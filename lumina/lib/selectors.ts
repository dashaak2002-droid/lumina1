// Чистые функции, которые считают всё, что показываем на экранах.
import { AREAS } from './areas';
import { addDays, diffDays, plural, weekdayMon } from './dates';
import type { AppState, AreaId, EventItem, Goal, Habit, Task } from './types';

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;

export function isTaskOnDate(t: Task, date: string): boolean {
  if (t.repeat === 'daily') return !t.date || date >= t.date;
  if (t.repeat === 'weekly') return !!t.date && date >= t.date && weekdayMon(date) === weekdayMon(t.date);
  return t.date === date;
}

export function isTaskDone(t: Task, date: string): boolean {
  return t.repeat !== 'none' ? t.doneDates.includes(date) : t.done;
}

export function sortTasks(list: Task[], date: string): Task[] {
  return [...list].sort((a, b) => {
    const da = isTaskDone(a, date) ? 1 : 0;
    const db = isTaskDone(b, date) ? 1 : 0;
    if (da !== db) return da - db;
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });
}

export const tasksOn = (s: AppState, date: string) => sortTasks(s.tasks.filter((t) => isTaskOnDate(t, date)), date);

export const overdueTasks = (s: AppState, today: string) =>
  s.tasks.filter((t) => t.repeat === 'none' && !t.done && t.date && t.date < today);

export const eventsOn = (s: AppState, date: string): EventItem[] =>
  s.events.filter((e) => e.date === date).sort((a, b) => (a.time ?? '00:00').localeCompare(b.time ?? '00:00'));

// ---------- привычки ----------
export const habitDone = (h: Habit, date: string) => h.log.includes(date);

