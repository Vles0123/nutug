/* Historical datasets stay in public/ so the web and native clients share them. */
export const people = PEOPLE;
export const peopleEdges = EDGES;
export const events = EVENTS;
export const sources = SOURCES;
export const gaps = RESEARCH_GAPS;
export const relationUI = RELATION_UI;
export const tribes = TRIBAL_GRAPH;
export const knowledge = KNOWLEDGE;
export const tribalKnowledge = TRIBAL_KNOWLEDGE;
export const calendar = MONGOL_CALENDAR;
export const almanac = CHINESE_ALMANAC_CONFIG;

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
};

export const own = (table, id) => typeof id === 'string' && Object.hasOwn(table, id);
export const edgeKey = (edge) => (edge ? edge.id || `${edge.type}:${edge.from}:${edge.to}` : null);
export const sourceItems = (ids = [], table = sources) =>
  [...new Set(ids)]
    .map((id) => table[id])
    .filter(Boolean)
    .map((s) => ({ ...s, title: s.title || s.name || s.label }));
export const articles = [
  ...knowledge.articles.map((a) => ({
    ...a,
    paragraphs: a.body,
    people: a.relatedPeople || [],
    collection: 'culture',
  })),
  ...tribalKnowledge.articles.map((a) => ({
    ...a,
    sources: sourceItems(a.sources, tribalKnowledge.sources),
    collection: 'tribes',
  })),
];
export const normalizeQuery = (value) =>
  String(value)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u180b-\u180f\u200b-\u200d]/g, '')
    .replace(/\u202f/g, ' ')
    .trim();
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
