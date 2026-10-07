'use client';
import { Check, Repeat, X } from 'lucide-react';
import { AREA_BY_ID } from '@/lib/areas';
import { isTaskDone } from '@/lib/selectors';
import type { Task } from '@/lib/types';

export default function TaskRow({
  task,
  date,
  onToggle,
  onDelete,
  overdue,
  showArea = true,
}: {
  task: Task;
  date: string;
  onToggle: () => void;
  onDelete?: () => void;
  overdue?: boolean;
  showArea?: boolean;
}) {
  const done = isTaskDone(task, date);
  return (
    <div className={`item ${done ? 'done' : ''}`}>
      <button className={`check ${done ? 'on' : ''}`} onClick={onToggle} aria-label={done ? 'Снять отметку' : 'Отметить выполненной'}>
        <Check size={14} strokeWidth={3} />
      </button>
      <div className="grow">
        <div className="t">{task.title}</div>
        <div className="meta">
          {task.priority === 'high' && !done && (
            <span className="tag">
              <i className="dot" /> важно
            </span>
          )}
          {overdue && !done && <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>просрочено</span>}
          {task.repeat !== 'none' && (
            <span className="tag">
              <Repeat size={11} /> {task.repeat === 'daily' ? 'каждый день' : 'каждую неделю'}
            </span>
          )}
          {showArea && <span>{AREA_BY_ID[task.areaId].name}</span>}
        </div>
      </div>
      {task.time && <span className="time-pill">{task.time}</span>}
      {onDelete && (
        <button className="icon-btn" onClick={onDelete} aria-label="Удалить" style={{ width: 30, height: 30 }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
