const readLegacy = require('./legacy-assets.cjs');
const assert = require('node:assert'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { JSDOM } = require('jsdom'),
  core = require('../public/chinese-almanac-core');
const A = vm.runInNewContext(
    fs.readFileSync('content-source/almanac-data.js', 'utf8') + ';CHINESE_ALMANAC_CONFIG',
  ),
  verified = require('./fixtures/chinese-almanac-verification.json');
assert.equal(A.calendarSystem, 'chinese-lunisolar');
assert.equal(Object.keys(A.activities).length, 142);
for (const term of verified.dayVocabulary) assert(A.activities[term]);
assert.equal(Object.keys(A.directions).length, 9);
assert.equal(Object.keys(A.solarTerms).length, 24);
assert.equal(A.pendingTerms[0], '归岫');
assert.notEqual(A.activities['无'], A.activities['诸事不宜']);
assert.notEqual(A.activities['无'], A.activities['馀事勿取']);
assert.notEqual(A.activities['诸事不宜'], A.activities['馀事勿取']);
let now = '2026-10-03T09:00:00Z';
const w = new JSDOM(fs.readFileSync('tests/fixtures/legacy/almanac.html', 'utf8'), {
  runScripts: 'outside-only',
  url: 'https://nutug.cn/almanac.html',
}).window;
w.Date = class extends Date {
  constructor(...a) {
    super(...(a.length ? a : [now]));
  }
};
w.eval(
  [
    'calendar-data.js',
    'vendor/lunar-1.7.7.js',
    'chinese-almanac-core.js',
    'almanac-data.js',
    'almanac.js',
  ]
    .map((f) => readLegacy(f))
    .join('\n'),
);
const d = w.document;
assert.equal(d.getElementById('almanacDate').value, '2026-10-03');
assert(!d.getElementById('almanacRecord').hidden);
assert.equal(d.querySelectorAll('.almanac-field').length, 6);
assert(d.querySelector('[data-field=lunar] strong').textContent.includes('2026 / 8 / 23'));
assert.equal(d.querySelector('[data-field=zodiac] strong').textContent, A.animals['马']);
assert.equal(d.querySelectorAll('.deity-direction').length, 5);
assert.equal(d.querySelectorAll('#favorableValues p').length, 10);
assert.equal(d.querySelectorAll('#favorableValues p:not([hidden])').length, 8);
d.querySelector('#favorableValues .activity-toggle').click();
assert.equal(d.querySelectorAll('#favorableValues p:not([hidden])').length, 10);
assert.equal(d.getElementById('almanacTraditionNote').textContent, A.ui.traditionNote);
assert(
  d.getElementById('almanacTraditionNote').compareDocumentPosition(d.querySelector('.favorable')) &
    w.Node.DOCUMENT_POSITION_FOLLOWING,
);
d.querySelector('[data-example-date="2027-03-07"]').click();
assert(!d.getElementById('almanacRecord').hidden);
assert(d.querySelector('[data-field=lunar] strong').textContent.includes('2027 / 1 / 30'));
assert.equal(d.querySelector('[data-field=zodiac] strong').textContent, A.animals['羊']);
assert.deepEqual(
  [...d.querySelectorAll('#favorableValues p')].map((p) => p.dataset.originalTerm),
  core.compute('2027-03-07').yi,
);
assert(d.querySelector('#favorableValues [data-original-term="治病"]'));
assert(d.querySelector('#unfavorableValues [data-original-term="诸事不宜"]'));
assert.equal(
  d.querySelector('[data-deity=wealthDeityDirection] strong').textContent,
  A.directions['东北'],
);
assert.equal(
  d.querySelector('[data-deity=fortuneDeityDirection] strong').textContent,
  A.directions['西南'],
);
assert(!d.body.textContent.includes('Ergelt'));
function choose(s) {
  d.getElementById('almanacDate').value = s;
  d.getElementById('almanacDate').dispatchEvent(new w.Event('change'));
}
choose('2025-07-25');
assert(d.querySelector('[data-field=lunar] strong').textContent.includes(A.ui.leapMonth));
choose('2026-02-04');
assert.equal(d.querySelector('[data-field=term] strong').textContent, A.solarTerms['立春']);
assert.equal(d.querySelector('[data-field=zodiac] strong').textContent, A.animals['蛇']);
choose('1901-01-01');
assert(d.getElementById('almanacPrevious').disabled);
choose('2100-12-31');
assert(d.getElementById('almanacNext').disabled);
choose('2027-02-30');
assert.equal(d.getElementById('almanacDate').getAttribute('aria-invalid'), 'true');
assert(d.getElementById('almanacInputError').textContent);
choose('2026-10-03');
now = '2026-10-03T16:00:01Z';
d.dispatchEvent(new w.Event('visibilitychange'));
assert.equal(d.getElementById('almanacDate').value, '2026-10-04');
assert(!d.getElementById('almanacRecord').hidden);
assert.equal(d.querySelector('[data-field=lunar] strong').textContent, '2026 / 8 / 24');
assert(!/[\u3400-\u9fff\u0400-\u04ff]/.test(d.body.textContent));
assert(!d.body.textContent.includes('undefined'));
assert(d.getElementById('almanacSystemLabel').textContent === A.ui.calendarSystem);
w.close();
console.log(
  'PASS: full date-calculated Chinese almanac with Mongolian UI, 142-term coverage and distinct sentinels, five named deity directions, explicit pending rare term, tradition description, leap month/new year/solar-term/range behavior, future date support, and UTC+08 date rollover.',
);
