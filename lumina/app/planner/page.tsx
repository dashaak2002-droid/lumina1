'use client';
// Planner — задачи, события, календарь и списки в одном месте.
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import EventRow from '@/components/EventRow';
import QuickAdd from '@/components/QuickAdd';
import Sheet from '@/components/Sheet';
import TaskRow from '@/components/TaskRow';
import { addDays, fmtLong, fmtMonthYear, fmtWeekdayShort, fromISO, monthGrid, relativeDay, todayISO, toISO, weekDays } from '@/lib/dates';
import { eventsOn, isTaskDone, overdueTasks, tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';

type Tab = 'day' | 'week' | 'month' | 'lists';
const TABS: { id: Tab; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'lists', label: 'Списки' },
];

export default function PlannerPage() {
  const [tab, setTab] = useState<Tab>('day');
  const [date, setDate] = useState(todayISO());
  const [adding, setAdding] = useState(false);

  function openDay(d: string) {
    setDate(d);
    setTab('day');
  }

  return (
    <main className="page">
      <p className="eyebrow">Planner</p>
      <h1 className="title" style={{ margin: '6px 0 18px' }}>
        План
      </h1>

      <div className="seg" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} role="tab" aria-selected={tab === t.id}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }} key={tab} className="fade-up">
        {tab === 'day' && <DayView date={date} setDate={setDate} />}
        {tab === 'week' && <WeekView date={date} setDate={setDate} openDay={openDay} />}
        {tab === 'month' && <MonthView date={date} setDate={setDate} openDay={openDay} />}
        {tab === 'lists' && <ListsView />}
      </div>

      {tab !== 'lists' && (
        <>
          <button className="fab" onClick={() => setAdding(true)} aria-label="Добавить">
            <Plus size={24} />
          </button>
          <Sheet open={adding} onClose={() => setAdding(false)} title="Быстро добавить">
            <p className="muted small" style={{ marginBottom: 12 }}>
              Напиши как есть: «Созвон в пятницу в 11:00», «Купить подарок маме 15 октября», «Каждый понедельник планёрка в 10:00».
            </p>
            <QuickAdd autoFocus onAdded={() => setTimeout(() => setAdding(false), 700)} />
          </Sheet>
        </>
      )}
    </main>
  );
}

// ---------------- День ----------------
function DayView({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { state, toggleTask, deleteTask, deleteEvent } = useStore();
  const today = todayISO();
  const events = eventsOn(state, date);
  const tasks = tasksOn(state, date);
  const overdue = date === today ? overdueTasks(state, today) : [];
  const open = tasks.filter((t) => !isTaskDone(t, date)).length;

  return (
    <>
      <div className="daybar">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Предыдущий день">
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="h2" style={{ textTransform: 'capitalize' }}>
            {date === today ? 'Сегодня' : relativeDay(date, today) === 'завтра' ? 'Завтра' : fmtLong(date)}
          </div>
          <div className="muted small">{date === today || relativeDay(date, today) === 'завтра' ? fmtLong(date) : `${open} открытых задач`}</div>
        </div>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Следующий день">
          <ChevronRight size={20} />
        </button>
      </div>
      {date !== today && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="chip chip-sm" onClick={() => setDate(today)}>
            Вернуться к сегодня
          </button>
        </div>
      )}

      <section className="section" style={{ marginTop: 22 }}>
        <h3 className="eyebrow" style={{ marginBottom: 10 }}>
          События
        </h3>
        {events.map((e) => (
          <EventRow key={e.id} event={e} onDelete={() => deleteEvent(e.id)} />
        ))}
        {!events.length && <div className="empty">Событий нет</div>}
      </section>

      <section className="section" style={{ marginTop: 22 }}>
        <h3 className="eyebrow" style={{ marginBottom: 10 }}>
          Задачи
        </h3>
        {overdue.map((t) => (
          <TaskRow key={t.id} task={t} date={date} overdue onToggle={() => toggleTask(t.id, date)} onDelete={() => deleteTask(t.id)} />
        ))}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} date={date} onToggle={() => toggleTask(t.id, date)} onDelete={() => deleteTask(t.id)} />
        ))}
        {!tasks.length && !overdue.length && <div className="empty">Задач на этот день нет</div>}
      </section>
    </>
  );
}

// ---------------- Неделя ----------------
function WeekView({ date, setDate, openDay }: { date: string; setDate: (d: string) => void; openDay: (d: string) => void }) {
  const { state, toggleTask } = useStore();
  const today = todayISO();
  const days = weekDays(date);
  const first = days[0];
  const last = days[6];

  return (
    <>
      <div className="daybar">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -7))} aria-label="Предыдущая неделя">
          <ChevronLeft size={20} />
        </button>
        <div className="h2" style={{ textAlign: 'center' }}>
          {fromISO(first).getDate()} {new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(fromISO(first))} — {fromISO(last).getDate()}{' '}
          {new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(fromISO(last))}
        </div>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 7))} aria-label="Следующая неделя">
          <ChevronRight size={20} />
        </button>
      </div>

      {days.map((d) => {
        const ev = eventsOn(state, d);
        const tk = tasksOn(state, d);
        return (
          <section key={d}>
            <div className={`week-day-head ${d === today ? 'today' : ''}`}>
              <button onClick={() => openDay(d)} style={{ textAlign: 'left' }}>
                <span className="h2" style={{ textTransform: 'capitalize' }}>
                  {fmtWeekdayShort(d)}, {fromISO(d).getDate()}
                </span>
              </button>
              <span className="muted small">{ev.length + tk.length ? `${ev.length + tk.length} дел` : 'свободно'}</span>
            </div>
            {ev.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
            {tk.map((t) => (
              <TaskRow key={t.id} task={t} date={d} showArea={false} onToggle={() => toggleTask(t.id, d)} />
            ))}
          </section>
        );
      })}
    </>
  );
}

