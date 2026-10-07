/* UI adapters for the verified content snapshot loaded by bootstrap. */
import { createCatalogIndex, normalizeSearch } from './catalog.mjs';
const snapshot = window.NutugData;
const data = snapshot.core;
export const people = data.people;
export const peopleEdges = data.peopleEdges;
export const events = data.events;
export const sources = data.sources;
export const gaps = data.gaps;
export const relationUI = data.relationUI;
export const tribes = data.tribes;
export const knowledge = data.knowledge;
export const tribalKnowledge = data.tribalKnowledge;
export const calendar = data.calendar;
export const almanac = data.almanac;
export const contentClient = window.NutugContentClient;

export { labels } from './ui-copy.mjs';

export const own = (table, id) => typeof id === 'string' && Object.hasOwn(table, id);
export { edgeKey } from '../shared/records.mjs';
export const sourceItems = (ids = [], table = sources) =>
  [...new Set(ids)]
    .map((id) => table[id])
    .filter(Boolean)
    .map((s) => ({ ...s, title: s.title || s.name || s.label }));
export const catalogRecords = snapshot.catalog.map((record) => ({
  ...record,
  searchText: snapshot.search[record.id] || '',
}));
export const articles = catalogRecords.filter((record) => record.collection !== 'originals');
export const catalogIndex = createCatalogIndex(catalogRecords);
export const catalogById = new Map(catalogRecords.map((record) => [record.id, record]));
export const normalizeQuery = normalizeSearch;
export const matches = (query, ...values) =>
  values.some((v) => normalizeQuery(v || '').includes(normalizeQuery(query)));
export { currentDate } from '../shared/calendar.mjs';
