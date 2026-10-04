const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { setTimeout: pause } = require('node:timers/promises');
const pages = ['index.html', 'tribes.html', 'tribes-mobile.html', 'calendar.html', 'almanac.html'];
const han = /[\u3400-\u9fff\u{20000}-\u{2FA1F}]/u;
async function load(page, options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e.message));
  const w = new JSDOM(fs.readFileSync('public/' + page, 'utf8'), {
    url: 'https://nutug.test/' + page + (options.fragment || ''),
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  }).window;
  w.matchMedia = () => ({
    matches: true,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.SVGElement.prototype.scrollIntoView = () => {};
  w.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (options.native)
    w.webkit = {
      messageHandlers: { nutug: { postMessage: (message) => options.native.push(message) } },
    };
  const scripts = [...w.document.querySelectorAll('script[src]')].map((n) => n.getAttribute('src'));
  w.eval(scripts.map((file) => fs.readFileSync('public/' + file, 'utf8')).join('\n'));
  await pause(100);
  assert.equal(errors.length, 0, errors.join('\n'));
  return { w, d: w.document, errors };
}
async function click(w, element) {
  assert(element, 'Expected interactive element');
  element.click();
  await pause(65);
}
function visibleText(d) {
  return (
    d.getElementById('root').textContent +
    [...d.querySelectorAll('[role=dialog]')].map((e) => e.textContent).join('') +
    [...d.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join('')
  );
}
(async () => {
  const { readingPages } = await import('../src/reading-layout.mjs');
  for (const scale of [1, 1.5]) {
    const columns = [8, 90, 190, 305, 405, 485, 600].map((left) => ({
      left: left * scale,
      right: (left + 35) * scale,
    }));
    const starts = readingPages(columns, 342);
    assert(starts.length > 1);
    for (const start of starts)
      assert(
        !columns.some((column) => column.left < start && column.right > start),
        'Page starts between shaped text columns',
      );
  }
  for (const page of pages) {
    const { w, d, errors } = await load(page);
    assert.equal(d.querySelectorAll('.destination').length, 4);
    assert(d.querySelector('h1 .mn, h1.mn'));
    assert(!han.test(visibleText(d)), page + ': Traditional Mongolian interface');
    assert(!visibleText(d).includes('undefined'), page + ': resolved labels');
    await click(w, d.querySelector('[data-action="type"]'));
    assert(d.querySelector('[role="dialog"]'));
    assert(!han.test(visibleText(d)), 'Overlay accessibility labels remain Mongolian');
    const slider = d.querySelector('input[type="range"]');
    assert(slider, 'React Aria slider');
    w.NutugShell.setScale(1.35);
    await pause(40);
    assert.equal(w.localStorage.getItem('nutug.readingScale'), '1.35');
    assert.equal(d.documentElement.style.getPropertyValue('--reading-scale'), '1.35');
    w.NutugShell.setScale(8);
    await pause(40);
    assert.equal(w.localStorage.getItem('nutug.readingScale'), '1.5');
    d.querySelector('[role="dialog"]').dispatchEvent(
      new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await pause(65);
    assert.equal(d.querySelector('[role="dialog"]'), null, 'Escape closes React Aria modal');
    assert.equal(errors.length, 0, errors.join('\n'));
    w.close();
  }
  const { w, d, errors } = await load('tribes.html');
  assert.equal(d.querySelectorAll('[data-node]').length, 9);
  assert.equal(d.querySelectorAll('.network-edge').length, 16);
  d.querySelector('[data-edge="temujin_kereit_alliance"]').dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
  );
  await pause(65);
  assert.equal(
    d.querySelectorAll('.network-edge.is-chosen').length,
    1,
    'A keyboard action selects one relationship',
  );
  for (const period of ['1180–1199', '1200–1202', '1203–1206']) {
    await click(
      w,
      [...d.querySelectorAll('.segment')].find((e) => e.textContent === period),
    );
    assert(d.querySelectorAll('.network-edge').length > 0);
    assert(d.querySelectorAll('.network-edge').length < 16);
  }
  await click(w, d.querySelector('.segment'));
  for (const id of ['kereit', 'merkit', 'tatar', 'naiman', 'tayichiud', 'onggirat']) {
    await click(w, d.querySelector(`[data-node="${id}"]`));
    assert.equal(d.querySelector('.network-node[aria-pressed="true"]').dataset.node, id);
    assert.equal(d.querySelector('.inspector').dataset.record, id);
    await click(w, d.querySelector('[data-action="read-record"]'));
    assert(
      d.querySelectorAll('.reader-content h3').length >= 4,
      'All profile sections and sources',
    );
    assert(d.querySelectorAll('.reader-content a').length > 0);
    assert(!han.test(visibleText(d)));
    d.querySelector('[role="dialog"]').dispatchEvent(
      new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await pause(65);
  }
  await click(w, d.querySelector('[data-action="search"]'));
  assert(d.querySelector('.search-input'));
  assert(d.querySelectorAll('.search-results button').length > 0);
  d.querySelector('[role="dialog"]').dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  await pause(65);
  await click(w, d.querySelectorAll('.destination')[2]);
  assert.equal(d.querySelectorAll('[data-article]').length, 38);
  await click(w, d.querySelector('[data-action="catalog-filter"]'));
  assert.equal(d.querySelectorAll('.category-options .segment').length, 8);
  await click(
    w,
    [...d.querySelectorAll('.category-options .segment')].find(
      (e) => e.getAttribute('aria-label') === 'ᠠᠶᠢᠮᠠᠭ',
    ),
  );
  assert.equal(d.querySelectorAll('[data-article]').length, 8);
  assert.equal(
    d.querySelector('.category-popover'),
    null,
    'A category selection returns to the catalog',
  );
  await click(w, d.querySelector('[data-action="catalog-filter"]'));
  await click(w, d.querySelector('.category-options .segment'));
  assert.equal(d.querySelectorAll('[data-article]').length, 38);
  await click(w, d.querySelector('[data-article="kereit_guide"]'));
  assert(d.querySelectorAll('.reader-content .reading-text').length >= 5);
  assert(d.querySelector('.reader-title'), 'Article title belongs to the vertical reading flow');
  await click(w, d.querySelector('[data-action="reader-smaller"]'));
  assert.equal(
    w.localStorage.getItem('nutug.readingScale'),
    '0.95',
    'Reading size can be changed while reading',
  );
  d.querySelector('[role="dialog"]').dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  await pause(65);
  await click(w, d.querySelector('[data-article="sorghaghtani-beki"]'));
  assert.equal(d.querySelectorAll('.reader-related').length, 3, 'Article keeps related people');
  await click(
    w,
    [...d.querySelectorAll('.reader-related')].find((button) => button.textContent === 'ᠪᠠᠲᠤ'),
  );
  assert.equal(d.querySelector('.inspector').dataset.record, 'batu');
  assert.equal(
    d.querySelectorAll('.network-edge.is-chosen').length,
    0,
    'People edges start unselected',
  );
  assert.equal(errors.length, 0, errors.join('\n'));
  w.close();
  for (const id of ['constructor', '__proto__']) {
    const { w, d } = await load('index.html', { fragment: '#person=' + id });
    assert.equal(d.querySelector('.inspector').dataset.record, 'temujin');
    w.close();
  }
  const messages = [],
    native = await load('index.html', { native: messages });
  assert(native.d.querySelector('.native-app'));
  assert(messages.some((m) => m.event === 'ready'));
  native.w.NutugShell.person('batu');
  await pause(75);
  assert.equal(native.d.querySelector('.inspector').dataset.record, 'batu');
  assert(messages.some((m) => m.event === 'record' && m.record?.id === 'batu' && m.interactive));
  native.w.close();
  console.log(
    'PASS: React production bundle on five routes; 9 nodes, 16 edges, period filters, six complete profiles, 38 articles, React Aria dialogs and slider, persistent type scaling, URL validation and native bridge.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
