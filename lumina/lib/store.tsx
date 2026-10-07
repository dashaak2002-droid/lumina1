'use client';
// Единое хранилище данных приложения (React Context + localStorage).
// Любой экран получает данные и действия через useStore().

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyActionsToState, newEvent, newGoal, newMilestone, newNote, newTask, uid } from './actions';
import { guessArea } from './areas';
import { todayISO } from './dates';
import { buildDemo, welcomeMessage } from './demo';
import { classifyNote, parseQuickAdd } from './parser';
import { clearState, loadState, saveState } from './storage';
import type { AppState, AreaId, AssistantAction, ChatMessage, EventItem, Goal, Habit, Profile, Task } from './types';
import { cap } from './dates';

const EMPTY: AppState = { version: 1, profile: null, tasks: [], events: [], habits: [], goals: [], notes: [], chat: [] };

export interface Store {
  ready: boolean;
  state: AppState;
  completeOnboarding: (p: Omit<Profile, 'createdAt'>, mainGoal: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  addTask: (t: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string, date: string) => void;
  deleteTask: (id: string) => void;
  addEvent: (e: Partial<EventItem> & { title: string; date: string }) => string;
  deleteEvent: (id: string) => void;
  addHabit: (h: { title: string; areaId: AreaId; perWeek: number }) => void;
  toggleHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;
  addGoal: (g: Partial<Goal> & { title: string }) => string;
  deleteGoal: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  addMilestones: (goalId: string, steps: string[]) => void;
  addNote: (text: string) => string;
  deleteNote: (id: string) => void;
  convertNote: (id: string) => string | null;
  applyActions: (actions: AssistantAction[]) => string[];
  addChat: (m: Pick<ChatMessage, 'role' | 'text'> & Partial<ChatMessage>) => void;
  clearChat: () => void;
  clearContent: () => void;
  loadDemo: () => void;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore должен вызываться внутри <StoreProvider>');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const saved = loadState();
    if (saved) setState({ ...EMPTY, ...saved });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  const store = useMemo<Store>(() => {
    const up = (fn: (s: AppState) => AppState) => setState(fn);
    const fallbackArea = (): AreaId => ref.current.profile?.priorities[0] ?? 'home';

    return {
      ready,
      state,

      completeOnboarding(p, mainGoal) {
        const profile: Profile = { ...p, createdAt: new Date().toISOString() };
        setState({ ...EMPTY, profile, ...buildDemo(profile, mainGoal, todayISO()) });
      },
      updateProfile(p) {
        up((s) => (s.profile ? { ...s, profile: { ...s.profile, ...p } } : s));
      },

      addTask(t) {
        const task = newTask({ areaId: fallbackArea(), ...t });
        up((s) => ({ ...s, tasks: [...s.tasks, task] }));
        return task.id;
      },
      updateTask(id, patch) {
        up((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      },
      toggleTask(id, date) {
        up((s) => ({
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            if (t.repeat !== 'none') {
              const has = t.doneDates.includes(date);
              return { ...t, doneDates: has ? t.doneDates.filter((x) => x !== date) : [...t.doneDates, date] };
            }
            return { ...t, done: !t.done, doneAt: !t.done ? todayISO() : null };
          }),
        }));
      },
      deleteTask(id) {
        up((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      addEvent(e) {
        const ev = newEvent({ areaId: fallbackArea(), ...e });
        up((s) => ({ ...s, events: [...s.events, ev] }));
        return ev.id;
      },
      deleteEvent(id) {
        up((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
      },

      addHabit(h) {
        const habit: Habit = { id: uid('h'), log: [], ...h };
        up((s) => ({ ...s, habits: [...s.habits, habit] }));
      },
      toggleHabit(id, date) {
        up((s) => ({
          ...s,
          habits: s.habits.map((h) => (h.id !== id ? h : { ...h, log: h.log.includes(date) ? h.log.filter((d) => d !== date) : [...h.log, date] })),
        }));
      },
      deleteHabit(id) {
        up((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
      },

      addGoal(g) {
        const goal = newGoal({ areaId: fallbackArea(), ...g });
        up((s) => ({ ...s, goals: [...s.goals, goal] }));
        return goal.id;
      },
      deleteGoal(id) {
        up((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id), tasks: s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)) }));
      },
      toggleMilestone(goalId, mid) {
        up((s) => ({
          ...s,
          goals: s.goals.map((g) => (g.id !== goalId ? g : { ...g, milestones: g.milestones.map((m) => (m.id === mid ? { ...m, done: !m.done } : m)) })),
        }));
      },
      addMilestones(goalId, steps) {
        up((s) => ({
          ...s,
          goals: s.goals.map((g) => (g.id !== goalId ? g : { ...g, milestones: [...g.milestones, ...steps.map((t) => newMilestone(t))] })),
        }));
      },

      addNote(text) {
        const note = newNote(text.trim());
        up((s) => ({ ...s, notes: [note, ...s.notes] }));
        return note.id;
      },
      deleteNote(id) {
        up((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
      },
      convertNote(id) {
        const cur = ref.current;
        const note = cur.notes.find((n) => n.id === id);
        if (!note) return null;
        const kind = classifyNote(note.text);
        const p = parseQuickAdd(note.text);
        const area = p.areaId ?? guessArea(note.text) ?? fallbackArea();
        const rest = { ...cur, notes: cur.notes.filter((n) => n.id !== id) };
        let next: AppState | null = null;
        let summary: string | null = null;
        if (kind === 'event' && p.date) {
          summary = `Перенесено в календарь: ${p.title}`;
          next = { ...rest, events: [...rest.events, newEvent({ title: p.title, date: p.date, time: p.time, areaId: area })] };
        } else if (kind === 'task') {
          summary = `Перенесено в задачи: ${p.title}`;
          next = { ...rest, tasks: [...rest.tasks, newTask({ title: p.title, date: p.date, time: p.time, areaId: area, priority: p.priority, repeat: p.repeat })] };
        } else if (kind === 'goal') {
          summary = 'Создана цель из заметки';
          next = { ...rest, goals: [...rest.goals, newGoal({ title: cap(note.text).slice(0, 120), areaId: area })] };
        }
        if (next) {
          ref.current = next;
          setState(next);
        }
        return summary; // идея/заметка остаётся на месте (null)
      },

      applyActions(actions) {
        const r = applyActionsToState(ref.current, actions, fallbackArea());
        ref.current = r.state;
        setState(r.state);
        return r.applied;
      },
      addChat(m) {
        const msg: ChatMessage = { id: uid('c'), createdAt: new Date().toISOString(), ...m };
        up((s) => ({ ...s, chat: [...s.chat, msg].slice(-60) }));
      },
      clearChat() {
        up((s) => ({ ...s, chat: s.profile ? [welcomeMessage(s.profile.name)] : [] }));
      },

      clearContent() {
        up((s) => ({ ...EMPTY, profile: s.profile, chat: s.profile ? [welcomeMessage(s.profile.name)] : [] }));
      },
      loadDemo() {
        up((s) => (s.profile ? { ...s, ...buildDemo(s.profile, '', todayISO()) } : s));
      },
      resetAll() {
        clearState();
        setState(EMPTY);
      },
    };
  }, [state, ready]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
