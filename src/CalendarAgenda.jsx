import React from 'react';
import { Button } from 'react-aria-components';
import { Plus, Repeat2, MapPin } from 'lucide-react';
import { Mn } from './ui';
import { CalendarTitle } from './CalendarTitle';
import { calendarCopy as copy } from './calendar-copy.mjs';

export function Agenda({
  date,
  items,
  onOpen,
  onAdd,
  compact = false,
  disabled = false,
  showAdd = true,
}) {
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
            aria-label={[
              item.title,
              item.allDay ? copy.allDay : start + '–' + end,
              item.repeat !== 'none' ? copy.repeat : '',
              item.location?.trim() ? `${copy.location} · ${item.location}` : '',
              item.notes?.trim() ? `${copy.notes} · ${item.notes}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => onOpen(item)}
          >
            {!item.allDay && (
              <span className="appointment-time">
                <span className="numeric">
                  {start}
                  <small>–{end}</small>
                </span>
                {item.repeat !== 'none' && <Repeat2 size={13} aria-label={copy.repeat} />}
              </span>
            )}
            <span className="appointment-title-scroll">
              {item.allDay && (
                <span className="appointment-all-day">
                  <Mn>{copy.allDay}</Mn>
                  {item.repeat !== 'none' && <Repeat2 size={13} aria-label={copy.repeat} />}
                </span>
              )}
              <Mn className="appointment-label">{item.title}</Mn>
              {item.location?.trim() && (
                <span className="appointment-location">
                  <MapPin size={14} aria-hidden="true" />
                  <Mn>{item.location}</Mn>
                </span>
              )}
              {item.notes?.trim() && (
                <CalendarTitle text={item.notes} className="appointment-notes" />
              )}
            </span>
          </Button>
        );
      })}
      {items.length === 0 && (
        <div className="schedule-empty">
          <Mn compact>{copy.empty}</Mn>
        </div>
      )}
      {showAdd && (
        <Button
          className="agenda-add"
          data-action="day-add-event"
          isDisabled={disabled}
          onPress={onAdd}
        >
          <Plus size={19} />
          <Mn compact>{copy.add}</Mn>
        </Button>
      )}
    </div>
  );
}
