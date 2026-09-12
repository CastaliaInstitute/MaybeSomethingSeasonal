#!/usr/bin/env node
// Generate a suggested day-agenda for every calendar event, drawing on the
// event's History / Traditions / Feasting text and the recipes already
// generated for its dishes.
//
//   node scripts/generate-agendas.js   (Gemini via Vertex AI + gcloud auth; see scripts/lib/llm.js) [--force] [--only "Event Summary"]
//
// Output: public/recipes/agendas.json
//   { [eventSummary]: { slug, title, intro, schedule: [{ time, activity, detail, recipes: [slug] }], closing } }
const fs = require('fs');
const path = require('path');
const { chatJson, mapLimit, describe } = require('./lib/llm');

const ROOT = path.join(__dirname, '..');
const ICS_PATH = path.join(ROOT, 'public', 'MSS.ics');
const OUT_DIR = path.join(ROOT, 'public', 'recipes');
const LINKS_PATH = path.join(OUT_DIR, 'links.json');
const AGENDAS_PATH = path.join(OUT_DIR, 'agendas.json');
const CONCURRENCY = Number(process.env.RECIPE_CONCURRENCY || 6);

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


const SYSTEM = `You write a warm, practical one-day agenda for observing a seasonal festival at home, for a holidays calendar.
Return JSON: {"title":"Agenda title","intro":"1-2 sentences","schedule":[{"time":"e.g. Morning / 7:00 am / Sundown","activity":"short heading","detail":"1-2 sentences of what to do and why","recipes":["<slug>", ...]}],"closing":"one sentence to end the day"}
Use 5-8 schedule entries in chronological order, grounded strictly in the traditions and foods described; do not invent customs. Where an entry involves cooking or eating, reference the matching recipe slugs from the provided list (only those slugs). For a multi-day festival, describe the first day. No markdown.`;

(async () => {
  const events = readEvents().filter((e) => !ONLY || e.summary === ONLY);
  const links = fs.existsSync(LINKS_PATH) ? JSON.parse(fs.readFileSync(LINKS_PATH, 'utf8')) : {};
  const agendas = !FORCE && fs.existsSync(AGENDAS_PATH) ? JSON.parse(fs.readFileSync(AGENDAS_PATH, 'utf8')) : {};
  const todo = events.filter((e) => FORCE || !agendas[e.summary]);
  console.log(`Events: ${events.length}; generating ${todo.length} agendas with ${describe()}`);
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
