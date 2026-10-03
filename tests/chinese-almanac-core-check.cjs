const assert = require('node:assert'),
  fs = require('node:fs'),
  crypto = require('node:crypto'),
  core = require('../public/chinese-almanac-core.js'),
  cases = require('./fixtures/chinese-almanac-cases.json');
for (const t of cases) {
  const r = core.compute(t.date);
  for (const k of ['lunarYear', 'lunarDay', 'yearGanZhi', 'monthGanZhi', 'dayGanZhi'])
    assert.equal(r[k], t[k], t.date + ' ' + k);
  assert.equal(r.lunarMonth, Math.abs(t.lunarMonth));
  assert.equal(r.leapMonth, t.lunarMonth < 0);
  assert.equal(r.solarTerm, t.jieQi);
  assert.deepEqual(r.yi, t.yi);
  assert.deepEqual(r.ji, t.ji);
  const ds = Object.fromEntries(r.directions.map((x) => [x.key, x.value]));
  assert.deepEqual(ds, {
    joyDeityDirection: t.xi,
    wealthDeityDirection: t.cai,
    fortuneDeityDirection: t.fu,
    yangNobleDirection: t.yangGui,
    yinNobleDirection: t.yinGui,
  });
  assert.equal(r.yiJiSect, 1);
  assert.equal(r.fortuneDirectionSect, 2);
}
for (const bad of [
  '2027-02-30',
  '2026-02-29',
  '2026-04-31',
  '2027-13-01',
  '1900-12-31',
  '2101-01-01',
  'bad',
  '2027-3-7',
]) {
  assert(!core.validDate(bad));
  assert.throws(() => core.compute(bad), RangeError);
}
for (const good of ['1901-01-01', '2100-12-31', '2000-02-29', '2028-02-29'])
  assert(core.validDate(good));
assert.equal(core.compute('2026-10-03').lunarDay, 23);
assert.equal(core.compute('2027-03-07').lunarDay, 30);
assert.equal(core.compute('2026-10-04').dayGanZhi, '辛亥');
assert.equal(core.compute('2026-02-16').yearGanZhi, '乙巳');
assert.equal(core.compute('2026-02-17').yearGanZhi, '丙午');
assert.equal(
  core.compute('2027-03-07').directions.find((x) => x.key === 'fortuneDeityDirection').value,
  '西南',
);
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('public/vendor/lunar-1.7.7.js')).digest('hex'),
  '9750324bfe1aa63c146f8c72b1143df924466c11c8a5277d7d9225c541a18aaa',
);
assert(fs.readFileSync('public/vendor/lunar-1.7.7-LICENSE.txt', 'utf8').includes('MIT License'));
console.log(
  'PASS: pinned unmodified MIT engine, 8 verified reference vectors, leap months, lunar new year/day/term boundaries, explicit YiJi/Fu variants, invalid Gregorian dates rejected, 1901–2100 limits. Exhaustive round-trip evidence is separate from independent HKO checks.',
);
