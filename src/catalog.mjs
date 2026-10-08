import { normalizeMongolian } from '../shared/mongolian-orthography.mjs';
export const CATALOG_BATCH_SIZE = 24;

export function normalizeSearch(value) {
  return normalizeMongolian(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}

export function createCatalogIndex(records) {
  return records.map((record, order) => {
    const title = normalizeSearch(record.title),
      id = normalizeSearch(record.id),
      summary = normalizeSearch(record.summary);
    const document =
      record.searchText ||
      normalizeSearch(
        [
          record.id,
          record.title,
          record.summary,
          ...(record.paragraphs || []),
          ...(record.sources || []).flatMap((s) => [
            s.title,
            s.nameMn,
            s.organization,
            s.originalTitle,
            s.originalOrganization,
            s.url,
          ]),
        ]
          .filter(Boolean)
          .join(' '),
      );
    return { record, order, title, id, summary, document };
  });
}

export function searchCatalog(index, { query = '', category = 'all', collection } = {}) {
  const normalized = normalizeSearch(query),
    terms = normalized.split(' ').filter(Boolean);
  return index
    .filter(
      (item) =>
        (!collection || item.record.collection === collection) &&
        (category === 'all' ||
          (category === 'tribes'
            ? item.record.collection === 'tribes'
            : item.record.category === category)) &&
        terms.every((term) => item.document.includes(term)),
    )
    .map((item) => ({
      ...item,
      score: !normalized
        ? 0
        : item.id === normalized
          ? 500
          : item.title === normalized
            ? 400
            : item.title.startsWith(normalized)
              ? 300
              : item.title.includes(normalized)
                ? 200
                : item.id.includes(normalized)
                  ? 150
                  : item.summary.includes(normalized)
                    ? 100
                    : 20,
    }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((item) => item.record);
}

export function canonicalSourceUrl(value) {
  const url = new URL(value);
  url.hash = '';
  url.hostname = url.hostname.replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/$/, '');
  for (const key of [...url.searchParams.keys()])
    if (key.startsWith('utm_') || key === 'hl') url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
