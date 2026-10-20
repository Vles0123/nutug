import { useEffect } from 'react';

export function useColumnScroll(ref, enabled = true) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    const wheel = (event) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY))
        return;
      if (
        event.target !== element &&
        event.target.closest('input,textarea,[contenteditable="true"]')
      )
        return;
      const maximum = element.scrollWidth - element.clientWidth;
      if (maximum <= 1) return;
      const unit = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? element.clientWidth : 1;
      const next = Math.max(0, Math.min(maximum, element.scrollLeft + event.deltaY * unit));
      if (next === element.scrollLeft) return;
      event.preventDefault();
      element.scrollLeft = next;
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [ref, enabled]);
}
