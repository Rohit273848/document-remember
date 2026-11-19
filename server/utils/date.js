import { DateTime } from 'luxon';

export function parseDateOnly(input) {
  if (input == null || input === '') return undefined;
  if (input instanceof Date && !Number.isNaN(input.getTime())) return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 12));
  const match = String(input).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(input);
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return new Date(NaN);
  return date;
}
export const dateKey = (date) => new Date(date).toISOString().slice(0, 10);
export const localDayStart = (zone) => DateTime.now().setZone(zone).startOf('day');
export const localDateKey = (zone) => localDayStart(zone).toISODate();
export const addCivilDays = (isoDate, days) => DateTime.fromISO(isoDate, { zone: 'UTC' }).plus({ days }).toISODate();
export const dateBoundary = (isoDate) => parseDateOnly(isoDate);
export function reminderTime(expiryDate, daysBefore, zone) {
  const iso = dateKey(expiryDate);
  return DateTime.fromISO(iso, { zone }).startOf('day').minus({ days: daysBefore }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }).toUTC().toJSDate();
}
export function isExpired(expiryDate, zone) {
  const expiry = DateTime.fromISO(dateKey(expiryDate), { zone }).startOf('day');
  return expiry < localDayStart(zone);
}
