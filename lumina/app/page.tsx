'use client';
// Home / Today — главный экран дня.
import { Check, ChevronRight, Flame, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { AreaIcon } from '@/components/AreaIcon';
import EventRow from '@/components/EventRow';
import QuickAdd from '@/components/QuickAdd';
import Ring from '@/components/Ring';
import TaskRow from '@/components/TaskRow';
import { AREAS } from '@/lib/areas';
import { fmtLong, greeting, plural, todayISO } from '@/lib/dates';
import { areaOverview, eventsOn, goalProgress, habitDone, habitStreak, homeInsights, isTaskDone, overdueTasks, tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';

// задержка появления блоков (микроанимация)
const d = (i: number, marginTop?: number) => ({ '--i': i, ...(marginTop !== undefined ? { marginTop } : {}) }) as CSSProperties;

export default function HomePage() {
  const { state, toggleTask, toggleHabit } = useStore();
  const profile = state.profile!;
  const today = todayISO();

  const events = eventsOn(state, today);
  const overdue = overdueTasks(state, today);
  const tasks = tasksOn(state, today);
  const openCount = tasks.filter((t) => !isTaskDone(t, today)).length + overdue.length;
  const insights = homeInsights(state, today);
  const features = profile.features;
  const showHabits = features.includes('habits') && state.habits.length > 0;
  const showGoals = features.includes('goals') && state.goals.length > 0;
  const habitsDone = state.habits.filter((h) => habitDone(h, today)).length;

  // приоритетные сферы — первыми
  const areas = [...AREAS].sort((a, b) => Number(profile.priorities.includes(b.id)) - Number(profile.priorities.includes(a.id)));

  const summary = [
    openCount ? `${openCount} ${plural(openCount, 'задача', 'задачи', 'задач')}` : 'задач нет',
    events.length ? `${events.length} ${plural(events.length, 'событие', 'события', 'событий')}` : null,
    showHabits ? `${state.habits.length - habitsDone} ${plural(state.habits.length - habitsDone, 'привычка', 'привычки', 'привычек')} впереди` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="page">
      <header className="fade-up">
        <p className="eyebrow">{fmtLong(today)}</p>
        <h1 className="display" style={{ marginTop: 8 }}>
          {greeting()},<br />
          {profile.name}.
        </h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Сегодня: {summary}
        </p>
      </header>

      <div className="section fade-up" style={d(1, 22)}>
        <QuickAdd />
      </div>

      {insights.length > 0 && features.includes('ai') && (
        <section className="section fade-up" style={d(2)}>
          <div className="ai-card">
            <p className="eyebrow">
              <Sparkles size={13} /> Подсказки на сегодня
            </p>
            <div style={{ marginTop: 8 }}>
              {insights.map((i) => (
                <div className="tip" key={i.id}>
                  {i.text}
                  <br />
                  <Link className="ask" href={`/ai?q=${encodeURIComponent(i.prompt)}`}>
                    Спросить AI <ChevronRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="section fade-up" style={d(3)}>
          <div className="section-head">
            <h2 className="h2">События</h2>
            <Link className="link-btn" href="/planner">
              Календарь <ChevronRight size={14} />
            </Link>
          </div>
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </section>
      )}

      <section className="section fade-up" style={d(4)}>
        <div className="section-head">
          <h2 className="h2">Задачи</h2>
          <Link className="link-btn" href="/planner">
            Все <ChevronRight size={14} />
          </Link>
        </div>
        {overdue.map((t) => (
          <TaskRow key={t.id} task={t} date={today} overdue onToggle={() => toggleTask(t.id, today)} />
        ))}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} date={today} onToggle={() => toggleTask(t.id, today)} />
        ))}
        {!overdue.length && !tasks.length && (
          <div className="empty">
            Свободный день. Запиши что-нибудь выше — или просто отдохни.
          </div>
        )}
      </section>

      {showHabits && (
        <section className="section fade-up" style={d(5)}>
          <div className="section-head">
            <h2 className="h2">Привычки</h2>
            <span className="muted small">
              {habitsDone} из {state.habits.length}
            </span>
          </div>
          {state.habits.map((h) => {
            const done = habitDone(h, today);
            const streak = habitStreak(h, today);
            return (
              <div key={h.id} className={`item ${done ? 'done' : ''}`}>
                <button className={`check ${done ? 'on' : ''}`} onClick={() => toggleHabit(h.id, today)} aria-label="Отметить привычку">
                  <Check size={14} strokeWidth={3} />
                </button>
                <div className="grow">
                  <div className="t">{h.title}</div>
                </div>
                {streak > 0 && (
                  <span className="streak">
                    <Flame size={14} /> {streak}
                  </span>
                )}
              </div>
            );
          })}
        </section>
      )}

      {showGoals && (
        <section className="section fade-up" style={d(6)}>
          <div className="section-head">
            <h2 className="h2">Цели</h2>
            <Link className="link-btn" href="/life?tab=goals">
              Все <ChevronRight size={14} />
            </Link>
          </div>
          {state.goals.slice(0, 2).map((g) => {
            const p = goalProgress(g, state);
            return (
              <Link key={g.id} href="/life?tab=goals" className="card" style={{ display: 'block', marginBottom: 8 }}>
                <div className="row between">
                  <b style={{ fontWeight: 600 }}>{g.title}</b>
                  <span className="muted small">{p.pct}%</span>
                </div>
                <div className="bar" style={{ marginTop: 10 }}>
                  <i style={{ width: `${p.pct}%` }} />
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <section className="section fade-up" style={d(7)}>
        <div className="section-head">
          <h2 className="h2">Сферы жизни</h2>
          <Link className="link-btn" href="/life">
            Подробнее <ChevronRight size={14} />
          </Link>
        </div>
        <div className="areas-scroll">
          {areas.map((a) => {
            const o = areaOverview(state, a.id, today);
            return (
              <Link key={a.id} href={`/life?tab=areas&area=${a.id}`} className="area-mini">
                <div className="row between" style={{ width: '100%' }}>
                  <span className="muted">
                    <AreaIcon id={a.id} />
                  </span>
                  <Ring value={o.score} size={34} stroke={3}>
                    <span style={{ fontSize: 10 }}>{o.score ?? '–'}</span>
                  </Ring>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {o.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