export function habitStreak(h: Habit, today: string): number {
  let cursor = habitDone(h, today) ? today : addDays(today, -1);
  let n = 0;
  while (h.log.includes(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function habitWeek(h: Habit, today: string) {
  const monday = addDays(today, -weekdayMon(today));
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(monday, i);
    return { iso, done: h.log.includes(iso), isToday: iso === today, isFuture: iso > today };
  });
  return { days, count: days.filter((d) => d.done).length };
}

export function habitRate30(h: Habit, today: string): number {
  let n = 0;
  for (let i = 0; i < 30; i++) if (h.log.includes(addDays(today, -i))) n++;
  return Math.round((n / 30) * 100);
}

// ---------- цели ----------
export function goalProgress(g: Goal, s: AppState): { pct: number; done: number; total: number } {
  const linked = s.tasks.filter((t) => t.goalId === g.id);
  const total = g.milestones.length + linked.length;
  const done = g.milestones.filter((m) => m.done).length + linked.filter((t) => t.done).length;
  return { pct: total ? Math.round((done / total) * 100) : 0, done, total };
}

// ---------- сферы жизни ----------
export interface AreaOverview {
  areaId: AreaId;
  openTasks: Task[];
  goals: Goal[];
  habits: Habit[];
  score: number | null; // 0..100, null = данных пока нет
  label: string;
}

export function areaOverview(s: AppState, areaId: AreaId, today: string): AreaOverview {
  const openTasks = s.tasks.filter((t) => t.areaId === areaId && t.repeat === 'none' && !t.done);
  const goals = s.goals.filter((g) => g.areaId === areaId);
  const habits = s.habits.filter((h) => h.areaId === areaId);

  const parts: number[] = [];
  if (habits.length) {
    const planned = habits.reduce((a, h) => a + h.perWeek, 0);
    const got = habits.reduce((a, h) => a + Math.min(h.perWeek, habitWeek(h, today).count), 0);
    parts.push(got / Math.max(planned, 1));
  }
  if (goals.length) parts.push(goals.reduce((a, g) => a + goalProgress(g, s).pct, 0) / goals.length / 100);

  const weekAgo = addDays(today, -6);
  const doneRecently = s.tasks.filter(
    (t) => t.areaId === areaId && t.repeat === 'none' && t.done && t.doneAt && t.doneAt >= weekAgo,
  ).length;
  const due = openTasks.filter((t) => t.date && t.date <= addDays(today, 7)).length;
  if (doneRecently + due > 0) parts.push(doneRecently / (doneRecently + due));

  if (!parts.length) return { areaId, openTasks, goals, habits, score: null, label: 'Пока пусто' };
  const score = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  const label = score >= 70 ? 'В ритме' : score >= 40 ? 'Стабильно' : 'Просит внимания';
  return { areaId, openTasks, goals, habits, score, label };
}

// ---------- недельная статистика (для AI-анализа) ----------
export function weekStats(s: AppState, today: string) {
  const from = addDays(today, -6);
  const inWin = (d: string | null) => !!d && d >= from && d <= today;
  let tasksDone = 0;
  const activeAreas = new Set<AreaId>();
  for (const t of s.tasks) {
    if (t.repeat === 'none') {
      if (t.done && inWin(t.doneAt)) {
        tasksDone++;
        activeAreas.add(t.areaId);
      }
    } else {
      const n = t.doneDates.filter(inWin).length;
      tasksDone += n;
      if (n) activeAreas.add(t.areaId);
    }
  }
  let habitDone_ = 0;
  let habitPlanned = 0;
  let best: { title: string; streak: number } | null = null;
  for (const h of s.habits) {
    const n = h.log.filter(inWin).length;
    habitDone_ += Math.min(n, h.perWeek);
    habitPlanned += h.perWeek;
    if (n) activeAreas.add(h.areaId);
    const st = habitStreak(h, today);
    if (!best || st > best.streak) best = { title: h.title, streak: st };
  }
  const overdue = overdueTasks(s, today).length;
  const quietAreas = AREAS.filter((a) => !activeAreas.has(a.id)).map((a) => a.name);
  return {
    tasksDone,
    habitDone: habitDone_,
    habitPlanned,
    habitPct: habitPlanned ? Math.round((habitDone_ / habitPlanned) * 100) : null,
    bestHabit: best,
    overdue,
    quietAreas,
  };
}

// ---------- подсказки AI на Home (по правилам, без внешнего AI) ----------
export interface Insight {
  id: string;
  text: string;
  prompt: string; // что отправить в чат, если нажать «Спросить AI»
}

export function homeInsights(s: AppState, today: string): Insight[] {
  const out: Insight[] = [];
  const overdue = overdueTasks(s, today);
  const todayOpen = tasksOn(s, today).filter((t) => !isTaskDone(t, today));

  if (overdue.length) {
    out.push({
      id: 'overdue',
      text: `${overdue.length} ${plural(overdue.length, 'просроченная задача', 'просроченные задачи', 'просроченных задач')}. Давай решим, что перенести, а что сделать сегодня.`,
      prompt: 'Расставь приоритеты по моим задачам',
    });
  } else if (todayOpen.length > 5) {
    out.push({
      id: 'many',
      text: `На сегодня ${todayOpen.length} задач — это много. Могу выбрать три главные и перенести остальное.`,
      prompt: 'У меня слишком много задач, расставь приоритеты',
    });
  } else if (todayOpen.length) {
    const first = todayOpen[0];
    out.push({
      id: 'first',
      text: `Начни с «${first.title}» — так день пойдёт легче.`,
      prompt: 'Что мне сегодня лучше сделать в первую очередь?',
    });
  } else {
    out.push({ id: 'free', text: 'На сегодня всё сделано. Хороший момент выдохнуть или спланировать завтра.', prompt: 'Помоги распланировать мою неделю' });
  }

  const risky = s.habits
    .map((h) => ({ h, st: habitStreak(h, today) }))
    .filter(({ h, st }) => st >= 3 && !habitDone(h, today))
    .sort((a, b) => b.st - a.st)[0];
  if (risky) {
    out.push({
      id: 'streak',
      text: `Серия «${risky.h.title}» — ${risky.st} ${plural(risky.st, 'день', 'дня', 'дней')} подряд. Отметь сегодня, чтобы не прерывать.`,
      prompt: 'Проанализируй мою неделю',
    });
  }

  const ws = weekStats(s, today);
  const quiet = ws.quietAreas.slice(0, 2);
  if (quiet.length && s.profile) {
    out.push({
      id: 'quiet',
      text: `Сферы «${quiet.join('» и «')}» давно без внимания. Добавим один маленький шаг?`,
      prompt: 'Проанализируй мою неделю',
    });
  }
  return out.slice(0, 3);
}

export function upcomingDays(from: string, n: number) {
  return Array.from({ length: n }, (_, i) => addDays(from, i));
}

export { diffDays };
