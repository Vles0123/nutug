import React from 'react';
import { Button } from 'react-aria-components';
import { ArrowUpRight, BookOpen, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mn, IconButton, ReadingColumns, SourceLinks, Sheet } from './ui';
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
            <ArrowUpRight size={16} />
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
export function Reader({ record, onClose, onPerson, onTribe }) {
  if (!record) return null;
  const sourceTable = record.origin === 'tribes' ? tribes.sources : sources;
  return (
    <Sheet
      open={!!record}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      label={record.title}
      wide
    >
      <ReadingColumns className="reader-content">
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
            <ArrowUpRight size={16} />
          </Button>
        ))}
        {record.tribes?.map((id) => (
          <Button key={id} className="reader-related" onPress={() => onTribe(id)}>
            <Mn>{tribes.nodes[id]?.name}</Mn>
            <ArrowUpRight size={16} />
          </Button>
        ))}
      </ReadingColumns>
    </Sheet>
  );
}
