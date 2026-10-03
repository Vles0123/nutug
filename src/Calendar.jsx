import React, { useState } from 'react';
import { Button } from 'react-aria-components';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Mn, IconButton, Segments, ReadingColumns, SourceLinks } from './ui';
import { calendar as D, almanac as A, currentDate, sourceItems, labels } from './content';

export function CalendarView({ onRead, onAlmanac }) {
  const today = currentDate(),
    [date, setDate] = useState(today),
    [month, setMonth] = useState(today.slice(0, 7)),
    [region, setRegion] = useState('all');
  const [y, m] = month.split('-').map(Number);
  const filtered = D.events.filter((e) => region === 'all' || e.region === region),
    selected = filtered.filter((e) => e.dates.includes(date));
  const upcoming = filtered
    .flatMap((e) =>
      e.dates
        .filter((d) => d >= today)
        .slice(0, 1)
        .map((date) => ({ e, date })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7,
    days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const select = (value) => {
    setDate(value);
    setMonth(value.slice(0, 7));
  };
  const move = (delta) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const read = (e) =>
    onRead({
      title: e.title,
      subtitle: e.regionLabel,
      paragraphs: [e.summary, e.ruleText, e.note].filter(Boolean),
      sources: sourceItems(e.sources, D.sources),
    });
  return (
    <div className="calendar-page">
      <div className="calendar-main">
        <Segments
          label={D.ui.scope}
          value={region}
          onChange={setRegion}
          items={[
            { id: 'all', label: D.ui.all },
            { id: 'inner-mongolia', label: D.ui.innerMongolia },
            { id: 'mongolia', label: D.ui.mongolia },
          ]}
        />
        <section className="month-card">
          <div className="month-toolbar">
            <h2 className="numeric">{month.replace('-', ' / ')}</h2>
            <div>
              <IconButton icon={ChevronLeft} label={D.ui.previous} onPress={() => move(-1)} />
              <IconButton icon={CalendarDays} label={D.ui.today} onPress={() => select(today)} />
              <IconButton icon={ChevronRight} label={D.ui.next} onPress={() => move(1)} />
            </div>
          </div>
          <div className="weekdays">
            {D.ui.weekdays.map((s) => (
              <Mn key={s}>{s}</Mn>
            ))}
          </div>
          <div className="month-grid" role="group" aria-label={D.ui.selectDate}>
            {Array.from({ length: offset }, (_, i) => (
              <span key={'blank' + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1,
                key = `${month}-${String(day).padStart(2, '0')}`,
                es = filtered.filter((e) => e.dates.includes(key));
              return (
                <Button
                  key={key}
                  aria-label={key}
                  aria-pressed={date === key}
                  aria-current={today === key ? 'date' : undefined}
                  onPress={() => setDate(key)}
                  data-date={key}
                >
                  <span>{day}</span>
                  {es.length > 0 && <i />}
                </Button>
              );
            })}
          </div>
        </section>
        <div className="selected-date">
          <span className="numeric">{date}</span>
          <Button className="text-button" onPress={() => onAlmanac(date)}>
            <Mn>{D.ui.almanac}</Mn>
            <ChevronRight size={16} />
          </Button>
        </div>
        {selected.length ? (
          selected.map((e) => (
            <Button className="calendar-event" key={e.id} onPress={() => read(e)}>
              <Mn as="h3">{e.title}</Mn>
              <Mn className="muted">{e.summary}</Mn>
              <ChevronRight size={16} />
            </Button>
          ))
        ) : (
          <div className="calendar-empty">
            <Mn>{D.ui.empty}</Mn>
          </div>
        )}
      </div>
      <aside className="calendar-upcoming">
        <Mn as="h2">{D.ui.upcoming}</Mn>
        <div>
          {upcoming.map(({ e, date }) => (
            <Button key={e.id} className="upcoming-row" onPress={() => select(date)}>
              <span className="numeric">{date}</span>
              <Mn>{e.title}</Mn>
              <ChevronRight size={16} />
            </Button>
          ))}
        </div>
        {filtered.some((e) => !e.dates.some((d) => d.startsWith(y + '-'))) && (
          <>
            <Mn as="h3">
              {D.ui.pending} · {y}
            </Mn>
            {filtered
              .filter((e) => !e.dates.some((d) => d.startsWith(y + '-')))
              .map((e) => (
                <Button className="upcoming-row" key={e.id} onPress={() => read(e)}>
                  <Mn>{e.title}</Mn>
                  <ChevronRight size={16} />
                </Button>
              ))}
          </>
        )}
      </aside>
    </div>
  );
}
export function AlmanacView({ initialDate, onRead }) {
  const core = window.ChineseAlmanac,
    ui = A.ui;
  const [date, setDate] = useState(
      core.validDate(initialDate) ? initialDate : currentDate(A.timeZone),
    ),
    [input, setInput] = useState(date),
    [invalid, setInvalid] = useState(false);
  const r = core.compute(date),
    translate = (table, key) => table[key] || ui.translationPending;
  const ganZhi = (value) => A.stems[value[0]] + ' ' + A.branches[value[1]];
  const choose = (value) => {
    if (!core.validDate(value)) {
      setInvalid(true);
      return;
    }
    setDate(value);
    setInput(value);
    setInvalid(false);
  };
  const move = (delta) => {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + delta);
    choose(d.toISOString().slice(0, 10));
  };
  const fields = [
    [
      ui.lunarDate,
      `${r.lunarYear} / ${r.leapMonth ? ui.leapMonth + ' ' : ''}${r.lunarMonth} / ${r.lunarDay}`,
    ],
    [ui.yearGanZhi, ganZhi(r.yearGanZhi)],
    [ui.monthGanZhi, ganZhi(r.monthGanZhi)],
    [ui.dayGanZhi, ganZhi(r.dayGanZhi)],
    [ui.zodiac, translate(A.animals, r.yearZodiac)],
    [ui.solarTerm, r.solarTerm ? translate(A.solarTerms, r.solarTerm) : ui.noSolarTerm],
  ];
  return (
    <div className="almanac-page">
      <div className="date-controls">
        <IconButton
          icon={ChevronLeft}
          label={ui.previous}
          isDisabled={date <= A.minDate}
          onPress={() => move(-1)}
        />
        <input
          aria-label={ui.selectDate}
          type="text"
          inputMode="numeric"
          value={input}
          aria-invalid={invalid || undefined}
          onChange={(e) => setInput(e.target.value)}
          onBlur={() => choose(input)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') choose(input);
          }}
        />
        <IconButton
          icon={ChevronRight}
          label={ui.next}
          isDisabled={date >= A.maxDate}
          onPress={() => move(1)}
        />
        <IconButton
          icon={CalendarDays}
          label={ui.today}
          onPress={() => choose(currentDate(A.timeZone))}
        />
      </div>
      {invalid && (
        <Mn className="input-error" role="alert">
          {ui.rangeNote}
        </Mn>
      )}
      <div className="almanac-fields">
        {fields.map(([label, value]) => (
          <div className="almanac-field" key={label}>
            <Mn className="muted">{label}</Mn>
            <Mn>{value}</Mn>
          </div>
        ))}
      </div>
      <div className="almanac-activities">
        {[
          [ui.favorable, r.yi],
          [ui.unfavorable, r.ji],
        ].map(([title, terms]) => (
          <section key={title}>
            <Mn as="h2">{title}</Mn>
            <ReadingColumns>
              {terms.map((term, i) => (
                <Mn as="p" className="reading-text" key={i}>
                  {translate(A.activities, term)}
                </Mn>
              ))}
            </ReadingColumns>
          </section>
        ))}
      </div>
      <div className="almanac-fields directions">
        {r.directions.map((item) => (
          <div className="almanac-field" key={item.key}>
            <Mn className="muted">{ui[item.key]}</Mn>
            <Mn>{translate(A.directions, item.value)}</Mn>
          </div>
        ))}
      </div>
      <div className="date-examples">
        {A.quickDates.map((value) => (
          <Button key={value} className="numeric text-button" onPress={() => choose(value)}>
            {value}
          </Button>
        ))}
      </div>
      <div className="almanac-footer">
        <SourceLinks items={A.sources} />
        <Button
          className="text-button"
          onPress={() =>
            onRead({
              title: ui.calendarSystem,
              paragraphs: [
                ui.algorithmNote,
                ui.traditionNote,
                ui.directionNote,
                ui.ganZhiNote,
                ui.solarTermNote,
              ],
              sources: A.sources,
            })
          }
        >
          <Mn>{labels.details}</Mn>
        </Button>
      </div>
    </div>
  );
}
