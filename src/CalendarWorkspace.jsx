import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Switch } from 'react-aria-components';
import {
  Plus,
  Settings2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  List,
  Upload,
  Download,
  Check,
  Trash2,
  MapPin,
} from 'lucide-react';
import { Mn, IconButton, Sheet, Segments, SearchBox, ColumnScroller } from './ui';
import { labels } from './ui-copy.mjs';
import { calendarCopy as copy, calendarConfig } from './calendar-copy.mjs';
import { calendarPreferences, preferenceKey } from './calendar-skins.mjs';
import { MonthCalendar } from './MonthCalendar';
import { SkinPicker } from './SkinPicker';
import { Agenda, DualDate } from './CalendarAgenda';
import { chineseLunisolarProvider, monthDays, moveDate, moveMonth } from '../shared/calendar.mjs';
import {
  readEvents,
  writeEvents,
  eventStorageKey,
  occurrencesBetween,
  normalizeEvent,
  eventForOccurrence,
  weekday,
  exportCalendar,
  importCalendar,
  eventColors,
} from '../shared/calendar-events.mjs';
import { useToday } from './useToday';
import './calendar-workspace.css';

const newId = () => crypto.randomUUID();
const preferences = () => {
  try {
    return calendarPreferences(JSON.parse(localStorage.getItem(preferenceKey) || '{}'));
  } catch {
    return calendarPreferences();
  }
};
const download = (text, name, type) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function CalendarWorkspace() {
  const today = useToday(calendarConfig.timeZone);
  const engine = useMemo(() => chineseLunisolarProvider(window.ChineseAlmanac, calendarConfig), []);
  const initial = new URLSearchParams(location.search).get('date');
  const [date, setDate] = useState(() => (engine.validDate(initial) ? initial : today));
  const [prefs, setPrefs] = useState(preferences);
  const [events, setEvents] = useState(() => {
    try {
      return readEvents(localStorage);
    } catch {
      return [];
    }
  });
  const [storageError, setStorageError] = useState(() => {
    try {
      readEvents(localStorage);
      return false;
    } catch {
      return true;
    }
  });
  const [storageLocked, setStorageLocked] = useState(storageError);
  const [undo, setUndo] = useState(null);
  const [viewMenu, setViewMenu] = useState(false),
    [dayOpen, setDayOpen] = useState(false),
    [settings, setSettings] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null),
    [selected, setSelected] = useState(null),
    [importResult, setImportResult] = useState(null);
  const file = useRef(null),
    previousToday = useRef(today);
  const select = (next) => {
    if (!engine.validDate(next)) return;
    setDate(next);
    const url = new URL(location.href);
    url.searchParams.set('date', next);
    history.replaceState(null, '', url.pathname + url.search);
  };
  useEffect(() => {
    document.title = labels.calendar;
    document.documentElement.dataset.skin = prefs.skin;
    document.documentElement.style.setProperty('--reading-scale', prefs.fontScale);
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(prefs));
    } catch {
      setStorageError(true);
    }
  }, [prefs]);
  useEffect(() => {
    if (date === previousToday.current) select(today);
    previousToday.current = today;
  }, [today]);
  useEffect(() => {
    const changed = (event) => {
      if (event.key === eventStorageKey) {
        try {
          setEvents(readEvents(localStorage));
          setStorageError(false);
          setStorageLocked(false);
          setUndo(null);
        } catch {
          setStorageError(true);
          setStorageLocked(true);
        }
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  const persist = (next) => {
    if (storageLocked) return false;
    try {
      const normalized = writeEvents(localStorage, next);
      setEvents(normalized);
      setStorageError(false);
      setUndo(null);
      return true;
    } catch {
      setStorageError(true);
      return false;
    }
  };
  const create = (chosen = date) => {
    setDayOpen(false);
    setEditor({
      draft: {
        id: newId(),
        title: '',
        notes: '',
        location: '',
        startDate: chosen,
        endDate: chosen,
        startTime: '09:00',
        endTime: '10:00',
        allDay: false,
        repeat: 'none',
        interval: 1,
        until: '',
        color: 'blue',
        exceptions: [],
      },
    });
  };
  const save = (draft) => {
    let next = events.filter((event) => event.id !== draft.id);
    if (editor.exception)
      next = next.map((event) =>
        event.id === editor.exception.eventId
          ? { ...event, exceptions: [...event.exceptions, editor.exception.date] }
          : event,
      );
    if (persist([...next, draft])) {
      setEditor(null);
      setSelected(null);
      select(draft.startDate);
      if (prefs.view === 'year') setPrefs({ ...prefs, view: 'month' });
    }
  };
  const remove = (one) => {
    const next = one
      ? events.map((event) =>
          event.id === selected.eventId
            ? { ...event, exceptions: [...event.exceptions, selected.occurrenceDate] }
            : event,
        )
      : events.filter((event) => event.id !== selected.eventId);
    if (persist(next)) {
      setSelected(null);
      setUndo(events);
    }
  };
  const first = date.slice(0, 7) + '-01';
  const monthRange = monthDays(date.slice(0, 7));
  const rangeStart =
    prefs.view === 'week'
      ? moveDate(date, -((weekday(date) - prefs.firstWeekday + 7) % 7))
      : prefs.view === 'day'
        ? date
        : monthRange[0].iso;
  const rangeEnd =
    prefs.view === 'week'
      ? moveDate(rangeStart, 6)
      : prefs.view === 'day'
        ? date
        : monthRange.at(-1).iso;
  const occurrences = useMemo(
    () =>
      occurrencesBetween(
        events,
        rangeStart < calendarConfig.minDate ? calendarConfig.minDate : rangeStart,
        rangeEnd > calendarConfig.maxDate ? calendarConfig.maxDate : rangeEnd,
      ),
    [events, rangeStart, rangeEnd],
  );
  const onDay = (day) =>
    occurrences.filter((event) => event.startDate <= day && event.endDate >= day);
  const found = useMemo(
    () =>
      events.filter((event) =>
        [event.title, event.notes, event.location, event.startDate].join(' ').includes(query),
      ),
    [events, query],
  );
  const viewItems = [
    ['year', LayoutGrid],
    ['month', CalendarDays],
    ['week', CalendarRange],
    ['day', List],
  ];
  const CurrentViewIcon = viewItems.find(([id]) => id === prefs.view)[1];
  const destination = (amount) =>
    prefs.view === 'year'
      ? moveMonth(date, amount * 12)
      : prefs.view === 'month'
        ? moveMonth(date, amount)
        : moveDate(date, amount * (prefs.view === 'week' ? 7 : 1));
  return (
    <div className="calendar-app" data-calendar-view={prefs.view}>
      <header className="calendar-app-bar">
        <Mn as="h1">{labels.calendar}</Mn>
        <div className="calendar-view-switch" role="group" aria-label={copy.display}>
          {viewItems.map(([id, Icon]) => (
            <Button
              key={id}
              data-view={id}
              aria-label={copy[id]}
              title={copy[id]}
              aria-pressed={prefs.view === id}
              onPress={() => setPrefs({ ...prefs, view: id })}
            >
              <Icon size={19} />
            </Button>
          ))}
        </div>
        <Button
          className="view-menu-trigger"
          data-action="choose-view"
          aria-label={copy.display + ' · ' + copy[prefs.view]}
          onPress={() => setViewMenu(true)}
        >
          <CurrentViewIcon size={21} />
          <ChevronDown size={16} />
        </Button>
        <div className="calendar-app-tools">
          <IconButton
            icon={Search}
            label={labels.search}
            data-action="schedule-search"
            onPress={() => setSearch(true)}
          />
          <IconButton
            icon={Plus}
            label={copy.add}
            data-action="new-event"
            onPress={() => create()}
          />
          <IconButton
            icon={Settings2}
            label={labels.settings}
            data-action="product-settings"
            onPress={() => setSettings(true)}
          />
        </div>
      </header>
      <main className="calendar-workspace">
        {prefs.view === 'month' ? (
          <MonthCalendar
            selectedDate={date}
            onSelectDate={select}
            firstWeekday={prefs.firstWeekday}
            showLunar={prefs.lunar}
            appointments={events}
            onAdd={create}
            onOpenEvent={setSelected}
            onOpenDay={() => setDayOpen(true)}
          />
        ) : (
          <>
            <div className="calendar-period-bar">
              <span className="numeric">
                {prefs.view === 'year'
                  ? date.slice(0, 4)
                  : prefs.view === 'week'
                    ? `${rangeStart} — ${rangeEnd.slice(5)}`
                    : date}
              </span>
              <div>
                <Button className="calendar-today" onPress={() => select(today)}>
                  <Mn>{copy.today}</Mn>
                </Button>
                <IconButton
                  icon={ChevronLeft}
                  label={labels.previous}
                  isDisabled={!engine.validDate(destination(-1))}
                  onPress={() => select(destination(-1))}
                />
                <IconButton
                  icon={ChevronRight}
                  label={labels.next}
                  isDisabled={!engine.validDate(destination(1))}
                  onPress={() => select(destination(1))}
                />
              </div>
            </div>
            {prefs.view === 'year' ? (
              <div className="year-grid">
                {Array.from({ length: 12 }, (_, index) => {
                  const month = `${date.slice(0, 4)}-${String(index + 1).padStart(2, '0')}`;
                  return (
                    <Button
                      key={month}
                      data-year-month={month}
                      onPress={() => {
                        select(month + '-01');
                        setPrefs({ ...prefs, view: 'month' });
                      }}
                    >
                      <span className="numeric year-month-number">{index + 1}</span>
                      <div className="mini-month">
                        {monthDays(month, undefined, prefs.firstWeekday).map((day) => (
                          <span
                            key={day.iso}
                            data-current={day.iso === today || undefined}
                            className={`numeric ${day.inMonth ? '' : 'muted'}`}
                          >
                            {day.day}
                          </span>
                        ))}
                      </div>
                    </Button>
                  );
                })}
              </div>
            ) : prefs.view === 'week' ? (
              <ColumnScroller className="week-board">
                {Array.from({ length: 7 }, (_, i) => moveDate(rangeStart, i)).map((day) => (
                  <section key={day} className="week-day" data-today={day === today || undefined}>
                    <Button
                      className="week-day-heading"
                      isDisabled={!engine.validDate(day)}
                      onPress={() => {
                        select(day);
                        setPrefs({ ...prefs, view: 'day' });
                      }}
                    >
                      <Mn>{copy.weekdays[weekday(day)]}</Mn>
                      <span className="numeric">{Number(day.slice(-2))}</span>
                      {prefs.lunar && engine.validDate(day) && (
                        <span className="numeric lunar-number">
                          {engine.compute(day).lunarMonth} / {engine.compute(day).lunarDay}
                        </span>
                      )}
                    </Button>
                    <Agenda
                      items={onDay(day)}
                      onOpen={setSelected}
                      onAdd={() => create(day)}
                      disabled={!engine.validDate(day)}
                      compact
                    />
                  </section>
                ))}
              </ColumnScroller>
            ) : (
              <div className="day-workspace">
                <DualDate date={date} provider={engine} lunar={prefs.lunar} />
                <Agenda items={onDay(date)} onOpen={setSelected} onAdd={() => create()} />
              </div>
            )}
          </>
        )}
      </main>
      <Sheet
        open={dayOpen}
        onOpenChange={setDayOpen}
        label={copy.agenda}
        className="calendar-day-sheet"
      >
        <DualDate date={date} provider={engine} lunar={prefs.lunar} />
        <Agenda
          items={onDay(date)}
          onOpen={(item) => {
            setDayOpen(false);
            setSelected(item);
          }}
          onAdd={() => create()}
        />
      </Sheet>
      {undo && (
        <div className="calendar-message" role="status">
          <Button data-action="undo-event" onPress={() => persist(undo)}>
            <Mn>{copy.undo}</Mn>
          </Button>
        </div>
      )}
      {storageError && (
        <div className="calendar-message" role="alert">
          <Mn>{copy.storageError}</Mn>
          <IconButton
            icon={Download}
            label={copy.export}
            onPress={() =>
              storageLocked
                ? download(
                    localStorage.getItem(eventStorageKey) || '',
                    'Nutug-recovery.json',
                    'application/json',
                  )
                : download(exportCalendar(events), 'Nutug.ics', 'text/calendar;charset=utf-8')
            }
          />
        </div>
      )}
      <Sheet
        open={viewMenu}
        onOpenChange={setViewMenu}
        label={copy.display}
        className="calendar-view-sheet"
      >
        <div className="calendar-view-options">
          {viewItems.map(([id, Icon]) => (
            <Button
              key={id}
              data-view-option={id}
              aria-pressed={prefs.view === id}
              onPress={() => {
                setPrefs({ ...prefs, view: id });
                setViewMenu(false);
              }}
            >
              <Icon size={20} />
              <Mn>{copy[id]}</Mn>
            </Button>
          ))}
        </div>
      </Sheet>
      <Sheet
        open={settings}
        onOpenChange={setSettings}
        label={labels.settings}
        className="calendar-settings-sheet"
      >
        <div className="calendar-settings-content">
          <Mn as="h2">{copy.appearance}</Mn>
          <SkinPicker value={prefs.skin} onChange={(skin) => setPrefs({ ...prefs, skin })} />
          <label className="calendar-font-setting">
            <Mn>{labels.type}</Mn>
            <input
              type="range"
              min="0.85"
              max="1.5"
              step="0.05"
              value={prefs.fontScale}
              aria-label={labels.type}
              onChange={(event) => setPrefs({ ...prefs, fontScale: Number(event.target.value) })}
            />
            <output className="numeric">{Math.round(prefs.fontScale * 100)}%</output>
          </label>
          <div className="calendar-setting-row">
            <Mn>{copy.firstWeekday}</Mn>
            <Segments
              label={copy.firstWeekday}
              value={String(prefs.firstWeekday)}
              onChange={(value) => setPrefs({ ...prefs, firstWeekday: Number(value) })}
              items={[
                { id: '0', label: copy.weekdays[0] },
                { id: '6', label: copy.weekdays[6] },
              ]}
            />
          </div>
          <Switch
            className="calendar-switch"
            isSelected={prefs.lunar}
            onChange={(value) => setPrefs({ ...prefs, lunar: value })}
          >
            <span className="switch-track" />
            <Mn>{copy.lunar}</Mn>
          </Switch>
          <div className="calendar-transfer">
            <Button onPress={() => file.current?.click()}>
              <Upload size={19} />
              <Mn>{copy.import}</Mn>
            </Button>
            <Button
              onPress={() =>
                download(exportCalendar(events), 'Nutug.ics', 'text/calendar;charset=utf-8')
              }
            >
              <Download size={19} />
              <Mn>{copy.export}</Mn>
            </Button>
          </div>
          <input
            ref={file}
            type="file"
            accept=".ics,text/calendar"
            hidden
            onChange={async (event) => {
              const chosen = event.target.files?.[0];
              if (!chosen) return;
              try {
                const incoming = importCalendar(await chosen.text(), newId);
                const merged = new Map(events.map((item) => [item.id, item]));
                for (const item of incoming) merged.set(item.id, item);
                if (persist([...merged.values()])) setImportResult({ count: incoming.length });
              } catch {
                setImportResult({ error: true });
              }
              event.target.value = '';
            }}
          />
          {importResult && (
            <div role="status" className="calendar-import-result">
              <Mn>{importResult.error ? copy.importError : copy.imported}</Mn>
              {!importResult.error && <span className="numeric">{importResult.count}</span>}
            </div>
          )}
        </div>
      </Sheet>
      <Sheet
        open={search}
        onOpenChange={setSearch}
        label={labels.search}
        className="calendar-search-sheet"
        wide
      >
        <SearchBox value={query} onChange={setQuery} autoFocus />
        <ColumnScroller className="schedule-search-results">
          {found.map((event) => (
            <Button
              key={event.id}
              onPress={() => {
                setSearch(false);
                select(event.startDate);
                setSelected({ ...event, eventId: event.id, occurrenceDate: event.startDate });
              }}
            >
              <span className="numeric">{event.startDate}</span>
              <Mn>{event.title}</Mn>
            </Button>
          ))}
          {!found.length && <Mn>{copy.empty}</Mn>}
        </ColumnScroller>
      </Sheet>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        label={copy.agenda}
        className="appointment-sheet"
      >
        {selected && (
          <div className="appointment-detail">
            <Mn as="h2">{selected.title}</Mn>
            <div className="appointment-facts">
              <span className="numeric">
                {selected.startDate}
                {selected.endDate !== selected.startDate ? ` — ${selected.endDate}` : ''}
              </span>
              {selected.allDay ? (
                <Mn>{copy.allDay}</Mn>
              ) : (
                <span className="numeric">
                  {selected.startTime} — {selected.endTime}
                </span>
              )}
              {selected.location && <Mn>{selected.location}</Mn>}
            </div>
            {selected.notes && (
              <ColumnScroller className="appointment-notes">
                <Mn>{selected.notes}</Mn>
              </ColumnScroller>
            )}
            <div className="appointment-actions">
              <Button
                data-action="edit-event"
                onPress={() => {
                  const event = events.find((event) => event.id === selected.eventId);
                  setEditor({ draft: event });
                  setSelected(null);
                }}
              >
                <Mn>
                  {selected.repeat !== 'none' ? `${copy.series} · ` : ''}
                  {copy.edit}
                </Mn>
              </Button>
              {selected.repeat !== 'none' && (
                <Button
                  data-action="edit-occurrence"
                  aria-label={copy.thisOccurrence + ' · ' + copy.edit}
                  onPress={() => {
                    const event = events.find((event) => event.id === selected.eventId);
                    setEditor({
                      draft: eventForOccurrence(event, selected.occurrenceDate, newId()),
                      exception: { eventId: event.id, date: selected.occurrenceDate },
                    });
                    setSelected(null);
                  }}
                >
                  <Mn>
                    {copy.thisOccurrence} · {copy.edit}
                  </Mn>
                </Button>
              )}
              <Button
                className="destructive"
                data-action="delete-event"
                onPress={() => remove(false)}
              >
                <Trash2 size={18} />
                <Mn>
                  {selected.repeat !== 'none' ? `${copy.series} · ` : ''}
                  {copy.delete}
                </Mn>
              </Button>
              {selected.repeat !== 'none' && (
                <Button
                  className="destructive"
                  data-action="delete-occurrence"
                  onPress={() => remove(true)}
                >
                  <Mn>
                    {copy.thisOccurrence} · {copy.delete}
                  </Mn>
                </Button>
              )}
            </div>
          </div>
        )}
      </Sheet>
      {editor && (
        <AppointmentEditor
          key={editor.draft.id}
          value={editor.draft}
          onSave={save}
          onClose={() => setEditor(null)}
          storageError={storageError}
        />
      )}
    </div>
  );
}

function AppointmentEditor({ value, onSave, onClose, storageError }) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState('');
  const form = useRef(null);
  const errorLabels = {
    title: copy.title,
    startDate: copy.start + ' · ' + copy.day,
    endDate: copy.end + ' · ' + copy.day,
    startTime: copy.start + ' · ' + copy.time,
    endTime: copy.end + ' · ' + copy.time,
    repeat: copy.repeat,
    interval: copy.interval,
    until: copy.until,
  };
  const change = (key, value) => setDraft({ ...draft, [key]: value });
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      label={copy.agenda}
      wide
      className="appointment-editor"
    >
      <form
        ref={form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(normalizeEvent(draft));
            setError('');
          } catch (issue) {
            const field = issue.message;
            setError(field);
            requestAnimationFrame(() => form.current?.elements.namedItem(field)?.focus?.());
          }
        }}
      >
        <div className="appointment-form-scroll">
          <label className="appointment-title-field">
            <Mn>{copy.title}</Mn>
            <textarea
              className="mn"
              autoFocus
              required
              name="title"
              aria-invalid={error === 'title' || undefined}
              value={draft.title}
              onChange={(event) => change('title', event.target.value)}
              aria-label={copy.title}
            />
          </label>
          <Switch
            className="calendar-switch"
            isSelected={draft.allDay}
            onChange={(value) =>
              setDraft({
                ...draft,
                allDay: value,
                ...(!value && draft.startTime === draft.endTime
                  ? { startTime: '09:00', endTime: '10:00' }
                  : {}),
              })
            }
          >
            <span className="switch-track" />
            <Mn>{copy.allDay}</Mn>
          </Switch>
          <div className="appointment-dates">
            {['start', 'end'].map((key) => (
              <label key={key}>
                <Mn>{copy[key]}</Mn>
                <div>
                  <input
                    type="text"
                    inputMode="text"
                    required
                    name={key + 'Date'}
                    aria-invalid={error === key + 'Date' || undefined}
                    pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                    aria-label={copy[key] + ' · ' + copy.day}
                    className="numeric"
                    value={draft[key + 'Date']}
                    onChange={(event) => change(key + 'Date', event.target.value)}
                  />
                  {!draft.allDay && (
                    <input
                      type="text"
                      inputMode="text"
                      required
                      name={key + 'Time'}
                      aria-invalid={error === key + 'Time' || undefined}
                      pattern="[0-9]{2}:[0-9]{2}"
                      className="numeric"
                      aria-label={copy[key] + ' · ' + copy.time}
                      value={draft[key + 'Time']}
                      onChange={(event) => change(key + 'Time', event.target.value)}
                    />
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="repeat-field">
            <Mn>{copy.repeat}</Mn>
            <Segments
              label={copy.repeat}
              value={draft.repeat}
              onChange={(value) => change('repeat', value)}
              items={[
                { id: 'none', label: copy.once },
                { id: 'daily', label: copy.day },
                { id: 'weekly', label: copy.week },
                { id: 'monthly', label: copy.month },
                { id: 'yearly', label: copy.year },
              ]}
            />
          </div>
          {draft.repeat !== 'none' && (
            <div className="appointment-dates">
              <label>
                <Mn>{copy.interval}</Mn>
                <input
                  type="number"
                  min="1"
                  max="99"
                  required
                  name="interval"
                  aria-invalid={error === 'interval' || undefined}
                  className="numeric"
                  aria-label={copy.interval}
                  value={draft.interval}
                  onChange={(event) => change('interval', Number(event.target.value))}
                />
              </label>
              <label>
                <Mn>{copy.until}</Mn>
                <input
                  type="text"
                  inputMode="text"
                  pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                  placeholder={draft.startDate}
                  name="until"
                  aria-invalid={error === 'until' || undefined}
                  className="numeric"
                  aria-label={copy.until}
                  value={draft.until}
                  onChange={(event) => change('until', event.target.value)}
                />
              </label>
            </div>
          )}
          <label className="appointment-note-field">
            <MapPin size={17} />
            <Mn>{copy.location}</Mn>
            <textarea
              className="mn"
              aria-label={copy.location}
              value={draft.location}
              onChange={(event) => change('location', event.target.value)}
            />
          </label>
          <label className="appointment-note-field">
            <Mn>{copy.notes}</Mn>
            <textarea
              className="mn"
              aria-label={copy.notes}
              value={draft.notes}
              onChange={(event) => change('notes', event.target.value)}
            />
          </label>
          <div className="event-colors">
            {eventColors.map((color, index) => (
              <Button
                key={color}
                data-event-color={color}
                aria-label={String(index + 1)}
                aria-pressed={draft.color === color}
                onPress={() => change('color', color)}
              >
                {draft.color === color && <Check size={18} />}
              </Button>
            ))}
          </div>
        </div>
        {(error || storageError) && (
          <Mn role="alert">
            {storageError ? copy.storageError : errorLabels[error] || copy.invalid}
          </Mn>
        )}
        <div className="appointment-form-footer">
          <Button type="button" onPress={onClose}>
            <Mn>{labels.close}</Mn>
          </Button>
          <Button className="primary-action" data-action="save-event" type="submit">
            <Check size={20} />
            <Mn>{copy.save}</Mn>
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
