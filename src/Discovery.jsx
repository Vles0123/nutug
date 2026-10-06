import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'react-aria-components';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import { catalogRecords, catalogById, knowledge, labels } from './content';
import { discoverySeeds, relatedRecords, shortTitle } from './discovery.mjs';
import { IconButton, Mn } from './ui';

export function Discovery({ onRead, onCatalog }) {
  const [journey, setJourney] = useState({ ids: [discoverySeeds.language], index: 0 });
  const host = useRef(null),
    [width, setWidth] = useState(700);
  const reduced = useReducedMotion();
  const active = catalogById.get(journey.ids[journey.index]) || catalogRecords[0];
  const related = useMemo(() => relatedRecords(catalogRecords, active.id, 6), [active.id]);
  const compact = width < 620;
  const narrow = width < 340;
  const displayed = related.slice(0, narrow ? 2 : compact ? 3 : 6);
  useLayoutEffect(() => {
    const measure = () => setWidth(host.current?.clientWidth || 700);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const visit = (id) => {
    if (id === active.id || !catalogById.has(id)) return;
    setJourney((old) => ({ ids: [...old.ids.slice(0, old.index + 1), id], index: old.index + 1 }));
  };
  const reasonLabel = (item) =>
    item.reason === 'category'
      ? knowledge.ui.categories[item.record.category] || labels.library
      : labels[item.reason];
  const points = narrow
    ? [
        { x: 50, y: 34 },
        { x: 24, y: 76 },
        { x: 76, y: 76 },
      ]
    : compact
      ? [
          { x: 50, y: 34 },
          { x: 18, y: 64 },
          { x: 50, y: 82 },
          { x: 82, y: 64 },
        ]
      : [
          { x: 50, y: 50 },
          { x: 15, y: 30 },
          { x: 50, y: 16 },
          { x: 83, y: 25 },
          { x: 17, y: 71 },
          { x: 50, y: 84 },
          { x: 83, y: 72 },
        ];
  const nodes = [{ record: active, reason: null }, ...displayed];
  return (
    <section className="discovery" aria-label={labels.explore}>
      <div className="topic-rail" role="group" aria-label={knowledge.ui.topics}>
        {Object.entries(discoverySeeds).map(([category, id]) => (
          <Button
            key={category}
            className="topic-entry"
            data-topic={category}
            aria-pressed={active.category === category}
            onPress={() =>
              visit(
                catalogById.has(id) ? id : catalogRecords.find((a) => a.category === category)?.id,
              )
            }
          >
            <Mn>{knowledge.ui.categories[category]}</Mn>
            <span className="numeric">
              {catalogRecords.filter((a) => a.category === category).length}
            </span>
          </Button>
        ))}
      </div>
      <div className="discovery-workspace">
        <div className="discovery-map" ref={host} data-discovery={active.id}>
          <div className="journey-controls" role="group" aria-label={labels.relations}>
            <IconButton
              icon={ArrowLeft}
              label={labels.previous}
              data-action="discovery-back"
              isDisabled={journey.index === 0}
              onPress={() => setJourney((s) => ({ ...s, index: s.index - 1 }))}
            />
            <output className="numeric" aria-live="polite">
              {journey.index + 1} / {journey.ids.length}
            </output>
            <IconButton
              icon={ArrowRight}
              label={labels.next}
              data-action="discovery-forward"
              isDisabled={journey.index === journey.ids.length - 1}
              onPress={() => setJourney((s) => ({ ...s, index: s.index + 1 }))}
            />
          </div>
          <svg
            className="discovery-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {displayed.map((item, i) => {
              const p = points[i + 1],
                root = points[0];
              return (
                <motion.path
                  key={item.record.id}
                  d={`M${root.x},${root.y} Q${root.x},${p.y} ${p.x},${p.y}`}
                  initial={{ opacity: reduced ? 1 : 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.3 }}
                />
              );
            })}
          </svg>
          {nodes.map(({ record, reason }, i) => (
            <motion.div
              key={record.id}
              className="discovery-node-position"
              initial={false}
              animate={{ left: points[i].x + '%', top: points[i].y + '%' }}
              transition={{ duration: reduced ? 0 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Button
                className="discovery-node"
                data-discovery-node={record.id}
                data-current={i === 0 || undefined}
                aria-current={i === 0 ? 'true' : undefined}
                data-visited={journey.ids.includes(record.id) || undefined}
                aria-label={`${record.title} · ${i === 0 ? labels.read : reasonLabel({ record, reason })}`}
                onPress={() => (i === 0 ? onRead(active) : visit(record.id))}
              >
                <span className="discovery-node-dot" aria-hidden="true" />
                <Mn>{shortTitle(record.title, compact ? 30 : 42)}</Mn>
                {i === 0 && <BookOpen size={16} aria-hidden="true" />}
              </Button>
            </motion.div>
          ))}
        </div>
        <motion.div
          key={active.id}
          className="discovery-preview"
          data-preview={active.id}
          initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
        >
          <div className="discovery-copy">
            <Mn as="h2">{active.title}</Mn>
            <Mn as="p">{active.summary}</Mn>
          </div>
          <div className="discovery-preview-actions">
            <Button
              className="discovery-read"
              data-action="discovery-read"
              onPress={() => onRead(active)}
            >
              <BookOpen size={20} />
              <Mn>{labels.read}</Mn>
              <ChevronRight size={17} />
            </Button>
            <Button className="text-button" data-action="discovery-catalog" onPress={onCatalog}>
              <Mn>{labels.catalog}</Mn>
              <ChevronRight size={17} />
            </Button>
          </div>
        </motion.div>
      </div>
      <div className="discovery-related" aria-label={labels.relations}>
        {related.map((item) => (
          <Button
            key={item.record.id}
            className="discovery-link"
            data-related={item.record.id}
            data-relation={item.reason}
            onPress={() => visit(item.record.id)}
          >
            <Mn className="discovery-reason">{reasonLabel(item)}</Mn>
            <Mn>{item.record.title}</Mn>
            <ChevronRight size={16} />
          </Button>
        ))}
      </div>
    </section>
  );
}
