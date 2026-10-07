'use client';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AreaIcon } from '@/components/AreaIcon';
import { AREAS } from '@/lib/areas';
import { useStore } from '@/lib/store';
import type { AreaId, Feature } from '@/lib/types';

const AGE_GROUPS = ['25–29', '30–34', '35–39', '40–45', 'Другое'];
const IMPROVE = ['Меньше хаоса', 'Больше энергии', 'Финансовая подушка', 'Время для себя', 'Баланс работы и семьи', 'Рост в карьере', 'Спокойный сон', 'Порядок дома'];
const FEATURES: { id: Feature; title: string; hint: string }[] = [
  { id: 'planner', title: 'Планирование дня', hint: 'Задачи, события, календарь' },
  { id: 'habits', title: 'Привычки', hint: 'Серии и недельный прогресс' },
  { id: 'goals', title: 'Цели', hint: 'Этапы и прогресс' },
  { id: 'notes', title: 'Заметки', hint: 'Выгрузить мысли из головы' },
  { id: 'ai', title: 'AI-помощник', hint: 'Приоритеты, планы, советы' },
];

const toggle = <T,>(arr: T[], v: T, max = 99) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.length >= max ? arr : [...arr, v]);

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('30–34');
  const [priorities, setPriorities] = useState<AreaId[]>([]);
  const [improve, setImprove] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [features, setFeatures] = useState<Feature[]>(['planner', 'habits', 'goals', 'ai']);
  const [building, setBuilding] = useState(false);

  const LAST = 3;
  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? priorities.length > 0 : true;

  function next() {
    if (step < LAST) return setStep(step + 1);
    setBuilding(true);
  }

  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => {
      completeOnboarding({ name: name.trim(), ageGroup: age, priorities, improve, features }, goal);
    }, 1400);
    return () => clearTimeout(t);
  }, [building]); // eslint-disable-line react-hooks/exhaustive-deps

  if (building) {
    return (
      <div className="onb" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div className="typing" style={{ marginBottom: 12 }}>
          <i />
          <i />
          <i />
        </div>
        <h1 className="title">Собираю твой день, {name.trim()}</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Настраиваю дашборд под твои приоритеты
        </p>
      </div>
    );
  }

  return (
    <div className="onb">
      <div className="row between" style={{ marginBottom: 18 }}>
        <span className="logo">
          <i /> Lumina
        </span>
        <span className="muted small">
          {step + 1} из {LAST + 1}
        </span>
      </div>
      <div className="onb-progress">
        {Array.from({ length: LAST + 1 }, (_, i) => (
          <i key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      <div className="onb-body" key={step}>
        {step === 0 && (
          <>
            <p className="eyebrow">Давай познакомимся</p>
            <h1 className="display" style={{ margin: '10px 0 8px' }}>
              Вся жизнь — в одном спокойном месте
            </h1>
            <p className="lead">Планы, привычки, цели и AI-помощник. Это займёт меньше минуты.</p>
            <label className="label" htmlFor="name">
              Как тебя зовут?
            </label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" autoFocus maxLength={30} />
            <label className="label">Возраст</label>
            <div className="chips">
              {AGE_GROUPS.map((a) => (
                <button key={a} className={`chip ${age === a ? 'on' : ''}`} onClick={() => setAge(a)}>
                  {a}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="eyebrow">Приоритеты</p>
            <h1 className="title" style={{ margin: '8px 0 6px' }}>
              Что сейчас важнее всего?
            </h1>
            <p className="muted" style={{ marginBottom: 16 }}>
              Выбери до трёх сфер — они окажутся в центре твоего дашборда.
            </p>
            {AREAS.map((a) => {
              const on = priorities.includes(a.id);
              return (
                <button key={a.id} className={`option ${on ? 'on' : ''}`} onClick={() => setPriorities(toggle(priorities, a.id, 3))}>
                  <span className="ico">
                    <AreaIcon id={a.id} />
                  </span>
                  <span className="grow">
                    <b style={{ fontWeight: 600 }}>{a.name}</b>
                    <br />
                    <span className="muted small">{a.hint}</span>
                  </span>
                  {on && <Check size={18} />}
                </button>
              );
            })}
          </>
        )}

        {step === 2 && (
          <>
            <p className="eyebrow">Цели</p>
            <h1 className="title" style={{ margin: '8px 0 16px' }}>
              Что хочется улучшить?
            </h1>
            <div className="chips">
              {IMPROVE.map((x) => (
                <button key={x} className={`chip ${improve.includes(x) ? 'on' : ''}`} onClick={() => setImprove(toggle(improve, x))}>
                  {x}
                </button>
              ))}
            </div>
            <label className="label" htmlFor="goal">
              Твоя главная цель (по желанию)
            </label>
            <input id="goal" className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Например: запустить свой проект" maxLength={120} />
            <p className="muted small" style={{ marginTop: 8 }}>
              Я превращу её в цель с первыми шагами.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <p className="eyebrow">Функции</p>
            <h1 className="title" style={{ margin: '8px 0 6px' }}>
              Что понадобится чаще всего?
            </h1>
            <p className="muted" style={{ marginBottom: 16 }}>
              Эти разделы будут на главном экране. Остальное всегда доступно в разделе «Жизнь».
            </p>
            {FEATURES.map((f) => {
              const on = features.includes(f.id);
              return (
                <button key={f.id} className={`option ${on ? 'on' : ''}`} onClick={() => setFeatures(toggle(features, f.id))}>
                  <span className="grow">
                    <b style={{ fontWeight: 600 }}>{f.title}</b>
                    <br />
                    <span className="muted small">{f.hint}</span>
                  </span>
                  <span className={`check square ${on ? 'on' : ''}`}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <div className="row" style={{ paddingTop: 20 }}>
        {step > 0 && (
          <button className="btn" onClick={() => setStep(step - 1)} aria-label="Назад">
            <ArrowLeft size={18} />
          </button>
        )}
        <button className="btn btn-primary grow" disabled={!canNext} onClick={next}>
          {step === LAST ? 'Создать мой дашборд' : 'Продолжить'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
