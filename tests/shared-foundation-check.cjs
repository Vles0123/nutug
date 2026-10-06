const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const { civilDate, chineseLunisolarProvider } = await import('../shared/calendar.mjs');
  const { assertManifest, assertSnapshot, assertSource } =
    await import('../shared/content-contract.mjs');
  const manifest = JSON.parse(fs.readFileSync('content-dist/manifest.json', 'utf8'));
  const read = (path) => JSON.parse(fs.readFileSync('content-dist/' + path, 'utf8'));
  const snapshot = {
    manifest,
    core: read(manifest.core),
    catalog: read(manifest.catalog),
    search: read(manifest.search),
  };
  assertSnapshot(snapshot);
  const bad = (edit) => {
    const copy = structuredClone(snapshot);
    edit(copy);
    assert.throws(() => assertSnapshot(copy));
  };
  bad((s) => {
    s.core.peopleEdges[0].from = 'missing-person';
  });
  bad((s) => {
    s.catalog[0].document = 'https://outside.test/article.json';
  });
  bad((s) => {
    s.catalog[1].id = s.catalog[0].id;
  });
  bad((s) => {
    delete s.search[s.catalog[0].id];
  });
  bad((s) => {
    s.core.calendar.events[0].dates = ['2026-02-30'];
  });
  assert.throws(() => assertManifest({ ...manifest, counts: { ...manifest.counts, entries: 1 } }));
  const source = {
    title: 'ᠨᠤᠲᠤᠭ',
    kind: 'wikipedia',
    url: 'https://mn.wikipedia.org/wiki/Example',
    originalTitle: 'Example',
    language: 'mn',
    pageId: 1,
    revisionId: 2,
    retrievedAt: '2026-10-07T00:00:00Z',
    license: { name: 'Example license', url: 'https://example.org/license' },
  };
  assertSource(source);
  for (const field of [
    'pageId',
    'revisionId',
    'originalTitle',
    'language',
    'retrievedAt',
    'license',
  ]) {
    const copy = { ...source };
    delete copy[field];
    assert.throws(() => assertSource(copy));
  }
  for (const date of ['0001-01-01', '0099-12-31', '2000-02-29', '2028-02-29'])
    assert(civilDate(date));
  for (const date of [
    '0000-01-01',
    '1900-02-29',
    '2100-02-29',
    '2026-02-29',
    '2026-04-31',
    '2026-2-01',
    null,
  ])
    assert.equal(civilDate(date), null);
  const engine = require('../public/chinese-almanac-core.js');
  const config = snapshot.core.almanac;
  const provider = chineseLunisolarProvider(engine, config);
  for (const test of require('./fixtures/chinese-almanac-cases.json')) {
    const result = provider.compute(test.date);
    assert.equal(result.civilDate, test.date);
    assert.equal(result.calendarSystem, config.calendarSystem);
    assert.equal(result.lunarYear, test.lunarYear);
    assert.equal(result.lunarMonth, Math.abs(test.lunarMonth));
    assert.equal(result.leapMonth, test.lunarMonth < 0);
    assert.equal(result.lunarDay, test.lunarDay);
  }
  for (const date of [config.minDate, config.maxDate]) assert(provider.validDate(date));
  for (const date of ['1900-12-31', '2101-01-01', '2026-02-30'])
    assert.throws(() => provider.compute(date), RangeError);
  assert.throws(() => chineseLunisolarProvider(engine, { ...config, calendarSystem: 'unknown' }));
  assert.throws(() =>
    chineseLunisolarProvider({ compute: () => ({}) }, config).compute('2026-10-07'),
  );
  console.log(
    'PASS: shared content structure, record references, source metadata and calendar date boundaries.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
