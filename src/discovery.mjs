export function relatedRecords(records, id, limit = 6) {
  const origin = records.findIndex((record) => record.id === id);
  const current = records[origin];
  if (!current) return [];
  const overlap = (field, record) =>
    (current[field] || []).filter((value) => (record[field] || []).includes(value)).length;
  return records
    .map((record, order) => {
      const people = overlap('people', record),
        tribes = overlap('tribes', record),
        sources = overlap('sourceKeys', record),
        category = current.category === record.category;
      return {
        record,
        distance: (order - origin + records.length) % records.length,
        reason: people ? 'people' : tribes ? 'tribes' : sources ? 'sources' : 'category',
        score: people * 100 + tribes * 80 + sources * 60 + (category ? 8 : 0),
      };
    })
    .filter((item) => item.record.id !== id && item.score > 0)
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, limit);
}

export function shortTitle(title, limit = 42) {
  // A Mongolian orthographic word includes its NNBSP suffix and MVS/FVS sequences.
  const words = [...title.matchAll(/[^\u0020\u0009\u000a\u000d]+/gu)];
  const segmenter = new Intl.Segmenter('mn', { granularity: 'grapheme' });
  let end = 0;
  for (const word of words) {
    const next = word.index + word[0].length;
    if (end && [...segmenter.segment(title.slice(0, next))].length > limit) break;
    end = next;
  }
  return !end || end === title.trimEnd().length ? title : title.slice(0, end) + '᠁';
}

export const discoverySeeds = {
  history: 'paiza-object',
  people: 'tribal-alliances',
  language: 'vertical-script',
  life: 'ger-craft',
  arts: 'morin-khuur',
  sources: 'reading-histories',
};
