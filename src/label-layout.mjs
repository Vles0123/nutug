const overlaps = (a, b, gap = 6) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

export function placeLabels(labels, positions, width, height) {
  const occupied = [],
    result = {};
  const dots = Object.entries(positions).map(([id, p]) => ({
    id,
    x: p.x - 12,
    y: p.y - 12,
    w: 24,
    h: 24,
  }));
  for (const label of [...labels].sort((a, b) => b.priority - a.priority)) {
    const p = positions[label.id],
      w = label.width,
      h = label.height;
    const candidates = [];
    for (const gap of [20, 36, 56])
      candidates.push(
        { x: p.x - w / 2, y: p.y + gap },
        { x: p.x + gap, y: p.y - 12 },
        { x: p.x - w - gap, y: p.y - 12 },
        { x: p.x - w / 2, y: p.y - h - gap },
        { x: p.x + gap, y: p.y - h + 12 },
        { x: p.x - w - gap, y: p.y - h + 12 },
      );
    const inBounds = (r) => r.x >= 8 && r.x + w <= width - 8 && r.y >= 8 && r.y + h <= height - 72;
    const free = (r) => !occupied.some((other) => overlaps({ ...r, w, h }, other));
    const selected =
      candidates.find(
        (r) =>
          inBounds(r) &&
          free(r) &&
          !dots.some((dot) => dot.id !== label.id && overlaps({ ...r, w, h }, dot, 3)),
      ) || candidates.find((r) => inBounds(r) && free(r));
    if (selected) {
      result[label.id] = { ...selected, hidden: false };
      occupied.push({ ...selected, w, h });
    } else result[label.id] = { ...candidates[0], hidden: true };
  }
  return result;
}
