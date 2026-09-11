const fs = require('fs');
const path = require('path');

const icsPath = path.join(__dirname, '..', 'dist', 'MSS.ics');
let content = fs.readFileSync(icsPath, 'utf8');

function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '');
}

function prop(block, name) {
  const unfolded = unfold(block);
  const match = unfolded.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'mi'));
  return match ? match[1].trim() : null;
}

function replaceProp(block, name, value) {
  const pattern = new RegExp(`^(${name}(?:;[^:]*)?:).*?$`, 'mi');
  if (!pattern.test(block)) return block;
  return block.replace(pattern, `$1${value}`);
}

function normalizeAllDayBlock(block) {
  const startValue = prop(block, 'DTSTART');
  const endValue = prop(block, 'DTEND');
  const startMatch = startValue && startValue.match(/^(\d{8})T(\d{6})Z$/);
  const endMatch = endValue && endValue.match(/^(\d{8})T(\d{6})Z$/);
  if (!startMatch || !endMatch || startMatch[2] !== endMatch[2]) return block;

  const startDate = new Date(Date.UTC(
    Number(startMatch[1].slice(0, 4)),
    Number(startMatch[1].slice(4, 6)) - 1,
    Number(startMatch[1].slice(6, 8)),
  ));
  const endDate = new Date(Date.UTC(
    Number(endMatch[1].slice(0, 4)),
    Number(endMatch[1].slice(4, 6)) - 1,
    Number(endMatch[1].slice(6, 8)),
  ));
  if (endDate <= startDate) return block;

  let updated = block
    .replace(/^DTSTART(?:;[^:]*)?:.*$/mi, `DTSTART;VALUE=DATE:${startMatch[1]}`)
    .replace(/^DTEND(?:;[^:]*)?:.*$/mi, `DTEND;VALUE=DATE:${endMatch[1]}`);

  updated = updated.replace(/^RDATE(?:;[^:]*)?:(.*)$/gmi, (line, rawValues) => {
    const values = rawValues.split(',').map((value) => value.trim());
    if (!values.every((value) => /^\d{8}T\d{6}Z$/.test(value))) return line;
    return `RDATE;VALUE=DATE:${values.map((value) => value.slice(0, 8)).join(',')}`;
  });
  return updated;
}

