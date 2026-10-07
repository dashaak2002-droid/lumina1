// Хранилище данных. Сейчас — localStorage браузера (самый простой вариант для MVP:
// ничего не нужно настраивать, данные живут на устройстве пользователя).
//
// КАК РАЗВИТЬ: замените эти три функции на запросы к вашему серверу/Supabase
// (структура таблиц уже готова в db/schema.sql) — остальной код менять не придётся.
import type { AppState } from './types';

const KEY = 'lumina.v1';

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.version === 1 ? (parsed as AppState) : null;
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* память заполнена или приватный режим — молча пропускаем */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
