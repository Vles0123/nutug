import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, ReadingColumns } from './ui';
import { labels } from './ui-copy.mjs';
import { readingPages } from './reading-layout.mjs';

export function PagedReading({ children, className = '', contentKey }) {
  const scroll = useRef(null);
  const [layout, setLayout] = useState({ pages: [0], width: 1, tail: 12, minimum: 0 });
  const [left, setLeft] = useState(0);
  useLayoutEffect(() => {
    const element = scroll.current;
    const inner = element.firstElementChild;
    let active = true;
    const measure = () => {
      if (!active || !element.clientWidth) return;
      const viewport = element.getBoundingClientRect();
      const columns = [];
      let minimum = 0;
      const controls = new Set();
      const add = (rect) => {
        if (rect.width && rect.height)
          columns.push({
            left: rect.left - viewport.left + element.scrollLeft,
            right: rect.right - viewport.left + element.scrollLeft,
          });
      };
      for (const text of inner.querySelectorAll('.mn, .numeric')) {
        if (text.classList.contains('mn')) {
          // U+202F and shaping controls stay inside the word being measured.
          // A short viewport grows enough to keep even the longest word visible.
          const walker = element.ownerDocument.createTreeWalker(text, 4);
          const inset = text.getBoundingClientRect().top - viewport.top;
          let node;
          while ((node = walker.nextNode())) {
            for (const word of node.textContent.matchAll(/[^ \t\r\n]+/gu)) {
              const range = element.ownerDocument.createRange();
              range.setStart(node, word.index);
              range.setEnd(node, word.index + word[0].length);
              minimum = Math.max(minimum, inset + range.getBoundingClientRect().height + 16);
            }
          }
        }
        const control = text.closest('button,a');
        if (control && control.offsetWidth < element.clientWidth - 24) {
          controls.add(control);
        } else {
          const range = element.ownerDocument.createRange();
          range.selectNodeContents(text);
          for (const rect of range.getClientRects?.() || []) add(rect);
        }
      }
      for (const control of controls) add(control.getBoundingClientRect());
      const width = element.clientWidth;
      const pages = readingPages(columns, width, 12);
      const base =
        inner.getBoundingClientRect().width - parseFloat(getComputedStyle(inner).paddingRight || 0);
      const tail = Math.max(12, pages.at(-1) + width - base);
      minimum = Math.ceil(minimum);
      setLayout((previous) =>
        previous.width === width &&
        previous.minimum === minimum &&
        Math.abs(previous.tail - tail) < 0.5 &&
        previous.pages.length === pages.length &&
        previous.pages.every((value, index) => Math.abs(value - pages[index]) < 0.5)
          ? previous
          : { pages, width, tail, minimum },
      );
    };
    element.scrollLeft = 0;
    setLeft(0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(inner);
    document.fonts?.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [contentKey]);
  useLayoutEffect(() => {
    const element = scroll.current;
    const nearest = layout.pages.reduce(
      (best, start) =>
        Math.abs(start - element.scrollLeft) < Math.abs(best - element.scrollLeft) ? start : best,
      0,
    );
    element.scrollLeft = nearest;
    setLeft(element.scrollLeft);
  }, [layout]);
  const current = layout.pages.reduce(
    (best, start, index) =>
      Math.abs(start - left) < Math.abs(layout.pages[best] - left) ? index : best,
    0,
  );
  const move = (direction) => {
    const target =
      layout.pages[Math.max(0, Math.min(layout.pages.length - 1, current + direction))];
    scroll.current?.scrollTo({ left: target, behavior: 'instant' });
  };
  const clip =
    current < layout.pages.length - 1 && Math.abs(layout.pages[current] - left) < 2
      ? Math.max(0, layout.width - (layout.pages[current + 1] - left))
      : 0;
  return (
    <div className={`paged-reading ${className}`} style={{ minHeight: layout.minimum + 53 }}>
      <ReadingColumns
        scrollRef={scroll}
        pages={layout.pages}
        endPadding={layout.tail}
        clipRight={clip}
        onScroll={() => setLeft(scroll.current.scrollLeft)}
      >
        {children}
      </ReadingColumns>
      <div className="reading-navigation" role="group" aria-label={labels.read}>
        <IconButton
          icon={ChevronLeft}
          label={labels.previous}
          data-action="reading-previous"
          isDisabled={current === 0}
          onPress={() => move(-1)}
        />
        <div className="reading-position">
          <span className="reading-track" aria-hidden="true">
            <span style={{ width: `${(100 * (current + 1)) / layout.pages.length}%` }} />
          </span>
          <output className="numeric" aria-live="polite">
            {current + 1} / {layout.pages.length}
          </output>
        </div>
        <IconButton
          icon={ChevronRight}
          label={labels.next}
          data-action="reading-next"
          isDisabled={current === layout.pages.length - 1}
          onPress={() => move(1)}
        />
      </div>
    </div>
  );
}
