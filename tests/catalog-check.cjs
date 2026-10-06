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
  console.log(
    'PASS: 484 searchable entries, category integrity, multi-term full text, exact-ID ranking and Mongolian query normalization.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
