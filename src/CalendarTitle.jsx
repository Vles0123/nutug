import React, { useLayoutEffect, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Mn } from './ui';
import { fitCalendarTitle } from '../shared/calendar-layout.mjs';
import { displayMongolian } from '../shared/mongolian-orthography.mjs';

export function CalendarTitle({ text, className = '' }) {
  const box = useRef(null);
  const [preview, setPreview] = useState({ text, shortened: false });
  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      const el = box.current;
      if (!active) return;
      if (!el?.clientWidth || !el.clientHeight) {
        setPreview({ text, shortened: false });
        return;
      }
      const style = getComputedStyle(el);
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      context.font = `${style.fontSize} ${style.fontFamily}`;
      const result = fitCalendarTitle(
        displayMongolian(text),
        (s) => context.measureText(s).width,
        el.clientHeight - 8,
        Math.max(1, Math.floor(el.clientWidth / parseFloat(style.lineHeight))),
      );
      setPreview(result);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box.current);
    document.fonts?.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [text]);
  return (
    <span className={`calendar-title-preview ${className}`} aria-hidden="true">
      <Mn ref={box} className="calendar-title-measure">
        {preview.text}
      </Mn>
      {preview.shortened && <Ellipsis size={13} className="calendar-title-more" />}
    </span>
  );
}
