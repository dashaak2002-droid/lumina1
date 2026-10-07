// Демо-данные: чтобы после онбординга приложение не было пустым.
// Все даты считаются от сегодняшнего дня.
import { newGoal, newMilestone, newNote, newTask, newEvent, uid } from './actions';
import { addDays, startOfWeek } from './dates';
import type { AppState, AreaId, ChatMessage, Habit, Profile } from './types';

const HABIT_TEMPLATES: Record<AreaId, { title: string; perWeek: number }> = {
  health: { title: 'Прогулка 30 минут', perWeek: 5 },
  selfcare: { title: '10 минут тишины', perWeek: 7 },
  growth: { title: 'Читать 20 минут', perWeek: 5 },
  career: { title: 'Разобрать входящие', perWeek: 5 },
  money: { title: 'Записать расходы', perWeek: 7 },
  home: { title: 'Быстрая уборка 15 минут', perWeek: 4 },
  family: { title: 'Вечер без телефона с семьёй', perWeek: 4 },
  relationships: { title: 'Написать близкому человеку', perWeek: 3 },
};
const EXTRA_HABITS: { areaId: AreaId; title: string; perWeek: number }[] = [
  { areaId: 'health', title: 'Стакан воды утром', perWeek: 7 },
  { areaId: 'selfcare', title: 'Лечь спать до 23:00', perWeek: 5 },
  { areaId: 'growth', title: 'Записать одну мысль дня', perWeek: 4 },
];
// Какие дни назад «выполнены» — чтобы показать разные серии
const LOG_PATTERNS = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 5, 6, 9, 10],
  [2, 3, 5, 6, 8, 9],
  [1, 3, 4, 6, 7, 10, 11],
];

export function welcomeMessage(name: string): ChatMessage {
  return {
    id: uid('c'),
    role: 'assistant',
    createdAt: new Date().toISOString(),
    text: `Привет, ${name}! Я помогу разобраться с планами: расставлю приоритеты, разложу задачи по дням, добавлю события и разберу заметки. Просто напиши обычными словами — например «Маникюр завтра в 16:00».`,
  };
}

export function buildDemo(profile: Profile, mainGoal: string, today: string): Omit<AppState, 'version' | 'profile'> {
  const d = (n: number) => addDays(today, n);
  const monday = startOfWeek(today);
  const first = profile.priorities[0] ?? 'growth';

  // ---- цели ----
  const goals = [];
  const moneyGoal = newGoal({
    title: 'Финансовая подушка на 3 месяца',
    description: 'Накопить сумму, которая даёт спокойствие, даже если что-то пойдёт не так.',
    areaId: 'money',
    deadline: d(150),
    milestones: [newMilestone('Посчитать ежемесячные расходы', true), newMilestone('Открыть отдельный накопительный счёт', true), newMilestone('Настроить автоперевод после зарплаты'), newMilestone('Накопить первый месяц расходов')],
  });
  const calmGoal = newGoal({
    title: 'Спокойные утра без спешки',
    description: 'Вставать на 30 минут раньше и начинать день с себя, а не с телефона.',
    areaId: 'selfcare',
    deadline: d(45),
    milestones: [newMilestone('Выбрать время подъёма', true), newMilestone('Подготовить вечером одежду и завтрак'), newMilestone('Неделя без телефона в первые 30 минут')],
  });
  if (mainGoal.trim()) {
    goals.push(
      newGoal({
        title: mainGoal.trim().slice(0, 120),
        description: 'Моя главная цель на ближайшие месяцы.',
        areaId: first,
        deadline: d(90),
        milestones: [newMilestone('Описать, как выглядит результат'), newMilestone('Выбрать первый маленький шаг на этой неделе'), newMilestone('Выделить регулярное время в календаре')],
      }),
    );
  }
  goals.push(moneyGoal, calmGoal);

  // ---- задачи ----
  const tasks = [
    newTask({ title: 'Подготовить отчёт для руководителя', areaId: 'career', priority: 'high', date: today }),
    newTask({ title: 'Записаться к стоматологу', areaId: 'health', date: today }),
    newTask({ title: 'Оплатить коммунальные платежи', areaId: 'money', date: d(-1) }),
    newTask({ title: 'Позвонить маме', areaId: 'family', date: today, time: '19:00' }),
    newTask({ title: 'Заказать продукты на неделю', areaId: 'home', priority: 'low', date: d(1) }),
    newTask({ title: 'Забронировать столик на выходные', areaId: 'relationships', date: d(2) }),
    newTask({ title: 'Составить бюджет на следующий месяц', areaId: 'money', priority: 'high', date: d(3), goalId: moneyGoal.id }),
    newTask({ title: 'Планёрка команды', areaId: 'career', date: monday, time: '10:00', repeat: 'weekly' }),
    newTask({ title: 'Купить подарок подруге', areaId: 'relationships' }),
    newTask({ title: 'Овощи и зелень', areaId: 'home', list: 'Покупки' }),
    newTask({ title: 'Кофе в зёрнах', areaId: 'home', list: 'Покупки' }),
    newTask({ title: 'Средство для посуды', areaId: 'home', list: 'Покупки' }),
    newTask({ title: 'Выбрать курс по финансовой грамотности', areaId: 'growth', date: d(4) }),
  ];
  // пара выполненных, чтобы аналитика недели не была пустой
  tasks.push(
    newTask({ title: 'Записаться на массаж', areaId: 'selfcare', date: d(-2), done: true, doneAt: d(-2) }),
    newTask({ title: 'Отправить документы в банк', areaId: 'money', date: d(-3), done: true, doneAt: d(-3) }),
    newTask({ title: 'Созвониться с клиентом', areaId: 'career', date: d(-1), done: true, doneAt: d(-1) }),
  );

  // ---- события ----
  const events = [
    newEvent({ title: 'Созвон с командой', areaId: 'career', date: today, time: '15:00' }),
    newEvent({ title: 'Маникюр', areaId: 'selfcare', date: d(1), time: '16:00' }),
    newEvent({ title: 'Приём у терапевта', areaId: 'health', date: d(2), time: '11:30' }),
    newEvent({ title: 'Ужин с подругами', areaId: 'relationships', date: d(3), time: '19:30' }),
    newEvent({ title: 'Родительское собрание', areaId: 'family', date: d(6), time: '18:00' }),
  ];

  // ---- привычки: сначала из приоритетных сфер ----
  const picked: { areaId: AreaId; title: string; perWeek: number }[] = profile.priorities.map((a) => ({ areaId: a, ...HABIT_TEMPLATES[a] }));
  for (const e of EXTRA_HABITS) {
    if (picked.length >= 4) break;
    if (!picked.some((p) => p.title === e.title)) picked.push(e);
  }
  const habits: Habit[] = picked.slice(0, 5).map((p, i) => ({
    id: uid('h'),
    title: p.title,
    areaId: p.areaId,
    perWeek: p.perWeek,
    log: LOG_PATTERNS[i % LOG_PATTERNS.length].map((n) => d(-n)),
  }));

  // ---- заметки ----
  const notes = [
    'Купить билеты на концерт в ноябре',
    'Хочу выучить испанский до лета',
    'Идея: воскресный ритуал планирования с чаем',
    'Позвонить в сервис по поводу стиральной машины',
  ].map((t) => newNote(t));

  return { tasks, events, habits, goals, notes, chat: [welcomeMessage(profile.name)] };
}
