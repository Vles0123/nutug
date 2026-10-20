import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Button } from 'react-aria-components';
import { ArrowLeft, ChevronLeft, ChevronRight, List, Search } from 'lucide-react';
import { Mn, IconButton, ColumnScroller, Sheet, SourceLinks, SearchBox, Segments } from './ui';
import { PagedReading } from './PagedReading';
import { labels } from './ui-copy.mjs';
import { orderedEvents, relatedPeople } from '../shared/history.mjs';
import { normalizeSearch } from './catalog.mjs';
import { Network } from './Network';

export function Chronicle({ snapshot }) {
  const peopleTrigger = useRef(null);
  const data = snapshot.core;
  const events = useMemo(() => orderedEvents(data.events), [data.events]);
  const initial = new URLSearchParams(location.hash.slice(1)).get('event');
  const [selected, setSelected] = useState(
    () => events.find((event) => event.id === initial)?.id || events[0]?.id,
  );
  const [catalogPeriod, setCatalogPeriod] = useState(null);
  const [person, setPerson] = useState(null),
    [mode, setMode] = useState('family'),
    [personView, setPersonView] = useState('details'),
    [personTrail, setPersonTrail] = useState([]),
    [contents, setContents] = useState(false),
    [context, setContext] = useState(null),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState('');
  const index = Math.max(
      0,
      events.findIndex((event) => event.id === selected),
    ),
    event = events[index];
  const periods = data.historyPeriods?.periods || [];
  const contentsEvents = catalogPeriod
    ? events.filter((item) => item.periodId === catalogPeriod)
    : events;
  const scriptedDate = /[\u1800-\u18af]/u.test(event?.date || '');
  const choose = (id) => {
    setSelected(id);
    setSearch(false);
    setContents(false);
    history.pushState(null, '', 'chronicle.html#event=' + encodeURIComponent(id));
  };
  useEffect(() => {
    const change = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get('event');
      if (events.some((e) => e.id === id)) setSelected(id);
    };
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, [events]);
  const openPerson = (id) => {
    setContext(null);
    setPerson(id);
    setPersonView('details');
    setPersonTrail([]);
  };
  const followPerson = (id) => {
    if (id === person) return;
    setPersonTrail((trail) => [...trail, person]);
    setPerson(id);
  };
  const filtered = useMemo(() => {
    const terms = normalizeSearch(query)
      .replace(/[᠐-᠙]/g, (d) => String(d.codePointAt(0) - 0x1810))
      .split(' ')
      .filter(Boolean);
    return events.filter((item) => {
      const text = normalizeSearch(
        [
          item.title,
          item.text,
          item.date,
          ...item.people.map((id) => data.people[id]?.name || ''),
        ].join(' '),
      );
      return terms.every((term) =>
        /^\d{3,4}$/.test(term)
          ? item.start !== null && Number(term) >= item.start && Number(term) <= item.end
          : text.includes(term),
      );
    });
  }, [query, events, data.people]);
  const record = person ? data.people[person] : null;
  const graph = useMemo(
    () =>
      person
        ? relatedPeople(
            person,
            data.people,
            data.peopleEdges.filter((edge) =>
              mode === 'family'
                ? ['parent', 'spouse'].includes(edge.type)
                : !['parent', 'spouse'].includes(edge.type),
            ),
          )
        : null,
    [person, mode, data],
  );
  const citations = (ids) =>
    (ids || [])
      .filter((id) => Object.hasOwn(data.sources, id))
      .map((id) => ({
        ...data.sources[id],
        title: data.sources[id].title || data.sources[id].name || data.sources[id].label,
      }));
  if (!event) return null;
  return (
    <section className="chronicle" aria-label={labels.chronicle}>
      <div className="chronicle-toolbar">
        <Button
          className="chronicle-contents-button"
          data-action="chronicle-contents"
          aria-label={labels.timeline}
          onPress={() => {
            setCatalogPeriod(event.periodId || null);
            setContents(true);
          }}
        >
          <List size={20} aria-hidden="true" />
          <Mn>{labels.timeline}</Mn>
          <span className="numeric">
            {index + 1} / {events.length}
          </span>
        </Button>
        <div className="chronicle-pagination">
          <IconButton
            icon={ChevronLeft}
            label={labels.previous}
            isDisabled={index === 0}
            data-action="chronicle-previous"
            onPress={() => choose(events[index - 1].id)}
          />
          <IconButton
            icon={ChevronRight}
            label={labels.next}
            isDisabled={index === events.length - 1}
            data-action="chronicle-next"
            onPress={() => choose(events[index + 1].id)}
          />
          <IconButton
            icon={Search}
            label={labels.search}
            data-action="chronicle-search"
            onPress={() => setSearch(true)}
          />
        </div>
      </div>
      <div className="chronicle-body">
        <nav className="year-rail" aria-label={labels.timeline}>
          {events
            .filter(
              (item, index) => events.findIndex((other) => other.date === item.date) === index,
            )
            .map((item) => (
              <Button
                key={item.id}
                data-event={item.id}
                aria-current={item.date === event.date ? 'true' : undefined}
                onPress={() => choose(item.id)}
              >
                {/[\u1800-\u18af]/u.test(item.date) ? (
                  <Mn>{item.date}</Mn>
                ) : (
                  <span className="numeric">{item.date}</span>
                )}
              </Button>
            ))}
        </nav>
        <div className="chronicle-workspace">
          <PagedReading className="chronicle-reading" contentKey={event.id}>
            <article className="chronicle-entry" data-event-id={event.id}>
              <div className="chronicle-title">
                {!scriptedDate && <span className="numeric chronicle-year">{event.date}</span>}
                <Mn as="h1">{event.title}</Mn>
              </div>
              {scriptedDate && <Mn className="event-date">{event.date}</Mn>}
              <Mn as="p" className="reading-text">
                {event.text}
              </Mn>
            </article>
          </PagedReading>
          <div className="chronicle-context">
            {event.people.length > 0 && (
              <Button
                ref={peopleTrigger}
                data-action="event-people"
                onPress={() =>
                  event.people.length === 1 ? openPerson(event.people[0]) : setContext('people')
                }
              >
                <Mn>
                  {event.people.length === 1 ? data.people[event.people[0]].name : labels.people}
                </Mn>
                {event.people.length > 1 && <span className="numeric">{event.people.length}</span>}
              </Button>
            )}
            {event.sources?.length > 0 && (
              <Button data-action="event-sources" onPress={() => setContext('sources')}>
                <Mn>{labels.sources}</Mn>
                <span className="numeric">{event.sources.length}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      <Sheet
        open={!!context}
        onOpenChange={(open) => {
          if (!open) setContext(null);
        }}
        label={labels[context] || labels.people}
        className="event-context-sheet"
        wide
      >
        <ColumnScroller className="event-context-content">
          {context === 'people' ? (
            event.people.map(
              (id) =>
                data.people[id] && (
                  <Button key={id} data-person={id} onPress={() => openPerson(id)}>
                    <Mn>{data.people[id].name}</Mn>
                  </Button>
                ),
            )
          ) : (
            <SourceLinks items={citations(event.sources)} />
          )}
        </ColumnScroller>
      </Sheet>
      <Sheet
        open={contents}
        onOpenChange={setContents}
        label={labels.timeline}
        wide
        className="chronicle-contents-sheet"
      >
        {periods.length > 0 && (
          <ColumnScroller
            className="history-period-options"
            role="group"
            aria-label={labels.timeline}
          >
            {periods.map((period) => (
              <Button
                key={period.id}
                data-history-period={period.id}
                aria-pressed={catalogPeriod === period.id}
                onPress={() => setCatalogPeriod(period.id)}
              >
                <span className="numeric">
                  {period.startYear}—{period.endYear}
                </span>
                <Mn>{period.title}</Mn>
              </Button>
            ))}
          </ColumnScroller>
        )}
        <ColumnScroller className="chronicle-contents">
          {contentsEvents.map((item) => (
            <Button
              key={item.id}
              data-contents-event={item.id}
              aria-current={item.id === event.id ? 'true' : undefined}
              onPress={() => choose(item.id)}
            >
              {!/[\u1800-\u18af]/u.test(item.date) && <span className="numeric">{item.date}</span>}
              <Mn>{item.title}</Mn>
              {/[\u1800-\u18af]/u.test(item.date) && (
                <Mn className="contents-period">{item.date}</Mn>
              )}
            </Button>
          ))}
        </ColumnScroller>
      </Sheet>
      <Sheet
        open={search}
        onOpenChange={setSearch}
        label={labels.search}
        wide
        className="chronicle-search-sheet"
      >
        <div className="chronicle-search-workspace">
          <SearchBox value={query} onChange={setQuery} autoFocus />
          <ColumnScroller className="chronicle-results">
            {filtered.map((item) => (
              <Button key={item.id} data-search-event={item.id} onPress={() => choose(item.id)}>
                <span className="numeric">
                  {/[\u1800-\u18af]/u.test(item.date) ? '' : item.date}
                </span>
                <Mn>{item.title}</Mn>
              </Button>
            ))}
            {!filtered.length && <Mn>{data.knowledge.ui.empty}</Mn>}
          </ColumnScroller>
        </div>
      </Sheet>
      <Sheet
        open={!!record}
        onOpenChange={(open) => {
          if (!open) {
            setPerson(null);
            requestAnimationFrame(() => peopleTrigger.current?.focus());
          }
        }}
        label={record?.name || labels.people}
        wide
        className="person-sheet"
        headerActions={
          record && (
            <div className="person-controls">
              {personTrail.length > 0 && (
                <IconButton
                  icon={ArrowLeft}
                  label={labels.back}
                  data-action="person-back"
                  onPress={() => {
                    setPerson(personTrail.at(-1));
                    setPersonTrail((trail) => trail.slice(0, -1));
                  }}
                />
              )}
              <Segments
                label={labels.people}
                value={personView}
                onChange={setPersonView}
                items={[
                  { id: 'details', label: labels.details },
                  { id: 'relations', label: labels.relations },
                ]}
              />
            </div>
          )
        }
      >
        {record && (
          <div className="context-person" data-person-record={person}>
            {personView === 'details' ? (
              <PagedReading className="person-reading" contentKey={person}>
                {record.years && <Mn className="person-years">{record.years}</Mn>}
                <Mn as="p" className="reading-text">
                  {record.summary}
                </Mn>
                <SourceLinks items={citations(record.sources)} />
              </PagedReading>
            ) : (
              <div className="person-network">
                <Segments
                  label={labels.relations}
                  value={mode}
                  onChange={setMode}
                  items={[
                    { id: 'family', label: labels.family },
                    { id: 'power', label: labels.power },
                  ]}
                />
                <Network
                  nodes={graph.nodes}
                  edges={graph.edges}
                  selected={person}
                  onSelect={followPerson}
                  onEdge={(edge) => followPerson(edge.from === person ? edge.to : edge.from)}
                  kind="people"
                />
              </div>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}
