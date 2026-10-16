import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Link, I18nProvider } from 'react-aria-components';
import { MotionConfig, motion } from 'motion/react';
import {
  Network as NetworkIcon,
  Users,
  BookOpen,
  CalendarDays,
  Search,
  PanelRight,
  ChevronRight,
  History,
  ArrowLeft,
} from 'lucide-react';
import {
  Mn,
  IconButton,
  Segments,
  Sheet,
  ReadingSettings,
  SearchBox,
  ColumnScroller,
  MongolianTypeIcon as Type,
} from './ui';
import { uiLocale } from './ui-copy.mjs';
import { Network } from './Network';
import { Inspector, Reader, makeRecord } from './Records';
import { Library } from './Library';
import { ContentControls } from './ContentControls';
import { searchCatalog } from './catalog.mjs';
import { CalendarView, AlmanacView } from './Calendar';
import {
  people,
  peopleEdges,
  events,
  tribes,
  articles,
  labels,
  matches,
  own,
  gaps,
  sourceItems,
  edgeKey,
  knowledge,
  catalogIndex,
  catalogById,
  contentClient,
} from './content';
import './tokens.css';
import './styles.css';
import './reading.css';
import './discovery.css';
import './mongolian-interaction.css';

const destinations = [
  ['calendar', CalendarDays, 'calendar.html'],
  ['chronicle', BookOpen, 'chronicle.html'],
];
const nodeLists = {
  people: Object.entries(people).map(([id, n]) => ({ id, ...n })),
  tribes: Object.entries(tribes.nodes).map(([id, n]) => ({ id, ...n })),
};
function route() {
  const path = location.pathname;
  return (
    window.NutugNativePage ||
    (/almanac/.test(path)
      ? 'almanac'
      : /calendar/.test(path)
        ? 'calendar'
        : /tribes/.test(path)
          ? 'tribes'
          : /^#(knowledge|article=)/.test(location.hash)
            ? 'library'
            : 'people')
  );
}
function hashValues() {
  return new URLSearchParams(location.hash.slice(1));
}
function readScale() {
  try {
    return (
      Math.round(
        Math.max(0.85, Math.min(1.5, Number(localStorage.getItem('nutug.readingScale')) || 1)) *
          100,
      ) / 100
    );
  } catch {
    return 1;
  }
}

