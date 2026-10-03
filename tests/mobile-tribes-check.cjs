const readLegacy = require('./legacy-assets.cjs');
const assert = require('node:assert'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { JSDOM } = require('jsdom');
const D = vm.runInNewContext(fs.readFileSync('public/tribes-data.js', 'utf8') + ';TRIBAL_GRAPH'),
  K = vm.runInNewContext(
    fs.readFileSync('public/tribal-knowledge-data.js', 'utf8') + ';TRIBAL_KNOWLEDGE',
  );
for (const [width, height] of [
  [320, 400],
  [390, 500],
  [430, 560],
  [740, 320],
]) {
  const w = new JSDOM(fs.readFileSync('tests/fixtures/legacy/tribes-mobile.html', 'utf8'), {
    runScripts: 'outside-only',
    url: 'https://nutug.cn/tribes-mobile.html',
    pretendToBeVisual: true,
  }).window;
  w.scrollTo = () => {};
  w.requestAnimationFrame = (fn) => w.setTimeout(fn, 0);
  w.SVGElement.prototype.getBoundingClientRect = function () {
    return w.document.body.dataset.screen === 'graph' ? { width, height } : { width: 0, height: 0 };
  };
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
  const doc = w.document;
  function assertPair() {
    assert.equal(doc.querySelectorAll('.tribe-node').length, Object.keys(D.nodes).length);
    const period = doc.querySelector('[data-period][aria-pressed="true"]').dataset.period;
    assert.equal(
      doc.querySelectorAll('.tribe-edge').length,
      D.edges.filter((e) => period === 'all' || e.period === period).length,
    );
    const v = doc.getElementById('tribeGraph').getAttribute('viewBox').split(' ').map(Number);
    assert(v.every(Number.isFinite));
    for (const n of doc.querySelectorAll('.tribe-node')) {
      const [x, y] = n
        .getAttribute('transform')
        .match(/-?[\d.]+/g)
        .map(Number);
      assert(x >= v[0] - 1 && x + 220 <= v[0] + v[2] + 1);
      assert(y >= v[1] - 1 && y + 280 <= v[1] + v[3] + 1);
    }
  }
  assertPair();
  assert.equal(doc.querySelectorAll('.tribe-node').length, Object.keys(D.nodes).length);
  assert(doc.getElementById('desktopEdition').href.endsWith('tribes.html?layout=desktop'));
  for (const id of Object.keys(D.nodes)) {
    doc.getElementById('mobileMenu').click();
    assert(!doc.getElementById('mobilePicker').hidden);
    doc.querySelector(`[data-tribe-picker="${id}"]`).click();
    assert(doc.getElementById('mobilePicker').hidden);
    assert.equal(doc.body.dataset.screen, 'detail');
    assert.equal(doc.querySelector('.mobile-overview-heading h2').textContent, D.nodes[id].name);
    doc.querySelector('[data-screen-target=graph]').click();
    assertPair();
    const n = D.edges.filter((e) => e.from === id || e.to === id).length,
      seen = new Set();
    for (let i = 0; i < n; i++) {
      seen.add(doc.querySelector('.edge-hit[aria-pressed="true"]').dataset.edgeId);
      doc.getElementById('mobileNextRelation').click();
      assertPair();
    }
    assert.equal(seen.size, n);
    doc.querySelector('[data-screen-target="detail"]').click();
    assert.equal(doc.body.dataset.screen, 'detail');
    assert(doc.querySelector('.mobile-overview-heading'));
    assert(!doc.querySelector('#tribeDetail>h3'));
    for (const b of [...doc.querySelectorAll('.event-card')]) {
      const e = D.edges.find((e) => e.id === b.dataset.edge);
      assert.equal(b.querySelector('.date').textContent, e.shortDate || e.date);
      assert(b.getAttribute('aria-label').includes(D.nodes[e.from].name));
    }
    doc.querySelector('[data-screen-target="graph"]').click();
    assertPair();
  }
  doc.querySelector('[data-tribe-picker="jin"]').click();
  doc.querySelector('[data-period="late"]').click();
  assert.equal(doc.querySelectorAll('.tribe-node').length, Object.keys(D.nodes).length);
  assert(doc.getElementById('mobileNextRelation').disabled);
  doc.querySelector('[data-period="all"]').click();
  for (const a of K.articles) {
    doc.querySelector('[data-screen-target="library"]').click();
    doc.querySelector('[data-tribal-filter="all"]').click();
    doc.querySelector(`[data-tribal-article="${a.id}"]`).click();
    assert(doc.getElementById('tl-reader').open);
    for (let i = 0; i < a.paragraphs.length; i++) {
      assert.equal(doc.querySelectorAll('#tl-reader-body p:not([hidden])').length, 1);
      assert.equal(
        doc.querySelector('#tl-reader-body p:not([hidden])').textContent,
        a.paragraphs[i],
      );
      assert.equal(
        doc.getElementById('mobilePageCount').textContent,
        i + 1 + ' / ' + a.paragraphs.length,
      );
      if (i < a.paragraphs.length - 1) doc.getElementById('mobileReader-next').click();
    }
    assert(doc.getElementById('mobileReader-next').disabled);
    doc.getElementById('mobileReader-sources').click();
    assert.equal(doc.getElementById('tl-reader').dataset.readerMode, 'sources');
    assert.equal(doc.querySelectorAll('#tl-sources a').length, a.sources.length);
    doc.getElementById('mobileReader-related').click();
    assert.equal(doc.getElementById('tl-reader').dataset.readerMode, 'related');
    doc.querySelector(`[data-related-tribe="${a.tribes[0]}"]`).click();
    assert(!doc.getElementById('tl-reader').open);
    assert.equal(doc.body.dataset.screen, 'graph');
    assertPair();
  }
  assert(!/[\u3400-\u9fff\u0400-\u04ff]/.test(doc.body.textContent));
  w.close();
}
console.log(
  JSON.stringify({
    passed: [
      'separate mobile route and desktop opt-out',
      'all tribal selections preserve the network',
      'every dated relation reachable via next',
      'empty period state',
      'three screen navigation',
      'mobile section layout',
      'complete-paragraph pagination',
      'reader source and graph panes',
      'reframe after hidden graph',
      '320/390/430/landscape mocked bounds',
    ],
    environment: 'jsdom with mocked mobile geometry',
  }),
);
