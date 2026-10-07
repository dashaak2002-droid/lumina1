'use client';
// Life — сферы жизни, цели, привычки и заметки.
import { useEffect, useState } from 'react';
import AreasTab from '@/components/life/AreasTab';
import GoalsTab from '@/components/life/GoalsTab';
import HabitsTab from '@/components/life/HabitsTab';
import NotesTab from '@/components/life/NotesTab';

type Tab = 'areas' | 'goals' | 'habits' | 'notes';
const TABS: { id: Tab; label: string }[] = [
  { id: 'areas', label: 'Сферы' },
  { id: 'goals', label: 'Цели' },
  { id: 'habits', label: 'Привычки' },
  { id: 'notes', label: 'Заметки' },
];

export default function LifePage() {
  const [tab, setTab] = useState<Tab>('areas');
  const [openArea, setOpenArea] = useState<string | null>(null);

  // ссылки с главного экрана: /life?tab=goals&area=health
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tab') as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
    const a = p.get('area');
    if (a) setOpenArea(a);
  }, []);

  return (
    <main className="page">
      <p className="eyebrow">Life</p>
      <h1 className="title" style={{ margin: '6px 0 18px' }}>
        Твоя жизнь
      </h1>
      <div className="seg" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} role="tab" aria-selected={tab === t.id}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 20 }} key={tab} className="fade-up">
        {tab === 'areas' && <AreasTab initialArea={openArea} />}
        {tab === 'goals' && <GoalsTab />}
        {tab === 'habits' && <HabitsTab />}
        {tab === 'notes' && <NotesTab />}
      </div>
    </main>
  );
}
