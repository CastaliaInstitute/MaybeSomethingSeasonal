#!/usr/bin/env node
// Render static recipe and agenda pages from public/recipes/*.json.
//   dist/recipes/index.html          all recipes, grouped by event
//   dist/recipes/<slug>/index.html   one recipe
//   dist/agenda/index.html           all event agendas
//   dist/agenda/<event-slug>/index.html  a suggested day for one event
// Runs as part of `npm run build` after vite so the pages sit next to the app.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'recipes');
const OUT = path.join(ROOT, 'dist', 'recipes');
const AGENDA_OUT = path.join(ROOT, 'dist', 'agenda');
const SITE = 'https://mss.castalia.institute';

const recipes = JSON.parse(fs.readFileSync(path.join(SRC, 'recipes.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(SRC, 'links.json'), 'utf8'));
const agendas = fs.existsSync(path.join(SRC, 'agendas.json'))
  ? JSON.parse(fs.readFileSync(path.join(SRC, 'agendas.json'), 'utf8'))
  : {};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `
  :root { color-scheme: light; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2933;
         background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); min-height: 100vh; }
  .wrap { max-width: 44rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
  .brand { text-align: center; margin-bottom: 1.5rem; }
  .brand a { color: #1f2933; text-decoration: none; }
  .christmas { font-family: 'Mountains of Christmas', cursive; }
  .brand h1 { font-size: clamp(2rem, 6vw, 3rem); margin: 0; }
  .brand p { margin: 0.25rem 0 0; color: #475569; }
  .card { background: #fff; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
  .card h2 { margin: 0 0 0.25rem; font-size: clamp(1.6rem, 5vw, 2.2rem); }
  .events { color: #15803d; font-size: 0.95rem; margin: 0 0 1rem; }
  .events a { color: inherit; }
  .meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; color: #475569; font-size: 0.9rem; margin: 0 0 1.25rem; }
  .intro { line-height: 1.6; margin: 0 0 1.25rem; }
  h3 { margin: 1.25rem 0 0.5rem; font-size: 1.1rem; color: #166534; }
  ul, ol { padding-left: 1.4rem; line-height: 1.55; }
  li { margin: 0.25rem 0; }
  .tips { background: #f0fdf4; border-radius: 0.75rem; padding: 0.75rem 1rem 0.75rem 2.2rem; margin-top: 1rem; }
  .back { display: inline-block; margin-top: 1.5rem; color: #15803d; }
  .index h2 { font-size: 1.25rem; margin: 1.5rem 0 0.25rem; color: #166534; }
  .index ul { list-style: none; padding: 0; margin: 0 0 0.5rem; display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .index li a { display: inline-block; background: #fff; border: 1px solid #d1fae5; border-radius: 999px;
                padding: 0.3rem 0.8rem; color: #1f2933; text-decoration: none; font-size: 0.9rem; }
  .index li a:hover { background: #ecfdf5; }
  .count { color: #475569; text-align: center; margin: 0 0 1rem; }
  .agenda { list-style: none; padding: 0; margin: 0; }
  .agenda li { display: grid; grid-template-columns: 7rem 1fr; gap: 0.75rem; padding: 0.75rem 0; border-top: 1px solid #ecfdf5; }
  .agenda li:first-child { border-top: 0; }
  .agenda .time { color: #15803d; font-weight: 600; font-size: 0.9rem; }
  .agenda .activity { font-weight: 600; margin: 0 0 0.2rem; }
  .agenda .detail { margin: 0; line-height: 1.5; color: #334155; }
  .agenda .recipes { margin: 0.35rem 0 0; font-size: 0.9rem; }
  .agenda .recipes a { color: #15803d; }
  .closing { font-style: italic; color: #475569; margin: 1rem 0 0; }
  @media (max-width: 480px) { .agenda li { grid-template-columns: 1fr; gap: 0.2rem; } }
`;

const page = (title, body, description, subtitle = 'Feast-day recipes') => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)} · Maybe Something Seasonal</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap" rel="stylesheet" />
    <style>${STYLE}</style>
  </head>
  <body>
    <div class="wrap">
      <header class="brand">
        <a href="/"><h1 class="christmas">Maybe Something Seasonal</h1></a>
        <p>${esc(subtitle)}</p>
      </header>
      ${body}
    </div>
  </body>
</html>
`;

const list = (items, tag) => `<${tag}>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</${tag}>`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
// The app fetches links.json at runtime to hyperlink dishes in event cards.
fs.copyFileSync(path.join(SRC, 'links.json'), path.join(OUT, 'links.json'));

let count = 0;
for (const [slug, r] of Object.entries(recipes)) {
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const meta = [r.yield, r.prepTime && `Prep ${r.prepTime}`, r.cookTime && r.cookTime !== 'none' && `Cook ${r.cookTime}`]
    .filter(Boolean)
    .map((m) => `<span>${esc(m)}</span>`)
    .join('');
  const body = `
      <article class="card">
        <h2 class="christmas">${esc(r.title)}</h2>
        <p class="events">Served at: ${(r.events || [])
          .map((e) => (agendas[e] ? `<a href="/agenda/${agendas[e].slug}/">${esc(e)}</a>` : esc(e)))
          .join(' · ')}</p>
        <p class="meta">${meta}</p>
        <p class="intro">${esc(r.intro)}</p>
        <h3>Ingredients</h3>
        ${list(r.ingredients, 'ul')}
        <h3>Method</h3>
        ${list(r.steps, 'ol')}
        ${r.tips && r.tips.length ? `<h3>Tips</h3><div class="tips">${list(r.tips, 'ul')}</div>` : ''}
      </article>
      <a class="back" href="/recipes/">← All feast-day recipes</a>`;
  fs.writeFileSync(path.join(dir, 'index.html'), page(r.title, body, r.intro.slice(0, 160)));
  count += 1;
}

// index grouped by event, in the order events appear in links.json (ICS order)
const sections = Object.entries(links)
  .filter(([, dishes]) => dishes.length)
  .map(
    ([summary, dishes]) => `
      <h2>${esc(summary)}</h2>
      <ul>${dishes
        .filter((d) => recipes[d.slug])
        .map((d) => `<li><a href="/recipes/${d.slug}/">${esc(recipes[d.slug].title)}</a></li>`)
        .join('')}</ul>`,
  )
  .join('');
fs.writeFileSync(
  path.join(OUT, 'index.html'),
  page(
    'Recipes',
    `<p class="count">${count} recipes for the dishes named on the calendar's feast days.</p><div class="index">${sections}</div>`,
    'Home recipes for every dish mentioned on the Maybe Something Seasonal calendar.',
  ),
);
// ── agendas ────────────────────────────────────────────────────────────────
fs.rmSync(AGENDA_OUT, { recursive: true, force: true });
fs.mkdirSync(AGENDA_OUT, { recursive: true });
let agendaCount = 0;
for (const [summary, a] of Object.entries(agendas)) {
  const dir = path.join(AGENDA_OUT, a.slug);
  fs.mkdirSync(dir, { recursive: true });
  const items = a.schedule
    .map(
      (s) => `<li><div class="time">${esc(s.time)}</div><div>
        <p class="activity">${esc(s.activity)}</p>
        <p class="detail">${esc(s.detail)}</p>
        ${s.recipes && s.recipes.length
          ? `<p class="recipes">Recipes: ${s.recipes
              .filter((slug) => recipes[slug])
              .map((slug) => `<a href="/recipes/${slug}/">${esc(recipes[slug].title)}</a>`)
              .join(' · ')}</p>`
          : ''}
      </div></li>`,
    )
    .join('');
  const dishes = (links[summary] || []).filter((d) => recipes[d.slug]);
  const body = `
      <article class="card">
        <h2 class="christmas">${esc(summary)}</h2>
        <p class="events">${esc(a.title)}</p>
        <p class="intro">${esc(a.intro)}</p>
        <ol class="agenda">${items}</ol>
        ${a.closing ? `<p class="closing">${esc(a.closing)}</p>` : ''}
        ${dishes.length
          ? `<h3>Feast-day recipes</h3><div class="index"><ul>${dishes
              .map((d) => `<li><a href="/recipes/${d.slug}/">${esc(recipes[d.slug].title)}</a></li>`)
              .join('')}</ul></div>`
          : ''}
      </article>
      <a class="back" href="/agenda/">← All agendas</a>`;
  fs.writeFileSync(path.join(dir, 'index.html'), page(`${summary} — agenda`, body, a.intro.slice(0, 160), 'A day for each feast'));
  agendaCount += 1;
}
fs.writeFileSync(
  path.join(AGENDA_OUT, 'index.html'),
  page(
    'Agendas',
    `<p class="count">A suggested day for each of the ${agendaCount} observances on the calendar.</p><div class="index"><ul>${Object.entries(agendas)
      .map(([summary, a]) => `<li><a href="/agenda/${a.slug}/">${esc(summary)}</a></li>`)
      .join('')}</ul></div>`,
    'A suggested day of traditions and food for every event on the Maybe Something Seasonal calendar.',
    'A day for each feast',
  ),
);
fs.copyFileSync(path.join(SRC, 'agendas.json'), path.join(OUT, 'agendas.json'));
console.log(`Built ${agendaCount} agenda pages + index → ${path.relative(ROOT, AGENDA_OUT)}`);
console.log(`Built ${count} recipe pages + index → ${path.relative(ROOT, OUT)} (${SITE}/recipes/)`);
