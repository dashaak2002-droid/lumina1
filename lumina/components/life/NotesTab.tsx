'use client';
import { ArrowRight, Check, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NOTE_KIND_LABEL } from '@/lib/parser';
import { useStore } from '@/lib/store';

const MOVABLE = new Set(['task', 'event', 'goal']);

export default function NotesTab() {
  const { state, addNote, deleteNote, convertNote } = useStore();
  const [text, setText] = useState('');
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3000);
  }

  const movable = state.notes.filter((n) => MOVABLE.has(n.kind));

  return (
    <>
      <p className="muted small" style={{ marginBottom: 10 }}>
        Brain Dump — записывай всё, что крутится в голове. Я определю, что это: задача, событие, цель, идея или просто заметка.
      </p>
      <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Что у тебя на уме?" />
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 10 }}
        disabled={!text.trim()}
        onClick={() => {
          addNote(text);
          setText('');
          flash('Записано');
        }}
      >
        Сохранить мысль
      </button>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} strokeWidth={3} /> {toast}
        </div>
      )}

      {movable.length > 0 && (
        <div className="card" style={{ marginTop: 18, background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <b style={{ fontWeight: 600 }}>
            {movable.length} {movable.length === 1 ? 'заметку' : 'заметки'} можно превратить в дела
          </b>
          <p className="small" style={{ marginTop: 4, color: 'var(--ink-2)' }}>
            Нажми «Перенести» у нужной заметки — она переедет в Planner или в цели.
          </p>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {state.notes.map((n) => (
          <div key={n.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
            <div className="row between" style={{ marginTop: 10 }}>
              <span className={`badge ${MOVABLE.has(n.kind) ? 'live' : ''}`}>{NOTE_KIND_LABEL[n.kind]}</span>
              <div className="row" style={{ gap: 4 }}>
                {MOVABLE.has(n.kind) && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      const s = convertNote(n.id);
                      if (s) flash(s);
                    }}
                  >
                    Перенести <ArrowRight size={14} />
                  </button>
                )}
                <button className="icon-btn" onClick={() => deleteNote(n.id)} aria-label="Удалить заметку">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!state.notes.length && <div className="empty">Здесь пока тихо. Выгрузи сюда первую мысль.</div>}
      </div>
    </>
  );
}
