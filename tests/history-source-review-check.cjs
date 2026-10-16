const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const data = vm.runInNewContext(
  fs.readFileSync('content-source/data.js', 'utf8') + ';({PEOPLE,EDGES,EVENTS,SOURCES})',
);
const review = JSON.parse(fs.readFileSync('docs/history-source-review.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('content-source/wikipedia-pages.json', 'utf8'));
const edgeKey = (edge) => `${edge.from}/${edge.to}/${edge.type}`;
const sameIDs = (actual, expected) => {
  assert.equal(new Set(actual).size, actual.length, 'Review records must be unique');
  assert.deepEqual([...actual].sort(), [...expected].sort(), 'Review every current record');
};
sameIDs(
  review.people.map((person) => person.id),
  Object.keys(data.PEOPLE),
);
sameIDs(
  review.events.map((event) => event.id),
  Array.from(data.EVENTS, (event) => event.id),
);
sameIDs(review.relationships.map(edgeKey), Array.from(data.EDGES, edgeKey));
const statuses = new Set([
  'paired-core-facts',
  'paired-with-differences',
  'partial',
  'primary-source-retained',
]);
for (const row of [...review.people, ...review.events, ...review.relationships]) {
  assert(statuses.has(row.status));
  assert(row.facts || row.note, 'State which facts were actually compared');
  const languages = new Set();
  for (const id of row.sources) {
    const source = data.SOURCES[id];
    assert(source, `Missing reviewed source: ${id}`);
    assert.equal(review.sources[id].revisionId, source.revisionId);
    assert.equal(review.sources[id].url, source.url);
    languages.add(source.language);
  }
  if (row.status.startsWith('paired-')) {
    assert(languages.has('en') && languages.has('mn'), 'A paired claim needs both languages');
  }
}
for (const entry of registry) {
  const source = data.SOURCES[entry.id];
  assert.equal(source.revisionId, entry.revisionId, 'Preserve the reviewed source version');
  assert.equal(source.language, entry.language);
  assert.equal(source.originalTitle, entry.page);
  assert.equal(new URL(source.url).searchParams.get('oldid'), String(entry.revisionId));
}
assert.equal(data.SOURCES['wiki-ogedei-mn'].revisionId, 870229);
assert(
  !Object.values(data.SOURCES).some(
    (source) => source.language === 'mn' && source.revisionId === 872641,
  ),
  'The known anomalous Ogedei revision must not become a product citation',
);
for (const person of Object.values(data.PEOPLE)) {
  const visible = [person.name, person.alias, person.years, person.era, person.summary, person.note]
    .filter(Boolean)
    .join(' ');
  assert(!/[A-Za-z\u0400-\u04ff\u3400-\u9fff]/.test(visible));
}
assert(
  review.events.find((event) => event.id === 'hongwu-ayushiridara-letter-1370').status ===
    'primary-source-retained',
  'General biographies do not verify a dated letter',
);
console.log(
  'PASS: complete review inventory, paired-language evidence, fixed revisions and Mongolian content.',
);
