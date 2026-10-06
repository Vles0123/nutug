const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const { createCatalogIndex, searchCatalog, normalizeSearch } = await import('../src/catalog.mjs');
  const manifest = JSON.parse(fs.readFileSync('content-dist/manifest.json', 'utf8'));
  const records = JSON.parse(fs.readFileSync('content-dist/' + manifest.catalog.path, 'utf8'));
  const search = JSON.parse(fs.readFileSync('content-dist/' + manifest.search.path, 'utf8'));
  const index = createCatalogIndex(records.map((r) => ({ ...r, searchText: search[r.id] })));
  assert.equal(searchCatalog(index).length, 484);
  assert.equal(searchCatalog(index, { category: 'tribes' }).length, 8);
  assert.equal(searchCatalog(index, { category: 'originals' }).length, 2);
  for (const record of records)
    assert.equal(
      searchCatalog(index, { query: record.id })[0].id,
      record.id,
      'Every catalog entry remains searchable',
    );
  const synthetic = createCatalogIndex([
    { id: 'one', title: 'ᠮᠣᠩᠭᠣᠯ', searchText: 'word only in the body' },
  ]);
  assert.equal(
    searchCatalog(synthetic, { query: 'word body' }).length,
    1,
    'Shared full-text index is used',
  );
  assert.equal(normalizeSearch('  ᠬᠡᠷᠡᠢᠳ\u202fᠤᠨ  '), normalizeSearch('ᠬᠡᠷᠡᠢᠳ ᠤᠨ'));
  assert.equal(normalizeSearch('ᠬᠡ\u180bᠷᠡᠢᠳ'), normalizeSearch('ᠬᠡᠷᠡᠢᠳ'));
  const { relatedRecords, shortTitle } = await import('../src/discovery.mjs');
  for (const record of records) {
    const related = relatedRecords(records, record.id);
    assert(related.length <= 6);
    assert.equal(new Set(related.map((x) => x.record.id)).size, related.length);
    for (const item of related) {
      assert.notEqual(item.record.id, record.id);
      const field = item.reason === 'sources' ? 'sourceKeys' : item.reason;
      assert(
        item.reason === 'category'
          ? record.category === item.record.category
          : record[field].some((key) => item.record[field]?.includes(key)),
        'Every displayed relationship has matching metadata',
      );
    }
  }
  const shared = relatedRecords(
    [
      { id: 'a', category: 'history', sourceKeys: ['one'] },
      { id: 'b', category: 'history', sourceKeys: ['two'] },
      { id: 'c', category: 'arts', sourceKeys: ['one'] },
      { id: 'd', category: 'language', sourceKeys: ['three'] },
    ],
    'a',
  );
  assert.equal(shared[0].record.id, 'c', 'Shared sources lead to cross-topic discovery');
  assert.equal(shared[0].reason, 'sources');
  assert(!shared.some((x) => x.record.id === 'd'), 'Unrelated articles do not create links');
  const collection = Array.from({ length: 20 }, (_, i) => ({ id: String(i), category: 'history' }));
  const visited = new Set();
  let cursor = '0';
  for (let i = 0; i < 20; i++) {
    visited.add(cursor);
    cursor = relatedRecords(collection, cursor, 1)[0].record.id;
  }
  assert.equal(visited.size, 20, 'Following same-topic neighbors reaches the whole collection');
  assert.equal(
    shortTitle('ᠠ᠋ᠠ᠋', 1),
    'ᠠ᠋…',
    'Node titles preserve grapheme and variation-selector boundaries',
  );
  console.log(
    'PASS: 484 searchable entries, category integrity, multi-term full text, exact-ID ranking and Mongolian query normalization.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
