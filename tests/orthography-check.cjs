const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
(async () => {
  const { spellingRegistry, displayMongolian, normalizeMongolian } =
    await import('../shared/mongolian-orthography.mjs');
  const { normalizeSearch } = await import('../src/catalog.mjs');
  assert.equal(spellingRegistry.length, 11);
  for (const row of spellingRegistry) {
    assert.equal(displayMongolian(row.canonical), row.display);
    assert.equal(displayMongolian(row.display), row.display);
    assert.equal(normalizeMongolian(row.display), row.canonical);
    assert.equal(normalizeSearch(row.canonical), normalizeSearch(row.display));
    for (const mark of ['\u034f', '\u200c', '\u200d'])
      assert.equal(displayMongolian(mark + row.canonical), mark + row.canonical);
    const other = row.canonical.replace('ᠶᠢ', 'ᠶ\u180cᠢ');
    assert.equal(displayMongolian(other), other);
  }
  assert.equal(displayMongolian('ᠠᠶᠢᠮᠠᠭᠤᠳ'), 'ᠠᠶᠢᠮᠠᠭᠤᠳ');
  assert.equal(normalizeSearch('ᠬᠡ\u180bᠷᠡᠢᠳ'), 'ᠬᠡ\u180bᠷᠡᠢᠳ');
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('content-source/knowledge-data.js', 'utf8'), context);
  const records = vm.runInContext('KNOWLEDGE.articles', context);
  const changes = JSON.parse(fs.readFileSync('docs/word-corrections.json', 'utf8'));
  for (const patch of changes.applied) {
    let value = records.find((record) => record.id === patch.id);
    for (const key of patch.path) value = value[key];
    assert.equal(value, patch.after, patch.id + ': reviewed correction retained');
  }
  assert(!JSON.stringify(records.find((r) => r.id === 'vertical-script')).includes('ᠳᠣᠣᠭᠰᠢ'));
  console.log(
    `PASS: 11 exact-word display forms, selector preservation, canonical search and ${changes.applied.length} reviewed field corrections.`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
