import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from 'react-aria-components';
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import { Mn, IconButton } from './ui';
import { labels } from './ui-copy.mjs';
import { calendarCopy as copy, calendarConfig } from './calendar-copy.mjs';
import {
  chineseLunisolarProvider,
  gregorianProvider,
  civilDate,
  moveDate,
  moveMonth,
  monthDays,
} from '../shared/calendar.mjs';
import { useToday } from './useToday';
import { Agenda } from './CalendarAgenda';
import { CalendarDatePicker } from './CalendarDatePicker';
import { occurrencesBetween } from '../shared/calendar-events.mjs';

export function MonthCalendar({
  selectedDate,
  onSelectDate,
  firstWeekday = 0,
  showLunar = true,
  appointments = [],
  onAdd,
  onOpenEvent,
  onOpenDay,
}) {
  const today = useToday(calendarConfig.timeZone);
  const civil = useMemo(() => gregorianProvider(calendarConfig), []);
  const provider = useMemo(
    () =>
      showLunar && window.ChineseAlmanac
        ? chineseLunisolarProvider(window.ChineseAlmanac, calendarConfig)
        : null,
    [showLunar],
  );
  const initial = new URLSearchParams(location.search).get('date');
  const [localDate, setLocalDate] = useState(() => (civil.validDate(initial) ? initial : today));
  const date = selectedDate || localDate;
  const setDate = (value) => {
    setLocalDate(value);
    onSelectDate?.(value);
  };
  const [month, setMonth] = useState(date.slice(0, 7));
  useEffect(() => {
    if (selectedDate) setMonth(selectedDate.slice(0, 7));
  }, [selectedDate]);
  const previousToday = useRef(today),
    grid = useRef(null),
    focusNext = useRef(false);
  const days = useMemo(
    () => monthDays(month, provider, firstWeekday),
    [month, provider, firstWeekday],
  );
  const lunar = provider?.validDate(date) ? provider.compute(date) : null;
  const occurrences = useMemo(
    () =>
      occurrencesBetween(
        appointments,
        days[0].iso < calendarConfig.minDate ? calendarConfig.minDate : days[0].iso,
        days.at(-1).iso > calendarConfig.maxDate ? calendarConfig.maxDate : days.at(-1).iso,
      ),
    [appointments, days],
  );
  const forDate = (value) =>
    occurrences.filter((event) => event.startDate <= value && event.endDate >= value);
  const select = (value, focus = false) => {
    if (!civil.validDate(value)) return;
    focusNext.current = focus;
    setDate(value);
    setMonth(value.slice(0, 7));
    const url = new URL(location.href);
    url.searchParams.set('date', value);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  };
  useEffect(() => {
    if (date === previousToday.current) select(today);
    previousToday.current = today;
  }, [today]);
  useEffect(() => {
    const change = () => {
      const target = new URLSearchParams(location.search).get('date');
      if (civil.validDate(target)) {
        setDate(target);
        setMonth(target.slice(0, 7));
      }
    };
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, [civil]);
  useEffect(() => {
    if (focusNext.current) {
      grid.current?.querySelector(`[data-date="${date}"]`)?.focus();
      focusNext.current = false;
    }
  }, [date, month]);
  const move = (delta) => {
    const value = moveMonth(month + '-01', delta);
    if (
      value.slice(0, 7) >= calendarConfig.minDate.slice(0, 7) &&
      value.slice(0, 7) <= calendarConfig.maxDate.slice(0, 7)
    )
      select(moveMonth(date, delta));
  };
  const key = (event, value) => {
    let target;
    if (event.key === 'ArrowLeft') target = moveDate(value, -1);
    if (event.key === 'ArrowRight') target = moveDate(value, 1);
    if (event.key === 'ArrowUp') target = moveDate(value, -7);
    if (event.key === 'ArrowDown') target = moveDate(value, 7);
    if (event.key === 'PageUp') target = moveMonth(value, -1);
    if (event.key === 'PageDown') target = moveMonth(value, 1);
    if (event.key === 'Home') target = month + '-01';
    if (event.key === 'End') target = moveDate(moveMonth(month + '-01', 1), -1);
    if (target) {
      event.preventDefault();
      select(target, true);
    }
  };
  const week = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
  return (
    <section className="ordinary-calendar" aria-label={labels.calendar}>
      <div className="calendar-heading">
        <CalendarDatePicker date={date} onSelect={select} />
        <div className="month-actions">
          <Button
            className="calendar-today"
            aria-label={copy.today}
            data-action="today"
            onPress={() => select(today, true)}
          >
            <Mn compact>{copy.today}</Mn>
          </Button>
          <IconButton
            icon={ChevronLeft}
            label={labels.previous}
            data-action="previous-month"
            isDisabled={month === '1901-01'}
            onPress={() => move(-1)}
          />
          <IconButton
            icon={ChevronRight}
            label={labels.next}
            data-action="next-month"
            isDisabled={month === '2100-12'}
            onPress={() => move(1)}
          />
        </div>
      </div>
      <div className="calendar-layout">
        <div className="month-surface">
          <div className="weekday-row">
            {Array.from({ length: 7 }, (_, i) => (i + firstWeekday) % 7).map((i) => (
              <Mn key={i} className={i >= 5 ? 'weekend' : ''}>
                {copy.weekdays[i]}
              </Mn>
            ))}
          </div>
          <div ref={grid} className="day-grid" role="group" aria-label={copy.choose}>
            {days.map((day) => (
              <Button
                key={day.iso}
                className={`day-cell ${day.inMonth ? '' : 'outside-month'}`}
                data-date={day.iso}
                data-selected={date === day.iso || undefined}
                aria-pressed={date === day.iso}
                aria-current={today === day.iso ? 'date' : undefined}
                aria-label={`${copy.gregorian} ${day.iso}${day.lunar ? ` · ${copy.lunar} ${day.lunar.lunarMonth} / ${day.lunar.lunarDay}` : ''}`}
                isDisabled={!civil.validDate(day.iso)}
                tabIndex={day.iso === (date.startsWith(month) ? date : month + '-01') ? 0 : -1}
                onKeyDown={(e) => key(e, day.iso)}
                onPress={() => {
                  select(day.iso);
                }}
              >
                <span className="day-number numeric">{day.day}</span>
                {showLunar && day.lunar && (
                  <span
                    className={`lunar-number numeric ${day.lunar.lunarDay === 1 ? 'month-start' : ''}`}
                  >
                    {day.lunar.leapMonth ? '* ' : ''}
                    {day.lunar.lunarDay === 1 ? `${day.lunar.lunarMonth} / ` : ''}
                    {day.lunar.lunarDay}
                  </span>
                )}
                {forDate(day.iso).length > 0 && (
                  <span className="appointment-dots" aria-hidden="true">
                    {forDate(day.iso)
                      .slice(0, 3)
                      .map((item) => (
                        <i key={item.id} data-event-color={item.color} />
                      ))}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
        <aside className="day-detail" aria-live="polite" data-selected-date={date}>
          <Button
            className="compact-day-summary"
            data-action="open-day"
            onPress={onOpenDay}
            aria-label={date + ' · ' + copy.agenda}
          >
            <span className="numeric">{civilDate(date).day}</span>
            <Mn compact>{copy.weekdays[week]}</Mn>
            {showLunar && lunar && (
              <span className="compact-lunar numeric">
                <Moon size={15} />
                {lunar.leapMonth ? '* ' : ''}
                {lunar.lunarMonth} / {lunar.lunarDay}
              </span>
            )}
            <ChevronRight size={17} />
          </Button>
          {onAdd && (
            <section className="month-day-agenda">
              <Agenda items={forDate(date)} onOpen={onOpenEvent} onAdd={() => onAdd(date)} />
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
