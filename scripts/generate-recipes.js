#!/usr/bin/env node
// Generate recipe pages for every dish named in an event's "Feasting:" line.
//
//   node scripts/generate-recipes.js   (Gemini via Vertex AI + gcloud auth; see scripts/lib/llm.js) [--force] [--only "Event Summary"]
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
const { chatJson, mapLimit, describe } = require('./lib/llm');

const ROOT = path.join(__dirname, '..');
const ICS_PATH = path.join(ROOT, 'public', 'MSS.ics');
const OUT_DIR = path.join(ROOT, 'public', 'recipes');
const LINKS_PATH = path.join(OUT_DIR, 'links.json');
const RECIPES_PATH = path.join(OUT_DIR, 'recipes.json');
const CONCURRENCY = Number(process.env.RECIPE_CONCURRENCY || 6);


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
  console.log(`Unique dishes: ${wanted.size}; generating ${missing.length} recipes with ${describe()}`);
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
