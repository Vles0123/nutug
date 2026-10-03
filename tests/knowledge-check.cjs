const assert = require('node:assert'),
  fs = require('node:fs'),
  vm = require('node:vm');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('public/index.html', 'utf8'),
  w = new JSDOM(html, { runScripts: 'outside-only', url: 'https://atlas.example/' }).window;
let size = { width: 390, height: 420 },
  resize;
w.SVGElement.prototype.getBoundingClientRect = () => size;
w.ResizeObserver = class {
  constructor(f) {
    resize = f;
  }
  observe() {}
};
w.matchMedia = () => ({ matches: true });
w.HTMLElement.prototype.scrollIntoView = function () {};
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
w.HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new w.Event('close'));
};
w.eval(
  ['data.js', 'app.js', 'knowledge-data.js', 'knowledge.js']
    .map((f) => fs.readFileSync('public/' + f, 'utf8'))
    .join('\n'),
);
const d = w.document;
const data = vm.runInNewContext(fs.readFileSync('public/knowledge-data.js', 'utf8') + ';KNOWLEDGE');
assert.equal(data.articles.length, 30);
assert.equal(data.readings.length, 2);
assert.equal(d.querySelectorAll('.kb-original').length, 2);
for (const r of data.readings) {
  assert.equal(new URL(r.url).protocol, 'https:');
  assert(r.accessNoteMn);
  assert.equal(r.downloaded, false);
}
assert.equal(new Set(data.articles.map((x) => x.id)).size, data.articles.length);
assert.equal(d.querySelectorAll('.kb-card').length, data.articles.length);
assert.equal(d.querySelectorAll('#kb-categories button').length, 7);
const ids = [...d.querySelectorAll('[id]')].map((x) => x.id);
assert.equal(ids.length, new Set(ids).size, 'duplicate IDs');
assert(
  d.querySelector('.timeline').compareDocumentPosition(d.querySelector('#knowledge')) & 4,
  'library must follow timeline',
);
for (const b of d.querySelectorAll('#kb-categories button')) {
  b.click();
  const cat = b.dataset.category;
  assert.equal(
    d.querySelectorAll('.kb-card').length,
    cat === 'all' ? data.articles.length : data.articles.filter((a) => a.category === cat).length,
  );
}
d.querySelector('[data-category="all"]').click();
for (const a of data.articles) {
  const b = d.querySelector('[data-article="' + a.id + '"]');
  b.click();
  assert(d.getElementById('kb-reader').open);
  assert.equal(d.getElementById('kb-reader-title').textContent, a.title);
  assert.equal(d.querySelectorAll('#kb-reader-copy p').length, a.body.length);
  assert.equal(d.querySelectorAll('#kb-reader-sources a').length, a.sources.length);
  for (const link of d.querySelectorAll('#kb-reader-sources a')) {
    assert.equal(new URL(link.href).protocol, 'https:');
    assert(link.rel.includes('noopener'));
    assert(
      !/[\u3400-\u9fff\u0400-\u04ffA-Za-z]/.test(link.textContent),
      'untranslated source display label',
    );
  }
  d.getElementById('kb-close').click();
  assert(!d.getElementById('kb-reader').open);
}
const meta = d.getElementById('kb-meta-toggle');
meta.click();
assert(d.getElementById('knowledge').classList.contains('kb-meta-open'));
meta.click();
assert.equal(meta.getAttribute('aria-expanded'), 'false');
const kt = d.getElementById('kb-search-toggle');
kt.click();
assert.equal(kt.getAttribute('aria-expanded'), 'true');
const q = d.getElementById('kb-query');
q.value = data.articles[0].title;
q.dispatchEvent(new w.Event('input'));
assert(kt.classList.contains('has-query'));
kt.click();
assert.equal(kt.getAttribute('aria-expanded'), 'false');
assert.equal(q.value, data.articles[0].title);
kt.click();
q.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert.equal(kt.getAttribute('aria-expanded'), 'false');
assert(d.querySelector('[data-article="' + data.articles[0].id + '"]'));
q.value = '<script>not an article</script>';
q.dispatchEvent(new w.Event('input'));
assert.equal(d.querySelectorAll('.kb-card').length, 0);
assert(!d.getElementById('kb-empty').hidden);
d.getElementById('kb-clear').click();
assert(!kt.classList.contains('has-query'));
assert.equal(d.querySelectorAll('.kb-card').length, data.articles.length);
const search = d.getElementById('searchToggle');
search.click();
assert.equal(search.getAttribute('aria-expanded'), 'true');
d.getElementById('search').value = 'kublai';
d.getElementById('search').dispatchEvent(new w.Event('input'));
d.querySelector('#searchResults button').click();
assert.equal(search.getAttribute('aria-expanded'), 'false');
for (const mode of ['power', 'family']) d.querySelector('[data-mode=' + mode + ']').click();
for (const id of ['zoomIn', 'zoomOut', 'fit', 'home', 'kb-jump']) d.getElementById(id).click();
for (const [width, height] of [
  [320, 360],
  [390, 420],
  [600, 430],
  [1000, 600],
]) {
  size = { width, height };
  resize();
  const v = d.getElementById('graph').getAttribute('viewBox').split(' ').map(Number);
  assert(v.every(Number.isFinite));
  assert(Math.abs(v[3] / v[2] - height / width) < 1e-8);
}
assert(
  !/[\u3400-\u9fff\u0400-\u04ff]/.test(d.body.textContent),
  'mixed Han/Cyrillic rendered text',
);
assert(!d.body.textContent.includes('undefined'));
assert(Number.isFinite(data.archive.bytes) && data.archive.bytes > 0);
assert.equal(data.archive.includedInSourceExport, false);
assert(!data.archive.url);
assert(data.archive.documents > 0);
assert.equal(d.querySelectorAll('a[download]').length, 0);
assert(!d.getElementById('kb-archive-link'));
assert(data.ui.archiveNote);
for (const a of data.articles) {
  assert(a.sources.length);
  assert(a.body.length >= 2);
  assert(!/[\u3400-\u9fff\u0400-\u04ffA-Za-z]/.test(a.title + a.summary + a.body.join('')));
}
console.log(
  JSON.stringify({
    articles: data.articles.length,
    categories: 6,
    archivedDocuments: data.archive.documents,
    sourceBytes: data.archive.bytes,
    passed: [
      'filters',
      'search and empty result',
      'all readers and citations',
      'close and reopen',
      'Mongolian-only prose',
      'external corpus excluded from source export',
      'existing graph and mobile search regression',
      'four mocked viewport aspect ratios',
    ],
    visualQA: 'not performed; DOM tests do not certify Safari layout',
  }),
);
