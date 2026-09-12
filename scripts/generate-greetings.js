#!/usr/bin/env node
// Generate the "today" content shown in the holiday welcome overlay: a
// greeting for the day and a few short meditations, per event.
//
//   node scripts/generate-greetings.js [--force] [--only "Event Summary"]
//   (Gemini via Vertex AI + gcloud auth; see scripts/lib/llm.js)
//
// Output: public/recipes/greetings.json
//   { [eventSummary]: { greeting, traditionalGreeting, meditations: [{ title, text }] } }
const fs = require('fs');
const path = require('path');
const { chatJson, mapLimit, describe } = require('./lib/llm');

const ROOT = path.join(__dirname, '..');
const ICS_PATH = path.join(ROOT, 'public', 'MSS.ics');
const OUT_PATH = path.join(ROOT, 'public', 'recipes', 'greetings.json');
const CONCURRENCY = Number(process.env.RECIPE_CONCURRENCY || 6);

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

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

const SYSTEM = `You write the welcome screen a seasonal-holidays calendar shows on the morning of a festival.
Return JSON: {"greeting":"1-2 warm sentences greeting the reader on this day (English)","traditionalGreeting":"the customary greeting in its original language with a short gloss, e.g. 'Shanah tovah — a good year', or empty string if there is none","meditations":[{"title":"3-6 words","text":"60-110 words"}]}
Give exactly 3 meditations: short reflective passages inviting the reader to pause — drawn from the festival's own meaning, history, and traditions as described; contemplative and welcoming to anyone, never preachy or instructional. No markdown, no emoji.`;

(async () => {
  const events = readEvents().filter((e) => !ONLY || e.summary === ONLY);
  const out = !FORCE && fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')) : {};
  const todo = events.filter((e) => FORCE || !out[e.summary]);
  console.log(`Events: ${events.length}; generating ${todo.length} greetings with ${describe()}`);
  let done = 0;
  await mapLimit(todo, CONCURRENCY, async (event) => {
    const r = await chatJson(SYSTEM, `Event: ${event.summary}\n\n${event.text}`, { temperature: 0.6 });
    out[event.summary] = {
      greeting: r.greeting || '',
      traditionalGreeting: r.traditionalGreeting || '',
      meditations: (r.meditations || []).slice(0, 3).map((m) => ({ title: m.title || '', text: m.text || '' })),
    };
    done += 1;
    if (done % 10 === 0 || done === todo.length) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
      console.log(`  ${done}/${todo.length}`);
    }
  });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(out).length} greetings → ${path.relative(ROOT, OUT_PATH)}`);
})().catch((err) => { console.error(err); process.exit(1); });
