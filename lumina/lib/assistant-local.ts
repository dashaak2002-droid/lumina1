// Демо-режим AI: понимает основные команды без интернета и без ключей.
// Когда подключён настоящий AI (см. .env.example), чат использует его,
// а этот файл остаётся запасным вариантом.
import { AREA_BY_ID } from './areas';
import { addDays, fmtDayMonth, fmtLong, plural, relativeDay, weekdayMon } from './dates';
import { parseQuickAdd } from './parser';
import { isTaskDone, overdueTasks, tasksOn, weekStats } from './selectors';
import type { AppState, AreaId, AssistantAction, AssistantResult, Task } from './types';

const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function localAssistant(message: string, state: AppState, today: string): AssistantResult {
  const m = message.toLowerCase().trim();

  if (/(распланир|планирован|план\b).*недел|недел.*(распланир|план\b)/.test(m)) return planWeek(state, today);
  if (/приоритет|слишком много|в первую очередь|с чего начать|что (?:мне )?(?:сегодня )?(?:лучше )?сделать/.test(m)) {
    return prioritize(state, today, /слишком много/.test(m));
  }
  if (/проанализ|анализ недел|итоги|как прошла.*недел|разбор недел/.test(m)) return analyzeWeek(state, today);

  const verb = /^(?:пожалуйста,?\s*)?(?:добавь|добавить|запиши|записать|создай|создать|напомни(?:\s+мне)?|поставь|запланируй|внеси)\s+/i;
  const hasVerb = verb.test(message.trim());
  const rest = message.trim().replace(verb, '').replace(/^(?:мне\s+)?(?:в\s+(?:планер|календарь|список)\s+)?/i, '');
  if (/^(?:заметк[уа]|идею)\b/i.test(rest) || /^(?:заметк[уа]|идею)/i.test(rest)) {
    const text = rest.replace(/^(?:заметк[уа]|идею)\s*[:\-—]?\s*/i, '').trim() || rest;
    return { reply: 'Сохранила в заметки — потом помогу разобрать, куда это перенести.', actions: [{ type: 'add_note', text }] };
  }
  const p = parseQuickAdd(rest);
  if (hasVerb || p.date || p.time) {
    const area: AreaId = p.areaId ?? state.profile?.priorities[0] ?? 'home';
    if (p.kind === 'event') {
      const when = `${relativeDay(p.date ?? today, today)}${p.time ? ` в ${p.time}` : ''}`;
      return {
        reply: `Готово: «${p.title}» — ${when}. Добавила в календарь (сфера «${AREA_BY_ID[area].name}»).`,
        actions: [{ type: 'add_event', title: p.title, date: p.date ?? today, time: p.time, areaId: area }],
      };
    }
    if (p.kind === 'note') {
      return { reply: 'Сохранила в заметки.', actions: [{ type: 'add_note', text: p.title }] };
    }
    const when = p.date ? relativeDay(p.date, today) : 'без даты';
    return {
      reply: `Добавила задачу «${p.title}» — ${when}${p.time ? `, ${p.time}` : ''}.`,
      actions: [{ type: 'add_task', title: p.title, date: p.date ?? today, time: p.time, areaId: area, priority: p.priority }],
    };
  }

  if (/привет|здравствуй|добр(ое|ый|ого)/.test(m)) {
    return { reply: `Привет${state.profile ? ', ' + state.profile.name : ''}! Чем помочь: спланировать неделю, расставить приоритеты или добавить дело?`, actions: [] };
  }

  return {
    reply:
      'Я пока работаю в демо-режиме и понимаю такие просьбы:\n' +
      '• «Помоги распланировать мою неделю»\n' +
      '• «Расставь приоритеты» или «Что сделать в первую очередь?»\n' +
      '• «Проанализируй мою неделю»\n' +
      '• «Добавь встречу с врачом в пятницу» или «Маникюр завтра в 16:00»\n\n' +
      'С подключённым AI (см. README) я смогу отвечать на любые вопросы и давать более глубокие советы.',
    actions: [],
  };
}

// ---------- сценарии ----------

function score(t: Task, today: string): number {
  let s = { high: 3, normal: 2, low: 1 }[t.priority];
  if (t.date && t.date < today) s += 2;
  if (t.time) s += 1;
  if (t.goalId) s += 1;
  return s;
}

function reason(t: Task, today: string): string {
  const r: string[] = [];
  if (t.date && t.date < today) r.push('просрочена');
  if (t.priority === 'high') r.push('важная');
  if (t.time) r.push(`в ${t.time}`);
  if (t.goalId) r.push('двигает цель');
  return r.length ? ` — ${r.join(', ')}` : '';
}

