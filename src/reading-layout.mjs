// Page boundaries follow shaped vertical columns, including their actual glyph widths.
export function readingPages(columns, viewportWidth, inset = 10) {
  const ordered = [...columns].sort((a, b) => a.left - b.left);
  const starts = [0];
  const width = Math.max(1, viewportWidth);
  for (const column of ordered) {
    const current = starts[starts.length - 1];
    if (column.right <= current + width - inset) continue;
    const next = Math.max(0, column.left - inset);
    if (next > current + inset) starts.push(next);
  }
  return starts;
}
