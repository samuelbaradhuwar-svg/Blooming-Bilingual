// Helpers for showing instants in a given IANA time zone.
export const pad = (n) => String(n).padStart(2, '0');

export const dateKeyIn = (tz, d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export const timeIn = (tz, d) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);

export const longDateIn = (tz, d) =>
  d.toLocaleDateString(undefined, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });

export const shortDateIn = (tz, d) =>
  d.toLocaleDateString(undefined, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' });

// A wall-clock date and time in an IANA time zone -> the exact moment (a Date).
// e.g. zonedToUtc('Africa/Johannesburg', '2026-10-16', '14:30'). Handles daylight-saving changes.
export function zonedToUtc(tz, dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (ms) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms));
    const o = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - ms;
  };
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);
  return new Date(t);
}
