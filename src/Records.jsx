import React, { useLayoutEffect, useRef, useState } from 'react';
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { ArrowLeft, ArrowRight, BookOpen, X, ChevronRight, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mn, IconButton, ReadingColumns, SourceLinks } from './ui';
import { readingPages } from './reading-layout.mjs';
import {
  people,
  peopleEdges,
  events,
  sources,
  tribes,
  articles,
  sourceItems,
  labels,
} from './content';

export function makeRecord(kind, id, edge = null) {
  const table = kind === 'tribes' ? tribes.nodes : people;
  const record = table[id];
  if (!record) return null;
  const allEdges = kind === 'tribes' ? tribes.edges : peopleEdges;
  if (edge)
    return {
      id: edge.id || `${edge.from}-${edge.to}-${edge.type}`,
      title: edge.label,
      subtitle: edge.date || record.name,
      paragraphs: [edge.summary].filter(Boolean),
      sources: sourceItems(edge.sources, kind === 'tribes' ? tribes.sources : sources),
      connections: [edge],
      kind: 'edge',
      origin: kind,
    };
  return {
    id,
    title: record.name,
    subtitle: record.alias || record.kind,
    dates: record.years,
    paragraphs: [record.summary, record.note].filter(Boolean),
    sections: record.profile || [],
    sources: sourceItems(record.sources, kind === 'tribes' ? tribes.sources : sources),
    connections: allEdges.filter((e) => e.from === id || e.to === id),
    kind,
    origin: kind,
    related: articles.filter((a) => (kind === 'tribes' ? a.tribes : a.people)?.includes(id)),
    events: kind === 'people' ? events.filter((e) => e.people.includes(id)) : [],
  };
}
export function Inspector({
  record,
  onRead,
  onClose,
  onEdge,
  onSelect,
  onArticle,
  period = 'all',
}) {
  if (!record) return null;
  const table = record.origin === 'tribes' ? tribes.nodes : people;
  const connections = (record.connections || []).filter(
    (e) => period === 'all' || e.period === period,
  );
  return (
    <aside className="inspector" aria-label={labels.details} data-record={record.id}>
      <div className="inspector-tools">
        <IconButton
          icon={BookOpen}
          label={labels.read}
          onPress={onRead}
          data-action="read-record"
        />
        <IconButton icon={X} label={labels.close} onPress={onClose} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={record.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div className="inspector-intro">
            <Mn as="h2">{record.title}</Mn>
            <Mn className="muted">{record.subtitle}</Mn>
            {record.dates && <Mn className="record-dates muted">{record.dates}</Mn>}
          </div>
          <ReadingColumns className="inspector-summary">
            {record.paragraphs.map((p, i) => (
              <Mn as="p" className="reading-text" key={i}>
                {p}
              </Mn>
            ))}
          </ReadingColumns>
          <Button className="read-button" onPress={onRead}>
            <BookOpen size={18} />
            <Mn>{labels.read}</Mn>
            <ChevronRight size={16} />
          </Button>
          {connections.length > 0 && (
            <div className="connection-section">
              <Mn as="h3">{labels.relations}</Mn>
              <div className="connection-list">
                {connections.map((e, i) => {
                  const other = e.from === record.id ? e.to : e.from;
                  return (
                    <Button
                      key={e.id || i}
                      className="connection-row"
                      data-connection={e.id || i}
                      onPress={() => (record.origin === 'tribes' ? onEdge(e) : onSelect(other))}
                    >
                      <span className={`relation-dot edge-${e.type}`} />
                      <Mn>{table[other]?.name}</Mn>
                      <Mn className="muted">{e.shortDate || e.label}</Mn>
                      <ChevronRight size={16} />
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          {!!record.related?.length && (
            <div className="related-section">
              <Mn as="h3">{labels.library}</Mn>
              <div className="related-books">
                {record.related.map((a) => (
                  <Button key={a.id} onPress={() => onArticle(a)}>
                    <BookOpen size={18} />
                    <Mn>{a.title}</Mn>
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="inspector-sources">
            <SourceLinks items={record.sources} />
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
export function Reader({ record, ...props }) {
  return record ? (
    <RecordReader key={record.id || record.title} record={record} {...props} />
  ) : null;
}

function RecordReader({ record, onClose, onPerson, onTribe, scale = 1, onScale }) {
  const sourceTable = record.origin === 'tribes' ? tribes.sources : sources;
  const scrollRef = useRef(null);
  const [position, setPosition] = useState({ left: 0, width: 1, total: 1, pages: [0], tail: 8 });
  const updatePosition = () => {
    const left = scrollRef.current?.scrollLeft || 0;
    setPosition((previous) =>
      Math.abs(previous.left - left) < 0.5 ? previous : { ...previous, left },
    );
  };
  const measure = () => {
    const element = scrollRef.current;
    if (!element) return;
    const inner = element.firstElementChild;
    const viewport = element.getBoundingClientRect();
    const width = Math.max(1, element.clientWidth);
    const columns = [];
    const interactive = new Set();
    const addRect = (rect) => {
      if (rect.width > 0 && rect.height > 0)
        columns.push({
          left: rect.left - viewport.left + element.scrollLeft,
          right: rect.right - viewport.left + element.scrollLeft,
        });
    };
    for (const text of inner.querySelectorAll('.mn')) {
      const control = text.closest('a,button');
      if (control && control.getBoundingClientRect().width < width - 20) {
        interactive.add(control);
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const rect of range.getClientRects?.() || []) addRect(rect);
    }
    for (const control of interactive) addRect(control.getBoundingClientRect());
    const pages = readingPages(columns, width);
    const base =
      inner.getBoundingClientRect().width - (parseFloat(getComputedStyle(inner).paddingRight) || 0);
    const tail = pages.length > 1 ? Math.max(8, pages[pages.length - 1] + width - base) : 8;
    const next = {
      left: element.scrollLeft,
      width,
      total: Math.max(width, base + tail),
      pages,
      tail,
    };
    setPosition((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
  };
  useLayoutEffect(() => {
    let active = true;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scrollRef.current);
    observer.observe(scrollRef.current.firstElementChild);
    document.fonts?.ready.then(() => {
      if (active) measure();
    });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [record, scale]);
  const totalPages = position.pages.length;
  const current = position.pages.reduce(
    (best, start, i) =>
      Math.abs(start - position.left) < Math.abs(position.pages[best] - position.left) ? i : best,
    0,
  );
  const page = current + 1;
  const clipRight =
    current < totalPages - 1 && Math.abs(position.left - position.pages[current]) < 2
      ? Math.max(0, position.width - (position.pages[current + 1] - position.left))
      : 0;
  const move = (direction) => {
    const left = position.pages[Math.max(0, Math.min(totalPages - 1, current + direction))];
    scrollRef.current?.scrollTo({ left, behavior: 'instant' });
    setPosition((previous) => ({ ...previous, left }));
  };
  return (
    <ModalOverlay
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable
      className="reader-overlay"
    >
      <Modal className="reader-window">
        <Dialog aria-label={record.title} className="reader-dialog">
          <div className="reader-toolbar">
            <IconButton
              icon={ArrowLeft}
              label={labels.back}
              onPress={onClose}
              data-action="reader-back"
            />
            <div className="reader-type-controls" role="group" aria-label={labels.type}>
              <IconButton
                icon={Minus}
                label={labels.smaller}
                isDisabled={scale <= 0.85}
                onPress={() => onScale?.(scale - 0.05)}
                data-action="reader-smaller"
              />
              <output className="numeric" aria-live="polite">
                {Math.round(scale * 100)}%
              </output>
              <IconButton
                icon={Plus}
                label={labels.larger}
                isDisabled={scale >= 1.5}
                onPress={() => onScale?.(scale + 0.05)}
                data-action="reader-larger"
              />
            </div>
          </div>
          <div className="reader-body">
            <ReadingColumns
              className="reader-content"
              scrollRef={scrollRef}
              onScroll={updatePosition}
              endPadding={position.tail}
              pages={position.pages}
              clipRight={clipRight}
            >
              <Heading slot="title" className="mn reader-title" lang="mn-Mong">
                {record.title}
              </Heading>
              {record.subtitle && (
                <Mn as="p" className="reading-text muted">
                  {record.subtitle}
                </Mn>
              )}
              {(record.paragraphs || []).map((p, i) => (
                <Mn as="p" className="reading-text" key={i}>
                  {p}
                </Mn>
              ))}
              {(record.sections || []).map((section) => (
                <React.Fragment key={section.id}>
                  <Mn as="h3">{section.title}</Mn>
                  {section.paragraphs.map((p, i) => (
                    <Mn as="p" className="reading-text" key={i}>
                      {p}
                    </Mn>
                  ))}
                  <SourceLinks items={sourceItems(section.sources, sourceTable)} />
                </React.Fragment>
              ))}
              {!!record.events?.length && (
                <>
                  <Mn as="h3">{labels.timeline}</Mn>
                  {record.events.map((e, i) => (
                    <React.Fragment key={i}>
                      <Mn as="h4">
                        {e.date} · {e.title}
                      </Mn>
                      <Mn as="p" className="reading-text">
                        {e.text}
                      </Mn>
                    </React.Fragment>
                  ))}
                </>
              )}
              <Mn as="h3">{labels.sources}</Mn>
              <SourceLinks items={record.sources} />
              {record.people?.map((id) => (
                <Button key={id} className="reader-related" onPress={() => onPerson(id)}>
                  <Mn>{people[id]?.name}</Mn>
                  <ChevronRight size={16} />
                </Button>
              ))}
              {record.tribes?.map((id) => (
                <Button key={id} className="reader-related" onPress={() => onTribe(id)}>
                  <Mn>{tribes.nodes[id]?.name}</Mn>
                  <ChevronRight size={16} />
                </Button>
              ))}
            </ReadingColumns>
          </div>
          <div
            className={`reader-pagination ${totalPages === 1 ? 'is-single' : ''}`}
            aria-hidden={totalPages === 1 || undefined}
          >
            <div className="reader-track" aria-hidden="true">
              <span
                style={{
                  width:
                    Math.min(100, ((position.left + position.width) / position.total) * 100) + '%',
                }}
              />
            </div>
            <span className="numeric">
              {page} / {totalPages}
            </span>
            <div className="reader-page-buttons">
              <IconButton
                icon={ArrowLeft}
                label={labels.previous}
                isDisabled={position.left < 1}
                onPress={() => move(-1)}
                data-action="reader-previous"
              />
              <IconButton
                icon={ArrowRight}
                label={labels.next}
                isDisabled={page === totalPages}
                onPress={() => move(1)}
                data-action="reader-next"
              />
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
