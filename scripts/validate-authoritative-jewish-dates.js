const fs = require('fs');
const path = require('path');

const icsPath = path.join(__dirname, '..', 'dist', 'MSS.ics');
const content = fs.readFileSync(icsPath, 'utf8');

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

const blocks = [...content.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)].map((match) => match[0]);
function requireBlock(summary) {
  const block = blocks.find((candidate) => prop(candidate, 'SUMMARY') === summary);
  if (!block) throw new Error(`${summary} event missing`);
  return block;
}

function validateAuthoritativeDates(summary, expected, durationDays) {
  const block = requireBlock(summary);
  if (prop(block, 'DTSTART') !== expected[0]) {
    throw new Error(`${summary}: DTSTART must be ${expected[0]}, found ${prop(block, 'DTSTART')}`);
  }
  const expectedEnd = addDays(expected[0], durationDays);
  if (prop(block, 'DTEND') !== expectedEnd) {
    throw new Error(`${summary}: DTEND must preserve ${durationDays}-day duration (${expectedEnd}), found ${prop(block, 'DTEND')}`);
  }
  if (prop(block, 'RRULE')) throw new Error(`${summary}: must use authoritative RDATEs, not RRULE`);
  if (!/^DTSTART;VALUE=DATE:/mi.test(block) || !/^DTEND;VALUE=DATE:/mi.test(block)) {
    throw new Error(`${summary}: Apple/iCloud-facing event must use VALUE=DATE`);
  }
  const rdates = [...block.matchAll(/^RDATE;VALUE=DATE:(\d{8})$/gmi)].map((match) => match[1]);
  const actual = [expected[0], ...rdates];
  if (actual.join(',') !== expected.join(',')) {
    throw new Error(`${summary}: authoritative dates differ\nexpected ${expected.join(',')}\nactual   ${actual.join(',')}`);
  }
  if (!block.includes('X-MSS-DATE-SOURCE:https://www.hebcal.com/holidays/')) {
    throw new Error(`${summary}: Hebcal date-source metadata missing`);
  }
  return block;
}

validateAuthoritativeDates('Passover', [
  '20260402', '20270422', '20280411', '20290331', '20300418',
  '20310408', '20320327', '20330414', '20340404', '20350424',
], 8);

validateAuthoritativeDates('Rosh Hashanah (Jewish New Year)', [
  '20250923', '20260912', '20271002', '20280921', '20290910',
  '20300928', '20310918', '20320906', '20330924', '20340914',
  '20351004',
], 2);

validateAuthoritativeDates('Yom Kippur (Day of Atonement)', [
  '20251002', '20260921', '20271011', '20280930', '20290919',
  '20301007', '20310927', '20320915', '20331003', '20340923',
  '20351013',
], 1);

validateAuthoritativeDates('Hanukkah (Festival of Lights)', [
  '20251215', '20261205', '20271225', '20281213', '20291202',
  '20301221', '20311210', '20321128', '20331217', '20341207',
  '20351226',
], 8);

const uidLines = blocks.map((block) => prop(block, 'UID')).filter(Boolean);
if (uidLines.length !== blocks.length) {
  throw new Error(`Every VEVENT must have a UID after Jewish-date application (${blocks.length - uidLines.length} missing)`);
}
if (new Set(uidLines).size !== uidLines.length) throw new Error('Duplicate UIDs found after Jewish-date application');

console.log('Authoritative Hebcal Jewish-date validation passed through 2035.');
