import React from 'react';
import { Button } from 'react-aria-components';
import { Plus, Repeat2 } from 'lucide-react';
import { Mn } from './ui';
import { calendarCopy as copy, calendarConfig } from './calendar-copy.mjs';
import { gregorianProvider } from '../shared/calendar.mjs';

const civil = gregorianProvider(calendarConfig);

export function DualDate({ date, provider, lunar = true }) {
  const day = civil.compute(date);
  const value = lunar && provider?.validDate(date) ? provider.compute(date) : null;
  return (
    <div className="calendar-dual-date">
      <div>
        <Mn>{copy.gregorian}</Mn>
        <time className="numeric" dateTime={date}>
          {date}
        </time>
        <Mn>{copy.weekdays[day.weekday]}</Mn>
      </div>
      {value && (
        <div>
          <Mn>{copy.lunar}</Mn>
          <span className="numeric">
            {value.lunarYear} / {value.lunarMonth} / {value.lunarDay}
          </span>
          {value.leapMonth && <Mn>{copy.leapMonth}</Mn>}
        </div>
      )}
    </div>
  );
}

export function Agenda({ items, onOpen, onAdd, compact = false, disabled = false }) {
  return (
    <div className={`schedule-agenda ${compact ? 'is-compact' : ''}`}>
      {items.map((item) => (
        <Button
          key={item.id}
          className="appointment-card"
          data-appointment={item.eventId}
          data-event-color={item.color}
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
          <Mn className="appointment-label">{item.title}</Mn>
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