function prioritize(state: AppState, today: string, tooMany: boolean): AssistantResult {
  const open = [...overdueTasks(state, today), ...tasksOn(state, today).filter((t) => !isTaskDone(t, today))];
  const unique = open.filter((t, i) => open.findIndex((x) => x.id === t.id) === i);
  if (!unique.length) {
    return { reply: 'На сегодня открытых задач нет — можно выдохнуть. Хочешь, распланирую неделю?', actions: [] };
  }
  const ranked = [...unique].sort((a, b) => score(b, today) - score(a, today));
  const top = ranked.slice(0, 3);
  const lines = top.map((t, i) => `${i + 1}. ${t.title}${reason(t, today)}`);
  const actions: AssistantAction[] = [];
  let tail = '';
  if (tooMany || unique.length > 5) {
    const movable = ranked.slice(3).filter((t) => t.repeat === 'none' && !t.time && t.priority !== 'high').slice(0, 5);
    for (const t of movable) actions.push({ type: 'schedule_task', taskId: t.id, date: addDays(today, 1) });
    if (movable.length) tail = `\n\nОстальное (${movable.length}) перенесла на завтра — так день станет реалистичнее.`;
  }
  return {
    reply: `Главное на сегодня:\n${lines.join('\n')}${tail}\n\nНачни с первого пункта и дай себе 25 минут без отвлечений.`,
    actions,
  };
}

function planWeek(state: AppState, today: string): AssistantResult {
  const candidates = state.tasks
    .filter((t) => t.repeat === 'none' && !t.done && (!t.date || t.date < today) && t.list !== 'Покупки')
    .sort((a, b) => score(b, today) - score(a, today));
  if (!candidates.length) {
    return { reply: 'Все задачи уже разложены по дням. Загляни в Planner → Неделя, чтобы посмотреть, как всё выглядит.', actions: [] };
  }
  const load = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    load.set(d, state.tasks.filter((t) => t.repeat === 'none' && !t.done && t.date === d).length);
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const workdays = days.filter((d) => weekdayMon(d) < 5);
  const pool = workdays.length >= 3 ? workdays : days;
  const actions: AssistantAction[] = [];
  const placed = new Map<string, string[]>();
  for (const t of candidates) {
    let best = pool[0];
    for (const d of pool) if ((load.get(d) ?? 0) < (load.get(best) ?? 0)) best = d;
    load.set(best, (load.get(best) ?? 0) + 1);
    actions.push({ type: 'schedule_task', taskId: t.id, date: best });
    placed.set(best, [...(placed.get(best) ?? []), t.title]);
  }
  const lines = [...placed.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, titles]) => `${DAY_SHORT[weekdayMon(d)]}, ${fmtDayMonth(d)}: ${titles.join('; ')}`);
  return {
    reply: `Разложила ${candidates.length} ${plural(candidates.length, 'задачу', 'задачи', 'задач')} по дням, стараясь не перегружать ни один день:\n${lines.join('\n')}\n\nВыходные оставила свободными. Всё видно в Planner → Неделя.`,
    actions,
  };
}

function analyzeWeek(state: AppState, today: string): AssistantResult {
  const w = weekStats(state, today);
  const lines: string[] = [];
  lines.push(`• Выполнено задач за 7 дней: ${w.tasksDone}`);
  if (w.habitPct !== null) lines.push(`• Привычки: ${w.habitDone} из ${w.habitPlanned} запланированных (${w.habitPct}%)`);
  if (w.bestHabit && w.bestHabit.streak > 0) lines.push(`• Лучшая серия: «${w.bestHabit.title}» — ${w.bestHabit.streak} ${plural(w.bestHabit.streak, 'день', 'дня', 'дней')} подряд`);
  if (w.overdue) lines.push(`• Просрочено: ${w.overdue} — стоит перенести или закрыть`);
  const quiet = w.quietAreas.slice(0, 3);
  let advice = 'Неделя выглядит ровной. Продолжай в том же ритме.';
  if (quiet.length) {
    lines.push(`• Без внимания остались сферы: ${quiet.join(', ')}`);
    advice = `На следующей неделе добавь по одному маленькому шагу в «${quiet[0]}» — этого хватит, чтобы сфера снова ожила.`;
  } else if (w.overdue) {
    advice = 'Сначала разберись с просроченным — это сразу снимет напряжение.';
  }
  return { reply: `Итоги недели (${fmtLong(addDays(today, -6))} — сегодня):\n${lines.join('\n')}\n\n${advice}`, actions: [] };
}

/** Шаги для цели, когда настоящий AI не подключён. */
export function localBreakdown(title: string): string[] {
  return [
    `Описать, как выглядит результат: «${title}»`,
    'Разбить цель на этапы и выбрать первый шаг на этой неделе',
    'Выделить регулярное время в календаре (2–3 раза в неделю)',
    'Назначить промежуточную проверку через две недели',
    'Подвести итог и скорректировать план',
  ];
}
