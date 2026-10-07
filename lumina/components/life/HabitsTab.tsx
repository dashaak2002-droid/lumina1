'use client';
import { Check, Flame, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { AREAS, AREA_BY_ID } from '@/lib/areas';
import { todayISO } from '@/lib/dates';
import { habitDone, habitRate30, habitStreak, habitWeek } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { AreaId } from '@/lib/types';

const DOW = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

export default function HabitsTab() {
  const { state, toggleHabit, addHabit, deleteHabit } = useStore();
  const today = todayISO();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<AreaId>(state.profile?.priorities[0] ?? 'health');
  const [perWeek, setPerWeek] = useState(5);

  const done = state.habits.filter((h) => habitDone(h, today)).length;
  const planned = state.habits.reduce((a, h) => a + h.perWeek, 0);
  const got = state.habits.reduce((a, h) => a + Math.min(h.perWeek, habitWeek(h, today).count), 0);
  const best = state.habits.reduce((a, h) => Math.max(a, habitStreak(h, today)), 0);

  return (
    <>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <b>
            {done}/{state.habits.length}
          </b>
          <span className="muted small">сегодня</span>
        </div>
        <div className="card stat">
          <b>{planned ? Math.round((got / planned) * 100) : 0}%</b>
          <span className="muted small">за эту неделю</span>
        </div>
      </div>
      {best > 0 && (
        <p className="muted small" style={{ marginBottom: 14 }}>
          <Flame size={13} style={{ verticalAlign: '-2px', color: 'var(--accent)' }} /> Лучшая серия сейчас — {best} дн. подряд
        </p>
      )}

      {state.habits.map((h) => {
        const isDone = habitDone(h, today);
        const week = habitWeek(h, today);
        return (
          <div key={h.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row">
              <button className={`check ${isDone ? 'on' : ''}`} onClick={() => toggleHabit(h.id, today)} aria-label="Отметить на сегодня">
                <Check size={14} strokeWidth={3} />
              </button>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{h.title}</div>
                <div className="muted small">
                  {AREA_BY_ID[h.areaId].name} · цель {h.perWeek} раз в неделю
                </div>
              </div>
              <button
                className="icon-btn"
                aria-label="Удалить привычку"
                onClick={() => {
                  if (confirm(`Удалить привычку «${h.title}»?`)) deleteHabit(h.id);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="row between" style={{ marginTop: 12 }}>
              <div className="week-dots">
                {week.days.map((d, i) => (
                  <span key={d.iso} className={`${d.done ? 'on' : ''} ${d.isToday ? 'today' : ''}`} style={d.isFuture ? { opacity: 0.45 } : undefined}>
                    {DOW[i]}
                  </span>
                ))}
              </div>
              <div className="row" style={{ gap: 12 }}>
                <span className="muted small">{habitRate30(h, today)}% за 30 дн.</span>
                <span className="streak">
                  <Flame size={14} /> {habitStreak(h, today)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {!state.habits.length && <div className="empty">Привычек пока нет. Начни с одной маленькой.</div>}

      <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>
        <Plus size={18} /> Новая привычка
      </button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Новая привычка">
        <label className="label">Название</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Прогулка 30 минут" autoFocus />
        <label className="label">Сфера жизни</label>
        <div className="chips">
          {AREAS.map((a) => (
            <button key={a.id} className={`chip chip-sm ${area === a.id ? 'on' : ''}`} onClick={() => setArea(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
        <label className="label">Сколько раз в неделю</label>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} className={`chip chip-sm ${perWeek === n ? 'on' : ''}`} onClick={() => setPerWeek(n)}>
              {n}
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 22 }}
          disabled={!title.trim()}
          onClick={() => {
            addHabit({ title: title.trim(), areaId: area, perWeek });
            setTitle('');
            setCreating(false);
          }}
        >
          Создать привычку
        </button>
      </Sheet>
    </>
  );
}
