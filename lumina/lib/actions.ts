// Фабрики сущностей + применение действий AI к состоянию приложения.
import { AREA_IDS } from './areas';
import { fromISO } from './dates';
import type { AppState, AreaId, AssistantAction, EventItem, Goal, Milestone, Note, Priority, Task } from './types';
import { classifyNote } from './parser';

/** Простой уникальный id. (crypto.randomUUID недоступен по http на телефоне — поэтому свой.) */
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function newTask(p: Partial<Task> & { title: string }): Task {
  return {
    id: uid('t'),
    areaId: 'home',
    priority: 'normal',
    date: null,
    time: null,
    done: false,
    doneAt: null,
    doneDates: [],
    repeat: 'none',
    list: 'Входящие',
    goalId: null,
    ...p,
  };
}

export function newEvent(p: Partial<EventItem> & { title: string; date: string }): EventItem {
  return { id: uid('e'), areaId: 'home', time: null, ...p };
}

export function newNote(text: string, now = new Date()): Note {
  return { id: uid('n'), text, createdAt: now.toISOString(), kind: classifyNote(text, now) };
}

export function newMilestone(title: string, done = false): Milestone {
  return { id: uid('m'), title, done };
}

export function newGoal(p: Partial<Goal> & { title: string }): Goal {
  return { id: uid('g'), description: '', areaId: 'growth', deadline: null, milestones: [], ...p };
}

const isISO = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(fromISO(s).getTime());
const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isArea = (s: unknown): s is AreaId => typeof s === 'string' && (AREA_IDS as string[]).includes(s);
const isPriority = (s: unknown): s is Priority => s === 'high' || s === 'normal' || s === 'low';
const str = (s: unknown, max = 200) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

/** Проверяем то, что прислал AI, — внешней модели доверять вслепую нельзя. */
export function sanitizeActions(raw: unknown): AssistantAction[] {
  if (!Array.isArray(raw)) return [];
  const out: AssistantAction[] = [];
  for (const a of raw.slice(0, 20)) {
    if (!a || typeof a !== 'object') continue;
    const x = a as Record<string, unknown>;
    switch (x.type) {
      case 'add_task': {
        const title = str(x.title);
        if (!title) break;
        out.push({
          type: 'add_task',
          title,
          date: isISO(x.date) ? x.date : null,
          time: isTime(x.time) ? x.time : null,
          areaId: isArea(x.areaId) ? x.areaId : undefined,
          priority: isPriority(x.priority) ? x.priority : undefined,
        });
        break;
      }
      case 'add_event': {
        const title = str(x.title);
        if (!title || !isISO(x.date)) break;
        out.push({ type: 'add_event', title, date: x.date, time: isTime(x.time) ? x.time : null, areaId: isArea(x.areaId) ? x.areaId : undefined });
        break;
      }
      case 'add_note': {
        const text = str(x.text, 1000);
        if (text) out.push({ type: 'add_note', text });
        break;
      }
      case 'schedule_task':
        if (typeof x.taskId === 'string' && isISO(x.date)) out.push({ type: 'schedule_task', taskId: x.taskId, date: x.date });
        break;
      case 'add_goal_steps': {
        const steps = Array.isArray(x.steps) ? x.steps.map((s) => str(s)).filter(Boolean).slice(0, 10) : [];
        if (typeof x.goalId === 'string' && steps.length) out.push({ type: 'add_goal_steps', goalId: x.goalId, steps });
        break;
      }
    }
  }
  return out;
}

/** Применяет действия и возвращает новое состояние + список «что сделано» для чата. */
export function applyActionsToState(
  state: AppState,
  actions: AssistantAction[],
  fallbackArea: AreaId = 'home',
): { state: AppState; applied: string[] } {
  let s = state;
  const applied: string[] = [];
  let scheduled = 0;
  for (const a of actions) {
    if (a.type === 'add_task') {
      s = { ...s, tasks: [...s.tasks, newTask({ title: a.title, date: a.date ?? null, time: a.time ?? null, areaId: a.areaId ?? fallbackArea, priority: a.priority ?? 'normal' })] };
      applied.push(`Задача: ${a.title}`);
    } else if (a.type === 'add_event') {
      s = { ...s, events: [...s.events, newEvent({ title: a.title, date: a.date, time: a.time ?? null, areaId: a.areaId ?? fallbackArea })] };
      applied.push(`Событие: ${a.title}`);
    } else if (a.type === 'add_note') {
      s = { ...s, notes: [newNote(a.text), ...s.notes] };
      applied.push('Заметка сохранена');
    } else if (a.type === 'schedule_task') {
      if (s.tasks.some((t) => t.id === a.taskId)) {
        s = { ...s, tasks: s.tasks.map((t) => (t.id === a.taskId ? { ...t, date: a.date } : t)) };
        scheduled++;
      }
    } else if (a.type === 'add_goal_steps') {
      if (s.goals.some((g) => g.id === a.goalId)) {
        s = {
          ...s,
          goals: s.goals.map((g) => (g.id === a.goalId ? { ...g, milestones: [...g.milestones, ...a.steps.map((t) => newMilestone(t))] } : g)),
        };
        applied.push(`Шагов добавлено в цель: ${a.steps.length}`);
      }
    }
  }
  if (scheduled) applied.push(`Задач перенесено в календарь: ${scheduled}`);
  return { state: s, applied };
}
