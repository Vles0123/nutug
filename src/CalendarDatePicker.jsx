import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Mn, IconButton } from './ui';
import { labels } from './ui-copy.mjs';
import { calendarCopy as copy, calendarConfig } from './calendar-copy.mjs';
import { gregorianProvider, moveMonth, normalizeDateInput } from '../shared/calendar.mjs';

const civil = gregorianProvider(calendarConfig);
const minYear = Number(civil.minDate.slice(0, 4));
const maxYear = Number(civil.maxDate.slice(0, 4));

export function CalendarDatePicker({ date, onSelect, children }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(date.slice(0, 4)));
  const [draft, setDraft] = useState(date);
  const [invalid, setInvalid] = useState(false);
  const input = useRef(null);
  const select = (next) => {
    onSelect(next);
    setOpen(false);
  };
  return (
    <DialogTrigger
      isOpen={open}
      onOpenChange={(next) => {
        setYear(Number(date.slice(0, 4)));
        setDraft(date);
        setInvalid(false);
        setOpen(next);
      }}
    >
      <Button
        className="month-title"
        aria-label={`${copy.gregorian} · ${copy.choose} · ${date}`}
        data-action="choose-month"
      >
        <span className="numeric">{children || date.slice(0, 7).replace('-', ' / ')}</span>
        <ChevronDown size={18} />
      </Button>
      <Popover className="month-picker" placement="bottom start">
        <Dialog aria-label={copy.choose}>
          <form
            className="calendar-date-jump"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const value = normalizeDateInput(draft);
              if (civil.validDate(value)) select(value);
              else {
                setInvalid(true);
                input.current?.focus();
              }
            }}
          >
            <Mn>{copy.gregorian}</Mn>
            <input
              ref={input}
              className="numeric"
              name="calendar-date"
              aria-label={copy.choose}
              aria-invalid={invalid || undefined}
              value={draft}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setDraft(event.target.value);
                setInvalid(false);
              }}
            />
            <Button
              type="submit"
              className="icon-button"
              aria-label={copy.choose}
              data-action="jump-date"
            >
              <Check size={20} />
            </Button>
          </form>
          {invalid && (
            <Mn className="calendar-date-error" role="alert">
              {copy.choose}
            </Mn>
          )}
          <div className="picker-year">
            <IconButton
              icon={ChevronLeft}
              label={labels.previous}
              isDisabled={year <= minYear}
              onPress={() => setYear(Number(year) - 1)}
            />
            <input
              className="numeric"
              type="number"
              min={minYear}
              max={maxYear}
              value={year}
              aria-label={copy.year}
              onChange={(event) =>
                setYear(event.target.value === '' ? '' : Number(event.target.value))
              }
            />
            <IconButton
              icon={ChevronRight}
              label={labels.next}
              isDisabled={year >= maxYear}
              onPress={() => setYear(Number(year) + 1)}
            />
          </div>
          <div className="picker-months">
            {Array.from({ length: 12 }, (_, i) => (
              <Button
                key={i}
                className="numeric"
                aria-label={`${i + 1} ${copy.month}`}
                isDisabled={!Number.isInteger(year) || year < minYear || year > maxYear}
                onPress={() =>
                  select(
                    moveMonth(
                      date,
                      (year - Number(date.slice(0, 4))) * 12 + i + 1 - Number(date.slice(5, 7)),
                    ),
                  )
                }
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