function ymdFromDtstart(block) {
  const value = prop(block, 'DTSTART');
  const match = value && value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function weekdayToken(year, month, day) {
  return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayRule(date) {
  const weekday = weekdayToken(date.year, date.month, date.day);
  const positiveOrdinal = Math.floor((date.day - 1) / 7) + 1;
  const isLast = date.day + 7 > daysInMonth(date.year, date.month);
  return { month: date.month, weekday, positiveOrdinal, isLast };
}

function stableUid(summary) {
  const slug = summary
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'event';
  return `${slug}@maybesomethingseasonal.com`;
}

function addUid(block, summary) {
  if (/^UID:/mi.test(block)) return block;
  return block.replace(/^BEGIN:VEVENT\r?\n/m, `BEGIN:VEVENT\nUID:${stableUid(summary)}\n`);
}

function addRrule(block, rrule) {
  if (/^RRULE:/mi.test(block) || /^RDATE(?:;[^:]*)?:/mi.test(block)) return block;
  return block.replace(/^(DTSTART(?:;[^:]*)?:[^\r\n]+\r?\n)/mi, `$1RRULE:${rrule}\n`);
}

function formatDateLikeSeed(date, seedValue) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const suffix = seedValue.slice(8);
  return `${y}${m}${d}${suffix}`;
}

function addGeneratedRdates(block, summary, dateForYear, throughYear = 2100) {
  if (/^RRULE:/mi.test(block) || /^RDATE(?:;[^:]*)?:/mi.test(block)) return block;
  const seedValue = prop(block, 'DTSTART');
  const seedDate = ymdFromDtstart(block);
  if (!seedValue || !seedDate) return block;

  const lines = [];
  const rdatePrefix = seedValue.length === 8 ? 'RDATE;VALUE=DATE' : 'RDATE';
  for (let year = seedDate.year + 1; year <= throughYear; year += 1) {
    lines.push(`${rdatePrefix}:${formatDateLikeSeed(dateForYear(year), seedValue)}`);
  }
  if (!lines.length) return addUid(block, summary);

  let updated = addUid(block, summary);
  updated = updated.replace(
    /^(DTSTART(?:;[^:]*)?:[^\r\n]+\r?\n)/mi,
    `$1${lines.join('\n')}\n`,
  );
  return updated;
}

function addDaysUtc(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Gregorian Meeus/Jones/Butcher algorithm.
function westernEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function firstSundayOfAdvent(year) {
  const date = new Date(Date.UTC(year, 10, 27));
  while (date.getUTCDay() !== 0) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

const GENERATED_DATE_RULES = new Map([
  ['Palm Sunday', (year) => addDaysUtc(westernEaster(year), -7)],
  ['Maundy Thursday', (year) => addDaysUtc(westernEaster(year), -3)],
  ['Good Friday', (year) => addDaysUtc(westernEaster(year), -2)],
  ['First Sunday of Advent', (year) => firstSundayOfAdvent(year)],
  ['Second Sunday of Advent', (year) => addDaysUtc(firstSundayOfAdvent(year), 7)],
  ['Gaudete Sunday', (year) => addDaysUtc(firstSundayOfAdvent(year), 14)],
  ['Fourth Sunday of Advent', (year) => addDaysUtc(firstSundayOfAdvent(year), 21)],
]);

const RULE_BASED_RRULES = new Map([
  ['Thanksgiving Day (United States)', 'FREQ=YEARLY;BYMONTH=11;BYDAY=4TH'],
  ['Sinterklaas Arrival (Intocht)', 'FREQ=YEARLY;BYMONTH=11;BYDAY=SA;BYMONTHDAY=12,13,14,15,16,17,18'],
]);

// Correct known source-data defects in the deployed feed before recurrence is
// applied. These can be removed once the large source ICS is rewritten cleanly.
const DATE_CORRECTIONS = new Map([
  ['Candlemas (Feast of the Presentation)', ['20260202T070000Z', '20260203T070000Z']],
  ["All Hallows' Eve (Halloween)", ['20261031T060000Z', '20261101T060000Z']],
  ['Feast of the Holy Innocents (Childermas Banquet)', ['20251228T070000Z', '20251229T070000Z']],
]);

const MOVABLE_NAME = /\b(lunar|losar|ramadan|eid|passover|pesach|rosh hash|yom kippur|sukkot|hanukkah|chanukah|purim|easter|ash wednesday|palm sunday|maundy thursday|good friday|holy saturday|pentecost|ascension|corpus christi|orthodox|mardi gras|carnival|diwali|deepavali|navaratri|dussehra|vijayadashami|holi|vesak|wesak|mid-autumn|moon|equinox|solstice|nowruz|navroz|yalda|thanksgiving|advent|gaudete|sinterklaas arrival|ghost festival|ullambana|gita jayanti)\b/i;

const ONE_OFF_NAME = new Set([
  '800th Anniversary Transitus of St. Francis',
  'Broadmoor Brunch',
  'Madrigal Dinner at Glen Eyrie',
]);

function correctedBlock(block, summary) {
  const correction = DATE_CORRECTIONS.get(summary);
  if (!correction) return block;
  let updated = replaceProp(block, 'DTSTART', correction[0]);
  updated = replaceProp(updated, 'DTEND', correction[1]);
  return updated;
}

const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT\r?\n?/g;
const events = [...content.matchAll(eventRegex)].map((m, index) => {
  const summary = prop(m[0], 'SUMMARY');
  let block = summary ? correctedBlock(m[0], summary) : m[0];
  block = normalizeAllDayBlock(block);
  if (summary) block = addUid(block, summary);
  return {
    index,
    block,
    start: m.index,
    end: m.index + m[0].length,
    summary,
    date: ymdFromDtstart(block),
    hasRecurrence: /^RRULE:|^RDATE(?:;[^:]*)?:/mi.test(unfold(block)),
  };
});

const groups = new Map();
for (const event of events) {
  if (!event.summary || !event.date || event.hasRecurrence) continue;
  if (!groups.has(event.summary)) groups.set(event.summary, []);
  groups.get(event.summary).push(event);
}

const replacements = new Map();
const removals = new Set();
let fixedDateCount = 0;
let weekdayRuleCount = 0;
let generatedDateCount = 0;
let ruleBasedCount = 0;
let protectedMovableCount = 0;
let oneOffCount = 0;
let unresolvedRepeatedCount = 0;

for (const [summary, group] of groups) {
  const sorted = [...group].sort((a, b) =>
    a.date.year - b.date.year || a.date.month - b.date.month || a.date.day - b.date.day
  );
  const canonical = sorted[0];

  if (ONE_OFF_NAME.has(summary) || /\banniversary\b/i.test(summary)) {
    oneOffCount++;
    continue;
  }

  if (GENERATED_DATE_RULES.has(summary)) {
    replacements.set(
      canonical.index,
      addGeneratedRdates(canonical.block, summary, GENERATED_DATE_RULES.get(summary)),
    );
    for (const duplicate of sorted.slice(1)) removals.add(duplicate.index);
    generatedDateCount++;
    continue;
  }

  if (RULE_BASED_RRULES.has(summary)) {
    let block = addUid(canonical.block, summary);
    block = addRrule(block, RULE_BASED_RRULES.get(summary));
    replacements.set(canonical.index, block);
    for (const duplicate of sorted.slice(1)) removals.add(duplicate.index);
    ruleBasedCount++;
    continue;
  }

  const years = new Set(group.map((e) => e.date.year));
  if (MOVABLE_NAME.test(summary)) {
    protectedMovableCount++;
    continue;
  }

  // MSS is a seasonal-observance feed. A singleton that is neither known
  // movable nor explicitly one-off is treated as a fixed Gregorian annual
  // observance. The exclusions above are deliberately conservative.
  if (years.size < 2) {
    if (group.length !== 1) {
      unresolvedRepeatedCount++;
      continue;
    }
    let block = addUid(canonical.block, summary);
    block = addRrule(block, 'FREQ=YEARLY');
    replacements.set(canonical.index, block);
    fixedDateCount++;
    continue;
  }

  const sameMonthDay = group.every(
    (e) => e.date.month === canonical.date.month && e.date.day === canonical.date.day
  );

  let rrule = null;
  if (sameMonthDay) {
    rrule = 'FREQ=YEARLY';
    fixedDateCount++;
  } else {
    const rules = group.map((e) => weekdayRule(e.date));
    const sameMonth = rules.every((r) => r.month === rules[0].month);
    const sameWeekday = rules.every((r) => r.weekday === rules[0].weekday);
    const allLast = rules.every((r) => r.isLast);
    const samePositiveOrdinal = rules.every((r) => r.positiveOrdinal === rules[0].positiveOrdinal);

    if (sameMonth && sameWeekday && allLast) {
      rrule = `FREQ=YEARLY;BYMONTH=${rules[0].month};BYDAY=-1${rules[0].weekday}`;
      weekdayRuleCount++;
    } else if (sameMonth && sameWeekday && samePositiveOrdinal) {
      rrule = `FREQ=YEARLY;BYMONTH=${rules[0].month};BYDAY=${rules[0].positiveOrdinal}${rules[0].weekday}`;
      weekdayRuleCount++;
    }
  }

  if (!rrule) {
    unresolvedRepeatedCount++;
    continue;
  }

  let block = addUid(canonical.block, summary);
  block = addRrule(block, rrule);
  replacements.set(canonical.index, block);
  for (const duplicate of sorted.slice(1)) removals.add(duplicate.index);
}

let rebuilt = '';
let cursor = 0;
for (const event of events) {
  rebuilt += content.slice(cursor, event.start);
  if (!removals.has(event.index)) rebuilt += replacements.get(event.index) || event.block;
  cursor = event.end;
}
rebuilt += content.slice(cursor);

fs.writeFileSync(icsPath, rebuilt);
console.log(
  `Normalized recurring events: ${fixedDateCount} fixed-date, ${weekdayRuleCount} inferred weekday, ` +
  `${ruleBasedCount} explicit weekday-rule, ${generatedDateCount} generated-date; ` +
  `${protectedMovableCount} movable groups protected, ${oneOffCount} one-off groups protected, ` +
  `${unresolvedRepeatedCount} repeated groups left explicit.`
);
