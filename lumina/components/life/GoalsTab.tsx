'use client';
import { Check, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AreaIcon } from '@/components/AreaIcon';
import Sheet from '@/components/Sheet';
import TaskRow from '@/components/TaskRow';
import { breakDownGoal } from '@/lib/ai-client';
import { AREAS, AREA_BY_ID } from '@/lib/areas';
import { fmtDayMonth, todayISO } from '@/lib/dates';
import { goalProgress } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { AreaId } from '@/lib/types';

export default function GoalsTab() {
  const { state, addGoal, deleteGoal, toggleMilestone, addMilestones, addTask, toggleTask } = useStore();
  const today = todayISO();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [stepDraft, setStepDraft] = useState('');
  const [taskDraft, setTaskDraft] = useState('');

  // форма новой цели
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [area, setArea] = useState<AreaId>(state.profile?.priorities[0] ?? 'growth');
  const [deadline, setDeadline] = useState('');

  const goal = state.goals.find((g) => g.id === openId) ?? null;

  function create() {
    if (!title.trim()) return;
    const id = addGoal({ title: title.trim(), description: desc.trim(), areaId: area, deadline: deadline || null });
    setTitle('');
    setDesc('');
    setDeadline('');
    setCreating(false);
    setOpenId(id);
  }

  async function breakDown() {
    if (!goal) return;
    setBusy(true);
    setNote('');
    const r = await breakDownGoal(goal, state, today);
    const existing = new Set(goal.milestones.map((m) => m.title.toLowerCase()));
    const steps = r.steps.filter((s) => !existing.has(s.toLowerCase()));
    addMilestones(goal.id, steps);
    setNote(r.source === 'llm' ? `AI добавил шагов: ${steps.length}` : `Добавлено шагов: ${steps.length} (шаблон демо-режима — подключи AI для персональных шагов)`);
    setBusy(false);
  }

  const linked = goal ? state.tasks.filter((t) => t.goalId === goal.id) : [];

  return (
    <>
      {state.goals.map((g) => {
        const p = goalProgress(g, state);
        return (
          <button key={g.id} className="card" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 10 }} onClick={() => setOpenId(g.id)}>
            <div className="row between">
              <span className="tag">
                <AreaIcon id={g.areaId} size={14} /> {AREA_BY_ID[g.areaId].name}
              </span>
              <span className="muted small">{g.deadline ? `до ${fmtDayMonth(g.deadline)}` : 'без срока'}</span>
            </div>
            <div className="h2" style={{ margin: '8px 0 12px' }}>
              {g.title}
            </div>
            <div className="bar">
              <i style={{ width: `${p.pct}%` }} />
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>
              {p.done} из {p.total} шагов · {p.pct}%
            </div>
          </button>
        );
      })}
      {!state.goals.length && <div className="empty">Целей пока нет. Создай первую — AI поможет разбить её на шаги.</div>}

      <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>
        <Plus size={18} /> Новая цель
      </button>

      {/* создание */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Новая цель">
        <label className="label">Название</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: выучить испанский до уровня A2" autoFocus />
        <label className="label">Описание</label>
        <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Зачем тебе это и как поймёшь, что получилось?" />
        <label className="label">Сфера жизни</label>
        <div className="chips">
          {AREAS.map((a) => (
            <button key={a.id} className={`chip chip-sm ${area === a.id ? 'on' : ''}`} onClick={() => setArea(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
        <label className="label">Срок</label>
        <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={today} />
        <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} disabled={!title.trim()} onClick={create}>
          Создать цель
        </button>
      </Sheet>

      {/* детали */}
      <Sheet open={!!goal} onClose={() => setOpenId(null)} title={goal?.title ?? ''}>
        {goal && (
          <>
            {goal.description && <p className="lead" style={{ marginBottom: 6 }}>{goal.description}</p>}
            <div className="muted small">
              {AREA_BY_ID[goal.areaId].name}
              {goal.deadline ? ` · до ${fmtDayMonth(goal.deadline)}` : ''}
            </div>
            <div className="bar" style={{ margin: '14px 0 4px' }}>
              <i style={{ width: `${goalProgress(goal, state).pct}%` }} />
            </div>

            <h3 className="eyebrow" style={{ margin: '20px 0 8px' }}>
              Этапы
            </h3>
            {goal.milestones.map((m) => (
              <div key={m.id} className={`item ${m.done ? 'done' : ''}`}>
                <button className={`check ${m.done ? 'on' : ''}`} onClick={() => toggleMilestone(goal.id, m.id)} aria-label="Отметить этап">
                  <Check size={14} strokeWidth={3} />
                </button>
                <div className="grow t">{m.title}</div>
              </div>
            ))}
            {!goal.milestones.length && <div className="empty">Этапов нет — попроси AI разбить цель на шаги</div>}

            <form
              className="row"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!stepDraft.trim()) return;
                addMilestones(goal.id, [stepDraft.trim()]);
                setStepDraft('');
              }}
            >
              <input className="input" placeholder="Добавить этап…" value={stepDraft} onChange={(e) => setStepDraft(e.target.value)} />
              <button className="btn btn-sm" type="submit">
                <Plus size={16} />
              </button>
            </form>

            <button className="btn btn-accent btn-block" style={{ marginTop: 14 }} onClick={breakDown} disabled={busy}>
              <Sparkles size={18} /> {busy ? 'Думаю…' : 'Разбить на шаги с AI'}
            </button>
            {note && <p className="muted small" style={{ marginTop: 8 }}>{note}</p>}

            <h3 className="eyebrow" style={{ margin: '24px 0 8px' }}>
              Связанные задачи
            </h3>
            {linked.map((t) => (
              <TaskRow key={t.id} task={t} date={today} showArea={false} onToggle={() => toggleTask(t.id, today)} />
            ))}
            <form
              className="row"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskDraft.trim()) return;
                addTask({ title: taskDraft.trim(), areaId: goal.areaId, goalId: goal.id, date: today });
                setTaskDraft('');
              }}
            >
              <input className="input" placeholder="Новая задача для этой цели…" value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)} />
              <button className="btn btn-sm" type="submit">
                <Plus size={16} />
              </button>
            </form>

            <button
              className="btn btn-ghost btn-danger btn-block"
              style={{ marginTop: 26 }}
              onClick={() => {
                deleteGoal(goal.id);
                setOpenId(null);
              }}
            >
              <Trash2 size={16} /> Удалить цель
            </button>
          </>
        )}
      </Sheet>
    </>
  );
}
