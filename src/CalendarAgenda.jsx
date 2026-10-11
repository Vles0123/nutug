import React from 'react';
import { Button } from 'react-aria-components';
import { Plus, Repeat2 } from 'lucide-react';
import { Mn } from './ui';
import { calendarCopy as copy } from './calendar-copy.mjs';

export function Agenda({ date, items, onOpen, onAdd, compact = false, disabled = false }) {
  return (
    <div className={`schedule-agenda ${compact ? 'is-compact' : ''}`}>
      {items.map((item) => {
        const start = date && item.startDate < date ? '00:00' : item.startTime;
        const end = date && item.endDate > date ? '24:00' : item.endTime;
        return (
          <Button
            key={item.id}
            className="appointment-card"
            data-appointment={item.eventId}
            data-event-color={item.color}
            aria-label={`${item.title} · ${item.allDay ? copy.allDay : start + '–' + end}`}
            onPress={() => onOpen(item)}
          >
            <span className="appointment-time">
              {item.allDay ? (
                <Mn>{copy.allDay}</Mn>
              ) : (
                <span className="numeric">
                  {start}
                  <small>{end}</small>
                </span>
              )}
            </span>
            <span className="appointment-title-scroll">
              <Mn className="appointment-label">{item.title}</Mn>
            </span>
            {item.repeat !== 'none' && <Repeat2 size={15} aria-label={copy.repeat} />}
          </Button>
        );
      })}
      {items.length === 0 && (
        <div className="schedule-empty">
          <Mn compact>{copy.empty}</Mn>
        </div>
      )}
      <Button
        className="agenda-add"
        data-action="day-add-event"
        isDisabled={disabled}
        onPress={onAdd}
      >
        <Plus size={19} />
        <Mn compact>{copy.add}</Mn>
      </Button>
    </div>
  );
}
