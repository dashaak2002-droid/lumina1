'use client';
import { X } from 'lucide-react';
import { AREA_BY_ID } from '@/lib/areas';
import type { EventItem } from '@/lib/types';

export default function EventRow({ event, onDelete }: { event: EventItem; onDelete?: () => void }) {
  return (
    <div className="item event">
      <span className="time-pill">{event.time ?? 'весь день'}</span>
      <div className="grow">
        <div className="t">{event.title}</div>
        <div className="meta">
          <span>{AREA_BY_ID[event.areaId].name}</span>
        </div>
      </div>
      {onDelete && (
        <button className="icon-btn" onClick={onDelete} aria-label="Удалить" style={{ width: 30, height: 30 }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
