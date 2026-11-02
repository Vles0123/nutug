import React from 'react';
import { Button, Link } from 'react-aria-components';
import { BookOpen, ChevronRight, ArrowUpRight } from 'lucide-react';
import historyDays from 'nutug:history-days';
import { Mn, Sheet, ColumnScroller } from './ui';
import { labels } from './ui-copy.mjs';
import { calendarCopy as copy } from './calendar-copy.mjs';

/* History events with a source-backed day, matched by month and day ("on this day"). Dates before
   the Gregorian reform are kept as the sources record them, in the Julian calendar. */
const historyUrl = __NUTUG_HISTORY_URL__;

export function historyOn(date) {
  const year = Number(date.slice(0, 4));
  return historyDays
    .filter((event) => event.date.slice(5) === date.slice(5) && event.year < year)
    .map((event) => ({ ...event, yearsAgo: year - event.year }))
    .sort((a, b) => a.year - b.year);
}

export function HistoryList({ items, onOpen }) {
  if (!items.length) return null;
  return (
    <section className="day-history" aria-label={copy.onThisDay}>
      <Mn compact className="day-history-heading">
        {copy.onThisDay}
      </Mn>
      {items.map((item) => (
        <Button
          key={item.id}
          className="day-history-item"
          data-history-event={item.id}
          aria-label={`${copy.onThisDay} · ${item.year} · ${item.title}`}
          onPress={() => onOpen(item)}
        >
          <span className="day-history-years numeric">
            {item.year}
            <small>
              {item.yearsAgo} <Mn compact>{copy.yearsAgo}</Mn>
            </small>
          </span>
          <Mn compact className="day-history-title">
            {item.title}
          </Mn>
          <ChevronRight size={17} aria-hidden="true" />
        </Button>
      ))}
    </section>
  );
}

export function HistorySheet({ item, onOpenChange }) {
  return (
    <Sheet
      open={!!item}
      onOpenChange={onOpenChange}
      label={copy.onThisDay}
      className="history-day-sheet"
      wide
    >
      {item && (
        <div className="history-day-detail" data-history-detail={item.id}>
          <div className="history-day-facts">
            <time className="numeric" dateTime={item.date}>
              {item.date.replace(/^0+/, '')}
            </time>
            {item.calendar === 'julian' && <Mn compact>{copy.julianCalendar}</Mn>}
            <span className="numeric">
              {item.yearsAgo} <Mn compact>{copy.yearsAgo}</Mn>
            </span>
          </div>
          <ColumnScroller className="history-day-text">
            <Mn as="h2">{item.title}</Mn>
            <Mn as="p">{item.text}</Mn>
          </ColumnScroller>
          <Link
            className="history-day-link"
            data-action="read-history"
            href={historyUrl + '#event=' + encodeURIComponent(item.id)}
          >
            <BookOpen size={18} aria-hidden="true" />
            <Mn compact>{labels.read}</Mn>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </Sheet>
  );
}
