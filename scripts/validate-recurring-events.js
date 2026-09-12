const fs = require('fs');
const path = require('path');

const icsPath = path.join(__dirname, '..', 'dist', 'MSS.ics');
const content = fs.readFileSync(icsPath, 'utf8');

function requireMatch(pattern, message) {
  if (!pattern.test(content)) throw new Error(message);
}

function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '');
}

function prop(block, name) {
  const match = unfold(block).match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'mi'));
  return match ? match[1].trim() : null;
}

function eventDate(block) {
  const value = prop(block, 'DTSTART');
  const match = value && value.match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

function weekdayToken(date) {
  return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][
    new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
  ];
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function recurrenceSignature(date) {
  const weekday = weekdayToken(date);
  const ordinal = Math.floor((date.day - 1) / 7) + 1;
  const last = date.day + 7 > daysInMonth(date.year, date.month);
  return {
    fixed: `${date.month}-${date.day}`,
    weekday: `${date.month}-${last ? -1 : ordinal}${weekday}`,
  };
}

const MOVABLE_NAME = /\b(lunar|losar|ramadan|eid|passover|pesach|rosh hashana?h?|yom kippur|sukkot|hanukkah|chanukah|purim|easter|ash wednesday|palm sunday|maundy thursday|good friday|holy saturday|pentecost|ascension|corpus christi|orthodox|mardi gras|carnival|diwali|deepavali|navaratri|dussehra|vijayadashami|holi|vesak|wesak|mid-autumn|moon|equinox|solstice|nowruz|navroz|yalda|thanksgiving|advent|gaudete|sinterklaas arrival|ghost festival|ullambana|gita jayanti)\b/i;
const ONE_OFF_NAME = new Set(['800th Anniversary Transitus of St. Francis', 'Broadmoor Brunch', 'Madrigal Dinner at Glen Eyrie']);

const blocks = [...content.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)].map((match) => match[0]);
function blockFor(summary) {
  return blocks.find((block) => prop(block, 'SUMMARY') === summary);
}
function requireBlock(summary) {
  const block = blockFor(summary);
  if (!block) throw new Error(`${summary} event missing`);
  return block;
}
function assertNoRrule(summary) {
  const block = requireBlock(summary);
  if (prop(block, 'RRULE')) throw new Error(`${summary} must not use a naive yearly RRULE`);
  return block;
}
function assertNoRecurrence(summary) {
  const block = requireBlock(summary);
  if (prop(block, 'RRULE') || prop(block, 'RDATE')) {
    throw new Error(`${summary} must remain a one-off until authoritative future dates are generated`);
  }
  return block;
}

requireMatch(/UID:burn-night@maybesomethingseasonal\.com/, 'Burn Night UID missing');
requireMatch(/SUMMARY:Burn Night/, 'Burn Night missing');
requireMatch(/RDATE;VALUE=DATE:20270904/, 'Burn Night 2027 occurrence missing');
requireMatch(/RDATE;VALUE=DATE:21000904/, 'Burn Night recurrence horizon does not reach 2100');

