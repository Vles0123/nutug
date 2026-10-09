const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const {
    civilDate,
    gregorianProvider,
    chineseLunisolarProvider,
    normalizeDateInput,
    monthDays,
    moveDate,
    moveMonth,
  } = await import('../shared/calendar.mjs');
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
  const engineForFeed = require('../public/chinese-almanac-core.js');
  for (const year of manifest.calendar.years)
    for (let month = 1; month <= 12; month++) {
      const monthId = `${year}-${String(month).padStart(2, '0')}`;
      const page = read(manifest.calendar.path.replace('{month}', monthId));
      assert.equal(page.days.length, new Date(Date.UTC(year, month, 0)).getUTCDate());
      for (const item of page.days) {
        const value = engineForFeed.compute(item.date);
        assert.deepEqual(
          [item.year, item.month, item.day, item.leap],
          [value.lunarYear, value.lunarMonth, value.lunarDay, value.leapMonth],
        );
      }
    }
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
  const civil = gregorianProvider(config);
  assert.equal(civil.id, 'gregorian');
  assert.deepEqual(civil.compute('2028-02-29'), {
    iso: '2028-02-29',
    year: 2028,
    month: 2,
    day: 29,
    weekday: 1,
    calendarSystem: 'gregorian',
  });
  assert.equal(moveDate('2028-02-28', 1), '2028-02-29');
  assert.equal(moveDate('2028-02-29', 1), '2028-03-01');
  assert.equal(moveDate('2026-12-31', 1), '2027-01-01');
  assert.equal(moveMonth('2028-01-31', 1), '2028-02-29');
  assert.equal(moveMonth('2028-02-29', 12), '2029-02-28');
  assert.equal(monthDays('2028-02').filter((day) => day.inMonth).length, 29);
  assert.equal(monthDays('2100-02').filter((day) => day.inMonth).length, 28);
  assert.throws(() => civil.compute('2100-02-29'), RangeError);
  assert.equal(normalizeDateInput(' ᠒᠐᠒᠘/᠒/᠒᠙ '), '2028-02-29');
  assert.equal(normalizeDateInput('２０２８．２．２９'), '2028-02-29');
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
