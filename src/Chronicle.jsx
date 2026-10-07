import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Button } from 'react-aria-components';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Mn, IconButton, ReadingColumns, Sheet, SourceLinks, SearchBox, Segments } from './ui';
import { labels } from './ui-copy.mjs';
import { orderedEvents, relatedPeople } from '../shared/history.mjs';
import { normalizeSearch } from './catalog.mjs';
import { Network } from './Network';

export function Chronicle({ snapshot }) {
  const data = snapshot.core;
  const events = useMemo(() => orderedEvents(data.events), [data.events]);
  const initial = new URLSearchParams(location.hash.slice(1)).get('event');
  const [selected, setSelected] = useState(
    () => events.find((event) => event.id === initial)?.id || events[0]?.id,
  );
  const [person, setPerson] = useState(null),
    [mode, setMode] = useState('family'),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState('');
  const scroll = useRef(null);
  const index = Math.max(
      0,
      events.findIndex((event) => event.id === selected),
    ),
    event = events[index];
  const choose = (id) => {
    setSelected(id);
    setSearch(false);
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
  useEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = 0;
  }, [selected]);
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
        <div className="chronicle-pagination">
          <IconButton
            icon={ChevronLeft}
            label={labels.previous}
            isDisabled={index === 0}
            data-action="chronicle-previous"
            onPress={() => choose(events[index - 1].id)}
          />
          <span className="numeric">
            {index + 1} / {events.length}
          </span>
          <IconButton
            icon={ChevronRight}
            label={labels.next}
            isDisabled={index === events.length - 1}
            data-action="chronicle-next"
            onPress={() => choose(events[index + 1].id)}
          />
        </div>
        <IconButton
          icon={Search}
          label={labels.search}
          data-action="chronicle-search"
          onPress={() => setSearch(true)}
        />
      </div>
      <div className="chronicle-body">
        <nav className="year-rail" aria-label={labels.timeline}>
          {events.map((item) => (
            <Button
              key={item.id}
              data-event={item.id}
              aria-current={item.id === event.id ? 'true' : undefined}
              onPress={() => choose(item.id)}
            >
              {item.precision === 'period' ? (
                <Mn>{item.date}</Mn>
              ) : (
                <span className="numeric">{item.date}</span>
              )}
            </Button>
          ))}
        </nav>
        <ReadingColumns className="chronicle-reading" scrollRef={scroll}>
          <article className="chronicle-entry" data-event-id={event.id}>
            <div className="chronicle-title">
              <span className="numeric chronicle-year">
                {event.precision === 'period' ? '' : event.date}
              </span>
              <Mn as="h1">{event.title}</Mn>
            </div>
            {event.precision === 'period' && <Mn className="event-date">{event.date}</Mn>}
            <Mn as="p" className="reading-text">
              {event.text}
            </Mn>
            <div className="event-people">
              <Mn as="h2">{labels.people}</Mn>
              {event.people.map(
                (id) =>
                  data.people[id] && (
                    <Button key={id} data-person={id} onPress={() => setPerson(id)}>
                      <Mn>{data.people[id].name}</Mn>
                    </Button>
                  ),
              )}
            </div>
            {event.sources?.length > 0 && (
              <div className="event-sources">
                <Mn as="h2">{labels.sources}</Mn>
                <SourceLinks items={citations(event.sources)} />
              </div>
            )}
          </article>
        </ReadingColumns>
      </div>
      <Sheet
        open={search}
        onOpenChange={setSearch}
        label={labels.search}
        wide
        className="chronicle-search-sheet"
      >
        <SearchBox value={query} onChange={setQuery} autoFocus />
        <div className="chronicle-results">
          {filtered.map((item) => (
            <Button key={item.id} data-search-event={item.id} onPress={() => choose(item.id)}>
              <span className="numeric">{item.precision === 'period' ? '' : item.date}</span>
              <Mn>{item.title}</Mn>
            </Button>
          ))}
          {!filtered.length && <Mn>{data.knowledge.ui.empty}</Mn>}
        </div>
      </Sheet>
      <Sheet
        open={!!record}
        onOpenChange={(open) => {
          if (!open) setPerson(null);
        }}
        label={record?.name || labels.people}
        wide
        className="person-sheet"
      >
        {record && (
          <div className="context-person" data-person-record={person}>
            <div className="person-reading">
              <Mn as="p">{record.summary}</Mn>
              <SourceLinks items={citations(record.sources)} />
            </div>
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
                onSelect={setPerson}
                onEdge={(edge) => setPerson(edge.from === person ? edge.to : edge.from)}
                kind="people"
              />
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}
