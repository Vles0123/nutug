import React from 'react';
import { Button } from 'react-aria-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import almanac from '../content-source/almanac-data.js';
import { Mn, IconButton, Sheet, ColumnScroller, SourceLinks } from './ui';
import { labels } from './ui-copy.mjs';
import { moveDate } from '../shared/calendar.mjs';

/* Chinese almanac (黄历) for the selected day, bundled with the calendar so it works offline. */
const ui = almanac.ui;
const translate = (table, key) => table[key] || ui.translationPending;
const ganZhi = (value) => almanac.stems[value[0]] + ' ' + almanac.branches[value[1]];
const SUMMARY_TERMS = 3;

export const almanacTitle = ui.title;

export function almanacFor(provider, date) {
  return provider?.validDate(date) ? provider.compute(date) : null;
}

export function AlmanacSummary({ day, onOpen }) {
  if (!day) return null;
  const groups = [
    ['yi', ui.yi, day.yi],
    ['ji', ui.ji, day.ji],
  ];
  return (
    <Button
      className="day-almanac"
      data-action="open-almanac"
      aria-label={`${ui.title} · ${day.civilDate}`}
      onPress={onOpen}
    >
      <span className="day-almanac-fact">
        <Mn compact className="day-almanac-label">
          {ui.title}
        </Mn>
        <Mn compact>{ganZhi(day.dayGanZhi)}</Mn>
        {day.solarTerm && <Mn compact>{translate(almanac.solarTerms, day.solarTerm)}</Mn>}
      </span>
      {groups.map(([key, label, terms]) => (
        <span className="day-almanac-group" data-almanac-group={key} key={key}>
          <Mn compact className="day-almanac-label">
            {label}
          </Mn>
          {terms.slice(0, SUMMARY_TERMS).map((term, i) => (
            <Mn compact key={i}>
              {translate(almanac.activities, term)}
            </Mn>
          ))}
          {terms.length > SUMMARY_TERMS && (
            <span className="numeric day-almanac-more">+{terms.length - SUMMARY_TERMS}</span>
          )}
        </span>
      ))}
      <ChevronRight size={17} aria-hidden="true" />
    </Button>
  );
}

export function AlmanacSheet({ open, onOpenChange, provider, date, onSelectDate }) {
  const day = open ? almanacFor(provider, date) : null;
  const step = (amount) => {
    const next = moveDate(date, amount);
    if (provider?.validDate(next)) onSelectDate(next);
  };
  return (
    <Sheet
      open={open && !!day}
      onOpenChange={onOpenChange}
      label={ui.title}
      className="almanac-sheet"
      wide
      headerActions={
        <span className="almanac-sheet-nav">
          <IconButton
            icon={ChevronLeft}
            label={ui.previous}
            data-action="almanac-previous"
            isDisabled={!provider?.validDate(moveDate(date, -1))}
            onPress={() => step(-1)}
          />
          <time className="numeric" dateTime={date}>
            {date}
          </time>
          <IconButton
            icon={ChevronRight}
            label={ui.next}
            data-action="almanac-next"
            isDisabled={!provider?.validDate(moveDate(date, 1))}
            onPress={() => step(1)}
          />
        </span>
      }
    >
      {day && <AlmanacDetail day={day} />}
    </Sheet>
  );
}

function AlmanacDetail({ day }) {
  const fields = [
    [
      ui.lunarDate,
      `${day.lunarYear} / ${day.leapMonth ? ui.leapMonth + ' ' : ''}${day.lunarMonth} / ${day.lunarDay}`,
    ],
    [ui.yearGanZhi, ganZhi(day.yearGanZhi)],
    [ui.monthGanZhi, ganZhi(day.monthGanZhi)],
    [ui.dayGanZhi, ganZhi(day.dayGanZhi)],
    [ui.zodiac, translate(almanac.animals, day.yearZodiac)],
    [ui.solarTerm, day.solarTerm ? translate(almanac.solarTerms, day.solarTerm) : ui.noSolarTerm],
  ];
  return (
    <div className="almanac-detail" data-almanac-date={day.civilDate}>
      <ColumnScroller className="almanac-detail-row almanac-detail-fields">
        {fields.map(([label, value]) => (
          <div className="almanac-detail-field" key={label}>
            <Mn className="muted">{label}</Mn>
            <Mn>{value}</Mn>
          </div>
        ))}
      </ColumnScroller>
      {[
        ['yi', ui.favorable, day.yi],
        ['ji', ui.unfavorable, day.ji],
      ].map(([key, title, terms]) => (
        <section className="almanac-detail-section" data-almanac-group={key} key={key}>
          <Mn as="h2" compact>
            {title}
          </Mn>
          <ColumnScroller className="almanac-detail-row almanac-detail-terms">
            {terms.map((term, i) => (
              <Mn key={i}>{translate(almanac.activities, term)}</Mn>
            ))}
          </ColumnScroller>
        </section>
      ))}
      <section className="almanac-detail-section">
        <Mn as="h2" compact>
          {labels.directions}
        </Mn>
        <ColumnScroller className="almanac-detail-row almanac-detail-fields">
          {day.directions.map((item) => (
            <div className="almanac-detail-field" key={item.key}>
              <Mn className="muted">{ui[item.key]}</Mn>
              <Mn>{translate(almanac.directions, item.value)}</Mn>
            </div>
          ))}
        </ColumnScroller>
      </section>
      <section className="almanac-detail-section">
        <Mn as="h2" compact>
          {ui.source}
        </Mn>
        <ColumnScroller className="almanac-detail-row almanac-detail-notes">
          {[
            ui.algorithmNote,
            ui.traditionNote,
            ui.directionNote,
            ui.ganZhiNote,
            ui.solarTermNote,
          ].map((note, i) => (
            <Mn as="p" key={i}>
              {note}
            </Mn>
          ))}
        </ColumnScroller>
        <SourceLinks items={almanac.sources} />
      </section>
    </div>
  );
}
