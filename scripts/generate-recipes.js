#!/usr/bin/env node
// Generate recipe pages for every dish named in an event's "Feasting:" line.
//
//   OPENAI_API_KEY=... node scripts/generate-recipes.js [--force] [--only "Event Summary"]
//
// Output (committed, consumed by scripts/build-recipes.js and the app):
//   public/recipes/links.json    { [eventSummary]: [{ text, slug, dish }] }
//   public/recipes/recipes.json  { [slug]: { title, dish, events, intro, yield,
//                                            prepTime, cookTime, ingredients[], steps[], tips[] } }
//
// Existing entries are kept; only missing dishes are generated, so re-running
// after adding an event is cheap. --force regenerates everything.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ICS_PATH = path.join(ROOT, 'public', 'MSS.ics');
const OUT_DIR = path.join(ROOT, 'public', 'recipes');
const LINKS_PATH = path.join(OUT_DIR, 'links.json');
const RECIPES_PATH = path.join(OUT_DIR, 'recipes.json');
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

// ── ICS → { summary, feasting } ────────────────────────────────────────────
function readEvents() {
  const unfolded = fs.readFileSync(ICS_PATH, 'utf8').replace(/\r?\n[ \t]/g, '');
  const events = [];
  for (const block of unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []) {
    const summary = (block.match(/^SUMMARY:(.*)$/m) || [])[1];
    const desc = (block.match(/^DESCRIPTION:(.*)$/m) || [])[1] || '';
    const text = desc
      .replace(/\\+n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\;/g, ';')
      .replace(/\\\\/g, '\\');
    const feast = (text.match(/^Feasting:\s*(.*)$/m) || [])[1];
    if (summary && feast) events.push({ summary, feasting: feast.trim() });
  }
  return events;
}

// ── OpenAI helpers ─────────────────────────────────────────────────────────
async function chatJson(system, user, { retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const body = await res.json();
    if (res.ok) {
      try {
        return JSON.parse(body.choices[0].message.content);
      } catch (err) {
        if (attempt >= retries) throw err;
        continue;
      }
    }
    if (attempt >= retries || (res.status < 500 && res.status !== 429)) {
      throw new Error(`OpenAI ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 1500 * attempt));
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

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// ── Step A: find the dish phrases in each Feasting line ────────────────────
const EXTRACT_SYSTEM = `You identify the dishes and drinks named in a sentence about festive food.
Return JSON: {"dishes":[{"text":"<exact substring of the sentence naming one dish or drink>","dish":"<canonical short recipe title in English, Title Case>"}]}.
Rules: "text" must be copied verbatim from the sentence (so it can be hyperlinked) and name exactly one dish/drink — no leading "and", no verbs, no quantities like "mugs of" or "slices of". Include every distinct dish and drink. Skip generic words (tables, families, crowd). Keep the sentence order.`;

// ── Step B: write a recipe ─────────────────────────────────────────────────
const RECIPE_SYSTEM = `You are a careful home-cooking recipe writer for a seasonal-holidays calendar.
Write one traditional, workable home recipe for the dish requested, in the context of the holiday(s) it is served at.
Return JSON with exactly these keys:
{"title":"Title Case dish name","intro":"2-3 sentences on what it is and its place in the festival(s)","yield":"e.g. Serves 6","prepTime":"e.g. 20 min","cookTime":"e.g. 45 min (or 'none')","ingredients":["quantity + ingredient", ...],"steps":["one clear instruction each", ...],"tips":["1-3 short tips or variations"]}
Use US customary measures with metric in parentheses. Be accurate about the tradition; if a dish is a simple purchased item (e.g. a fruit, a wine), give a serving or preparation recipe instead. No markdown.`;

(async () => {
  const events = readEvents().filter((e) => !ONLY || e.summary === ONLY);
  const links = !FORCE && fs.existsSync(LINKS_PATH) ? JSON.parse(fs.readFileSync(LINKS_PATH, 'utf8')) : {};
  const recipes = !FORCE && fs.existsSync(RECIPES_PATH) ? JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8')) : {};

  // A. extraction
  const toExtract = events.filter((e) => FORCE || !links[e.summary]);
  console.log(`Feasting lines: ${events.length}; extracting dishes for ${toExtract.length}`);
  await mapLimit(toExtract, CONCURRENCY, async (event) => {
    const out = await chatJson(EXTRACT_SYSTEM, `Event: ${event.summary}\nSentence: ${event.feasting}`);
    const seen = new Set();
    links[event.summary] = (out.dishes || [])
      .filter((d) => d && d.text && d.dish && event.feasting.includes(d.text))
      .map((d) => ({ text: d.text.trim(), dish: d.dish.trim(), slug: slugify(d.dish) }))
      .filter((d) => d.slug && !seen.has(d.slug) && seen.add(d.slug));
    console.log(`  ${event.summary}: ${links[event.summary].map((d) => d.dish).join(' | ')}`);
  });
  fs.writeFileSync(LINKS_PATH, JSON.stringify(links, null, 2) + '\n');

  // B. recipes for every unique slug
  const wanted = new Map();
  for (const [summary, dishes] of Object.entries(links)) {
    if (!events.some((e) => e.summary === summary) && ONLY) continue;
    for (const d of dishes) {
      if (!wanted.has(d.slug)) wanted.set(d.slug, { dish: d.dish, events: new Set() });
      wanted.get(d.slug).events.add(summary);
    }
  }
  for (const [slug, info] of wanted) {
    if (recipes[slug]) recipes[slug].events = [...new Set([...(recipes[slug].events || []), ...info.events])];
  }
  const missing = [...wanted].filter(([slug]) => FORCE || !recipes[slug]);
  console.log(`Unique dishes: ${wanted.size}; generating ${missing.length} recipes with ${MODEL}`);
  let done = 0;
  await mapLimit(missing, CONCURRENCY, async ([slug, info]) => {
    const evs = [...info.events];
    const out = await chatJson(RECIPE_SYSTEM, `Dish: ${info.dish}\nServed at: ${evs.join('; ')}`);
    recipes[slug] = {
      title: out.title || info.dish,
      dish: info.dish,
      events: evs,
      intro: out.intro || '',
      yield: out.yield || '',
      prepTime: out.prepTime || '',
      cookTime: out.cookTime || '',
      ingredients: Array.isArray(out.ingredients) ? out.ingredients : [],
      steps: Array.isArray(out.steps) ? out.steps : [],
      tips: Array.isArray(out.tips) ? out.tips : [],
    };
    done += 1;
    if (done % 25 === 0 || done === missing.length) {
      fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 2) + '\n');
      console.log(`  ${done}/${missing.length}`);
    }
  });
  fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(recipes).length} recipes → ${path.relative(ROOT, RECIPES_PATH)}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
