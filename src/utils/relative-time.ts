const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 jours »… */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < MINUTE) return "à l'instant";
  if (seconds < HOUR) return `il y a ${Math.floor(seconds / MINUTE)} min`;
  if (seconds < DAY) return `il y a ${Math.floor(seconds / HOUR)} h`;
  if (seconds < WEEK) return `il y a ${plural(Math.floor(seconds / DAY), 'jour')}`;
  if (seconds < MONTH) return `il y a ${plural(Math.floor(seconds / WEEK), 'semaine')}`;
  if (seconds < YEAR) return `il y a ${Math.floor(seconds / MONTH)} mois`;
  return `il y a ${plural(Math.floor(seconds / YEAR), 'an')}`;
}
