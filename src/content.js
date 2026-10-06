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

export const labels = {
  brand: 'ᠨᠤᠲᠤᠭ',
  previous: 'ᠡᠮᠦᠨᠡᠬᠢ',
  next: 'ᠳᠠᠷᠠᠭᠠᠬᠢ',
  people: 'ᠬᠦᠮᠦᠰ',
  tribes: 'ᠠᠶᠢᠮᠠᠭ',
  library: 'ᠮᠡᠳᠡᠯᠭᠡ',
  calendar: 'ᠴᠠᠭ ᠲᠣᠭ᠎ᠠ',
  search: 'ᠬᠠᠶᠢᠬᠤ',
  close: 'ᠬᠠᠭᠠᠬᠤ',
  clear: 'ᠠᠷᠢᠯᠭᠠᠬᠤ',
  read: 'ᠤᠩᠰᠢᠬᠤ',
  settings: 'ᠲᠣᠬᠢᠷᠠᠭᠤᠯᠭ᠎ᠠ',
  type: 'ᠦᠰᠦᠭ ᠦᠨ ᠬᠡᠮᠵᠢᠶ᠎ᠡ',
  larger: 'ᠲᠣᠮᠣᠰᠬᠠᠬᠤ',
  smaller: 'ᠪᠠᠭᠠᠰᠬᠠᠬᠤ',
  fit: 'ᠪᠦᠬᠦᠨ ᠢ ᠦᠵᠡᠭᠦᠯᠬᠦ',
  focus: 'ᠲᠥᠪᠯᠡᠷᠡᠭᠦᠯᠬᠦ',
  details: 'ᠳᠡᠯᠭᠡᠷᠡᠩᠭᠦᠢ',
  sources: 'ᠰᠤᠷᠪᠤᠯᠵᠢ',
  relations: 'ᠬᠠᠷᠢᠯᠴᠠᠭ᠎ᠠ',
  all: 'ᠪᠦᠬᠦ',
  family: 'ᠤᠷᠤᠭ ᠲᠥᠷᠥᠯ',
  power: 'ᠤᠯᠤᠰ ᠲᠥᠷᠥ',
  timeline: 'ᠣᠨ ᠴᠠᠭ',
  back: 'ᠪᠤᠴᠠᠬᠤ',
  more: 'ᠨᠡᠮᠡᠵᠦ ᠦᠵᠡᠬᠦ',
  retry: 'ᠳᠠᠬᠢᠨ ᠣᠷᠣᠯᠳᠣᠬᠤ',
  update: 'ᠰᠢᠨᠡᠴᠢᠯᠡᠬᠦ',
  download: 'ᠲᠠᠲᠠᠵᠤ ᠠᠪᠬᠤ',
  saved: 'ᠬᠠᠳᠠᠭᠠᠯᠠᠪᠠ',
  connection: 'ᠰᠦᠯᠵᠢᠶ᠎ᠡ',
  directions: 'ᠵᠦᠭ',
};

export const own = (table, id) => typeof id === 'string' && Object.hasOwn(table, id);
export const edgeKey = (edge) => (edge ? edge.id || `${edge.type}:${edge.from}:${edge.to}` : null);
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
export function currentDate(zone = calendar.editorial?.todayTimeZone || 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((k) => parts.find((p) => p.type === k).value).join('-');
}
