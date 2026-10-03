const assert = require('node:assert'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { JSDOM } = require('jsdom');
const G = vm.runInNewContext(fs.readFileSync('public/tribes-data.js', 'utf8') + ';TRIBAL_GRAPH'),
  K = vm.runInNewContext(
    fs.readFileSync('public/tribal-knowledge-data.js', 'utf8') + ';TRIBAL_KNOWLEDGE',
  );
const ids = ['tatar', 'merkit', 'naiman', 'kereit', 'tayichiud', 'onggirat'];
for (const id of ids) {
  assert.equal(G.nodes[id].profile.length, 3);
  assert.equal(new Set(G.nodes[id].profile.map((s) => s.id)).size, 3);
  for (const section of G.nodes[id].profile) {
    assert(section.title && section.paragraphs.length);
    assert(section.sources.length);
    for (const key of section.sources) assert(G.sources[key]);
  }
  assert(K.articles.find((a) => a.id === id + '_guide').paragraphs.length >= 5);
}
for (const mobile of [false, true]) {
  const w = new JSDOM(
    fs.readFileSync('public/' + (mobile ? 'tribes-mobile.html' : 'tribes.html'), 'utf8'),
    {
      runScripts: 'outside-only',
      url: 'https://nutug.cn/' + (mobile ? 'tribes-mobile.html' : 'tribes.html'),
    },
  ).window;
  w.scrollTo = () => {};
  w.requestAnimationFrame = (fn) => fn();
  w.SVGElement.prototype.getBoundingClientRect = () => ({ width: 390, height: 500 });
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
      'data.js',
      'tribes-data.js',
      'tribes.js',
      'tribal-knowledge-data.js',
      'tribal-knowledge.js',
      ...(mobile ? ['tribes-mobile.js'] : []),
    ]
      .map((f) => fs.readFileSync('public/' + f, 'utf8'))
      .join('\n'),
  );
  const d = w.document;
  for (const id of ids) {
    d.querySelector(`[data-tribe-picker="${id}"]`).click();
    if (mobile) assert.equal(d.body.dataset.screen, 'detail');
    const sections = G.nodes[id].profile;
    assert.equal(d.querySelector('.tribe-profile').dataset.profileTribe, id);
    for (const section of sections) {
      d.querySelector(`[data-profile-section="${section.id}"]`).click();
      const content = d.querySelector('.profile-content');
      assert.equal(content.dataset.section, section.id);
      assert.equal(
        content.querySelectorAll('.profile-paragraph').length,
        section.paragraphs.length,
      );
      assert.equal(content.querySelectorAll('a').length, new Set(section.sources).size);
      assert.equal(content.querySelector('.profile-paragraph').textContent, section.paragraphs[0]);
    }
    d.querySelector('[data-period="all"]').click();
    assert.equal(d.querySelector('.profile-content').dataset.section, sections[2].id);
    assert(!/[\u3400-\u9fff\u0400-\u04ff]/.test(d.body.textContent));
  }
}
console.log(
  JSON.stringify({
    profiles: ids.length,
    sections: 18,
    tribalGuides: K.articles.length,
    totalGuideParagraphs: K.articles.reduce((s, a) => s + a.paragraphs.length, 0),
    passed: [
      'six enriched profiles',
      'per-section source integrity',
      'all section toggles on desktop and mobile',
      'selected profile section survives rerender',
      'six expanded knowledge guides',
      'traditional Mongolian-only displayed text',
    ],
  }),
);
