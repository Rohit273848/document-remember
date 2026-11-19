import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { parseDateOnly, dateKey, reminderTime, isExpired, localDateKey, addCivilDays } from '../utils/date.js';

test('parses and preserves calendar dates independent of the host time zone', () => {
  const parsed = parseDateOnly('2028-02-29');
  assert.equal(dateKey(parsed), '2028-02-29');
  assert.ok(Number.isNaN(parseDateOnly('2027-02-29').getTime()));
  assert.ok(Number.isNaN(parseDateOnly('not-a-date').getTime()));
});

test('schedules a reminder at 9 AM in the family time zone', () => {
  const scheduled = reminderTime(parseDateOnly('2026-12-15'), 30, 'Asia/Kolkata');
  assert.equal(DateTime.fromJSDate(scheduled).toUTC().toISO(), '2026-11-15T03:30:00.000Z');
});

test('uses the correct offset across daylight saving changes', () => {
  const scheduled = reminderTime(parseDateOnly('2027-03-14'), 0, 'America/New_York');
  assert.equal(DateTime.fromJSDate(scheduled).toUTC().toISO(), '2027-03-14T13:00:00.000Z');
});

test('classifies expired documents by local calendar day', () => {
  const today = localDateKey('Asia/Kolkata');
  assert.equal(isExpired(parseDateOnly(today), 'Asia/Kolkata'), false);
  assert.equal(isExpired(parseDateOnly(addCivilDays(today, -1)), 'Asia/Kolkata'), true);
});
