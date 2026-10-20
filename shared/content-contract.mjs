import { civilDate } from './calendar.mjs';

export class ContentContractError extends Error {
  constructor(path, expected) {
    super(`${path}: expected ${expected}`);
    this.name = 'ContentContractError';
    this.path = path;
  }
}
const requireValue = (condition, path, expected) => {
  if (!condition) throw new ContentContractError(path, expected);
};
const object = (value, path) => {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), path, 'object');
  return value;
};
const text = (value, path) => {
  requireValue(typeof value === 'string' && value.trim().length > 0, path, 'nonempty string');
  return value;
};
const list = (value, path) => {
  requireValue(Array.isArray(value), path, 'array');
  return value;
};
const integer = (value, path, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  requireValue(
    Number.isSafeInteger(value) && value >= min && value <= max,
    path,
    `integer ${min}…${max}`,
  );
const own = (table, key) => typeof key === 'string' && Object.hasOwn(table, key);
const refs = (value, table, path) =>
  list(value, path).forEach((id, i) =>
    requireValue(own(table, id), `${path}[${i}]`, 'existing own ID'),
  );

export function assertSource(value, path = 'source') {
  object(value, path);
  text(value.title || value.name || value.label, path + '.title');
  text(value.url, path + '.url');
  let url;
  try {
    url = new URL(value.url, 'https://nutug.invalid/');
  } catch {}
  requireValue(
    url && ['https:', 'http:'].includes(url.protocol),
    path + '.url',
    'HTTP(S) URL or local path',
  );
  if (value.kind === 'wikipedia') {
    integer(value.pageId, path + '.pageId', 1, Number.MAX_SAFE_INTEGER);
    integer(value.revisionId, path + '.revisionId', 1, Number.MAX_SAFE_INTEGER);
    text(value.originalTitle, path + '.originalTitle');
    text(value.language, path + '.language');
    requireValue(
      typeof value.retrievedAt === 'string' &&
        /^\d{4}-\d{2}-\d{2}T/.test(value.retrievedAt) &&
        Number.isFinite(Date.parse(value.retrievedAt)),
      path + '.retrievedAt',
      'ISO timestamp',
    );
    requireValue(
      url.hostname === 'wikipedia.org' || url.hostname.endsWith('.wikipedia.org'),
      path + '.url',
      'Wikipedia URL',
    );
    object(value.license, path + '.license');
    text(value.license.name, path + '.license.name');
    let license;
    try {
      license = new URL(value.license.url);
    } catch {}
    requireValue(license?.protocol === 'https:', path + '.license.url', 'HTTPS license URL');
  }
  return value;
}
function sourceTable(table, path) {
  object(table, path);
  for (const [id, value] of Object.entries(table)) assertSource(value, path + '.' + id);
}

export function assertResourcePath(value, version, path = 'resource') {
  text(value, path);
  requireValue(
    value.startsWith(`releases/${version}/`) && value.endsWith('.json') && !value.includes('..'),
    path,
    'versioned JSON path',
  );
  return value;
}

export function assertManifest(manifest) {
  object(manifest, 'manifest');
  requireValue(manifest.schemaVersion === 2, 'manifest.schemaVersion', 'supported version 2');
  requireValue(
    typeof manifest.version === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(manifest.version),
    'manifest.version',
    'content version',
  );
  requireValue(
    ['mn-Mong', 'mn-Mong-CN'].includes(manifest.locale),
    'manifest.locale',
    'Traditional Mongolian locale',
  );
  requireValue(manifest.writingMode === 'vertical-lr', 'manifest.writingMode', 'vertical-lr');
  for (const key of ['core', 'catalog', 'search', 'offline'])
    assertResourcePath(manifest[key], manifest.version, key);
  object(manifest.counts, 'manifest.counts');
  for (const key of ['articles', 'tribalArticles', 'originalReadings', 'entries'])
    integer(manifest.counts[key], 'counts.' + key);
  const c = manifest.counts;
  requireValue(
    c.entries === c.articles + c.tribalArticles + c.originalReadings,
    'counts.entries',
    'sum of collections',
  );
  object(manifest.categories, 'manifest.categories');
  for (const [id, label] of Object.entries(manifest.categories)) text(label, 'categories.' + id);
  const device = object(manifest.deviceCatalog, 'deviceCatalog');
  integer(device.pageSize, 'deviceCatalog.pageSize', 1, 8);
  integer(device.pageCount, 'deviceCatalog.pageCount');
  requireValue(
    device.pageCount === Math.ceil(c.entries / device.pageSize),
    'deviceCatalog.pageCount',
    'complete directory',
  );
  requireValue(
    device.path === `releases/${manifest.version}/catalog/{page}.json`,
    'deviceCatalog.path',
    'version-specific directory',
  );
  return manifest;
}

export function assertCore(core) {
  object(core, 'core');
  sourceTable(core.sources, 'core.sources');
  object(core.people, 'core.people');
  for (const [id, person] of Object.entries(core.people)) {
    object(person, 'people.' + id);
    text(person.name, 'people.' + id + '.name');
    text(person.summary, 'people.' + id + '.summary');
    refs(person.sources, core.sources, 'people.' + id + '.sources');
  }
  const edges = (items, nodes, sources, path) =>
    list(items, path).forEach((edge, i) => {
      object(edge, path + '.' + i);
      requireValue(
        own(nodes, edge.from) && own(nodes, edge.to),
        path + '.' + i,
        'existing endpoints',
      );
      if (edge.sources) refs(edge.sources, sources, path + '.' + i + '.sources');
      text(edge.type, path + '.' + i + '.type');
    });
  edges(core.peopleEdges, core.people, core.sources, 'peopleEdges');
  list(core.events, 'events').forEach((event, i) => {
    for (const field of ['date', 'title', 'text']) text(event[field], `events.${i}.${field}`);
    refs(event.people, core.people, `events.${i}.people`);
    if (event.sources) refs(event.sources, core.sources, `events.${i}.sources`);
  });
  const tribes = object(core.tribes, 'tribes');
  object(tribes.nodes, 'tribes.nodes');
  sourceTable(tribes.sources, 'tribes.sources');
  object(tribes.ui, 'tribes.ui');
  for (const [id, tribe] of Object.entries(tribes.nodes)) {
    text(tribe.name, 'tribes.' + id + '.name');
    refs(tribe.sources, tribes.sources, 'tribes.' + id + '.sources');
  }
  edges(tribes.edges, tribes.nodes, tribes.sources, 'tribes.edges');
  object(core.knowledge?.ui, 'knowledge.ui');
  object(core.knowledge.ui.categories, 'knowledge.ui.categories');
  object(core.tribalKnowledge?.ui, 'tribalKnowledge.ui');
  sourceTable(core.tribalKnowledge.sources, 'tribalKnowledge.sources');
  const calendar = object(core.calendar, 'calendar');
  object(calendar.ui, 'calendar.ui');
  sourceTable(calendar.sources, 'calendar.sources');
  list(calendar.events, 'calendar.events').forEach((event, i) => {
    text(event.id, `calendar.events.${i}.id`);
    text(event.title, `calendar.events.${i}.title`);
    list(event.dates, `calendar.events.${i}.dates`).forEach((date) =>
      requireValue(civilDate(date), `calendar.events.${i}.dates`, 'valid civil dates'),
    );
    refs(event.sources, calendar.sources, `calendar.events.${i}.sources`);
  });
  const almanac = object(core.almanac, 'almanac');
  requireValue(
    almanac.calendarSystem === 'chinese-lunisolar',
    'almanac.calendarSystem',
    'declared Chinese lunisolar calendar',
  );
  requireValue(
    civilDate(almanac.minDate) && civilDate(almanac.maxDate) && almanac.minDate <= almanac.maxDate,
    'almanac.range',
    'ordered civil dates',
  );
  for (const key of [
    'ui',
    'activities',
    'directions',
    'animals',
    'solarTerms',
    'stems',
    'branches',
  ])
    object(almanac[key], 'almanac.' + key);
  list(almanac.sources, 'almanac.sources').forEach((source, i) =>
    assertSource(source, 'almanac.sources.' + i),
  );
  return core;
}

export function assertDocument(document, expectedId) {
  object(document, 'document');
  text(document.id, 'document.id');
  if (expectedId !== undefined)
    requireValue(document.id === expectedId, 'document.id', 'requested record ID');
  text(document.title, 'document.title');
  if (document.summary !== undefined) text(document.summary, 'document.summary');
  list(document.paragraphs, 'document.paragraphs').forEach((paragraph, i) =>
    text(paragraph, 'document.paragraphs.' + i),
  );
  list(document.sources, 'document.sources').forEach((source, i) =>
    assertSource(source, 'document.sources.' + i),
  );
  return document;
}

export function assertSnapshot({ manifest, core, catalog, search }) {
  assertManifest(manifest);
  assertCore(core);
  list(catalog, 'catalog');
  object(search, 'search');
  requireValue(
    catalog.length === manifest.counts.entries,
    'catalog.length',
    'declared entry count',
  );
  const ids = new Set(),
    counts = { culture: 0, tribes: 0, originals: 0 };
  catalog.forEach((record, i) => {
    object(record, 'catalog.' + i);
    text(record.id, `catalog.${i}.id`);
    text(record.title, `catalog.${i}.title`);
    requireValue(!ids.has(record.id), `catalog.${i}.id`, 'unique ID');
    ids.add(record.id);
    requireValue(own(counts, record.collection), `catalog.${i}.collection`, 'supported collection');
    counts[record.collection]++;
    requireValue(
      own(manifest.categories, record.category),
      `catalog.${i}.category`,
      'declared category',
    );
    assertResourcePath(record.document, manifest.version, `catalog.${i}.document`);
    integer(record.sourceCount, `catalog.${i}.sourceCount`);
    requireValue(
      own(search, record.id) && typeof search[record.id] === 'string',
      `search.${record.id}`,
      'search index entry',
    );
    if (record.people) refs(record.people, core.people, `catalog.${i}.people`);
    if (record.tribes) refs(record.tribes, core.tribes.nodes, `catalog.${i}.tribes`);
  });
  requireValue(
    counts.culture === manifest.counts.articles &&
      counts.tribes === manifest.counts.tribalArticles &&
      counts.originals === manifest.counts.originalReadings,
    'catalog.collections',
    'declared collection counts',
  );
}
