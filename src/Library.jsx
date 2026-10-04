import React, { useMemo, useState } from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { ChevronDown, ChevronRight, ListFilter, Search } from 'lucide-react';
import { Mn, Segments, SearchBox } from './ui';
import { articles, knowledge, labels, matches } from './content';

function CatalogEntry({ title, summary, onRead, articleId, readingId }) {
  return (
    <Button
      className="catalog-entry"
      onPress={onRead}
      data-article={articleId}
      data-reading={readingId}
    >
      <span className="catalog-entry-copy">
        <Mn className="catalog-entry-title">{title}</Mn>
        <Mn className="catalog-entry-summary">{summary}</Mn>
      </span>
      <ChevronRight className="catalog-disclosure" size={18} strokeWidth={1.6} aria-hidden="true" />
    </Button>
  );
}

export function Library({ onRead, tribalOnly = false }) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = [
    { id: 'all', label: labels.all },
    { id: 'tribes', label: labels.tribes },
    ...Object.entries(knowledge.ui.categories).map(([id, label]) => ({ id, label })),
  ];
  const list = useMemo(
    () =>
      articles.filter(
        (a) =>
          (!tribalOnly || a.collection === 'tribes') &&
          (category === 'all' ||
            (category === 'tribes' ? a.collection === 'tribes' : a.category === category)) &&
          matches(query, a.title, a.summary, a.id, ...(a.paragraphs || [])),
      ),
    [category, query, tribalOnly],
  );
  const readings =
    !tribalOnly && ['all', 'sources'].includes(category)
      ? knowledge.readings.filter((r) => matches(query, r.titleMn, r.summaryMn, r.id))
      : [];
  const selectedCategory = categories.find((c) => c.id === category);

  return (
    <section className="catalog" aria-label={knowledge.ui.title}>
      <div className="catalog-tools">
        <SearchBox value={query} onChange={setQuery} />
        {!tribalOnly && (
          <DialogTrigger isOpen={filtersOpen} onOpenChange={setFiltersOpen}>
            <Button
              className="catalog-filter"
              aria-label={knowledge.ui.topics}
              data-action="catalog-filter"
            >
              <ListFilter size={19} strokeWidth={1.6} aria-hidden="true" />
              <Mn>{selectedCategory.label}</Mn>
              <ChevronDown size={14} aria-hidden="true" />
            </Button>
            <Popover placement="bottom end" offset={10} className="category-popover">
              <Dialog aria-label={knowledge.ui.topics}>
                <Segments
                  label={knowledge.ui.topics}
                  items={categories}
                  value={category}
                  onChange={(id) => {
                    setCategory(id);
                    setFiltersOpen(false);
                  }}
                  className="category-options"
                />
              </Dialog>
            </Popover>
          </DialogTrigger>
        )}
        <output
          className="catalog-count numeric"
          aria-label={knowledge.ui.topics}
          aria-live="polite"
        >
          {list.length + readings.length}
        </output>
      </div>
      <div className="catalog-list">
        {list.map((a) => (
          <CatalogEntry
            key={a.id}
            title={a.title}
            summary={a.summary}
            articleId={a.id}
            onRead={() => onRead({ ...a, subtitle: a.summary })}
          />
        ))}
      </div>
      {readings.length > 0 && (
        <section className="catalog-originals">
          <Mn as="h2">{knowledge.ui.original}</Mn>
          <div className="catalog-list">
            {readings.map((r) => (
              <CatalogEntry
                key={r.id}
                title={r.titleMn}
                summary={r.summaryMn}
                readingId={r.id}
                onRead={() =>
                  onRead({
                    id: r.id,
                    title: r.titleMn,
                    paragraphs: [r.summaryMn],
                    sources: [{ title: r.titleMn, url: r.url }],
                  })
                }
              />
            ))}
          </div>
        </section>
      )}
      {!list.length && !readings.length && (
        <div className="empty-state">
          <Search size={24} aria-hidden="true" />
          <Mn>{knowledge.ui.empty}</Mn>
        </div>
      )}
    </section>
  );
}
