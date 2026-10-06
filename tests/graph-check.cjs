const readLegacy = require('./legacy-assets.cjs');
const assert = require('node:assert'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { JSDOM } = require('jsdom');
const d = vm.runInNewContext(
  fs.readFileSync('content-source/data.js', 'utf8') + ';({PEOPLE,EDGES,EVENTS,SOURCES})',
);
assert.equal(Object.keys(d.PEOPLE).length, 32);
assert.equal(d.EDGES.length, 53);
assert.equal(d.EVENTS.length, 18);
assert.equal(d.EVENTS.filter((e) => e.date === '1251').length, 1);
for (const p of Object.values(d.PEOPLE)) for (const key of p.sources) assert(d.SOURCES[key]);
for (const e of d.EDGES) {
  assert(d.PEOPLE[e.from] && d.PEOPLE[e.to]);
  for (const key of e.sources || []) assert(d.SOURCES[key]);
}
for (const e of d.EVENTS) {
  for (const id of e.people) assert(d.PEOPLE[id]);
  for (const key of e.sources || []) assert(d.SOURCES[key]);
}
function visit(id, path = []) {
  assert(!path.includes(id), 'parent cycle');
  for (const e of d.EDGES.filter((e) => e.type === 'parent' && e.from === id))
    visit(e.to, [...path, id]);
}
Object.keys(d.PEOPLE).forEach((id) => visit(id));
assert(!d.EDGES.some((e) => e.from === 'batu' && e.to === 'berke' && e.type === 'succession'));
assert(
  !d.EDGES.some(
    (e) =>
      [e.from, e.to].includes('hulegu') &&
      [e.from, e.to].includes('kublai') &&
      e.type === 'alliance',
  ),
);
for (const key of ['pos', 'power']) {
  const p = Object.entries(d.PEOPLE);
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) {
      let a = p[i][1][key] || p[i][1].pos,
        b = p[j][1][key] || p[j][1].pos;
      assert(
        !(Math.abs(a[0] - b[0]) * 1.12 < 166 && Math.abs(a[1] - b[1]) * 1.65 < 260),
        'overlap ' + key + ' ' + p[i][0] + ' ' + p[j][0],
      );
    }
}
const w = new JSDOM(fs.readFileSync('tests/fixtures/legacy/index.html', 'utf8'), {
  runScripts: 'outside-only',
}).window;
w.SVGElement.prototype.getBoundingClientRect = () => ({ width: 840, height: 210 });
w.ResizeObserver = class {
  observe() {}
};
w.matchMedia = () => ({ matches: true });
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
    'app.js',
    'knowledge-data.js',
    'knowledge.js',
  ]
    .map((f) => readLegacy(f))
    .join('\n'),
);
const doc = w.document;
for (const id of ['batu', 'berke', 'hulegu']) {
  const q = doc.getElementById('search');
  q.value = id;
  q.dispatchEvent(new w.Event('input'));
  doc.querySelector('#searchResults button').click();
  assert.equal(doc.getElementById('detail').dataset.person, id);
  assert(doc.querySelector('.person-readings button'));
}
const q = doc.getElementById('search');
q.value = 'batu';
q.dispatchEvent(new w.Event('input'));
doc.querySelector('#searchResults button').click();
doc.querySelector('[data-related-article="sorghaghtani-beki"]').click();
assert(doc.getElementById('kb-reader').open);
assert.equal(doc.querySelectorAll('#kb-reader-people button').length, 3);
doc.querySelector('[data-graph-person="batu"]').click();
assert(!doc.getElementById('kb-reader').open);
assert.equal(doc.querySelector('[data-mode="power"]').getAttribute('aria-selected'), 'true');
assert.equal(doc.getElementById('detail').dataset.person, 'batu');
const war = [...doc.querySelectorAll('#events button')].find((b) =>
  b.textContent.startsWith('1262—1263'),
);
war.click();
assert(doc.getElementById('focus').checked);
assert.equal(doc.querySelectorAll('.node').length, 2);
assert.equal(doc.getElementById('detail').dataset.person, 'berke');
doc.getElementById('focus').checked = false;
doc.getElementById('focus').dispatchEvent(new w.Event('change'));
doc.getElementById('fit').click();
const before = +doc.getElementById('graph').getAttribute('viewBox').split(' ')[2];
doc.getElementById('zoomOut').click();
const after = +doc.getElementById('graph').getAttribute('viewBox').split(' ')[2];
assert(after > before, 'zoom out increases the fitted view width');
assert(!/[\u3400-\u9fff\u0400-\u04ff]/.test(doc.body.textContent));
assert.equal(doc.querySelectorAll('a[download]').length, 0);
console.log(
  'PASS: 32 people, 53 edges, 18 events; source integrity, fixed-coordinate spacing, relationship types, knowledge navigation, conflict focus, fit and zoom.',
);

const gaps = vm.runInNewContext(
  fs.readFileSync('content-source/data.js', 'utf8') + ';RESEARCH_GAPS',
);
assert.equal(gaps.length, 1);
assert.equal(gaps[0].isPerson, false);
assert(!d.PEOPLE[gaps[0].id]);
assert(!d.EDGES.some((e) => e.from === gaps[0].id || e.to === gaps[0].id));
for (const [a, b] of [
  ['tumbinai', 'khabul'],
  ['khabul', 'bartan'],
  ['bartan', 'yesugei'],
  ['toghon', 'ayushiridara'],
  ['ayushiridara', 'maidarbal'],
])
  assert(d.EDGES.some((e) => e.from === a && e.to === b && e.type === 'parent'));
