import React from 'react';
import { Button, Switch } from 'react-aria-components';
import { ChevronRight, Flag } from 'lucide-react';
import festivalData from '../content-source/calendar-data.js';
import { Mn, Sheet, Segments, ColumnScroller, SourceLinks } from './ui';

/* Mongolian festivals and commemorations with year-by-year verified dates, bundled for offline use. */
const ui = festivalData.ui;
export const festivalTitle = ui.events;
export const festivalRegions = ['all', 'inner-mongolia', 'mongolia'];
const regionLabels = { all: ui.all, 'inner-mongolia': ui.innerMongolia, mongolia: ui.mongolia };

const byDate = new Map();
for (const festival of festivalData.events)
  for (const date of festival.dates) byDate.set(date, [...(byDate.get(date) || []), festival]);

export function festivalsOn(date, region) {
  if (!region || region === 'off') return [];
  return (byDate.get(date) || []).filter((item) => region === 'all' || item.region === region);
}

export function festivalSearch(query, region) {
  if (!query || !region || region === 'off') return [];
  return festivalData.events
    .filter((item) => region === 'all' || item.region === region)
    .filter((item) => [item.title, item.summary, item.regionLabel].join(' ').includes(query));
}

export function FestivalList({ items, onOpen }) {
  if (!items.length) return null;
  return (
    <div className="day-festivals" aria-label={ui.events}>
      {items.map((item) => (
        <Button
          key={item.id}
          className="day-festival"
          data-festival={item.id}
          aria-label={`${ui.events} · ${item.title}`}
          onPress={() => onOpen(item)}
        >
          <Flag size={15} aria-hidden="true" />
          <Mn compact className="day-festival-title">
            {item.title}
          </Mn>
          <Mn compact className="day-festival-region">
            {item.regionLabel}
          </Mn>
          <ChevronRight size={17} aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}

export function FestivalSheet({ festival, date, onOpenChange, onSelectDate }) {
  const year = Number(date.slice(0, 4));
  return (
    <Sheet
      open={!!festival}
      onOpenChange={onOpenChange}
      label={ui.events}
      className="festival-sheet"
      wide
    >
      {festival && (
        <div className="festival-detail" data-festival-detail={festival.id}>
          <ColumnScroller className="festival-detail-row">
            <Mn as="h2" className="festival-detail-title">
              {festival.title}
            </Mn>
            <div className="festival-detail-tags">
              <Mn compact>{festival.regionLabel}</Mn>
              <Mn compact>{festival.dateTypeLabel}</Mn>
            </div>
            {[festival.summary, festival.ruleText, festival.note].filter(Boolean).map((text, i) => (
              <Mn as="p" key={i} className={i ? 'muted' : ''}>
                {text}
              </Mn>
            ))}
          </ColumnScroller>
          <section className="festival-detail-section">
            <Mn as="h3" compact>
              {ui.date}
            </Mn>
            <div className="festival-dates">
              {festival.dates.map((value) => (
                <Button
                  key={value}
                  className="numeric"
                  data-festival-date={value}
                  aria-current={value === date ? 'date' : undefined}
                  onPress={() => {
                    onSelectDate(value);
                    onOpenChange(false);
                  }}
                >
                  {value}
                </Button>
              ))}
              {festival.pendingYears.map((value) => (
                <span key={value} className="festival-pending" data-pending-year={value}>
                  <span className="numeric">{value}</span>
                  <Mn compact>{ui.pending}</Mn>
                </span>
              ))}
            </div>
            {!festival.dates.some((value) => value.startsWith(year + '-')) &&
              !festival.pendingYears.includes(year) && (
                <span className="festival-pending">
                  <span className="numeric">{year}</span>
                  <Mn compact>{ui.unconfirmed}</Mn>
                </span>
              )}
          </section>
          <section className="festival-detail-section">
            <Mn as="h3" compact>
              {ui.sources}
            </Mn>
            <SourceLinks
              items={festival.sources.map((id) => festivalData.sources[id]).filter(Boolean)}
            />
          </section>
        </div>
      )}
    </Sheet>
  );
}

export function FestivalSettings({ value, onChange }) {
  const enabled = value !== 'off';
  return (
    <div className="calendar-festival-setting">
      <Switch
        className="calendar-switch"
        data-setting="festivals"
        isSelected={enabled}
        onChange={(on) => onChange(on ? 'all' : 'off')}
      >
        <span className="switch-track" />
        <Mn compact>{ui.events}</Mn>
      </Switch>
      {enabled && (
        <Segments
          label={ui.scope}
          value={value}
          onChange={onChange}
          items={festivalRegions.map((id) => ({ id, label: regionLabels[id] }))}
        />
      )}
    </div>
  );
}
