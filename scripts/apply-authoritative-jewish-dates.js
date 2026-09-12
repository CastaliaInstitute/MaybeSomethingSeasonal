const fs = require('fs');
const path = require('path');

const icsPath = path.join(__dirname, '..', 'dist', 'MSS.ics');
let content = fs.readFileSync(icsPath, 'utf8');

// Pinned from Hebcal's Hebrew-calendar holiday tables. Jewish holidays begin
// at sundown; MSS represents these festival spans using the first full civil
// day as DTSTART so Apple/iCloud can render them as true all-day events.
// Passover uses the Diaspora eight-day observance represented by the source
// calendar; Hanukkah spans eight full civil days after the first lighting.
const HEBCAL_SOURCE = 'https://www.hebcal.com/holidays/';

const AUTHORITATIVE_EVENTS = new Map([
  ['Passover', {
    durationDays: 8,
    dates: [
      '20260402', '20270422', '20280411', '20290331', '20300418',
      '20310408', '20320327', '20330414', '20340404', '20350424',
    ],
  }],
  ['Rosh Hashanah (Jewish New Year)', {
    durationDays: 2,
    dates: [
      '20250923', '20260912', '20271002', '20280921', '20290910',
      '20300928', '20310918', '20320906', '20330924', '20340914',
      '20351004',
    ],
  }],
  ['Yom Kippur (Day of Atonement)', {
    durationDays: 1,
    dates: [
      '20251002', '20260921', '20271011', '20280930', '20290919',
      '20301007', '20310927', '20320915', '20331003', '20340923',
      '20351013',
    ],
  }],
  ['Hanukkah (Festival of Lights)', {
    durationDays: 8,
    dates: [
      '20251215', '20261205', '20271225', '20281213', '20291202',
      '20301221', '20311210', '20321128', '20331217', '20341207',
      '20351226',
    ],
  }],
]);

function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '');
}

function prop(block, name) {
  const match = unfold(block).match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'mi'));
  return match ? match[1].trim() : null;
}

function addDays(yyyymmdd, days) {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

function applyDates(block, summary, config) {
  const { dates, durationDays } = config;
  if (!dates.length) throw new Error(`${summary}: authoritative date list is empty`);

  let updated = block
    .replace(/^DTSTART(?:;[^:]*)?:.*$/mi, `DTSTART;VALUE=DATE:${dates[0]}`)
    .replace(/^DTEND(?:;[^:]*)?:.*$/mi, `DTEND;VALUE=DATE:${addDays(dates[0], durationDays)}`)
    .replace(/^RRULE:.*\r?\n/gmi, '')
    .replace(/^RDATE(?:;[^:]*)?:.*\r?\n/gmi, '')
    .replace(/^X-MSS-DATE-SOURCE:.*\r?\n/gmi, '');

  const rdates = dates.slice(1).map((date) => `RDATE;VALUE=DATE:${date}`).join('\n');
  updated = updated.replace(
    /^(DTSTART;VALUE=DATE:[^\r\n]+\r?\n)/mi,
    `$1${rdates ? `${rdates}\n` : ''}X-MSS-DATE-SOURCE:${HEBCAL_SOURCE}\n`,
  );
  return updated;
}

const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT\r?\n?/g;
let changed = 0;
content = content.replace(eventRegex, (block) => {
  const summary = prop(block, 'SUMMARY');
  const config = AUTHORITATIVE_EVENTS.get(summary);
  if (!config) return block;
  changed += 1;
  return applyDates(block, summary, config);
});

if (changed !== AUTHORITATIVE_EVENTS.size) {
  const found = [...AUTHORITATIVE_EVENTS.keys()].filter((summary) => content.includes(`SUMMARY:${summary}`));
  throw new Error(`Expected to update ${AUTHORITATIVE_EVENTS.size} Jewish observances, updated ${changed}; found: ${found.join(', ')}`);
}

fs.writeFileSync(icsPath, content);
console.log(`Applied Hebcal dates through 2035 to ${changed} Jewish observances.`);