assert(!d.EDGES.some((e) => e.from === 'maidarbal' && e.type === 'parent'));
doc.getElementById('ancestor-end').click();
assert.equal(doc.getElementById('detail').dataset.person, 'tumbinai');
doc.getElementById('descendant-end').click();
assert.equal(doc.getElementById('detail').dataset.gap, gaps[0].id);
assert.equal(doc.querySelectorAll('.research-gap').length, 1);
assert.equal(doc.querySelectorAll('#detail a.source').length, gaps[0].sources.length);
doc.querySelector('.gap-anchor').click();
assert.equal(doc.getElementById('detail').dataset.person, 'maidarbal');
assert(!doc.getElementById('detail').dataset.gap);
doc.querySelector('[data-mode="power"]').click();
assert.equal(doc.querySelectorAll('.research-gap').length, 0);
doc.querySelector('[data-mode="family"]').click();
assert.equal(doc.querySelectorAll('.research-gap').length, 1);
doc.getElementById('fit').click();
const fitted = doc.getElementById('graph').getAttribute('viewBox').split(' ').map(Number);
for (const node of doc.querySelectorAll('.node,.research-gap')) {
  const [tx, ty] = node
    .getAttribute('transform')
    .match(/-?[\d.]+/g)
    .map(Number);
  const circle = node.querySelector('circle');
  const x = tx + Number(circle.getAttribute('cx')),
    y = ty + Number(circle.getAttribute('cy'));
  assert(x >= fitted[0] && x <= fitted[0] + fitted[2]);
  assert(y >= fitted[1] && y <= fitted[1] + fitted[3]);
}
assert(!/[\u3400-\u9fff\u0400-\u04ff]/.test(doc.body.textContent));
console.log(
  'PASS: three ancestor generations, two descendant generations, research-note node, endpoint navigation, relationship integrity, mode visibility and full-tree framing.',
);
// An isolated political node provides navigation to related records.
function searchPerson(id) {
  q.value = id;
  q.dispatchEvent(new w.Event('input'));
  doc.querySelector('#searchResults button').click();
}
function containsCard(id) {
  const v = doc.getElementById('graph').getAttribute('viewBox').split(' ').map(Number);
  const node = doc.querySelector('#graph [data-person="' + id + '"]');
  if (!node) return false;
  const [tx, ty] = node
    .getAttribute('transform')
    .match(/-?[\d.]+/g)
    .map(Number);
  const circle = node.querySelector('circle');
  const x = tx + Number(circle.getAttribute('cx')),
    y = ty + Number(circle.getAttribute('cy'));
  return x >= v[0] && x <= v[0] + v[2] && y >= v[1] && y <= v[1] + v[3];
}
searchPerson('hoelun');
doc.querySelector('[data-mode="power"]').click();
assert(!doc.getElementById('relationStatus').hidden);
assert(containsCard('hoelun'));
doc.getElementById('viewPoliticalGraph').click();
assert.equal(doc.getElementById('detail').dataset.person, 'hoelun');
assert(containsCard('temujin'));
doc.getElementById('viewFamily').click();
assert.equal(doc.querySelector('[data-mode="family"]').getAttribute('aria-selected'), 'true');
assert(doc.getElementById('relationStatus').hidden);
searchPerson('maidarbal');
doc.querySelector('[data-mode="power"]').click();
assert(doc.getElementById('relationStatus').hidden);
for (const id of ['maidarbal', 'hongwu', 'ayushiridara', 'toghon'])
  assert(containsCard(id), 'must frame component ' + id);
assert(d.EDGES.some((e) => e.type === 'contact' && e.to === 'maidarbal'));
assert(!d.EDGES.some((e) => e.type === 'succession' && e.to === 'maidarbal'));
const parent = [...doc.querySelectorAll('#detail .relations button')].find((b) =>
  b.textContent.startsWith(d.PEOPLE.ayushiridara.name),
);
parent.click();
assert.equal(doc.querySelector('[data-mode="family"]').getAttribute('aria-selected'), 'true');
assert.equal(doc.getElementById('detail').dataset.person, 'ayushiridara');
searchPerson('hongwu');
assert.equal(doc.querySelector('[data-mode="power"]').getAttribute('aria-selected'), 'true');
doc.querySelector('[data-mode="family"]').click();
assert(!doc.getElementById('relationStatus').hidden);
assert.equal(doc.getElementById('detail').dataset.person, 'hongwu');
assert(!d.EDGES.some((e) => e.type === 'parent' && (e.from === 'hongwu' || e.to === 'hongwu')));
doc.getElementById('viewFamily').click();
assert.equal(doc.querySelector('[data-mode="power"]').getAttribute('aria-selected'), 'true');
assert(doc.querySelector('.legend .contact'));
assert(!/[\u3400-\u9fff\u0400-\u04ff]/.test(doc.body.textContent));
console.log(
  'PASS: isolated-node navigation, connected-component framing, genealogy links, contextual Ming actor and documented Maidarbal relationships.',
);
