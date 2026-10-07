'use client';
import { Bell, Download, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AREAS } from '@/lib/areas';
import { notificationsSupported } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import type { AreaId, Feature } from '@/lib/types';

const FEATURES: { id: Feature; label: string }[] = [
  { id: 'planner', label: 'Планирование' },
  { id: 'habits', label: 'Привычки' },
  { id: 'goals', label: 'Цели' },
  { id: 'notes', label: 'Заметки' },
  { id: 'ai', label: 'AI-подсказки' },
];

export default function ProfilePage() {
  const { state, updateProfile, clearContent, loadDemo, resetAll } = useStore();
  const profile = state.profile!;
  const [name, setName] = useState(profile.name);
  const [ai, setAi] = useState<{ provider: string; model: string } | null>(null);
  const [perm, setPerm] = useState<string>('unsupported');

  useEffect(() => {
    fetch('/api/ai')
      .then((r) => r.json())
      .then(setAi)
      .catch(() => setAi(null));
    if (notificationsSupported()) setPerm(Notification.permission);
  }, []);

  const toggleArea = (id: AreaId) => {
    const has = profile.priorities.includes(id);
    if (!has && profile.priorities.length >= 3) return;
    if (has && profile.priorities.length === 1) return;
    updateProfile({ priorities: has ? profile.priorities.filter((x) => x !== id) : [...profile.priorities, id] });
  };
  const toggleFeature = (id: Feature) =>
    updateProfile({ features: profile.features.includes(id) ? profile.features.filter((x) => x !== id) : [...profile.features, id] });

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lumina-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function askPermission() {
    if (!notificationsSupported()) return;
    setPerm(await Notification.requestPermission());
  }

  return (
    <main className="page">
      <div className="row" style={{ gap: 16 }}>
        <div className="avatar">{profile.name.charAt(0).toUpperCase()}</div>
        <div>
          <h1 className="title">{profile.name}</h1>
          <p className="muted small">Возраст: {profile.ageGroup}</p>
        </div>
      </div>

      <section className="section">
        <label className="label" htmlFor="pname" style={{ marginTop: 0 }}>
          Имя
        </label>
        <div className="row">
          <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          <button className="btn btn-sm" disabled={!name.trim() || name.trim() === profile.name} onClick={() => updateProfile({ name: name.trim() })}>
            Сохранить
          </button>
        </div>

        <label className="label">Приоритетные сферы (до трёх)</label>
        <div className="chips">
          {AREAS.map((a) => (
            <button key={a.id} className={`chip chip-sm ${profile.priorities.includes(a.id) ? 'on' : ''}`} onClick={() => toggleArea(a.id)}>
              {a.name}
            </button>
          ))}
        </div>

        <label className="label">Что показывать на главном экране</label>
        <div className="chips">
          {FEATURES.map((f) => (
            <button key={f.id} className={`chip chip-sm ${profile.features.includes(f.id) ? 'on' : ''}`} onClick={() => toggleFeature(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="h2" style={{ marginBottom: 10 }}>
          AI и уведомления
        </h2>
        <div className="card">
          <div className="row between">
            <span>AI-помощник</span>
            {ai ? (
              <span className={`badge ${ai.provider !== 'local' ? 'live' : ''}`}>{ai.provider === 'local' ? 'Демо-режим' : `${ai.provider} · ${ai.model}`}</span>
            ) : (
              <span className="badge">…</span>
            )}
          </div>
          {ai?.provider === 'local' && (
            <p className="muted small" style={{ marginTop: 8 }}>
              Чтобы подключить настоящий AI, впиши ключ в файл .env.local (инструкция — в README).
            </p>
          )}
          <div className="divider" />
          <div className="row between">
            <span className="row" style={{ gap: 8 }}>
              <Bell size={16} /> Напоминания
            </span>
            {perm === 'granted' ? (
              <span className="badge live">Включены</span>
            ) : perm === 'unsupported' ? (
              <span className="badge">Не поддерживаются</span>
            ) : perm === 'denied' ? (
              <span className="badge">Запрещены в браузере</span>
            ) : (
              <button className="btn btn-sm" onClick={askPermission}>
                Включить
              </button>
            )}
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            Уведомление приходит за 10 минут до дела со временем, пока приложение открыто.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Данные
        </h2>
        <p className="muted small" style={{ marginBottom: 10 }}>
          Сейчас данные хранятся только в этом браузере, на этом устройстве.
        </p>
        <div className="stack">
          <button className="btn btn-block" onClick={exportData}>
            <Download size={16} /> Скачать резервную копию
          </button>
          <button
            className="btn btn-block"
            onClick={() => {
              if (confirm('Заменить текущие данные демо-примерами?')) loadDemo();
            }}
          >
            <RotateCcw size={16} /> Загрузить демо-данные
          </button>
          <button
            className="btn btn-block"
            onClick={() => {
              if (confirm('Удалить все задачи, цели, привычки и заметки? Профиль останется.')) clearContent();
            }}
          >
            Очистить демо-данные
          </button>
          <button
            className="btn btn-ghost btn-danger btn-block"
            onClick={() => {
              if (confirm('Стереть всё, включая профиль, и пройти онбординг заново?')) resetAll();
            }}
          >
            <Trash2 size={16} /> Сбросить приложение
          </button>
        </div>
      </section>

      <p className="muted small" style={{ textAlign: 'center', marginTop: 34 }}>
        Lumina · MVP 0.1
      </p>
    </main>
  );
}
