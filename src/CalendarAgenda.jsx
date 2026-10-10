import React from 'react';
import { Button } from 'react-aria-components';
import { Plus, Repeat2 } from 'lucide-react';
import { Mn } from './ui';
import { calendarCopy as copy } from './calendar-copy.mjs';

export function Agenda({ items, onOpen, onAdd, compact = false, disabled = false }) {
  return (
    <div className={`schedule-agenda ${compact ? 'is-compact' : ''}`}>
      {items.map((item) => (
        <Button
          key={item.id}
          className="appointment-card"
          data-appointment={item.eventId}
          data-event-color={item.color}
          aria-label={`${item.title} · ${item.allDay ? copy.allDay : item.startTime + '–' + item.endTime}`}
          onPress={() => onOpen(item)}
        >
          <span className="appointment-time">
            {item.allDay ? (
              <Mn>{copy.allDay}</Mn>
            ) : (
              <span className="numeric">
                {item.startTime}
                <small>{item.endTime}</small>
              </span>
            )}
          </span>
          <span className="appointment-title-scroll">
            <Mn className="appointment-label">{item.title}</Mn>
          </span>
          {item.repeat !== 'none' && <Repeat2 size={15} aria-label={copy.repeat} />}
        </Button>
      ))}
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
