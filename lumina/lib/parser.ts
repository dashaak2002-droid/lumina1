// Quick Add: превращает обычную фразу в задачу, событие или заметку.
// «Маникюр завтра в 16:00» → событие, завтра, 16:00, сфера «Забота о себе».
//
// Это правило-ориентированный парсер (работает без интернета и бесплатно).
// Когда подключён AI, ассистент делает то же самое умнее — но этот парсер остаётся
// как быстрый и надёжный запасной вариант.

import { addDays, cap, fromISO, pad, toISO, weekdayMon } from './dates';
import { guessArea } from './areas';
import type { AreaId, NoteKind, Priority, Repeat } from './types';

export type ParsedKind = 'task' | 'event' | 'note';

export interface Parsed {
  kind: ParsedKind;
  title: string;
  date: string | null;
  time: string | null;
  areaId: AreaId | null;
  priority: Priority;
  repeat: Repeat;
}

const WD = 'понедельник|вторник|сред[ауы]|четверг|пятниц[ауы]|суббот[ауы]|воскресень[еяю]';
const WD_INDEX: [RegExp, number][] = [
  [/^понедельник/, 1],
  [/^вторник/, 2],
  [/^сред/, 3],
  [/^четверг/, 4],
  [/^пятниц/, 5],
  [/^суббот/, 6],
  [/^воскресен/, 0],
];
const MONTH_STEMS = ['январ', 'феврал', 'март', 'апрел', 'ма[яй]', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];

// Границы слов для кириллицы (\b в JS с ней не работает)
const NA = '(?<![а-яёa-z0-9])';
const NB = '(?![а-яёa-z0-9])';

const EVENT_KW =
  /встреч|врач|приём|прием|маникюр|педикюр|массаж|стрижк|созвон|свидани|концерт|кино(?![а-яё])|театр|тренировк|собеседован|консультац|день рождени|экзамен|урок|занятие|вебинар|спектакл|поездк|перелёт|перелет|рейс|собрани/i;
const TASK_VERB =
  /^(?:купить|позвонить|записаться|оплатить|сделать|отправить|написать|заказать|забрать|приготовить|убрать|убраться|найти|подготовить|разобрать|сходить|проверить|узнать|договориться|забронировать|записать|напомнить|съездить|выбрать|обновить|прочитать|закончить|отменить|перенести|купи|позвони|оплати|напиши|отправь|сдать|подать|принять|выпить|погулять)/i;

interface Work {
  s: string;
}

/** Находит первое совпадение, при успехе вырезает его из строки. */
function take(w: Work, re: RegExp, validate?: (m: RegExpMatchArray) => boolean): RegExpMatchArray | null {
  const m = w.s.match(re);
  if (!m || m.index === undefined) return null;
  if (validate && !validate(m)) return null;
  w.s = w.s.slice(0, m.index) + ' ' + w.s.slice(m.index + m[0].length);
  return m;
}

function nextWeekday(today: string, jsDay: number, inclusive: boolean) {
  const cur = fromISO(today).getDay();
  let delta = (jsDay - cur + 7) % 7;
  if (delta === 0 && !inclusive) delta = 7;
  return addDays(today, delta);
}

function wdIndex(word: string): number {
  const w = word.toLowerCase();
  for (const [re, idx] of WD_INDEX) if (re.test(w)) return idx;
  return 1;
}

const hhmm = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

