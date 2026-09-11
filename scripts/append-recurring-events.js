const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'public', 'MSS.ics');
const outputPath = path.join(__dirname, '..', 'dist', 'MSS.ics');

const source = fs.readFileSync(sourcePath, 'utf8');

// Burn Night is the Saturday immediately before U.S. Labor Day
// (the first Monday in September). This relationship cannot be expressed
// cleanly as a single portable RRULE, so publish future instances as RDATEs.
function burnNightForYear(year) {
  const septemberFirst = new Date(Date.UTC(year, 8, 1));
  const daysUntilMonday = (8 - septemberFirst.getUTCDay()) % 7;
  const laborDay = new Date(Date.UTC(year, 8, 1 + daysUntilMonday));
  laborDay.setUTCDate(laborDay.getUTCDate() - 2);
  return laborDay;
}

function icsDateTime(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}T060000Z`;
}

const firstYear = 2026;
const lastYear = 2100;
const firstDate = burnNightForYear(firstYear);
const nextDate = new Date(firstDate);
nextDate.setUTCDate(nextDate.getUTCDate() + 1);
const recurrenceDates = [];
for (let year = firstYear + 1; year <= lastYear; year += 1) {
  recurrenceDates.push(`RDATE:${icsDateTime(burnNightForYear(year))}`);
}

const burnNightEvent = [
  'BEGIN:VEVENT',
  'UID:burn-night@maybesomethingseasonal.com',
  'DTSTAMP:20260829T102300Z',
  `DTSTART:${icsDateTime(firstDate)}`,
  `DTEND:${icsDateTime(nextDate)}`,
  ...recurrenceDates,
  'SUMMARY:Burn Night',
  'DESCRIPTION:Seasonal observance held on the Saturday immediately before U.S. Labor Day.\\n\\nIcon: 🔥\\nCategory: seasonal',
  'CATEGORIES:seasonal',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  ''
].join('\n');

// Glen Eyrie states that Madrigal Banquet tickets go on sale on the Tuesday
// after Labor Day. Because Labor Day is the first Monday in September, this
// is exactly the Tuesday falling on September 2 through 8.
const madrigalTicketSaleEvent = [
  'BEGIN:VEVENT',
  'UID:glen-eyrie-madrigal-tickets@maybesomethingseasonal.com',
  'DTSTAMP:20260829T104500Z',
  'DTSTART;VALUE=DATE:20260908',
  'DTEND;VALUE=DATE:20260909',
  'RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=TU;BYMONTHDAY=2,3,4,5,6,7,8',
  'SUMMARY:Glen Eyrie Madrigal Tickets Go On Sale',
  'DESCRIPTION:Glen Eyrie Madrigal Banquet tickets go on sale the Tuesday after Labor Day.\\nhttps://gleneyrie.org/our-event/madrigal/\\n\\nIcon: 🎟️\\nCategory: seasonal',
  'URL:https://gleneyrie.org/our-event/madrigal/',
  'CATEGORIES:seasonal',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  ''
].join('\n');

// Indigenous Peoples’ Day is observed on the second Monday in October.
const indigenousPeoplesDayEvent = [
  'BEGIN:VEVENT',
  'UID:indigenous-peoples-day@maybesomethingseasonal.com',
  'DTSTAMP:20260829T130000Z',
  'DTSTART;VALUE=DATE:20261012',
  'DTEND;VALUE=DATE:20261013',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=MO;BYMONTHDAY=8,9,10,11,12,13,14',
  'SUMMARY:Indigenous Peoples’ Day',
  'DESCRIPTION:Celebrate the Indigenous American origins of foods that transformed Italian cooking with an Italian feast of American foods—especially tomatoes.\\n\\nIcon: 🍅\\nCategory: cultural',
  'CATEGORIES:cultural',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  ''
].join('\n');

// Navaratri follows a lunisolar calendar, so its nine 2026 nights are
// published as explicit dated events rather than an incorrect Gregorian RRULE.
const navaratriDays = [
  ['20261011', '20261012', 'shailaputri', 'Navaratri Day 1 — Shailaputri', '🏔️', 'Honor Shailaputri, daughter of the mountains and embodiment of grounded beginnings. Begin Navaratri with intention, steadiness, and reverence for the earth.'],
  ['20261012', '20261013', 'brahmacharini', 'Navaratri Day 2 — Brahmacharini', '📿', 'Honor Brahmacharini, the devoted seeker whose discipline and contemplative strength illuminate the path of spiritual practice.'],
  ['20261013', '20261014', 'chandraghanta', 'Navaratri Day 3 — Chandraghanta', '🔔', 'Honor Chandraghanta, the moon-belled warrior whose courage, vigilance, and protective grace confront fear and restore peace.'],
  ['20261014', '20261015', 'kushmanda', 'Navaratri Day 4 — Kushmanda', '☀️', 'Honor Kushmanda, the radiant creator whose smile kindles the cosmic egg and fills the world with warmth, vitality, and light.'],
  ['20261015', '20261016', 'skandamata', 'Navaratri Day 5 — Skandamata', '👩‍👦', 'Honor Skandamata, mother of Skanda, as an image of nurturing courage, protective love, and wisdom carried through generations.'],
  ['20261016', '20261017', 'katyayani', 'Navaratri Day 6 — Katyayani', '🦁', 'Honor Katyayani, the lion-riding warrior goddess who embodies decisive strength, justice, and resistance to destructive forces.'],
  ['20261017', '20261018', 'kalaratri', 'Navaratri Day 7 — Kalaratri', '🌌', 'Honor Kalaratri, the dark night that dissolves fear and ignorance, revealing the fierce protection hidden within transformation.'],
  ['20261018', '20261019', 'mahagauri', 'Navaratri Day 8 — Mahagauri', '🪷', 'Honor Mahagauri, the luminous form of purification, serenity, compassion, and renewal after hardship.'],
  ['20261019', '20261020', 'siddhidatri', 'Navaratri Day 9 — Siddhidatri', '✨', 'Honor Siddhidatri, bestower of insight and accomplishment, bringing the nine-night journey toward wholeness, wisdom, and fulfillment.'],
];

const navaratriEvents = navaratriDays.map(([start, end, slug, summary, icon, description]) => [
  'BEGIN:VEVENT',
  `UID:navaratri-2026-${slug}@maybesomethingseasonal.com`,
  'DTSTAMP:20260829T130000Z',
  `DTSTART;VALUE=DATE:${start}`,
  `DTEND;VALUE=DATE:${end}`,
  `SUMMARY:${summary}`,
  `DESCRIPTION:${description}\\n\\nIcon: ${icon}\\nCategory: cultural`,
  'CATEGORIES:cultural',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  ''
].join('\n'));

const dussehraEvent = [
  'BEGIN:VEVENT',
  'UID:dussehra-2026@maybesomethingseasonal.com',
  'DTSTAMP:20260829T130000Z',
  'DTSTART;VALUE=DATE:20261020',
  'DTEND;VALUE=DATE:20261021',
  'SUMMARY:Dussehra / Vijayadashami',
  'DESCRIPTION:Celebrate the victorious tenth day after Navaratri: Rama’s defeat of Ravana and Durga’s victory over Mahishasura, expressing the triumph of courage, justice, and good over destructive forces.\\n\\nIcon: 🏹\\nCategory: cultural',
  'CATEGORIES:cultural',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  ''
].join('\n');

// The liturgical Feast of St. Francis is October 4. In 2026, the linked
// Colorado Springs parish observance begins with the 800th-anniversary
// Transitus on October 3, the date of Francis's death.
const stFrancisTransitusEvent = [
  'BEGIN:VEVENT',
  'UID:st-francis-transitus-800@maybesomethingseasonal.com',
  'DTSTAMP:20260829T130000Z',
  'DTSTART;VALUE=DATE:20261003',
  'DTEND;VALUE=DATE:20261004',
  'SUMMARY:800th Anniversary Transitus of St. Francis',
  'DESCRIPTION:Remember the passage of St. Francis of Assisi from earthly life on the 800th anniversary of his death. The Transitus opens the observance on the eve of his feast.\\nhttps://www.stfranciscs.org/news-articles/608-join-us-october-3rd-for-the-800th-anniversary-of-st-francis-of-assisi\\n\\nIcon: 🕊️\\nCategory: cultural',
  'URL:https://www.stfranciscs.org/news-articles/608-join-us-october-3rd-for-the-800th-anniversary-of-st-francis-of-assisi',
  'CATEGORIES:cultural',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  ''
].join('\n');

const stFrancisFeastEvent = [
  'BEGIN:VEVENT',
  'UID:feast-of-st-francis@maybesomethingseasonal.com',
  'DTSTAMP:20260829T130000Z',
  'DTSTART;VALUE=DATE:20261004',
  'DTEND;VALUE=DATE:20261005',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=4',
  'SUMMARY:Feast of St. Francis of Assisi',
  'DESCRIPTION:Celebrate St. Francis through simplicity, care for people in need, peace, kinship with creation, and the traditional blessing of animals.\\nhttps://www.stfranciscs.org/news-articles/608-join-us-october-3rd-for-the-800th-anniversary-of-st-francis-of-assisi\\n\\nIcon: 🐦\\nCategory: cultural',
  'URL:https://www.stfranciscs.org/news-articles/608-join-us-october-3rd-for-the-800th-anniversary-of-st-francis-of-assisi',
  'CATEGORIES:cultural',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  ''
].join('\n');

// Palmer Lake Resolution 54-2022 defines Yule Log Sunday as the second
// Sunday before Christmas. That is the Sunday falling December 11 through 17
// (the Third Sunday of Advent).
const palmerLakeYuleLogEvent = [
  'BEGIN:VEVENT',
  'UID:palmer-lake-yule-log@maybesomethingseasonal.com',
  'DTSTAMP:20260829T120000Z',
  'DTSTART:20251214T200000Z',
  'DTEND:20251215T033000Z',
  'RRULE:FREQ=YEARLY;BYMONTH=12;BYDAY=SU;BYMONTHDAY=11,12,13,14,15,16,17',
  'SUMMARY:Palmer Lake Yule Log Hunt',
  'DESCRIPTION:Palmer Lake’s annual Yule Log Hunt, held on the second Sunday before Christmas (the Third Sunday of Advent). Begins at Palmer Lake Town Hall.\\nhttps://palmerdividehistory.org/\\n\\nIcon: 🪵\\nCategory: seasonal',
  'URL:https://palmerdividehistory.org/',
  'LOCATION:Palmer Lake Town Hall\\, 28 Valley Crescent St.\\, Palmer Lake\\, CO',
  'CATEGORIES:seasonal',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'X-IMAGE:/images/annual-tradition-in-palmer-lake-colorado-community-yule-log-hunt-and-celebration.png',
  'END:VEVENT',
  ''
].join('\n');

if (!/END:VCALENDAR\s*$/.test(source)) {
  throw new Error('MSS.ics is missing END:VCALENDAR');
}

const additions = [];
if (!source.includes('SUMMARY:Burn Night')) additions.push(burnNightEvent);
if (!source.includes('SUMMARY:Glen Eyrie Madrigal Tickets Go On Sale')) additions.push(madrigalTicketSaleEvent);
if (!source.includes('SUMMARY:Indigenous Peoples’ Day')) additions.push(indigenousPeoplesDayEvent);
for (const event of navaratriEvents) {
  const summary = event.match(/^SUMMARY:(.*)$/m)?.[1];
  if (summary && !source.includes(`SUMMARY:${summary}`)) additions.push(event);
}
if (!source.includes('SUMMARY:Dussehra / Vijayadashami')) additions.push(dussehraEvent);
if (!source.includes('SUMMARY:800th Anniversary Transitus of St. Francis')) additions.push(stFrancisTransitusEvent);
if (!source.includes('SUMMARY:Feast of St. Francis of Assisi')) additions.push(stFrancisFeastEvent);
if (!source.includes('SUMMARY:Palmer Lake Yule Log Hunt')) additions.push(palmerLakeYuleLogEvent);

if (additions.length === 0) {
  fs.writeFileSync(outputPath, source);
  process.exit(0);
}

const merged = source.replace(/END:VCALENDAR\s*$/, `${additions.join('')}END:VCALENDAR\n`);
fs.writeFileSync(outputPath, merged);
