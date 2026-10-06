import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { ChevronDown, ChevronRight, ListFilter, Search } from 'lucide-react';
import { Mn, Segments, SearchBox } from './ui';
import { catalogIndex, knowledge, labels } from './content';
import { CATALOG_BATCH_SIZE, searchCatalog } from './catalog.mjs';
import { Discovery } from './Discovery';

function CatalogEntry({ title, summary, onRead, articleId, readingId }) {
  const ref = useRef(null),
    width = useRef(0);
  const [height, setHeight] = useState(null),
    [fontVersion, setFontVersion] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current,
      copy = element?.querySelector('.catalog-entry-copy');
    if (!copy?.clientWidth) return;
    width.current = element.clientWidth;
    if (copy.scrollWidth > copy.clientWidth + 1 && (height || 0) < 768) {
      const base = parseFloat(getComputedStyle(copy.firstElementChild).maxHeight) || 236;
      setHeight((height || base) + 32);
    }
  }, [height, fontVersion, title, summary]);
  useEffect(() => {
    let active = true;
    const observer = new ResizeObserver(() => {
      const next = ref.current?.clientWidth;
      if (next && Math.abs(next - width.current) > 1) {
        width.current = next;
        setHeight(null);
        setFontVersion((v) => v + 1);
      }
    });
    observer.observe(ref.current);
    document.fonts?.ready.then(() => {
      if (active) {
        setHeight(null);
        setFontVersion((v) => v + 1);
      }
    });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  return (
    <Button
      ref={ref}
      style={height ? { '--entry-height': height + 'px' } : undefined}
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

export function Library({ onRead, query, onQueryChange, tribalOnly = false }) {
  const [view, setView] = useState(query ? 'catalog' : 'explore');
  useEffect(() => {
    if (query) setView('catalog');
  }, [query]);
  const [category, setCategory] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState({ key: '', limit: CATALOG_BATCH_SIZE });
  const pendingFocus = useRef(null),
    listRef = useRef(null);
  const filterKey = JSON.stringify([query, category, tribalOnly]);
  const limit = expanded.key === filterKey ? expanded.limit : CATALOG_BATCH_SIZE;
  useLayoutEffect(() => {
    pendingFocus.current = null;
    setExpanded({ key: filterKey, limit: CATALOG_BATCH_SIZE });
  }, [filterKey]);
  const categories = [
    { id: 'all', label: labels.all },
    { id: 'tribes', label: labels.tribes },
    ...Object.entries(knowledge.ui.categories).map(([id, label]) => ({ id, label })),
    { id: 'originals', label: knowledge.ui.original },
  ];
  const list = useMemo(
    () =>
      searchCatalog(catalogIndex, {
        query,
        category,
        collection: tribalOnly ? 'tribes' : undefined,
      }),
    [query, category, tribalOnly],
  );
  const visible = list.slice(0, limit),
    selectedCategory = categories.find((c) => c.id === category);
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const entry = listRef.current?.children[pendingFocus.current];
    pendingFocus.current = null;
    entry?.focus({ preventScroll: true });
    entry?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [limit]);
  const exploring = !tribalOnly && !query && view === 'explore';
  return (
    <section className="catalog" aria-label={knowledge.ui.title}>
      <div className="catalog-tools library-toolbar">
        {!tribalOnly && (
          <Segments
            label={labels.library}
            className="library-views"
            value={exploring ? 'explore' : 'catalog'}
            onChange={(value) => {
              setView(value);
              if (value === 'explore') onQueryChange('');
            }}
            items={[
              { id: 'explore', label: labels.explore },
              { id: 'catalog', label: labels.all },
            ]}
          />
        )}
        <SearchBox value={query} onChange={onQueryChange} />
        {!exploring && !tribalOnly && (
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
        {!exploring && (
          <output
            className="catalog-count numeric"
            aria-label={knowledge.ui.topics}
            aria-live="polite"
          >
            {list.length}
          </output>
        )}
      </div>
      {exploring ? (
        <Discovery onRead={onRead} onCatalog={() => setView('catalog')} />
      ) : (
        <>
          <div ref={listRef} className="catalog-list" id="catalog-results">
            {visible.map((a) => (
              <CatalogEntry
                key={a.id}
                title={a.title}
                summary={a.summary}
                articleId={a.collection !== 'originals' ? a.id : undefined}
                readingId={a.collection === 'originals' ? a.id : undefined}
                onRead={() => onRead({ ...a, subtitle: a.summary })}
              />
            ))}
          </div>
          {list.length > 0 && (
            <div className="catalog-pagination">
              <output className="numeric" aria-live="polite">
                {visible.length} / {list.length}
              </output>
              {visible.length < list.length && (
                <Button
                  className="text-button"
                  data-action="catalog-more"
                  aria-controls="catalog-results"
                  onPress={() => {
                    pendingFocus.current = visible.length;
                    setExpanded({ key: filterKey, limit: limit + CATALOG_BATCH_SIZE });
                  }}
                >
                  <Mn>{labels.more}</Mn>
                  <span className="numeric">
                    {Math.min(CATALOG_BATCH_SIZE, list.length - visible.length)}
                  </span>
                </Button>
              )}
            </div>
          )}
          {!list.length && (
            <div className="empty-state">
              <Search size={24} aria-hidden="true" />
              <Mn>{knowledge.ui.empty}</Mn>
            </div>
          )}
        </>
      )}
    </section>
  );
}
