// Собираем компактную «выжимку» жизни пользователя, которую отправляем AI.
// Мы НЕ отправляем всё подряд — только нужное для советов.
import { AREA_BY_ID } from './areas';
import { addDays, weekdayMon } from './dates';
import { goalProgress, habitDone, habitStreak, habitWeek } from './selectors';
import type { AppState } from './types';

const DAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

export function buildContext(s: AppState, today: string) {
  const until = addDays(today, 14);
  return {
    today,
    weekday: DAYS[weekdayMon(today)],
    user: { name: s.profile?.name ?? '', ageGroup: s.profile?.ageGroup ?? '', priorities: s.profile?.priorities ?? [] },
    openTasks: s.tasks
      .filter((t) => (t.repeat === 'none' ? !t.done : true))
      .slice(0, 50)
      .map((t) => ({ id: t.id, title: t.title, date: t.date, time: t.time, priority: t.priority, area: t.areaId, repeat: t.repeat, goalId: t.goalId })),
    events: s.events
      .filter((e) => e.date >= today && e.date <= until)
      .slice(0, 30)
      .map((e) => ({ title: e.title, date: e.date, time: e.time, area: e.areaId })),
    habits: s.habits.map((h) => ({ id: h.id, title: h.title, area: h.areaId, streak: habitStreak(h, today), doneToday: habitDone(h, today), doneThisWeek: habitWeek(h, today).count, perWeek: h.perWeek })),
    goals: s.goals.map((g) => ({ id: g.id, title: g.title, area: g.areaId, deadline: g.deadline, progressPct: goalProgress(g, s).pct, steps: g.milestones.map((m) => m.title).slice(0, 10) })),
    areas: Object.keys(AREA_BY_ID),
  };
}
