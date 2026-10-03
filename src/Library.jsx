import React, { useState } from 'react';
import { Button } from 'react-aria-components';
import { BookOpen, ArrowUpRight } from 'lucide-react';
import { Mn, Segments, SearchBox } from './ui';
import { articles, knowledge, labels, matches } from './content';

export function Library({ onRead, tribalOnly = false }) {
  const [category, setCategory] = useState('all'),
    [query, setQuery] = useState('');
  const list = articles.filter(
    (a) =>
      (!tribalOnly || a.collection === 'tribes') &&
      (category === 'all' || category === 'tribes'
        ? category !== 'tribes' || a.collection === 'tribes'
        : a.category === category) &&
      matches(query, a.title, a.summary, a.id, ...(a.paragraphs || [])),
  );
  const categories = [
    { id: 'all', label: labels.all },
    { id: 'tribes', label: labels.tribes },
    ...Object.entries(knowledge.ui.categories).map(([id, label]) => ({ id, label })),
  ];
  return (
    <div className="library-page">
      <div className="library-toolbar">
        <SearchBox value={query} onChange={setQuery} />
        <span className="numeric library-count" aria-live="polite">
          {list.length} / {tribalOnly ? 8 : articles.length}
        </span>
      </div>
      {!tribalOnly && (
        <div className="filter-scroll">
          <Segments
            label={knowledge.ui.topics}
            items={categories}
            value={category}
            onChange={setCategory}
          />
        </div>
      )}
      <div className="book-grid">
        {list.map((a, i) => (
          <Button
            key={a.id}
            className="book"
            onPress={() => onRead({ ...a, subtitle: a.summary })}
            data-article={a.id}
          >
            <div className="book-index">
              <BookOpen size={18} />
              <span className="numeric">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="book-copy">
              <Mn as="h2">{a.title}</Mn>
              <Mn className="muted">{a.summary}</Mn>
            </div>
            <ArrowUpRight className="book-arrow" size={20} />
          </Button>
        ))}
      </div>
      {['all', 'sources'].includes(category) && !tribalOnly && (
        <section className="original-readings">
          <Mn as="h2">{knowledge.ui.original}</Mn>
          <div className="book-grid">
            {knowledge.readings
              .filter((r) => matches(query, r.titleMn, r.summaryMn, r.id))
              .map((r) => (
                <Button
                  key={r.id}
                  className="book"
                  data-reading={r.id}
                  onPress={() =>
                    onRead({
                      title: r.titleMn,
                      paragraphs: [r.summaryMn],
                      sources: [{ title: r.titleMn, url: r.url }],
                    })
                  }
                >
                  <div className="book-index">
                    <BookOpen size={18} />
                  </div>
                  <div className="book-copy">
                    <Mn as="h3">{r.titleMn}</Mn>
                    <Mn className="muted">{r.summaryMn}</Mn>
                  </div>
                  <ArrowUpRight className="book-arrow" size={20} />
                </Button>
              ))}
          </div>
        </section>
      )}
      {!list.length && (
        <div className="empty-state">
          <BookOpen size={28} />
          <Mn>{knowledge.ui.empty}</Mn>
        </div>
      )}
    </div>
  );
}
