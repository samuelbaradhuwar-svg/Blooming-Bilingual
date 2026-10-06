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
