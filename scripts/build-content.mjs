import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createCatalogIndex } from '../src/catalog.mjs';

const context = vm.createContext({});
for (const file of [
  'data',
  'tribes-data',
  'knowledge-data',
  'tribal-knowledge-data',
  'calendar-data',
  'almanac-data',
])
  vm.runInContext(await readFile(`content-source/${file}.js`, 'utf8'), context, { timeout: 1000 });
const data = JSON.parse(
  vm.runInContext(
    'JSON.stringify({people:PEOPLE,peopleEdges:EDGES,events:EVENTS,sources:SOURCES,gaps:RESEARCH_GAPS,relationUI:RELATION_UI,tribes:TRIBAL_GRAPH,knowledge:KNOWLEDGE,tribalKnowledge:TRIBAL_KNOWLEDGE,calendar:MONGOL_CALENDAR,almanac:CHINESE_ALMANAC_CONFIG})',
    context,
  ),
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = 'content-dist';
await mkdir(`${root}/objects`, { recursive: true });
async function writeAtomically(path, value) {
  const bytes = Buffer.from(value);
  try {
    if ((await readFile(path)).equals(bytes)) return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}
async function object(value) {
  const bytes = Buffer.from(JSON.stringify(value) + '\n');
  const sha256 = hash(bytes),
    path = `objects/${sha256}.json`;
  await writeAtomically(`${root}/${path}`, bytes);
  return { path, sha256, bytes: bytes.length };
}
const resolveSources = (ids, table) =>
  [...new Set(ids)]
    .map((id) => table[id])
    .filter(Boolean)
    .map((s) => ({ ...s, title: s.title || s.name || s.label }));
const records = [
  ...data.knowledge.articles.map((a) => ({
    ...a,
    paragraphs: a.body,
    people: a.relatedPeople || [],
    collection: 'culture',
  })),
  ...data.tribalKnowledge.articles.map((a) => ({
    ...a,
    sources: resolveSources(a.sources, data.tribalKnowledge.sources),
    collection: 'tribes',
  })),
  ...data.knowledge.readings.map((a) => ({
    id: a.id,
    title: a.titleMn,
    summary: a.summaryMn,
    paragraphs: [a.summaryMn],
    category: 'originals',
    collection: 'originals',
    sources: [{ title: a.titleMn, url: a.url }],
  })),
];
const catalog = [],
  documents = {};
if (new Set(records.map((record) => record.id)).size !== records.length)
  throw new Error('Content IDs must be unique across collections');
for (const record of records) {
  const { body, relatedPeople, ...document } = record;
  const descriptor = await object(document);
  documents[record.id] = { descriptor, document };
  const { id, title, summary, category, collection, people, tribes, graphMode, relatedModes } =
    record;
  catalog.push({
    id,
    title,
    summary,
    category,
    collection,
    people,
    tribes,
    graphMode,
    relatedModes,
    sourceCount: record.sources.length,
    document: descriptor,
  });
}
const { articles: knowledgeArticles, readings, ...knowledge } = data.knowledge;
const { articles: tribalArticles, ...tribalKnowledge } = data.tribalKnowledge;
const core = await object({ ...data, knowledge, tribalKnowledge });
const catalogDescriptor = await object(catalog);
const search = await object(
  Object.fromEntries(createCatalogIndex(records).map((item) => [item.record.id, item.document])),
);
const offline = await object(documents);
const revision = hash(JSON.stringify({ core, catalog: catalogDescriptor, search, offline })).slice(
  0,
  24,
);
const pageSize = 8,
  pageCount = Math.ceil(catalog.length / pageSize);
await mkdir(`${root}/revisions/${revision}/catalog`, { recursive: true });
for (let page = 0; page < pageCount; page++) {
  const entries = catalog
    .slice(page * pageSize, (page + 1) * pageSize)
    .map(({ id, title, category, collection, document }) => ({
      id,
      title,
      category,
      collection,
      document,
    }));
  await writeAtomically(
    `${root}/revisions/${revision}/catalog/${page}.json`,
    JSON.stringify({
      schemaVersion: 1,
      revision,
      page,
      totalPages: pageCount,
      totalEntries: catalog.length,
      entries,
    }) + '\n',
  );
}
const manifest = {
  schemaVersion: 1,
  revision,
  locale: 'mn-Mong',
  writingMode: 'vertical-lr',
  categories: {
    ...data.knowledge.ui.categories,
    tribes: 'ᠠᠶᠢᠮᠠᠭ',
    originals: data.knowledge.ui.original,
  },
  counts: {
    articles: data.knowledge.articles.length,
    tribalArticles: data.tribalKnowledge.articles.length,
    originalReadings: data.knowledge.readings.length,
    entries: catalog.length,
  },
  core,
  catalog: catalogDescriptor,
  search,
  offline,
  deviceCatalog: { path: `revisions/${revision}/catalog/{page}.json`, pageSize, pageCount },
  updatePolicy: { checkOnConnect: true, immutableObjects: true, hash: 'sha256' },
};
await writeAtomically(`${root}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
await writeAtomically(
  `${root}/_headers`,
  '/manifest.json\n  Cache-Control: no-cache\n  Access-Control-Allow-Origin: *\n/objects/*\n  Cache-Control: public, max-age=31536000, immutable\n  Access-Control-Allow-Origin: *\n/revisions/*\n  Cache-Control: public, max-age=31536000, immutable\n  Access-Control-Allow-Origin: *\n',
);
console.log(
  JSON.stringify({
    revision,
    entries: catalog.length,
    manifestBytes: (await readFile(`${root}/manifest.json`)).length,
    coreBytes: core.bytes,
    catalogBytes: catalogDescriptor.bytes,
    searchBytes: search.bytes,
    offlineBytes: offline.bytes,
    devicePages: pageCount,
  }),
);