export function parseQuickAdd(input: string, now: Date = new Date()): Parsed {
  const today = toISO(now);
  const raw = input.trim();

  // Явная заметка: «идея: …», «заметка: …»
  const np = raw.match(/^(?:заметка|идея|мысль)\s*[:\-—]\s*([\s\S]+)$/i);
  if (np) {
    return { kind: 'note', title: cap(np[1].trim()), date: null, time: null, areaId: guessArea(np[1]), priority: 'normal', repeat: 'none' };
  }

  const w: Work = { s: ' ' + raw + ' ' };
  let date: string | null = null;
  let time: string | null = null;
  let repeat: Repeat = 'none';
  let priority: Priority = 'normal';

  // --- приоритет ---
  if (take(w, new RegExp(NA + '(?:не\\s+срочно|когда[-\\s]нибудь|потом)' + NB, 'i'))) priority = 'low';
  else if (take(w, new RegExp('(?:' + NA + '(?:срочно|важно)' + NB + '|!{2,})', 'i'))) priority = 'high';

  // --- повторы ---
  if (take(w, new RegExp(NA + '(?:каждый\\s+день|ежедневно|каждое\\s+утро|каждый\\s+вечер)' + NB, 'i'))) {
    repeat = 'daily';
  }
  const eachWd = take(w, new RegExp(NA + 'кажд(?:ый|ую|ое)\\s+(' + WD + ')' + NB, 'i'));
  if (eachWd) {
    repeat = 'weekly';
    date = nextWeekday(today, wdIndex(eachWd[1]), true);
  } else if (take(w, new RegExp(NA + '(?:еженедельно|кажд(?:ую|ый)\\s+недел[юи])' + NB, 'i'))) {
    repeat = 'weekly';
  }

  // --- время ---
  const validHM = (h: number, m: number) => h >= 0 && h <= 23 && m >= 0 && m <= 59;
  let m = take(w, new RegExp(NA + '(?:(?:в|к|на)\\s*)?(\\d{1,2}):(\\d{2})' + NB, 'i'), (x) => validHM(+x[1], +x[2]));
  if (m) time = hhmm(+m[1], +m[2]);
  if (!time) {
    m = take(w, new RegExp(NA + '(?:в|к)\\s+(\\d{1,2})\\.(\\d{2})' + NB, 'i'), (x) => validHM(+x[1], +x[2]));
    if (m) time = hhmm(+m[1], +m[2]);
  }
  if (!time) {
    m = take(w, new RegExp(NA + '(?:в|к)\\s+(\\d{1,2})\\s*(утра|дня|вечера|ночи)' + NB, 'i'), (x) => +x[1] >= 1 && +x[1] <= 12);
    if (m) {
      let h = +m[1];
      const part = m[2].toLowerCase();
      if (part === 'вечера' && h < 12) h += 12;
      if (part === 'дня' && h < 6) h += 12;
      if (part === 'ночи' && h === 12) h = 0;
      time = hhmm(h, 0);
    }
  }
  if (!time) {
    m = take(w, new RegExp(NA + '(?:в|к)\\s+(\\d{1,2})\\s*час(?:а|ов)?' + NB, 'i'), (x) => +x[1] <= 23);
    if (m) time = hhmm(+m[1], 0);
  }
  if (!time) {
    // «встреча в 15» — только если число в самом конце фразы
    m = take(w, /(?:^|\s)(?:в|к)\s+(\d{1,2})\s*$/i, (x) => +x[1] >= 6 && +x[1] <= 23);
    if (m) time = hhmm(+m[1], 0);
  }

  // --- дата ---
  if (take(w, new RegExp(NA + 'послезавтра' + NB, 'i'))) date = addDays(today, 2);
  else if (take(w, new RegExp(NA + 'завтра' + NB, 'i'))) date = addDays(today, 1);
  else if (take(w, new RegExp(NA + 'сегодня' + NB, 'i'))) date = today;
  else if (take(w, new RegExp(NA + 'на\\s+следующей\\s+неделе' + NB, 'i'))) {
    date = addDays(today, 7 - weekdayMon(today));
  } else if (take(w, new RegExp(NA + '(?:на\\s+)?выходных' + NB, 'i'))) {
    date = nextWeekday(today, 6, true);
  } else {
    const inN = take(w, new RegExp(NA + 'через\\s+(\\d+)\\s*(дн(?:я|ей|ь)|недел(?:ю|и|ь)|месяц(?:а|ев)?)' + NB, 'i'));
    if (inN) {
      const n = +inN[1];
      const unit = inN[2].toLowerCase();
      if (unit.startsWith('дн')) date = addDays(today, n);
      else if (unit.startsWith('нед')) date = addDays(today, n * 7);
      else {
        const d = fromISO(today);
        d.setMonth(d.getMonth() + n);
        date = toISO(d);
      }
    } else if (take(w, new RegExp(NA + 'через\\s+неделю' + NB, 'i'))) {
      date = addDays(today, 7);
    } else {
      const wd = take(w, new RegExp('(?:' + NA + '(?:в|во|на|к)\\s+)?' + NA + '(' + WD + ')' + NB, 'i'));
      if (wd) {
        date = nextWeekday(today, wdIndex(wd[1]), false);
      } else {
        const dm = take(
          w,
          new RegExp(NA + '(\\d{1,2})\\s+(' + MONTH_STEMS.join('|') + ')[а-яё]*' + NB, 'i'),
          (x) => +x[1] >= 1 && +x[1] <= 31,
        );
        if (dm) {
          const monthIdx = MONTH_STEMS.findIndex((st) => new RegExp('^' + st).test(dm[2].toLowerCase()));
          date = resolveDM(+dm[1], monthIdx, now);
        } else {
          const num = take(
            w,
            /(?<![\d.])(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?(?![\d.])/,
            (x) => +x[1] >= 1 && +x[1] <= 31 && +x[2] >= 1 && +x[2] <= 12,
          );
          if (num) date = resolveDM(+num[1], +num[2] - 1, now, num[3] ? +num[3] : undefined);
        }
      }
    }
  }

  // --- название ---
  let title = w.s.replace(/\s+/g, ' ').trim();
  title = title.replace(/^(?:не забыть|нужно|надо|необходимо)\s+/i, '');
  let prev: string;
  do {
    prev = title;
    title = title
      .replace(/\s+(?:в|во|на|к|до|и|от|с|по)$/i, '')
      .replace(/^[\s,.;:—-]+|[\s,.;:—-]+$/g, '');
  } while (title !== prev);
  if (!title) title = cap(raw.replace(/\s+/g, ' ')) || 'Без названия';
  title = cap(title.replace(/^встречу(?![а-яё])/i, 'встреча'));

  // --- тип ---
  let kind: ParsedKind;
  const words = raw.split(/\s+/).length;
  if (repeat !== 'none') kind = 'task';
  else if (TASK_VERB.test(title)) kind = 'task';
  else if (time) kind = 'event';
  else if (EVENT_KW.test(title) && date) kind = 'event';
  else if (!date && words > 12) kind = 'note';
  else kind = 'task';

  if (kind === 'event' && !date) date = today;

  return { kind, title, date, time, areaId: guessArea(title), priority, repeat };
}

function resolveDM(day: number, month0: number, now: Date, year?: number): string | null {
  let y = year ? (year < 100 ? 2000 + year : year) : now.getFullYear();
  let d = new Date(y, month0, day);
  if (d.getMonth() !== month0) return null; // например 31 июня
  if (!year) {
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (d < todayMid) {
      y += 1;
      d = new Date(y, month0, day);
    }
  }
  return toISO(d);
}

/** Для Brain Dump: определяем, чем похожа заметка. */
export function classifyNote(text: string, now: Date = new Date()): NoteKind {
  const t = text.trim();
  if (/^(?:идея|а что если|можно было бы|придумала|придумал)|идея[:\s]/i.test(t)) return 'idea';
  if (/(?:^|\s)(?:хочу|мечта|мечтаю|цель)(?:\s|$)|к\s+(?:лету|осени|зиме|весне|20\d\d)|за\s+(?:год|полгода|\d+\s+мес)/i.test(t)) return 'goal';
  const p = parseQuickAdd(t, now);
  if (p.kind === 'event' && p.date) return 'event';
  if (p.date || TASK_VERB.test(p.title) || /^(?:не забыть|нужно|надо)\s/i.test(t)) return 'task';
  return 'note';
}

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  note: 'Заметка',
  task: 'Похоже на задачу',
  event: 'Похоже на событие',
  goal: 'Похоже на цель',
  idea: 'Идея',
};
