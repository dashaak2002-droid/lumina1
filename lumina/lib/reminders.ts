'use client';
// Напоминания (упрощённая версия для MVP): пока приложение открыто,
// за 10 минут до события или задачи со временем показываем уведомление.
// КАК РАЗВИТЬ: Web Push + service worker — тогда напоминания придут и при закрытом приложении.
import { useEffect, useRef } from 'react';
import { toISO } from './dates';
import { isTaskDone, isTaskOnDate } from './selectors';
import { useStore } from './store';

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function useReminders() {
  const { state, ready } = useStore();
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    if (!ready || !notificationsSupported()) return;
    const tick = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const iso = toISO(now);
      const minutes = now.getHours() * 60 + now.getMinutes();
      const s = ref.current;
      const items = [
        ...s.events.filter((e) => e.date === iso && e.time).map((e) => ({ id: e.id, title: e.title, time: e.time as string })),
        ...s.tasks.filter((t) => t.time && isTaskOnDate(t, iso) && !isTaskDone(t, iso)).map((t) => ({ id: t.id, title: t.title, time: t.time as string })),
      ];
      for (const it of items) {
        const [h, m] = it.time.split(':').map(Number);
        const diff = h * 60 + m - minutes;
        const key = `lumina.notified:${iso}:${it.id}`;
        try {
          if (diff >= 0 && diff <= 10 && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            new Notification(`Скоро: ${it.title}`, { body: `Сегодня в ${it.time}` });
          }
        } catch {
          /* некоторые мобильные браузеры не разрешают new Notification — пропускаем */
        }
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [ready]);
}
