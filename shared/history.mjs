export function eventDate(event) {
  if (event.precision !== 'period' && Number.isInteger(event.startYear))
    return {
      start: event.startYear,
      end: event.endYear ?? event.startYear,
      precision: event.precision || 'year',
    };
  const years = event.date.match(/^(\d{3,4})(?:\s*[—–-]\s*(\d{3,4}))?$/);
  if (years)
    return {
      start: Number(years[1]),
      end: Number(years[2] || years[1]),
      precision: years[2] ? 'range' : 'year',
    };
  const century = event.date.includes('ᠵᠠᠭᠤᠨ') && event.date.match(/^(\d{1,2})\s/);
  return {
    start: null,
    end: null,
    order: century ? Number(century[1]) * 100 - 1 : Infinity,
    precision: 'period',
  };
}
export function orderedEvents(events) {
  return events
    .map((event, index) => ({ ...event, id: event.id || `event-${index}`, ...eventDate(event) }))
    .sort((a, b) => (a.order ?? a.start ?? Infinity) - (b.order ?? b.start ?? Infinity));
}
export function relatedPeople(id, people, edges) {
  const links = edges.filter((edge) => edge.from === id || edge.to === id);
  const ids = new Set([id, ...links.flatMap((edge) => [edge.from, edge.to])]);
  return {
    nodes: [...ids]
      .filter((key) => Object.hasOwn(people, key))
      .map((key) => ({ id: key, ...people[key] })),
    edges: links,
  };
}
