'use client';
import { Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AreaIcon } from '@/components/AreaIcon';
import Ring from '@/components/Ring';
import Sheet from '@/components/Sheet';
import TaskRow from '@/components/TaskRow';
import { AREAS, AREA_BY_ID } from '@/lib/areas';
import { fmtDayMonth, todayISO } from '@/lib/dates';
import { areaOverview, goalProgress, habitStreak } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { AreaId } from '@/lib/types';

export default function AreasTab({ initialArea }: { initialArea: string | null }) {
  const { state, toggleTask, addTask } = useStore();
  const today = todayISO();
  const [open, setOpen] = useState<AreaId | null>(null);
  const [draft, setDraft] = useState('');
  const priorities = state.profile?.priorities ?? [];

  useEffect(() => {
    if (initialArea && initialArea in AREA_BY_ID) setOpen(initialArea as AreaId);
  }, [initialArea]);

  const sorted = [...AREAS].sort((a, b) => Number(priorities.includes(b.id)) - Number(priorities.includes(a.id)));
  const o = open ? areaOverview(state, open, today) : null;

  return (
    <>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Оценка сферы складывается из привычек, прогресса по целям и выполненных задач за неделю. Приоритетные сферы выделены.
      </p>
      <div className="grid-2">
        {sorted.map((a) => {
          const ov = areaOverview(state, a.id, today);
          const pri = priorities.includes(a.id);
          return (
            <button key={a.id} className={`area-card ${pri ? 'priority' : ''}`} onClick={() => setOpen(a.id)}>
              <div className="row between" style={{ width: '100%' }}>
                <span className="ico">
                  <AreaIcon id={a.id} />
                </span>
                <Ring value={ov.score} size={40} stroke={3.5}>
                  <span style={{ fontSize: 11 }}>{ov.score ?? '–'}</span>
                </Ring>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div className="muted small">{ov.label}</div>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {ov.openTasks.length} задач · {ov.goals.length} целей · {ov.habits.length} привычек
              </div>
            </button>
          );
        })}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? AREA_BY_ID[open].name : ''}>
        {open && o && (
          <>
            <div className="row" style={{ marginBottom: 14 }}>
              <Ring value={o.score} size={52} stroke={4}>
                {o.score ?? '–'}
              </Ring>
              <div>
                <b>{o.label}</b>
                <div className="muted small">{AREA_BY_ID[open].hint}</div>
              </div>
            </div>

            <h3 className="eyebrow" style={{ margin: '16px 0 8px' }}>
              Задачи
            </h3>
            {o.openTasks.slice(0, 8).map((t) => (
              <TaskRow key={t.id} task={t} date={today} showArea={false} onToggle={() => toggleTask(t.id, today)} />
            ))}
            {!o.openTasks.length && <div className="empty">Открытых задач нет</div>}
            <form
              className="row"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                addTask({ title: draft.trim(), areaId: open, date: today });
                setDraft('');
              }}
            >
              <input className="input" placeholder="Маленький шаг в этой сфере…" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button className="btn btn-primary btn-sm" type="submit">
                Добавить
              </button>
            </form>

            {o.goals.length > 0 && (
              <>
                <h3 className="eyebrow" style={{ margin: '20px 0 8px' }}>
                  Цели
                </h3>
                {o.goals.map((g) => {
                  const p = goalProgress(g, state);
                  return (
                    <div key={g.id} className="card" style={{ marginBottom: 8 }}>
                      <div className="row between">
                        <b style={{ fontWeight: 600 }}>{g.title}</b>
                        <span className="muted small">{p.pct}%</span>
                      </div>
                      <div className="bar" style={{ marginTop: 8 }}>
                        <i style={{ width: `${p.pct}%` }} />
                      </div>
                      {g.deadline && <div className="muted small" style={{ marginTop: 6 }}>до {fmtDayMonth(g.deadline)}</div>}
                    </div>
                  );
                })}
              </>
            )}

            {o.habits.length > 0 && (
              <>
                <h3 className="eyebrow" style={{ margin: '20px 0 8px' }}>
                  Привычки
                </h3>
                {o.habits.map((h) => (
                  <div key={h.id} className="item">
                    <div className="grow t">{h.title}</div>
                    <span className="streak">
                      <Flame size={14} /> {habitStreak(h, today)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
