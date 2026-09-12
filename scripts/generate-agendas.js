#!/usr/bin/env node
// Generate a suggested day-agenda for every calendar event, drawing on the
// event's History / Traditions / Feasting text and the recipes already
// generated for its dishes.
//
//   OPENAI_API_KEY=... node scripts/generate-agendas.js [--force] [--only "Event Summary"]
//
// Output: public/recipes/agendas.json
//   { [eventSummary]: { slug, title, intro, schedule: [{ time, activity, detail, recipes: [slug] }], closing } }
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ICS_PATH = path.join(ROOT, 'public', 'MSS.ics');
const OUT_DIR = path.join(ROOT, 'public', 'recipes');
const LINKS_PATH = path.join(OUT_DIR, 'links.json');
const AGENDAS_PATH = path.join(OUT_DIR, 'agendas.json');
const MODEL = process.env.RECIPE_MODEL || 'gpt-4.1-mini';
const CONCURRENCY = Number(process.env.RECIPE_CONCURRENCY || 6);

for (const envFile of [path.join(ROOT, '.env.local'), path.join(process.env.HOME || '', '.env')]) {
  if (!fs.existsSync(envFile)) continue;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('OPENAI_API_KEY is not set');
  process.exit(1);
}
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

function readEvents() {
  const unfolded = fs.readFileSync(ICS_PATH, 'utf8').replace(/\r?\n[ \t]/g, '');
  const events = [];
  for (const block of unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []) {
    const summary = (block.match(/^SUMMARY:(.*)$/m) || [])[1];
    const desc = (block.match(/^DESCRIPTION:(.*)$/m) || [])[1] || '';
    const text = desc.replace(/\\+n/g, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');
    const body = text.split(/\n(?=(?:Icon|Category|Image):)/)[0].replace(/^Day:.*$/m, '').trim();
    if (summary) events.push({ summary, text: body });
  }
  return events;
}

async function chatJson(system, user, { retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    const body = await res.json();
    if (res.ok) {
      try { return JSON.parse(body.choices[0].message.content); } catch (err) { if (attempt >= retries) throw err; continue; }
    }
    if (attempt >= retries || (res.status < 500 && res.status !== 429)) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }));
  return results;
}

const SYSTEM = `You write a warm, practical one-day agenda for observing a seasonal festival at home, for a holidays calendar.
Return JSON: {"title":"Agenda title","intro":"1-2 sentences","schedule":[{"time":"e.g. Morning / 7:00 am / Sundown","activity":"short heading","detail":"1-2 sentences of what to do and why","recipes":["<slug>", ...]}],"closing":"one sentence to end the day"}
Use 5-8 schedule entries in chronological order, grounded strictly in the traditions and foods described; do not invent customs. Where an entry involves cooking or eating, reference the matching recipe slugs from the provided list (only those slugs). For a multi-day festival, describe the first day. No markdown.`;

(async () => {
  const events = readEvents().filter((e) => !ONLY || e.summary === ONLY);
  const links = fs.existsSync(LINKS_PATH) ? JSON.parse(fs.readFileSync(LINKS_PATH, 'utf8')) : {};
  const agendas = !FORCE && fs.existsSync(AGENDAS_PATH) ? JSON.parse(fs.readFileSync(AGENDAS_PATH, 'utf8')) : {};
  const todo = events.filter((e) => FORCE || !agendas[e.summary]);
  console.log(`Events: ${events.length}; generating ${todo.length} agendas with ${MODEL}`);
  let done = 0;
  await mapLimit(todo, CONCURRENCY, async (event) => {
    const dishes = links[event.summary] || [];
    const recipeList = dishes.map((d) => `${d.slug} = ${d.dish}`).join('\n') || '(none)';
    const out = await chatJson(SYSTEM, `Event: ${event.summary}\n\n${event.text}\n\nAvailable recipe slugs:\n${recipeList}`);
    const allowed = new Set(dishes.map((d) => d.slug));
    agendas[event.summary] = {
      slug: slugify(event.summary),
      title: out.title || `A day for ${event.summary}`,
      intro: out.intro || '',
      schedule: (out.schedule || []).map((s) => ({
        time: s.time || '', activity: s.activity || '', detail: s.detail || '',
        recipes: (s.recipes || []).filter((slug) => allowed.has(slug)),
      })),
      closing: out.closing || '',
    };
    done += 1;
    if (done % 10 === 0 || done === todo.length) {
      fs.writeFileSync(AGENDAS_PATH, JSON.stringify(agendas, null, 2) + '\n');
      console.log(`  ${done}/${todo.length}`);
    }
  });
  fs.writeFileSync(AGENDAS_PATH, JSON.stringify(agendas, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(agendas).length} agendas → ${path.relative(ROOT, AGENDAS_PATH)}`);
})().catch((err) => { console.error(err); process.exit(1); });
