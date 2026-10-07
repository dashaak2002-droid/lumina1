// Все типы данных приложения в одном месте.
// Эти же сущности описаны в db/schema.sql — когда подключите настоящую базу данных,
// структура останется той же.

export type AreaId =
  | 'health'
  | 'career'
  | 'money'
  | 'relationships'
  | 'family'
  | 'selfcare'
  | 'home'
  | 'growth';

export type Priority = 'high' | 'normal' | 'low';
export type Repeat = 'none' | 'daily' | 'weekly';
export type Feature = 'planner' | 'habits' | 'goals' | 'notes' | 'ai';
export type NoteKind = 'note' | 'task' | 'event' | 'goal' | 'idea';

export interface Profile {
  name: string;
  ageGroup: string;
  priorities: AreaId[]; // до 3 приоритетных сфер
  improve: string[]; // что хочется улучшить (свободные теги)
  features: Feature[]; // какие функции нужны больше всего
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  areaId: AreaId;
  priority: Priority;
  date: string | null; // YYYY-MM-DD; null = без даты (лежит в списках)
  time: string | null; // HH:MM — работает как напоминание
  done: boolean; // для обычных задач
  doneAt: string | null; // дата выполнения (для аналитики)
  doneDates: string[]; // для повторяющихся: даты, когда выполнено
  repeat: Repeat;
  list: string; // название списка («Входящие», «Покупки»…)
  goalId: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  areaId: AreaId;
  date: string;
  time: string | null; // null = весь день
}

export interface Habit {
  id: string;
  title: string;
  areaId: AreaId;
  perWeek: number; // целевая частота 1..7
  log: string[]; // даты выполнения
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  areaId: AreaId;
  deadline: string | null;
  milestones: Milestone[];
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  kind: NoteKind;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  applied?: string[]; // что ассистент изменил в приложении
  source?: 'llm' | 'local';
  createdAt: string;
}

export interface AppState {
  version: 1;
  profile: Profile | null;
  tasks: Task[];
  events: EventItem[];
  habits: Habit[];
  goals: Goal[];
  notes: Note[];
  chat: ChatMessage[];
}

// Действия, которые AI может выполнить в приложении.
export type AssistantAction =
  | { type: 'add_task'; title: string; date?: string | null; time?: string | null; areaId?: AreaId; priority?: Priority }
  | { type: 'add_event'; title: string; date: string; time?: string | null; areaId?: AreaId }
  | { type: 'add_note'; text: string }
  | { type: 'schedule_task'; taskId: string; date: string }
  | { type: 'add_goal_steps'; goalId: string; steps: string[] };

export interface AssistantResult {
  reply: string;
  actions: AssistantAction[];
}
