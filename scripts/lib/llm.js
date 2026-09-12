// Shared JSON-chat helper for the recipe/agenda generators.
//
// Provider selection via LLM_PROVIDER:
//   vertex     (default) — Gemini via Vertex AI using gcloud credentials
//                          (`gcloud auth print-access-token`; project
//                          GOOGLE_CLOUD_PROJECT, default inquiry-institute)
//   gemini-api           — Gemini via AI Studio with GEMINI_API_KEY
//   openai               — OpenAI chat completions with OPENAI_API_KEY
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
for (const envFile of [path.join(ROOT, '.env.local'), path.join(process.env.HOME || '', '.env')]) {
  if (!fs.existsSync(envFile)) continue;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PROVIDER = process.env.LLM_PROVIDER || 'vertex';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.RECIPE_MODEL || 'gpt-4.1-mini';
const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'inquiry-institute';
const GCP_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

let accessToken = null;
let accessTokenAt = 0;
function gcloudToken() {
  if (accessToken && Date.now() - accessTokenAt < 40 * 60 * 1000) return accessToken;
  accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  accessTokenAt = Date.now();
  return accessToken;
}

function describe() {
  if (PROVIDER === 'openai') return `OpenAI ${OPENAI_MODEL}`;
  return PROVIDER === 'gemini-api'
    ? `Gemini ${GEMINI_MODEL} (AI Studio)`
    : `Gemini ${GEMINI_MODEL} (Vertex AI, ${GCP_PROJECT}/${GCP_LOCATION})`;
}

async function post(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { res, json };
}

function stripFences(s) {
  return String(s).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
}

async function geminiJson(system, user, temperature) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature, responseMimeType: 'application/json' },
  };
  let url;
  let headers;
  if (PROVIDER === 'gemini-api') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    headers = { 'x-goog-api-key': process.env.GEMINI_API_KEY };
  } else {
    url = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;
    headers = { Authorization: `Bearer ${gcloudToken()}` };
  }
  const { res, json } = await post(url, headers, body);
  if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 300)}`), { status: res.status });
  const parts = json.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('');
  return JSON.parse(stripFences(text));
}

async function openaiJson(system, user, temperature) {
  const { res, json } = await post(
    'https://api.openai.com/v1/chat/completions',
    { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    {
      model: OPENAI_MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    },
  );
  if (!res.ok) throw Object.assign(new Error(`OpenAI ${res.status}: ${JSON.stringify(json).slice(0, 300)}`), { status: res.status });
  return JSON.parse(json.choices[0].message.content);
}

async function chatJson(system, user, { temperature = 0.4, retries = 4 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return PROVIDER === 'openai'
        ? await openaiJson(system, user, temperature)
        : await geminiJson(system, user, temperature);
    } catch (err) {
      const retryable = err instanceof SyntaxError || !err.status || err.status === 429 || err.status >= 500;
      if (!retryable || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

module.exports = { chatJson, mapLimit, describe };