function App() {
  const [page, setPage] = useState(route),
    [selectedPerson, setPerson] = useState(() =>
      own(people, hashValues().get('person')) ? hashValues().get('person') : 'temujin',
    ),
    [selectedTribe, setTribe] = useState(() =>
      own(tribes.nodes, hashValues().get('tribe'))
        ? hashValues().get('tribe')
        : 'temujin_following',
    );
  const [period, setPeriod] = useState('all'),
    [mode, setMode] = useState('family'),
    [edge, setEdge] = useState(null),
    [eventFocus, setEventFocus] = useState(null);
  const [inspector, setInspector] = useState(true),
    [reader, setReader] = useState(null),
    [catalogRequest, setCatalogRequest] = useState(0),
    [libraryQuery, setLibraryQuery] = useState(
      () => new URLSearchParams(location.search).get('q') || '',
    ),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(''),
    [settings, setSettings] = useState(false),
    [timeline, setTimeline] = useState(false),
    [scale, setScale] = useState(readScale),
    [almanacDate, setAlmanacDate] = useState(new URLSearchParams(location.search).get('date'));
  const readingRequest = useRef(0);
  const networkRef = useRef(null),
    native = !!window.webkit?.messageHandlers?.nutug;
  const isTribes = page === 'tribes',
    graphPage = page === 'tribes' || page === 'people',
    selected = isTribes ? selectedTribe : selectedPerson;
  const filteredEdges = useMemo(
    () =>
      isTribes
        ? tribes.edges.filter((e) => period === 'all' || e.period === period)
        : peopleEdges.filter(
            (e) =>
              (mode === 'family'
                ? ['parent', 'spouse'].includes(e.type)
                : !['parent', 'spouse'].includes(e.type)) &&
              (!eventFocus || (eventFocus.includes(e.from) && eventFocus.includes(e.to))),
          ),
    [isTribes, period, mode, eventFocus],
  );
  const nodes = useMemo(
    () =>
      nodeLists[isTribes ? 'tribes' : 'people'].filter(
        (n) => isTribes || !eventFocus || eventFocus.includes(n.id),
      ),
    [isTribes, eventFocus],
  );
  const record = useMemo(
    () => (graphPage ? makeRecord(page, selected, edge) : null),
    [graphPage, page, selected, edge],
  );
  function setReading(value) {
    setScale(Math.round(Math.max(0.85, Math.min(1.5, Number(value) || 1)) * 100) / 100);
  }
  async function openReader(value, { push = true } = {}) {
    const request = ++readingRequest.current;
    const meta = catalogById.get(value.id);
    if (!meta) {
      setReader(value);
      return;
    }
    if (push && hashValues().get('article') !== meta.id) {
      const url = new URL('index.html', location.href);
      if (libraryQuery) url.searchParams.set('q', libraryQuery);
      url.hash = 'article=' + encodeURIComponent(meta.id);
      history.pushState({ nutugReader: true }, '', url.pathname + url.search + url.hash);
    }
    setReader({ id: meta.id, title: meta.title, pending: true, paragraphs: [], sources: [] });
    try {
      const document = await contentClient.document(meta);
      if (request === readingRequest.current)
        setReader({ ...document, subtitle: document.summary });
    } catch {
      if (request === readingRequest.current)
        setReader({ id: meta.id, title: meta.title, error: true, paragraphs: [], sources: [] });
    }
  }
  function closeReader() {
    readingRequest.current++;
    setReader(null);
    if (hashValues().get('article')) {
      if (history.state?.nutugReader) history.back();
      else {
        history.replaceState(null, '', location.pathname + location.search + '#knowledge');
        setPage('library');
      }
    }
  }
  function navigate(next, hash = '') {
    readingRequest.current++;
    setPage(next);
    setEdge(null);
    setEventFocus(null);
    setReader(null);
    setSearch(false);
    const file =
      next === 'tribes'
        ? 'tribes.html'
        : next === 'calendar'
          ? 'calendar.html'
          : next === 'almanac'
            ? 'almanac.html'
            : 'index.html';
    const fragment = hash || (next === 'library' ? '#knowledge' : '');
    history.pushState(null, '', file + fragment);
  }
  function select(id) {
    if (isTribes) {
      if (!own(tribes.nodes, id)) return;
      setTribe(id);
    } else {
      if (!own(people, id)) return;
      setPerson(id);
    }
    setEdge(null);
    setInspector(true);
    history.replaceState(
      null,
      '',
      location.pathname + (isTribes ? '#tribe=' : '#person=') + encodeURIComponent(id),
    );
  }
  function selectPerson(id) {
    if (!own(people, id)) return;
    navigate('people', '#person=' + encodeURIComponent(id));
    setPerson(id);
    setInspector(true);
  }
  function selectTribe(id) {
    if (!own(tribes.nodes, id)) return;
    navigate('tribes', '#tribe=' + encodeURIComponent(id));
    setTribe(id);
    setInspector(true);
  }
  const selectEdge = (e) => {
    setEdge(e);
    setInspector(true);
  };
  useEffect(() => {
    document.documentElement.style.setProperty('--reading-scale', scale);
    try {
      localStorage.setItem('nutug.readingScale', String(scale));
    } catch {}
  }, [scale]);
  useEffect(() => {
    document.title = reader?.title || labels[page] || labels.calendar;
  }, [page, reader]);
  useEffect(() => {
    const change = () => {
      setPage(route());
      const h = hashValues();
      if (own(people, h.get('person'))) setPerson(h.get('person'));
      if (own(tribes.nodes, h.get('tribe'))) setTribe(h.get('tribe'));
      setLibraryQuery(new URLSearchParams(location.search).get('q') || '');
      const article = catalogById.get(h.get('article'));
      if (article) openReader(article, { push: false });
      else {
        readingRequest.current++;
        setReader(null);
      }
      setEdge(null);
    };
    change();
    window.addEventListener('popstate', change);
    window.addEventListener('hashchange', change);
    return () => {
      window.removeEventListener('popstate', change);
      window.removeEventListener('hashchange', change);
    };
  }, []);
  useEffect(() => {
    if (page !== 'library' || reader) return;
    const url = new URL(location.href);
    if (libraryQuery) url.searchParams.set('q', libraryQuery);
    else url.searchParams.delete('q');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }, [page, libraryQuery, reader]);
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    window.NutugShell = {
      setScale: setReading,
      command: (id) => {
        const n = networkRef.current;
        const actions = {
          fit: () => n?.fit(),
          fitTribes: () => n?.fit(),
          plus: () => n?.zoom(1.2),
          zoomIn: () => n?.zoom(1.2),
          minus: () => n?.zoom(1 / 1.2),
          zoomOut: () => n?.zoom(1 / 1.2),
          focusTribe: () => n?.center(),
          search: () => setSearch(true),
          'content-download': () => contentClient.downloadOffline().catch(() => {}),
          'content-update': () =>
            contentClient.checkForUpdates().then((updated) => {
              if (updated) location.reload();
            }),
        };
        actions[id]?.();
      },
      mode: setMode,
      person: selectPerson,
      tribe: selectTribe,
    };
    window.webkit?.messageHandlers?.nutug?.postMessage({
      event: 'people',
      records: Object.entries(people).map(([id, p]) => ({
        id,
        title: p.name,
        subtitle: p.alias || '',
        dates: p.years || '',
        paragraphs: [p.summary, p.note].filter(Boolean),
        sources: sourceItems(p.sources),
      })),
    });
    window.webkit?.messageHandlers?.nutug?.postMessage({ event: 'ready' });
    return () => {
      delete window.NutugShell;
    };
  }, []);
  useEffect(() => {
    window.webkit?.messageHandlers?.nutug?.postMessage({
      event: 'record',
      interactive: graphPage,
      record: record
        ? {
            id: record.id,
            title: record.title,
            subtitle: record.subtitle || '',
            dates: record.dates || '',
            paragraphs: record.paragraphs,
            sources: record.sources.map((s) => ({ title: s.title, url: s.url })),
          }
        : null,
    });
  }, [record, graphPage]);
  const searchPeople = nodeLists.people.filter((n) => matches(query, n.id, n.name, n.alias));
  const searchTribes = nodeLists.tribes.filter((n) => matches(query, n.id, n.name));
  const searchArticles = useMemo(() => searchCatalog(catalogIndex, { query }), [query]);
  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${native ? 'native-app' : ''}`} data-page={page}>
        <nav className="navigation" aria-label={labels.brand}>
          <Link
            className="brand"
            href="./"
            onClick={(e) => {
              e.preventDefault();
              location.href = 'calendar.html';
            }}
          >
            <Mn>{labels.brand}</Mn>
          </Link>
          <div className="destinations">
            {destinations.map(([id, Icon, href]) => (
              <Link
                key={id}
                href={href}
                className={`destination ${page === id || (id === 'calendar' && page === 'almanac') ? 'is-active' : ''}`}
                aria-current={
                  page === id || (id === 'calendar' && page === 'almanac') ? 'page' : undefined
                }
                aria-label={labels[id]}
                onClick={(e) => {
                  e.preventDefault();
                  location.href = href;
                }}
              >
                {page === id && (
                  <motion.span
                    layoutId="destination-selection"
                    className="destination-selection"
                    transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                  />
                )}
                <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                <Mn>{labels[id]}</Mn>
              </Link>
            ))}
          </div>
          <div className="navigation-bottom">
            <IconButton icon={Type} label={labels.type} onPress={() => setSettings(true)} />
          </div>
        </nav>
        <main className="workspace">
          <header className="toolbar">
            <div className="toolbar-title">
              {page === 'almanac' && (
                <IconButton
                  icon={ArrowLeft}
                  label={labels.back}
                  onPress={() => navigate('calendar')}
                />
              )}
              <Mn as="h1">{labels[page] || labels.calendar}</Mn>
              {isTribes && <span className="toolbar-meta numeric">1180 — 1206</span>}
            </div>
            <div className="toolbar-actions">
              <ContentControls />
              {graphPage && (
                <IconButton
                  className="compact-reader"
                  icon={BookOpen}
                  label={labels.read}
                  onPress={() => setReader(record)}
                />
              )}
              <IconButton
                icon={Search}
                label={labels.search}
                onPress={() => setSearch(true)}
                data-action="search"
              />
              <IconButton
                icon={Type}
                label={labels.type}
                onPress={() => setSettings(true)}
                data-action="type"
              />
              {graphPage && (
                <IconButton
                  icon={PanelRight}
                  label={labels.details}
                  aria-pressed={inspector}
                  onPress={() => setInspector((v) => !v)}
                />
              )}
            </div>
          </header>
          {graphPage ? (
            <div className={`atlas ${inspector ? 'with-inspector' : ''}`}>
              <section className="graph-pane">
                <div className="graph-toolbar">
                  {isTribes ? (
                    <Segments
                      label={labels.timeline}
                      items={[
                        { id: 'all', label: labels.all },
                        { id: 'early', label: '1180–1199', numeric: true },
                        { id: 'middle', label: '1200–1202', numeric: true },
                        { id: 'late', label: '1203–1206', numeric: true },
                      ]}
                      value={period}
                      onChange={(value) => {
                        setPeriod(value);
                        setEdge(null);
                      }}
                    />
                  ) : (
                    <Segments
                      label={labels.relations}
                      items={[
                        { id: 'family', label: labels.family },
                        { id: 'power', label: labels.power },
                      ]}
                      value={mode}
                      onChange={(value) => {
                        setMode(value);
                        setEdge(null);
                        setEventFocus(null);
                      }}
                    />
                  )}
                  {!isTribes && (
                    <IconButton
                      icon={History}
                      label={labels.timeline}
                      onPress={() => setTimeline(true)}
                    />
                  )}
                </div>
                <Network
                  ref={networkRef}
                  nodes={nodes}
                  edges={filteredEdges}
                  selected={selected}
                  selectedEdge={edgeKey(edge)}
                  onSelect={select}
                  onEdge={selectEdge}
                  kind={page}
                />
                <div className="graph-legend">
                  {(isTribes
                    ? ['alliance', 'conflict', 'submission']
                    : mode === 'family'
                      ? ['parent', 'spouse']
                      : ['succession', 'alliance', 'conflict']
                  ).map((type) => (
                    <span key={type}>
                      <i className={`edge-${type}`} />
                      <Mn>{tribes.ui[type] || peopleEdges.find((e) => e.type === type)?.label}</Mn>
                    </span>
                  ))}
                  <Button
                    className="legend-library"
                    onPress={() => navigate('library')}
                    aria-label={labels.library}
                  >
                    <BookOpen size={18} />
                  </Button>
                </div>
                <div className="record-peek">
                  <span className="peek-dot" />
                  <Mn>{record?.title}</Mn>
                  <Button onPress={() => setReader(record)} className="peek-read">
                    <BookOpen size={18} />
                    <Mn>{labels.read}</Mn>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </section>
              {inspector && (
                <Inspector
                  record={record}
                  period={isTribes ? period : 'all'}
                  onRead={() => setReader(record)}
                  onClose={() => setInspector(false)}
                  onEdge={selectEdge}
                  onSelect={select}
                  onArticle={openReader}
                />
              )}
            </div>
          ) : (
            <div className="page-scroll">
              {page === 'library' ? (
                <Library
                  key={catalogRequest}
                  onRead={openReader}
                  query={libraryQuery}
                  onQueryChange={setLibraryQuery}
                  onSearch={() => {
                    setQuery(libraryQuery);
                    setSearch(true);
                  }}
                />
              ) : page === 'calendar' ? (
                <CalendarView
                  onRead={setReader}
                  onAlmanac={(date) => {
                    setAlmanacDate(date);
                    navigate('almanac');
                    history.replaceState(null, '', 'almanac.html?date=' + date);
                  }}
                />
              ) : (
                <AlmanacView initialDate={almanacDate} onRead={setReader} />
              )}
            </div>
          )}
        </main>
        <ReadingSettings
          open={settings}
          onOpenChange={setSettings}
          scale={scale}
          onScale={setReading}
        />
        <Reader
          record={reader}
          onRelatedArticle={openReader}
          onClose={closeReader}
          onRetry={() => {
            if (reader) openReader(reader, { push: false });
          }}
          onPerson={(id) => {
            setMode('power');
            selectPerson(id);
          }}
          onTribe={selectTribe}
          scale={scale}
          onScale={setReading}
        />
        <Sheet
          open={search}
          onOpenChange={setSearch}
          label={labels.search}
          wide
          className="search-sheet"
        >
          <div className="search-workspace">
            <SearchBox value={query} onChange={setQuery} autoFocus />
            <ColumnScroller className="search-results" aria-label={labels.search} tabIndex={0}>
              {!searchPeople.length && !searchTribes.length && !searchArticles.length && (
                <div className="empty-state">
                  <Mn>{knowledge.ui.empty}</Mn>
                </div>
              )}
              {[
                [labels.people, searchPeople, selectPerson],
                [labels.tribes, searchTribes, selectTribe],
                [
                  labels.library,
                  searchArticles,
                  (a) => {
                    setSearch(false);
                    openReader(a);
                  },
                ],
              ]
                .filter(([, items]) => items.length)
                .map(([title, items, action]) => (
                  <section key={title}>
                    <Mn as="h3">{title}</Mn>
                    <div>
                      {items
                        .slice(
                          0,
                          title === labels.library ? (query ? 8 : 5) : query ? items.length : 5,
                        )
                        .map((item) => (
                          <Button key={item.id} onPress={() => action(item.title ? item : item.id)}>
                            <Mn>{item.name || item.title}</Mn>
                            <ChevronRight size={16} />
                          </Button>
                        ))}
                    </div>
                    {title === labels.library && items.length > 0 && (
                      <Button
                        className="text-button search-all"
                        data-action="search-all"
                        onPress={() => {
                          setLibraryQuery(query);
                          setCatalogRequest((value) => value + 1);
                          navigate('library');
                        }}
                      >
                        <Mn>{labels.catalog}</Mn>
                        <span className="numeric">{items.length}</span>
                      </Button>
                    )}
                  </section>
                ))}
            </ColumnScroller>
          </div>
        </Sheet>
        <Sheet open={timeline} onOpenChange={setTimeline} label={labels.timeline}>
          <div className="timeline-list">
            {events.map((e, i) => (
              <Button
                key={i}
                onPress={() => {
                  setTimeline(false);
                  setMode('power');
                  setEventFocus(e.people);
                  setPerson(e.people[0]);
                  setEdge(null);
                  setInspector(true);
                }}
              >
                <Mn>{e.date}</Mn>
                <Mn>{e.title}</Mn>
                <ChevronRight size={16} />
              </Button>
            ))}
            {gaps.map((g) => (
              <Button
                key={g.id}
                onPress={() => {
                  setTimeline(false);
                  setReader({
                    title: g.title || g.name || labels.details,
                    paragraphs: [g.summary, ...(g.notes || [])].filter(Boolean),
                    people: [g.anchor],
                    sources: sourceItems(g.sources),
                  });
                }}
              >
                <Mn>{g.title || g.name || labels.details}</Mn>
                <ChevronRight size={16} />
              </Button>
            ))}
          </div>
        </Sheet>
      </div>
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')).render(
  <I18nProvider locale={uiLocale}>
    <App />
  </I18nProvider>,
);
