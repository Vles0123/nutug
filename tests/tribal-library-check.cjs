const readLegacy = require('./legacy-assets.cjs');
const assert = require('node:assert'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { JSDOM } = require('jsdom');
const data = vm.runInNewContext(
  fs.readFileSync('public/tribal-knowledge-data.js', 'utf8') +
    '\n' +
    fs.readFileSync('public/tribes-data.js', 'utf8') +
    ';({K:TRIBAL_KNOWLEDGE,G:TRIBAL_GRAPH})',
);
const { K, G } = data;
assert(K.articles.length >= 8);
assert.equal(new Set(K.articles.map((a) => a.id)).size, K.articles.length);
for (const a of K.articles) {
  assert(a.title && a.summary && a.paragraphs.length >= 2);
  assert(a.tribes.length);
  for (const id of a.tribes) assert(G.nodes[id]);
  assert(a.sources.length);
  for (const ref of a.sources) {
    const s = typeof ref === 'string' ? K.sources[ref] || G.sources[ref] : ref;
    assert(s && /^https:\/\//.test(s.url));
  }
}
const w = new JSDOM(fs.readFileSync('tests/fixtures/legacy/tribes.html', 'utf8'), {
  runScripts: 'outside-only',
  url: 'https://nutug.cn/tribes.html',
}).window;
w.SVGElement.prototype.getBoundingClientRect = () => ({ width: 390, height: 510 });
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
  ]
    .map((f) => readLegacy(f))
    .join('\n'),
);
const doc = w.document;
assert.equal(doc.querySelectorAll('.tl-card').length, K.articles.length);
const lib = doc.getElementById('tribalLibrary'),
  main = doc.querySelector('main');
assert(
  main.compareDocumentPosition(lib) & w.Node.DOCUMENT_POSITION_FOLLOWING,
  'knowledge library must be below graph',
);
for (const a of K.articles) {
  doc.querySelector(`[data-tribal-filter="all"]`).click();
  doc.querySelector(`[data-tribal-article="${a.id}"]`).click();
  assert(doc.getElementById('tl-reader').open);
  assert.equal(doc.getElementById('tl-reader-title').textContent, a.title);
  assert.equal(doc.querySelectorAll('#tl-reader-body p').length, a.paragraphs.length);
  assert.equal(doc.querySelectorAll('#tl-sources a').length, a.sources.length);
  doc.querySelector(`[data-related-tribe="${a.tribes[0]}"]`).click();
  assert(!doc.getElementById('tl-reader').open);
  assert.equal(doc.querySelector('.tribe-node.selected').dataset.tribe, a.tribes[0]);
  assert(doc.querySelector(`[data-tribe-reading="${a.id}"]`));
  doc.querySelector(`[data-tribe-reading="${a.id}"]`).click();
  assert(doc.getElementById('tl-reader').open);
  doc.getElementById('tl-close').click();
}
for (const button of [...doc.querySelectorAll('[data-tribal-filter]')]) {
  button.click();
  const id = button.dataset.tribalFilter;
  assert.equal(
    doc.querySelectorAll('.tl-card').length,
    K.articles.filter((a) => id === 'all' || a.tribes.includes(id)).length,
  );
}
doc.querySelector('[data-tribal-filter="all"]').click();
doc.getElementById('tl-search-toggle').click();
assert(!doc.getElementById('tl-search-panel').hidden);
doc.getElementById('tl-query').value = 'not-a-real-term-963xyz';
doc.getElementById('tl-query').dispatchEvent(new w.Event('input'));
assert(!doc.getElementById('tl-empty').hidden);
assert.equal(doc.querySelectorAll('.tl-card').length, 0);
doc.getElementById('tl-clear').click();
assert.equal(doc.querySelectorAll('.tl-card').length, K.articles.length);
assert(!/[\u3400-\u9fff\u0400-\u04ff]/.test(doc.body.textContent));
assert(!doc.querySelector('a[download]'));
assert(
  fs.readFileSync('tests/fixtures/legacy/index.html', 'utf8').includes('tribes.html#tribalLibrary'),
);
console.log(
  JSON.stringify({
    articles: K.articles.length,
    passed: [
      'below-graph placement',
      'every article opens and closes',
      'every citation resolves',
      'tribe filters',
      'search and empty state',
      'graph-to-guide and guide-to-graph',
      'main library entry',
      'Mongolian rendered text',
    ],
    environment: 'jsdom',
  }),
);
