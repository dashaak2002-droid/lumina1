'use client';
import { ArrowUp, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AREA_BY_ID } from '@/lib/areas';
import { relativeDay, todayISO } from '@/lib/dates';
import { parseQuickAdd, type ParsedKind } from '@/lib/parser';
import { useStore } from '@/lib/store';

const KIND_LABEL: Record<ParsedKind, string> = { task: 'Задача', event: 'Событие', note: 'Заметка' };

// Быстрый ввод: пишешь обычной фразой — приложение само понимает, что это,
// когда и к какой сфере жизни относится.
export default function QuickAdd({ onAdded, placeholder = 'Например: Маникюр завтра в 16:00', autoFocus }: { onAdded?: () => void; placeholder?: string; autoFocus?: boolean }) {
  const { state, addTask, addEvent, addNote } = useStore();
  const [text, setText] = useState('');
  const [override, setOverride] = useState<ParsedKind | null>(null);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const today = todayISO();
  const trimmed = text.trim();
  const parsed = trimmed ? parseQuickAdd(trimmed) : null;
  const kind: ParsedKind | null = parsed ? override ?? parsed.kind : null;

  function submit() {
    if (!parsed || !kind) return;
    const area = parsed.areaId ?? state.profile?.priorities[0] ?? 'home';
    let msg = '';
    if (kind === 'note') {
      addNote(override === 'note' && parsed.kind !== 'note' ? trimmed : parsed.title);
      msg = 'Сохранено в заметки';
    } else if (kind === 'event') {
      const date = parsed.date ?? today;
      addEvent({ title: parsed.title, date, time: parsed.time, areaId: area });
      msg = `Событие добавлено · ${relativeDay(date, today)}${parsed.time ? `, ${parsed.time}` : ''}`;
    } else {
      const date = parsed.date ?? today;
      addTask({ title: parsed.title, date, time: parsed.time, areaId: area, priority: parsed.priority, repeat: parsed.repeat });
      msg = `Задача добавлена · ${relativeDay(date, today)}${parsed.time ? `, ${parsed.time}` : ''}`;
    }
    setText('');
    setOverride(null);
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3000);
    onAdded?.();
  }

  return (
    <div>
      <form
        className="quick"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Быстрое добавление"
          autoFocus={autoFocus}
          enterKeyHint="send"
        />
        <button className="go" type="submit" disabled={!trimmed} aria-label="Добавить">
          <ArrowUp size={20} />
        </button>
      </form>

      {parsed && kind && (
        <div className="preview">
          <span className="pill">{KIND_LABEL[kind]}</span>
          {kind !== 'note' && (
            <span>
              {relativeDay(parsed.date ?? today, today)}
              {parsed.time ? `, ${parsed.time}` : ''}
              {parsed.repeat !== 'none' ? ` · ${parsed.repeat === 'daily' ? 'каждый день' : 'каждую неделю'}` : ''}
              {parsed.areaId ? ` · ${AREA_BY_ID[parsed.areaId].name}` : ''}
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {(['task', 'event', 'note'] as ParsedKind[])
              .filter((k) => k !== kind)
              .map((k) => (
                <button key={k} type="button" className="chip chip-sm" onClick={() => setOverride(k)}>
                  {KIND_LABEL[k]}
                </button>
              ))}
          </span>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Check size={16} strokeWidth={3} /> {toast}
        </div>
      )}
    </div>
  );
}
