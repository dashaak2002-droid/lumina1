// Работа с датами. Везде используем строки YYYY-MM-DD в локальном часовом поясе —
// так не бывает «съехавших» дней из-за UTC.

export const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);

/** Номер дня недели, где понедельник = 0 */
export const weekdayMon = (iso: string) => (fromISO(iso).getDay() + 6) % 7;
export const startOfWeek = (iso: string) => addDays(iso, -weekdayMon(iso));
export const weekDays = (iso: string) => {
  const s = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export interface MonthCell {
  iso: string;
  inMonth: boolean;
}
export function monthGrid(year: number, month0: number): MonthCell[] {
  const first = new Date(year, month0, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month0, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: toISO(d), inMonth: d.getMonth() === month0 };
  });
}

const fmt = (o: Intl.DateTimeFormatOptions) => (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', o).format(fromISO(iso));

export const fmtLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
export const fmtDayMonth = fmt({ day: 'numeric', month: 'long' });
export const fmtShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
export const fmtWeekdayShort = fmt({ weekday: 'short' });
export const fmtMonthYear = (iso: string) =>
  fmt({ month: 'long', year: 'numeric' })(iso).replace(/\s*г\.$/, '');

export function relativeDay(iso: string, today: string) {
  const d = diffDays(iso, today);
  if (d === 0) return 'сегодня';
  if (d === 1) return 'завтра';
  if (d === -1) return 'вчера';
  if (d === 2) return 'послезавтра';
  return fmtShort(iso);
}

export function greeting(hour = new Date().getHours()) {
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
