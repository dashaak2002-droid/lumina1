'use client';
// AI-помощник: чат, который видит задачи, привычки и цели и может менять план.
import { ArrowUp, Check, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { askAssistant } from '@/lib/ai-client';
import { todayISO } from '@/lib/dates';
import { useStore } from '@/lib/store';

const SUGGESTIONS = [
  'Помоги распланировать мою неделю',
  'У меня слишком много задач, расставь приоритеты',
  'Что мне сегодня лучше сделать в первую очередь?',
  'Проанализируй мою неделю',
  'Добавь встречу с врачом в пятницу',
];

export default function AiPage() {
  const { state, addChat, applyActions, clearChat } = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  async function send(raw: string) {
    const q = raw.trim();
    if (!q || busy) return;
    setText('');
    setBusy(true);
    const userMsg = { id: `u${Date.now()}`, role: 'user' as const, text: q, createdAt: new Date().toISOString() };
    addChat({ role: 'user', text: q });
    try {
      const history = [...stateRef.current.chat, userMsg];
      const res = await askAssistant(history, stateRef.current, todayISO());
      const applied = res.actions.length ? applyActions(res.actions) : [];
      addChat({ role: 'assistant', text: res.reply, applied, source: res.source });
    } catch {
      addChat({ role: 'assistant', text: 'Что-то пошло не так. Попробуй ещё раз через минуту.' });
    } finally {
      setBusy(false);
    }
  }

  // Переход с главного экрана: /ai?q=вопрос — отправляем автоматически
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      window.history.replaceState(null, '', '/ai');
      void send(q);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state.chat.length, busy]);

  const onlyWelcome = state.chat.length <= 1;
  const demo = [...state.chat].reverse().find((m) => m.role === 'assistant' && m.source)?.source;

  return (
    <div className="chat-wrap">
      <div className="chat-scroll">
        <div className="row between">
          <div>
            <p className="eyebrow">AI-помощник</p>
            <h1 className="title" style={{ marginTop: 6 }}>
              Чем помочь?
            </h1>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {demo && <span className={`badge ${demo === 'llm' ? 'live' : ''}`}>{demo === 'llm' ? 'AI подключён' : 'Демо-режим'}</span>}
            <button className="icon-btn" onClick={clearChat} aria-label="Очистить чат">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          {state.chat.map((m) => (
            <div key={m.id} className="msg">
              <div className={`bubble ${m.role === 'user' ? 'me' : 'ai'}`}>{m.text}</div>
              {m.applied && m.applied.length > 0 && (
                <div className="applied">
                  {m.applied.map((a, i) => (
                    <span key={i}>
                      <Check size={12} strokeWidth={3} /> {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="msg">
              <div className="bubble ai typing" aria-label="AI печатает">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {onlyWelcome && !busy && (
          <div className="stack" style={{ marginTop: 22 }}>
            <p className="eyebrow">Попробуй</p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        <form
          className="quick"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <Sparkles size={18} style={{ color: 'var(--accent)', flex: 'none' }} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Напиши обычными словами…" aria-label="Сообщение AI" enterKeyHint="send" />
          <button className="go" type="submit" disabled={!text.trim() || busy} aria-label="Отправить">
            <ArrowUp size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