// ---------------- Месяц ----------------
function MonthView({ date, setDate, openDay }: { date: string; setDate: (d: string) => void; openDay: (d: string) => void }) {
  const { state, toggleTask } = useStore();
  const today = todayISO();
  const cur = fromISO(date);
  const cells = monthGrid(cur.getFullYear(), cur.getMonth());
  const shift = (n: number) => {
    const d = new Date(cur.getFullYear(), cur.getMonth() + n, 1);
    setDate(toISO(d));
  };
  const events = eventsOn(state, date);
  const tasks = tasksOn(state, date);

  return (
    <>
      <div className="daybar" style={{ marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Предыдущий месяц">
          <ChevronLeft size={20} />
        </button>
        <div className="h2" style={{ textTransform: 'capitalize' }}>
          {fmtMonthYear(date)}
        </div>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Следующий месяц">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="cal">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="dow">
            {d}
          </div>
        ))}
        {cells.map(({ iso, inMonth }) => {
          const n = eventsOn(state, iso).length + tasksOn(state, iso).length;
          return (
            <button
              key={iso}
              className={`day ${inMonth ? '' : 'out'} ${iso === today ? 'today' : ''} ${iso === date ? 'sel' : ''}`}
              onClick={() => setDate(iso)}
              aria-label={fmtLong(iso)}
            >
              {fromISO(iso).getDate()}
              <span className="pips">{Array.from({ length: Math.min(n, 3) }, (_, i) => <i key={i} />)}</span>
            </button>
          );
        })}
      </div>

      <div className="row between" style={{ margin: '22px 0 10px' }}>
        <h3 className="h2" style={{ textTransform: 'capitalize' }}>
          {fmtLong(date)}
        </h3>
        <button className="link-btn" onClick={() => openDay(date)}>
          Открыть день <ChevronRight size={14} />
        </button>
      </div>
      {events.map((e) => (
        <EventRow key={e.id} event={e} />
      ))}
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} date={date} onToggle={() => toggleTask(t.id, date)} />
      ))}
      {!events.length && !tasks.length && <div className="empty">На этот день ничего нет</div>}
    </>
  );
}

// ---------------- Списки ----------------
function ListsView() {
  const { state, addTask, toggleTask, deleteTask } = useStore();
  const today = todayISO();
  const [newList, setNewList] = useState('');
  const [extraLists, setExtraLists] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // списки — это задачи без даты, сгруппированные по названию
  const undated = state.tasks.filter((t) => !t.date && t.repeat === 'none');
  const names = Array.from(new Set(['Входящие', 'Покупки', ...undated.map((t) => t.list), ...extraLists]));

  return (
    <>
      <p className="muted small" style={{ marginBottom: 6 }}>
        Дела без даты: покупки, идеи, «когда-нибудь». Назначь дату — и задача появится в календаре.
      </p>
      {names.map((name) => {
        const items = undated.filter((t) => t.list === name);
        return (
          <section key={name} className="section" style={{ marginTop: 22 }}>
            <div className="section-head">
              <h2 className="h2">{name}</h2>
              <span className="muted small">{items.filter((t) => !t.done).length} активных</span>
            </div>
            {[...items].sort((a, b) => Number(a.done) - Number(b.done)).map((t) => (
              <TaskRow key={t.id} task={t} date={today} showArea={false} onToggle={() => toggleTask(t.id, today)} onDelete={() => deleteTask(t.id)} />
            ))}
            <form
              className="row"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                const v = (drafts[name] ?? '').trim();
                if (!v) return;
                addTask({ title: v, list: name, date: null });
                setDrafts({ ...drafts, [name]: '' });
              }}
            >
              <input className="input" placeholder="Добавить в список…" value={drafts[name] ?? ''} onChange={(e) => setDrafts({ ...drafts, [name]: e.target.value })} />
              <button className="btn btn-primary btn-sm" type="submit">
                <Plus size={16} />
              </button>
            </form>
          </section>
        );
      })}

      <form
        className="row"
        style={{ marginTop: 30 }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = newList.trim();
          if (v && !names.includes(v)) setExtraLists([...extraLists, v]);
          setNewList('');
        }}
      >
        <input className="input" placeholder="Новый список (например, «Подарки»)" value={newList} onChange={(e) => setNewList(e.target.value)} />
        <button className="btn btn-sm" type="submit">
          Создать
        </button>
      </form>
    </>
  );
}
