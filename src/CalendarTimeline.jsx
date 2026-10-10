import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'react-aria-components';
import { Plus } from 'lucide-react';
import { Mn } from './ui';
import { CalendarTitle } from './CalendarTitle';
import { calendarCopy as copy, calendarConfig } from './calendar-copy.mjs';
import { dayTimeline, clockLabel } from '../shared/calendar-layout.mjs';
import { weekday } from '../shared/calendar-events.mjs';
import { currentDate, moveDate } from '../shared/calendar.mjs';

export function CalendarTimeline({
  date,
  days,
  occurrences,
  provider,
  firstWeekday,
  scale = 1,
  onSelectDate,
  onOpen,
  onAdd,
}) {
  const scroll = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const layouts = useMemo(
    () => days.map((day) => dayTimeline(occurrences, day)),
    [days.join(','), occurrences],
  );
  const lanes = Math.max(
    1,
    ...layouts.flatMap((layout) => layout.timed.map((item) => item.columns)),
  );
  const allDay = layouts.some((layout) => layout.allDay.length);
  const single = days.length === 1;
  const weekStart = moveDate(date, -((weekday(date) - firstWeekday + 7) % 7));
  const today = currentDate(calendarConfig.timeZone, now);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: calendarConfig.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const minute =
    Number(parts.find((part) => part.type === 'hour').value) * 60 +
    Number(parts.find((part) => part.type === 'minute').value);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = scroll.current;
      if (!el) return;
      const starts = layouts.flatMap((layout) => layout.timed.map((item) => item.start));
      const first = starts.length ? Math.min(...starts) : 480;
      const unit = 96 * scale;
      const pinned =
        el.querySelector('.timeline-heading').offsetHeight +
        (el.querySelector('.timeline-all-day')?.offsetHeight || 0);
      el.scrollTop = Math.max(
        0,
        el.querySelector('.timeline-hours').offsetTop +
          (Math.max(0, first - 30) / 60) * unit -
          pinned,
      );
      if (!single) {
        const chosen = el.querySelector(`[data-timeline-date="${date}"]`);
        if (chosen) el.scrollLeft = Math.max(0, chosen.offsetLeft - 52);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [date, days.length, scale]);
  return (
    <section
      className={`calendar-time-layout ${single ? 'single-day' : 'seven-days'}`}
      aria-label={single ? copy.day : copy.week}
    >
      {single && (
        <div className="timeline-week-strip" aria-label={copy.choose}>
          {Array.from({ length: 7 }, (_, i) => moveDate(weekStart, i)).map((day) => (
            <Button
              key={day}
              aria-label={day}
              aria-pressed={day === date}
              isDisabled={day < calendarConfig.minDate || day > calendarConfig.maxDate}
              onPress={() => onSelectDate(day)}
            >
              <Mn compact>{copy.weekdays[weekday(day)]}</Mn>
              <span className="numeric">{Number(day.slice(-2))}</span>
            </Button>
          ))}
        </div>
      )}
      <div
        className="timeline-scroll"
        ref={scroll}
        style={{
          '--timeline-days': days.length,
          '--hour-height': `${96 * scale}px`,
          '--lane-min': `${lanes * 58 * scale}px`,
        }}
      >
        <div className="timeline-canvas">
          <div className="timeline-heading">
            <div className="timeline-corner">
              <Mn compact>{copy.time}</Mn>
            </div>
            {days.map((day) => {
              const lunar = provider?.validDate(day) ? provider.compute(day) : null;
              return (
                <Button
                  key={day}
                  className="timeline-date-heading"
                  data-timeline-date={day}
                  data-selected={day === date || undefined}
                  aria-label={day}
                  isDisabled={day < calendarConfig.minDate || day > calendarConfig.maxDate}
                  onPress={() => onSelectDate(day)}
                >
                  {!single && (
                    <>
                      <span className="numeric">{Number(day.slice(-2))}</span>
                      <Mn compact>{copy.weekdays[weekday(day)]}</Mn>
                    </>
                  )}
                  {single && (
                    <time className="numeric" dateTime={day}>
                      {day}
                    </time>
                  )}
                  {lunar && (
                    <span className="numeric timeline-lunar">
                      {lunar.leapMonth ? '* ' : ''}
                      {lunar.lunarMonth}/{lunar.lunarDay}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
          {allDay && (
            <div className="timeline-all-day">
              <div className="timeline-corner">
                <Mn compact>{copy.allDay}</Mn>
              </div>
              {layouts.map((layout, index) => (
                <div key={days[index]} className="timeline-all-day-cell">
                  {layout.allDay.map((event) => (
                    <Button
                      key={event.id}
                      className="timeline-all-day-event"
                      data-event-color={event.color}
                      aria-label={`${copy.allDay} · ${event.title}`}
                      onPress={() => onOpen(event)}
                    >
                      <CalendarTitle text={event.title} />
                    </Button>
                  ))}
                  <Button
                    className="timeline-all-day-add"
                    isDisabled={
                      days[index] < calendarConfig.minDate || days[index] > calendarConfig.maxDate
                    }
                    aria-label={`${copy.add} · ${copy.allDay} · ${days[index]}`}
                    onPress={() => onAdd(days[index], 540, true)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="timeline-hours">
            <div className="timeline-ruler" aria-hidden="true">
              {Array.from({ length: 25 }, (_, h) => (
                <span
                  key={h}
                  className="numeric"
                  style={{ top: `calc(var(--hour-height) * ${h})` }}
                >
                  {clockLabel(h * 60)}
                </span>
              ))}
            </div>
            {layouts.map((layout, index) => (
              <div key={days[index]} className="timeline-day-column">
                <div className="timeline-slots">
                  {Array.from({ length: 48 }, (_, slot) => (
                    <Button
                      key={slot}
                      data-action="timeline-add-slot"
                      data-slot-date={days[index]}
                      data-slot-minute={slot * 30}
                      className="timeline-slot"
                      aria-label={`${copy.add} · ${days[index]} · ${clockLabel(slot * 30)}`}
                      isDisabled={
                        days[index] < calendarConfig.minDate || days[index] > calendarConfig.maxDate
                      }
                      onPress={() => onAdd(days[index], slot * 30)}
                    />
                  ))}
                </div>
                {layout.timed.map((item) => (
                  <Button
                    key={item.event.id}
                    className="timeline-event"
                    data-appointment={item.event.eventId}
                    data-event-color={item.event.color}
                    aria-label={`${item.event.title} · ${clockLabel(item.start)}–${clockLabel(item.end)}`}
                    style={{
                      top: `calc(var(--hour-height) * ${item.start / 60})`,
                      height: `calc(var(--hour-height) * ${(item.visualEnd - item.start) / 60} - 3px)`,
                      left: `calc(${(100 * item.column) / item.columns}% + 2px)`,
                      width: `calc(${100 / item.columns}% - 4px)`,
                    }}
                    onPress={() => onOpen(item.event)}
                  >
                    <span
                      className="timeline-duration"
                      aria-hidden="true"
                      style={{
                        height: `calc(var(--hour-height) * ${(item.end - item.start) / 60} - 2px)`,
                      }}
                    />
                    <span className="numeric timeline-event-time">{clockLabel(item.start)}</span>
                    <CalendarTitle text={item.event.title} />
                  </Button>
                ))}
                {days[index] === today && (
                  <div
                    className="timeline-now"
                    aria-label={clockLabel(minute)}
                    style={{ top: `calc(var(--hour-height) * ${minute / 60})` }}
                  >
                    <i />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
