const readLegacy = require('./legacy-assets.cjs');
const assert = require('node:assert'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { JSDOM } = require('jsdom');
const D = vm.runInNewContext(
  fs.readFileSync('content-source/tribes-data.js', 'utf8') + ';TRIBAL_GRAPH',
);
const w = new JSDOM(fs.readFileSync('tests/fixtures/legacy/tribes-mobile.html', 'utf8'), {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'https://nutug.cn/tribes-mobile.html',
}).window;
let frames = [];
w.requestAnimationFrame = (fn) => frames.push(fn);
const flush = () => {
  while (frames.length) frames.shift()();
};
w.scrollTo = () => {};
w.SVGElement.prototype.getBoundingClientRect = () =>
  w.document.body.dataset.screen === 'graph'
    ? { width: 390, height: 500 }
    : { width: 0, height: 0 };
w.ResizeObserver = class {
  observe() {}
};
w.HTMLElement.prototype.scrollIntoView = () => {};
w.SVGElement.prototype.scrollIntoView = () => {};
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
w.HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new w.Event('close'));
};
w.eval(
  [
    'vendor/d3-force-3.0.0.js',
    'network-layout.js',
    'data.js',
    'tribes-data.js',
    'tribes.js',
    'tribal-knowledge-data.js',
    'tribal-knowledge.js',
    'tribes-mobile.js',
  ]
    .map((f) => readLegacy(f))
    .join('\n'),
);
const d = w.document,
  click = (s) => {
    d.querySelector(s).click();
    flush();
  },
  edge = () => d.querySelector('.edge-hit[aria-pressed="true"]')?.dataset.edgeId;
flush();
click('[data-tribe-picker="temujin_following"]');
assert.equal(d.body.dataset.screen, 'detail');
assert.equal(d.activeElement, d.querySelector('.mobile-overview-heading h2'));
assert(d.querySelector('.overview').textContent.includes(D.nodes.temujin_following.summary));
click('[data-edge="temujin_tatar_conflict"]');
assert.equal(d.body.dataset.screen, 'detail');
assert(d.querySelector('.event-description').textContent.includes('1202'));
assert.equal(d.activeElement, d.querySelector('.event-description'));
click('[data-screen-target="graph"]');
assert.equal(edge(), 'temujin_tatar_conflict');
d.querySelector('[data-tribe="temujin_following"]').dispatchEvent(new w.MouseEvent('click'));
flush();
assert.equal(d.body.dataset.screen, 'detail');
assert.equal(edge(), 'temujin_tatar_conflict');
click('[data-screen-target="graph"]');
d.querySelector('[data-tribe="tatar"]').dispatchEvent(new w.MouseEvent('click'));
flush();
assert.equal(d.body.dataset.screen, 'detail');
assert.equal(edge(), 'temujin_tatar_conflict');
assert.equal(d.querySelector('.mobile-overview-heading h2').textContent, D.nodes.tatar.name);
click('[data-screen-target="graph"]');
click('#mobileNextRelation');
assert.equal(edge(), 'temujin_tatar_1196_conflict');
assert.equal(d.body.dataset.screen, 'graph');
click('[data-period="all"]');
assert.equal(edge(), 'temujin_tatar_1196_conflict');
click('[data-period="middle"]');
assert.equal(edge(), 'temujin_tatar_conflict');
click('[data-period="all"]');
assert.equal(edge(), 'temujin_tatar_conflict');
d.querySelector('.edge-hit[aria-pressed="true"]').dispatchEvent(new w.MouseEvent('click'));
flush();
assert.equal(d.body.dataset.screen, 'detail');
assert.equal(d.activeElement, d.querySelector('.event-description'));
const year = (e) => e.date_start || +(e.shortDate || e.date).match(/\d{4}/)[0];
for (const id of Object.keys(D.nodes)) {
  click('[data-period="all"]');
  click(`[data-tribe-picker="${id}"]`);
  const es = D.edges
    .filter((e) => e.from === id || e.to === id)
    .slice()
    .sort((a, b) => year(a) - year(b));
  if (!es.length) continue;
  click(`[data-edge="${es[0].id}"]`);
  click('[data-screen-target="graph"]');
  const actual = [];
  for (let i = 0; i < es.length; i++) {
    actual.push(edge());
    click('#mobileNextRelation');
  }
  assert.deepEqual(
    actual,
    es.map((e) => e.id),
  );
  assert.equal(edge(), es[0].id);
}
// The latest screen transition owns focus.
d.querySelector('[data-screen-target="graph"]').click();
d.querySelector('[data-screen-target="detail"]').click();
flush();
assert.equal(d.body.dataset.screen, 'detail');
assert.equal(d.activeElement, d.querySelector('.mobile-overview-heading h2'));
console.log(
  'PASS: tribe/menu taps reveal correct information, current/opposite node taps retain relationship, relation taps reveal selected summary, next/previous remain graph, period preservation, chronological sequence for every tribe, and stale-frame focus guard.',
);
