import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { ChevronLeft, ChevronRight, ChevronDown, Moon } from 'lucide-react';
import { Mn, IconButton } from './ui';
import { labels } from './ui-copy.mjs';
import { calendarCopy as copy, calendarConfig } from './calendar-copy.mjs';
import {
  chineseLunisolarProvider,
  civilDate,
  moveDate,
  moveMonth,
  monthDays,
} from '../shared/calendar.mjs';
import { useToday } from './useToday';
import { Agenda } from './CalendarAgenda';
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
  const provider = useMemo(
    () => chineseLunisolarProvider(window.ChineseAlmanac, calendarConfig),
    [],
  );
  const initial = new URLSearchParams(location.search).get('date');
  const [localDate, setLocalDate] = useState(() => (provider.validDate(initial) ? initial : today));
  const date = selectedDate || localDate;
  const setDate = (value) => {
    setLocalDate(value);
    onSelectDate?.(value);
  };
  const [month, setMonth] = useState(date.slice(0, 7));
  useEffect(() => {
    if (selectedDate) setMonth(selectedDate.slice(0, 7));
  }, [selectedDate]);
  const [picker, setPicker] = useState(false);
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const previousToday = useRef(today),
    grid = useRef(null),
    focusNext = useRef(false);
  const days = useMemo(
    () => monthDays(month, provider, firstWeekday),
    [month, provider, firstWeekday],
  );
  const lunar = provider.compute(date);
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
    if (!provider.validDate(value)) return;
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
      if (provider.validDate(target)) {
        setDate(target);
        setMonth(target.slice(0, 7));
      }
    };
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, [provider]);
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
        <DialogTrigger
          isOpen={picker}
          onOpenChange={(open) => {
            setYear(Number(month.slice(0, 4)));
            setPicker(open);
          }}
        >
          <Button className="month-title" aria-label={copy.choose} data-action="choose-month">
            <span className="numeric">{month.replace('-', ' / ')}</span>
            <ChevronDown size={18} />
          </Button>
          <Popover className="month-picker" placement="bottom start">
            <Dialog aria-label={copy.choose}>
              <div className="picker-year">
                <IconButton
                  icon={ChevronLeft}
                  label={labels.previous}
                  isDisabled={year <= 1901}
                  onPress={() => setYear(year - 1)}
                />
                <input
                  className="numeric"
                  type="number"
                  min="1901"
                  max="2100"
                  value={year}
                  aria-label={copy.year}
                  onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <IconButton
                  icon={ChevronRight}
                  label={labels.next}
                  isDisabled={year >= 2100}
                  onPress={() => setYear(year + 1)}
                />
              </div>
              <div className="picker-months">
                {Array.from({ length: 12 }, (_, i) => (
                  <Button
                    key={i}
                    className="numeric"
                    aria-label={`${i + 1} ${copy.month}`}
                    isDisabled={!Number.isInteger(year) || year < 1901 || year > 2100}
                    onPress={() => {
                      select(
                        moveMonth(
                          date,
                          (year - Number(date.slice(0, 4))) * 12 + i + 1 - Number(date.slice(5, 7)),
                        ),
                      );
                      setPicker(false);
                    }}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            </Dialog>
          </Popover>
        </DialogTrigger>
        <div className="month-actions">
          <Button className="today-button" data-action="today" onPress={() => select(today, true)}>
            <Mn>{copy.today}</Mn>
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
                aria-label={`${day.iso} · ${copy.lunar} ${day.lunar?.lunarMonth || ''} / ${day.lunar?.lunarDay || ''}`}
                isDisabled={!provider.validDate(day.iso)}
                tabIndex={day.iso === (date.startsWith(month) ? date : month + '-01') ? 0 : -1}
                onKeyDown={(e) => key(e, day.iso)}
                onPress={() => {
                  select(day.iso);
                  if (window.matchMedia('(max-width: 700px)').matches) onOpenDay?.();
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
        {onOpenDay && (
          <Button
            className="compact-day-summary"
            data-action="open-day"
            onPress={onOpenDay}
            aria-label={date + ' · ' + copy.agenda}
          >
            <span className="numeric">{civilDate(date).day}</span>
            <Mn>{copy.weekdays[week]}</Mn>
            {showLunar && (
              <span className="compact-lunar numeric">
                <Moon size={16} />
                {lunar.lunarMonth} / {lunar.lunarDay}
              </span>
            )}
            {forDate(date).length > 0 && (
              <span className="numeric day-event-count">{forDate(date).length}</span>
            )}
            <ChevronRight size={18} />
          </Button>
        )}
        <aside className="day-detail" aria-live="polite" data-selected-date={date}>
          <div className="day-focus">
            <span className="focus-number numeric">{civilDate(date).day}</span>
            <Mn>{copy.weekdays[week]}</Mn>
          </div>
          <div className="date-pair">
            <Mn>{copy.gregorian}</Mn>
            <time className="date-value numeric" dateTime={date}>
              <span>{civilDate(date).year}</span>
              <strong>
                {civilDate(date).month} / {civilDate(date).day}
              </strong>
            </time>
          </div>
          {showLunar && (
            <div className="date-pair">
              <Mn>{copy.lunar}</Mn>
              <span className="date-value numeric">
                <span>{lunar.lunarYear}</span>
                <strong>
                  {lunar.lunarMonth} / {lunar.lunarDay}
                </strong>
                {lunar.leapMonth && <Mn className="leap-month-note">{copy.leapMonth}</Mn>}
              </span>
            </div>
          )}
          {onAdd && (
            <section className="month-day-agenda">
              <div className="agenda-heading">
                <Mn as="h2">{copy.agenda}</Mn>
                <span className="numeric">{forDate(date).length}</span>
              </div>
              <Agenda items={forDate(date)} onOpen={onOpenEvent} onAdd={() => onAdd(date)} />
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
