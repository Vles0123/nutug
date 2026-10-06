import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import vm from 'node:vm';
import { createCatalogIndex, canonicalSourceUrl } from '../src/catalog.mjs';
import { assertCore, assertDocument, assertSnapshot } from '../shared/content-contract.mjs';

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
const root = 'content-dist';
const version = process.env.CONTENT_VERSION || new Date().toISOString().replace(/\D/g, '');
if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(version)) throw new Error('Invalid content version');
const release = `releases/${version}`;
await mkdir(`${root}/releases`, { recursive: true });
await mkdir(`${root}/${release}`);
await mkdir(`${root}/${release}/articles`, { recursive: true });
await mkdir(`${root}/${release}/catalog`, { recursive: true });
async function writeAtomically(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, path);
}
async function resource(name, value) {
  const path = `${release}/${name}.json`;
  await writeAtomically(`${root}/${path}`, JSON.stringify(value) + '\n');
  return path;
}
const resolveSources = (ids, table) =>
  [...new Set(ids)]
    .map((id) => {
      if (!Object.hasOwn(table, id)) throw new Error(`Unknown source: ${id}`);
      return table[id];
    })
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
    category: 'tribes',
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
  documents = Object.create(null);
if (new Set(records.map((record) => record.id)).size !== records.length)
  throw new Error('Content IDs must be unique across collections');
for (const record of records) {
  const { body, relatedPeople, ...document } = record;
  assertDocument(document, record.id);
  const path = await resource('articles/' + encodeURIComponent(record.id), document);
  documents[record.id] = document;
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
    sourceKeys: [...new Set(record.sources.map((source) => canonicalSourceUrl(source.url)))],
    document: path,
  });
}
const { articles: knowledgeArticles, readings, ...knowledge } = data.knowledge;
const { articles: tribalArticles, ...tribalKnowledge } = data.tribalKnowledge;
const coreData = { ...data, knowledge, tribalKnowledge };
assertCore(coreData);
const core = await resource('core', coreData);
const catalogPath = await resource('catalog', catalog);
const searchData = Object.fromEntries(
  createCatalogIndex(records).map((item) => [item.record.id, item.document]),
);
const search = await resource('search', searchData);
const offline = await resource('offline', documents);
const pageSize = 8,
  pageCount = Math.ceil(catalog.length / pageSize);
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
    `${root}/${release}/catalog/${page}.json`,
    JSON.stringify({
      schemaVersion: 2,
      version,
      page,
      totalPages: pageCount,
      totalEntries: catalog.length,
      entries,
    }) + '\n',
  );
}
const manifest = {
  schemaVersion: 2,
  version,
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
  catalog: catalogPath,
  search,
  offline,
  deviceCatalog: { path: `${release}/catalog/{page}.json`, pageSize, pageCount },
  updatePolicy: { checkOnConnect: true },
};
assertSnapshot({ manifest, core: coreData, catalog, search: searchData });
await writeAtomically(`${root}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
await writeAtomically(
  `${root}/_headers`,
  '/manifest.json\n  Cache-Control: no-cache\n  Access-Control-Allow-Origin: *\n/releases/*\n  Cache-Control: public, max-age=31536000, immutable\n  Access-Control-Allow-Origin: *\n',
);
console.log(
  JSON.stringify({
    version,
    entries: catalog.length,
    manifestBytes: (await readFile(`${root}/manifest.json`)).length,
    coreBytes: (await readFile(`${root}/${core}`)).length,
    catalogBytes: (await readFile(`${root}/${catalogPath}`)).length,
    searchBytes: (await readFile(`${root}/${search}`)).length,
    offlineBytes: (await readFile(`${root}/${offline}`)).length,
    devicePages: pageCount,
  }),
);
