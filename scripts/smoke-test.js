const { spawn } = require('child_process');
const fetch = global.fetch;

const PREVIEW_PORT = process.env.PREVIEW_PORT || 4174;
const PREVIEW_HOST = '127.0.0.1';
const BASE_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
const SITE_PATH = '/MaybeSomethingSeasonal/';
const ICS_PATH = `${SITE_PATH}MSS.ics`;
const MONTH_PATH = `${SITE_PATH}2026/12`;
const DEPLOY_BASE = 'https://castaliainstitute.github.io/MaybeSomethingSeasonal';

async function waitForServer(maxAttempts = 20, delayMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${SITE_PATH}`, { redirect: 'manual' });
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch (error) {
      if (attempt === maxAttempts) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error('Preview server did not become ready in time.');
}

async function checkPage() {
  const response = await fetch(`${BASE_URL}${SITE_PATH}`);
  if (!response.ok) {
    throw new Error(`GET ${SITE_PATH} responded with status ${response.status}`);
  }
  const html = await response.text();
  if (!html.includes('<div id="root">')) {
    throw new Error('Built index.html is missing expected <div id="root"> element.');
  }
  return html;
}

async function checkMonthRoute() {
  const response = await fetch(`${BASE_URL}${MONTH_PATH}`);
  if (!response.ok) {
    throw new Error(`GET ${MONTH_PATH} responded with status ${response.status}`);
  }
  const html = await response.text();
  if (!html.includes('<div id="root">')) {
    throw new Error('Month route did not resolve to the calendar app.');
  }
}

async function checkIcs(html) {
  const response = await fetch(`${BASE_URL}${ICS_PATH}`);
  if (!response.ok) {
    throw new Error(`GET ${ICS_PATH} responded with status ${response.status}`);
  }
  const ics = await response.text();
  if (!ics.includes('BEGIN:VEVENT')) {
    throw new Error('ICS file does not contain BEGIN:VEVENT markers.');
  }
  if (!ics.includes('RRULE:FREQ=YEARLY')) {
    throw new Error('ICS file does not contain expanded yearly recurrence rules.');
  }
  if (!ics.includes('SUMMARY:Palmer Lake Yule Log Hunt')) {
    throw new Error('ICS file is missing the recurring Palmer Lake Yule Log event.');
  }
  const imagePathRegex = /X-IMAGE:(.+)/g;
  const missingImages = [];
  let match;

  while ((match = imagePathRegex.exec(ics)) !== null) {
    const imageUrl = match[1].trim();
    let fetchUrl;
    if (imageUrl.startsWith('http')) {
      if (!imageUrl.startsWith(DEPLOY_BASE)) {
        throw new Error(`Unexpected absolute image URL detected: ${imageUrl}`);
      }
      const localBase = `${BASE_URL}${SITE_PATH.endsWith('/') ? SITE_PATH.slice(0, -1) : SITE_PATH}`;
      fetchUrl = imageUrl.replace(DEPLOY_BASE, localBase);
    } else {
      const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      const prefix = SITE_PATH.endsWith('/') ? SITE_PATH.slice(0, -1) : SITE_PATH;
      fetchUrl = `${BASE_URL}${prefix}${normalized}`;
    }
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      missingImages.push({ imageUrl: fetchUrl, status: response.status });
    }
  }

  if (missingImages.length > 0) {
    const details = missingImages.map(m => `${m.imageUrl} (status ${m.status})`).join('\n');
    throw new Error(`Missing image assets detected:\n${details}`);
  }

  return ics;
}

async function run() {
  const preview = spawn('npx', ['vite', 'preview', '--host', PREVIEW_HOST, '--port', String(PREVIEW_PORT)], {
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });

  preview.stdout.on('data', data => {
    process.stdout.write(`[preview] ${data}`);
  });

  preview.stderr.on('data', data => {
    process.stderr.write(`[preview] ${data}`);
  });

  preview.on('error', error => {
    console.error('Failed to start vite preview:', error);
  });

  try {
    await waitForServer();
    const html = await checkPage();
    await checkMonthRoute();
    await checkIcs(html);
    console.log('✅ Smoke test passed.');
  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    preview.kill('SIGINT');
    process.exitCode = 1;
    return;
  }

  preview.kill('SIGINT');
}

run();