requireMatch(/UID:glen-eyrie-madrigal-tickets@maybesomethingseasonal\.com/, 'Madrigal ticket-sale UID missing');
requireMatch(/SUMMARY:Glen Eyrie Madrigal Tickets Go On Sale/, 'Madrigal ticket-sale event missing');
requireMatch(/RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=TU;BYMONTHDAY=2,3,4,5,6,7,8/, 'Madrigal recurrence rule missing or changed');
requireMatch(/URL:https:\/\/gleneyrie\.org\/our-event\/madrigal\//, 'Madrigal source URL missing');

requireMatch(/UID:indigenous-peoples-day@maybesomethingseasonal\.com/, 'Indigenous Peoples’ Day UID missing');
requireMatch(/SUMMARY:Indigenous Peoples’ Day/, 'Indigenous Peoples’ Day event missing');
requireMatch(
  /RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=MO;BYMONTHDAY=8,9,10,11,12,13,14/,
  'Indigenous Peoples’ Day must recur on the second Monday in October'
);
requireMatch(/Icon: 🍅/, 'Indigenous Peoples’ Day tomato icon missing');
requireMatch(/especially tomatoes/, 'Indigenous Peoples’ Day tomato feast description missing');

const navaratriBlocks = blocks.filter((block) => /^Navaratri Day [1-9] — /.test(prop(block, 'SUMMARY') || ''));
if (navaratriBlocks.length !== 9) {
  throw new Error(`Expected nine distinct Navaratri events, found ${navaratriBlocks.length}`);
}
const navaratriIcons = navaratriBlocks.map((block) => prop(block, 'DESCRIPTION')?.match(/Icon: ([^\\]+)/)?.[1]);
if (new Set(navaratriIcons).size !== 9) throw new Error('Each Navaratri event must have its own icon');
if (navaratriBlocks.some((block) => prop(block, 'RRULE') || prop(block, 'RDATE'))) {
  throw new Error('Navaratri 2026 dates must remain explicit lunisolar events');
}

const dussehraBlock = requireBlock('Dussehra / Vijayadashami');
if (prop(dussehraBlock, 'DTSTART') !== '20261020') throw new Error('Dussehra 2026 date must be October 20');
if (prop(dussehraBlock, 'RRULE') || prop(dussehraBlock, 'RDATE')) {
  throw new Error('Dussehra must remain an explicit lunisolar event until future dates are generated');
}
if (!/Icon: 🏹/.test(dussehraBlock)) throw new Error('Dussehra bow icon missing');

requireMatch(/UID:st-francis-transitus-800@maybesomethingseasonal\.com/, 'St. Francis Transitus UID missing');
requireMatch(/DTSTART;VALUE=DATE:20261003/, 'St. Francis 800th-anniversary Transitus date missing');
assertNoRecurrence('800th Anniversary Transitus of St. Francis');
requireMatch(/UID:feast-of-st-francis@maybesomethingseasonal\.com/, 'Feast of St. Francis UID missing');
requireMatch(/SUMMARY:Feast of St. Francis of Assisi/, 'Feast of St. Francis missing');
requireMatch(/RRULE:FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=4/, 'Feast of St. Francis must recur on October 4');
requireMatch(/Icon: 🐦/, 'Feast of St. Francis icon missing');

requireMatch(/UID:palmer-lake-yule-log@maybesomethingseasonal\.com/, 'Palmer Lake Yule Log UID missing');
requireMatch(/SUMMARY:Palmer Lake Yule Log Hunt/, 'Palmer Lake Yule Log event missing');
requireMatch(
  /RRULE:FREQ=YEARLY;BYMONTH=12;BYDAY=SU;BYMONTHDAY=11,12,13,14,15,16,17/,
  'Palmer Lake Yule Log must recur on the second Sunday before Christmas'
);
requireMatch(/URL:https:\/\/palmerdividehistory\.org\//, 'Palmer Lake Yule Log source URL missing');

// Correct known source-date defects before making them recurring.
const candlemas = requireBlock('Candlemas (Feast of the Presentation)');
if (prop(candlemas, 'DTSTART') !== '20260202') throw new Error('Candlemas must be February 2');
if (prop(candlemas, 'DTEND') !== '20260203') throw new Error('Candlemas end date must be February 3');
if (prop(candlemas, 'RRULE') !== 'FREQ=YEARLY') throw new Error('Candlemas must recur yearly');

const halloween = requireBlock("All Hallows' Eve (Halloween)");
if (prop(halloween, 'DTEND') !== '20261101') throw new Error('Halloween end date must follow its 2026 start');
if (prop(halloween, 'RRULE') !== 'FREQ=YEARLY') throw new Error('Halloween must recur yearly');

const innocents = requireBlock('Feast of the Holy Innocents (Childermas Banquet)');
if (prop(innocents, 'DTSTART') !== '20251228') throw new Error('Holy Innocents must begin December 28');
if (prop(innocents, 'DTEND') !== '20251229') throw new Error('Holy Innocents must end December 29');

// Rule-based Gregorian observances.
const thanksgiving = requireBlock('Thanksgiving Day (United States)');
if (prop(thanksgiving, 'RRULE') !== 'FREQ=YEARLY;BYMONTH=11;BYDAY=4TH') {
  throw new Error('Thanksgiving must recur on the fourth Thursday in November');
}
const sinterklaas = requireBlock('Sinterklaas Arrival (Intocht)');
if (prop(sinterklaas, 'RRULE') !== 'FREQ=YEARLY;BYMONTH=11;BYDAY=SA;BYMONTHDAY=12,13,14,15,16,17,18') {
  throw new Error('Sinterklaas Arrival must recur on the first Saturday after St. Martin’s Day');
}

// Deterministic movable Christian dates are generated as RDATEs through 2100.
const palm = assertNoRrule('Palm Sunday');
if (!/RDATE;VALUE=DATE:20350318/.test(palm) || !/RDATE;VALUE=DATE:21000321/.test(palm)) {
  throw new Error('Palm Sunday generated dates must reach through 2100');
}
const maundy = assertNoRrule('Maundy Thursday');
if (!/RDATE;VALUE=DATE:20350322/.test(maundy) || !/RDATE;VALUE=DATE:21000325/.test(maundy)) {
  throw new Error('Maundy Thursday generated dates must reach through 2100');
}
const goodFriday = assertNoRrule('Good Friday');
if (!/RDATE;VALUE=DATE:20350323/.test(goodFriday) || !/RDATE;VALUE=DATE:21000326/.test(goodFriday)) {
  throw new Error('Good Friday generated dates must reach through 2100');
}

for (const [summary, expected2035] of [
  ['First Sunday of Advent', '20351202'],
  ['Second Sunday of Advent', '20351209'],
  ['Gaudete Sunday', '20351216'],
  ['Fourth Sunday of Advent', '20351223'],
]) {
  const block = assertNoRrule(summary);
  if (!block.includes(`RDATE;VALUE=DATE:${expected2035}`)) throw new Error(`${summary} 2035 generated occurrence missing`);
}

// Known movable or one-time entries must not be accidentally annualized.
for (const summary of [
  'Lunar New Year (Chunjie)',
  'Losar (Tibetan New Year)',
  'Passover',
  'Rosh Hashanah (Jewish New Year)',
  'Yom Kippur (Day of Atonement)',
  'Buddhist Ghost Festival (Ullambana)',
  'Gita Jayanti (गीता जयंती)',
  'Hanukkah (Festival of Lights)',
  'Spring Equinox (Ostara)',
  'Autumn Equinox (Mabon)',
  'Winter Solstice (Yule)',
  'Nowruz',
  'Yalda Night',
]) {
  assertNoRecurrence(summary);
}
assertNoRecurrence('Broadmoor Brunch');

// Apple/iCloud subscriptions should receive true all-day values for date-only observances.
const timedMidnightEvents = blocks.filter((block) => {
  const start = prop(block, 'DTSTART');
  const end = prop(block, 'DTEND');
  const sm = start && start.match(/^\d{8}T(\d{6})Z$/);
  const em = end && end.match(/^\d{8}T(\d{6})Z$/);
  return sm && em && sm[1] === em[1];
});
if (timedMidnightEvents.length) {
  throw new Error(`All-day observances remain encoded as midnight times: ${timedMidnightEvents.map((block) => prop(block, 'SUMMARY')).join(', ')}`);
}

const events = blocks.map((block) => ({
  block,
  summary: prop(block, 'SUMMARY'),
  date: eventDate(block),
  recurrence: prop(block, 'RRULE') || prop(block, 'RDATE'),
}));

const uidLines = events.map((event) => prop(event.block, 'UID')).filter(Boolean);
if (uidLines.length !== events.length) {
  throw new Error(`Every VEVENT must have a stable UID (${events.length - uidLines.length} missing)`);
}
const uniqueUids = new Set(uidLines);
if (uidLines.length !== uniqueUids.size) {
  throw new Error(`Duplicate UIDs detected: ${uidLines.length - uniqueUids.size}`);
}

const oneOffGroups = new Map();
for (const event of events) {
  if (!event.summary || !event.date || event.recurrence) continue;
  if (!oneOffGroups.has(event.summary)) oneOffGroups.set(event.summary, []);
  oneOffGroups.get(event.summary).push(event);
}

const missed = [];
for (const [summary, group] of oneOffGroups) {
  if (MOVABLE_NAME.test(summary) || ONE_OFF_NAME.has(summary) || /\banniversary\b/i.test(summary)) continue;
  const signatures = group.map((event) => recurrenceSignature(event.date));
  const fixed = new Set(signatures.map((sig) => sig.fixed));
  const weekday = new Set(signatures.map((sig) => sig.weekday));
  if (fixed.size === 1 || weekday.size === 1) missed.push(summary);
}
if (missed.length) throw new Error(`Fixed or inferable recurring events were not normalized: ${missed.join(', ')}`);

const recurringCount = events.filter((event) => event.recurrence).length;
if (recurringCount < 50) throw new Error(`Expected broad recurrence migration, found only ${recurringCount} recurring VEVENTs`);

console.log(`Recurring-event validation passed (${recurringCount} recurring VEVENTs; all ${events.length} VEVENTs have unique UIDs).`);
