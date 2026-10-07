const assert = require('node:assert/strict');
const fs = require('node:fs');
const liveWindows = new Set();
const { JSDOM, VirtualConsole } = require('jsdom');
const { setTimeout: pause } = require('node:timers/promises');
const pages = ['index.html', 'tribes.html', 'tribes-mobile.html', 'almanac.html'];
const han = /[\u3400-\u9fff\u{20000}-\u{2FA1F}]/u;
async function load(page, options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e.message));
  const w = new JSDOM(fs.readFileSync('public/' + page, 'utf8'), {
    url:
      'https://nutug.test/' +
      page +
      (options.fragment || (page === 'index.html' ? '#person=temujin' : '')),
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  }).window;
  liveWindows.add(w);
  if (options.clock) {
    const NativeDate = w.Date;
    w.Date = class extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [options.clock.now]));
      }
      static now() {
        return options.clock.now;
      }
    };
  }
  w.fetch = async (value) => {
    const url = new URL(value);
    const marker = url.pathname.indexOf('/releases/');
    const path = marker >= 0 ? url.pathname.slice(marker + 1) : 'manifest.json';
    return new Response(fs.readFileSync('content-dist/' + path), { status: 200 });
  };
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
  for (let i = 0; i < 100 && !w.document.querySelector('.app'); i++) await pause(20);
  assert(w.document.querySelector('.app'), 'Remote content bootstraps the interface');
  assert.equal(errors.length, 0, errors.join('\n'));
  return { w, d: w.document, errors };
}
async function click(w, element) {
  assert(element, 'Expected interactive element');
  element.click();
  await pause(65);
}
async function fill(w, element, value) {
  assert(element, 'Expected text input');
  const Type = element.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement : w.HTMLInputElement;
  Object.getOwnPropertyDescriptor(Type.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new w.Event('input', { bubbles: true }));
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
    assert.equal(d.querySelectorAll('.destination').length, 2);
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
  await click(w, d.querySelector('.legend-library'));
  assert.equal(d.querySelector('.discovery-map').dataset.discovery, 'vertical-script');
  assert.equal(d.querySelectorAll('[data-topic]').length, 6);
  const nextDiscovery = d.querySelector('[data-discovery-node]:not([data-current])').dataset
    .discoveryNode;
  await click(w, d.querySelector(`[data-discovery-node="${nextDiscovery}"]`));
  assert.equal(d.querySelector('.discovery-map').dataset.discovery, nextDiscovery);
  assert.equal(d.querySelector('.discovery-preview').dataset.preview, nextDiscovery);
  await click(w, d.querySelector('[data-action="discovery-back"]'));
  assert.equal(d.querySelector('.discovery-map').dataset.discovery, 'vertical-script');
  await click(w, d.querySelector('[data-topic="arts"]'));
  assert.equal(d.querySelector('.discovery-map').dataset.discovery, 'morin-khuur');
  await click(w, d.querySelector('[data-action="discovery-read"]'));
  for (let i = 0; i < 100 && !d.querySelector('.reader-content .reading-text'); i++)
    await pause(20);
  assert(d.querySelector('.reader-content .reading-text'));
  assert(d.querySelector('[data-related-article]'), 'Reading provides a further content path');
  const further = d.querySelector('[data-related-article]').dataset.relatedArticle;
  await click(w, d.querySelector('[data-related-article]'));
  assert.equal(w.location.hash, '#article=' + further);
  w.history.back();
  await pause(90);
  assert.equal(w.location.hash, '#article=morin-khuur');
  await click(w, d.querySelector('[data-action="reader-back"]'));
  await click(w, d.querySelector('[data-action="discovery-catalog"]'));
  assert.equal(d.querySelectorAll('[data-article]').length, 24);
  assert.equal(d.querySelector('.catalog-count').textContent, '484');
  await click(w, d.querySelector('[data-action="catalog-more"]'));
  assert.equal(d.querySelectorAll('[data-article]').length, 48);
  assert.equal(d.activeElement, d.querySelectorAll('[data-article]')[24]);
  await click(w, d.querySelector('[data-action="catalog-search"]'));
  const edit = d.querySelector('.search-input');
  assert.equal(edit.tagName, 'TEXTAREA', 'Search uses the multiline control for Mongolian columns');
  const beforeComposition = d.querySelector('.search-results').textContent;
  edit.dispatchEvent(new w.CompositionEvent('compositionstart', { bubbles: true }));
  await fill(w, edit, 'ᠮᠣ');
  assert.equal(
    d.querySelector('.search-results').textContent,
    beforeComposition,
    'IME composition does not filter provisional text',
  );
  edit.dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, isComposing: true }),
  );
  await pause(35);
  assert(d.querySelector('.search-input'), 'Candidate dismissal preserves the editor');
  await fill(w, edit, 'ᠮᠣᠩᠭᠣᠯ ᠤᠨ');
  edit.dispatchEvent(
    new w.CompositionEvent('compositionend', { bubbles: true, data: 'ᠮᠣᠩᠭᠣᠯ ᠤᠨ' }),
  );
  await pause(65);
  assert.equal(edit.value, 'ᠮᠣᠩᠭᠣᠯ ᠤᠨ', 'The editor preserves Mongolian suffix spacing');
  assert.notEqual(d.querySelector('.search-results').textContent, beforeComposition);
  await fill(w, edit, 'archive-lindgren-community-identification');
  await click(w, d.querySelector('[data-action="search-all"]'));
  assert.equal(d.querySelectorAll('[data-article]').length, 1);
  await click(w, d.querySelector('.catalog [data-action="clear-search"]'));
  assert.equal(
    d.activeElement.dataset.action,
    'catalog-search',
    'Clearing a query returns focus to the search control',
  );
  assert.equal(
    d.querySelectorAll('[data-article]').length,
    24,
    'Clearing search starts a new batch',
  );
  await click(w, d.querySelector('[data-action="catalog-filter"]'));
  assert.equal(d.querySelectorAll('.category-options .segment').length, 9);
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
  await click(w, d.querySelector('[data-action="search"]'));
  await fill(w, d.querySelector('[role="dialog"] .search-input'), 'ᠮᠣᠩᠭᠣᠯ');
  const completeCount = Number(d.querySelector('[data-action="search-all"] .numeric').textContent);
  assert(completeCount > 24);
  await click(w, d.querySelector('[data-action="search-all"]'));
  assert.equal(d.querySelector('.catalog .search-trigger .mn').textContent, 'ᠮᠣᠩᠭᠣᠯ');
  assert.equal(Number(d.querySelector('.catalog-count').textContent), completeCount);
  assert.equal(d.querySelectorAll('.catalog-entry').length, 24, 'Complete search resets category');
  assert.equal(new URLSearchParams(w.location.search).get('q'), 'ᠮᠣᠩᠭᠣᠯ');
  await click(w, d.querySelector('.catalog [data-action="clear-search"]'));
  await click(w, d.querySelector('[data-action="catalog-filter"]'));
  await click(w, d.querySelector('.category-options .segment'));
  assert.equal(d.querySelectorAll('[data-article]').length, 24);
  assert.equal(d.querySelector('.catalog-count').textContent, '484');
  await click(w, d.querySelector('[data-action="catalog-filter"]'));
  await click(
    w,
    [...d.querySelectorAll('.category-options .segment')].find(
      (e) => e.getAttribute('aria-label') === 'ᠠᠶᠢᠮᠠᠭ',
    ),
  );
  await click(w, d.querySelector('[data-article="kereit_guide"]'));
  for (let i = 0; i < 60 && !d.querySelector('.reader-content .reading-text'); i++) await pause(20);
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
  await click(w, d.querySelector('[data-action="catalog-filter"]'));
  await click(w, d.querySelector('.category-options .segment'));
  await click(w, d.querySelector('[data-article="sorghaghtani-beki"]'));
  for (let i = 0; i < 60 && !d.querySelector('.reader-related'); i++) await pause(20);
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
  const direct = await load('index.html', {
    fragment: '?q=archive#article=archive-lindgren-community-identification',
  });
  for (let i = 0; i < 60 && !direct.d.querySelector('.reader-content .reading-text'); i++)
    await pause(20);
  assert.equal(
    direct.d.querySelectorAll('.reader-content p').length,
    3,
    'Deep link hydrates the full body',
  );
  await click(direct.w, direct.d.querySelector('[data-action="reader-back"]'));
  assert.equal(direct.w.location.hash, '#knowledge');
  assert.equal(direct.d.querySelector('.catalog .search-trigger .mn').textContent, 'archive');
  const linkedId = direct.d.querySelector('[data-article]').dataset.article;
  await click(direct.w, direct.d.querySelector('[data-article]'));
  assert.equal(direct.w.location.hash, '#article=' + linkedId);
  direct.w.history.back();
  await pause(90);
  assert.equal(direct.d.querySelector('.reader-dialog'), null);
  direct.w.history.forward();
  await pause(90);
  assert(direct.d.querySelector('.reader-content .reading-text'), 'Forward restores article body');
  direct.w.close();
  for (const page of ['almanac.html']) {
    const clock = { now: Date.parse('2026-10-06T15:59:50Z') };
    const timed = await load(page, { clock });
    const selectedDate = () =>
      page === 'calendar.html'
        ? timed.d.querySelector('.selected-date .numeric').textContent
        : timed.d.querySelector('.date-controls input').value;
    assert.equal(selectedDate(), '2026-10-06');
    clock.now = Date.parse('2026-10-06T16:00:10Z');
    timed.d.dispatchEvent(new timed.w.Event('visibilitychange'));
    for (let i = 0; i < 100 && selectedDate() !== '2026-10-07'; i++) await pause(20);
    assert.equal(selectedDate(), '2026-10-07', 'Today follows the content time zone at midnight');
    if (page === 'calendar.html')
      await click(timed.w, timed.d.querySelector('[data-date="2026-10-05"]'));
    else {
      await fill(timed.w, timed.d.querySelector('.date-controls input'), '2026-10-05');
      timed.d
        .querySelector('.date-controls input')
        .dispatchEvent(new timed.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await pause(65);
      const tabs = timed.d.querySelectorAll('.almanac-tabs [role="tab"]');
      assert.equal(tabs.length, 3);
      await click(timed.w, tabs[1]);
      assert(timed.d.querySelector('[role="tabpanel"] .directions'));
      await click(timed.w, tabs[2]);
      assert(timed.d.querySelector('[role="tabpanel"] .source-links a'));
      await click(timed.w, tabs[0]);
      assert(timed.d.querySelector('[role="tabpanel"] .almanac-activities'));
      assert(!han.test(visibleText(timed.d)));
    }
    clock.now = Date.parse('2026-10-07T16:00:10Z');
    timed.d.dispatchEvent(new timed.w.Event('visibilitychange'));
    await pause(90);
    assert.equal(selectedDate(), '2026-10-05', 'A chosen historical date stays selected');
    timed.w.close();
  }
  for (const id of ['constructor', '__proto__']) {
    const { w, d } = await load('index.html', { fragment: '#person=' + id });
    assert.equal(d.querySelector('.inspector').dataset.record, 'temujin');
    w.close();
  }
  const messages = [],
    native = await load('index.html', { native: messages });
  assert(native.d.querySelector('.native-app'));
  assert(messages.some((m) => m.event === 'ready'));
  assert.equal(messages.find((m) => m.event === 'people')?.records.length, 32);
  native.w.NutugShell.person('batu');
  await pause(75);
  assert.equal(native.d.querySelector('.inspector').dataset.record, 'batu');
  assert(messages.some((m) => m.event === 'record' && m.record?.id === 'batu' && m.interactive));
  native.w.close();
  console.log(
    'PASS: React production bundle on retained graph and reading routes; graph filters and profiles, topic discovery and browsing path, 484-entry paged search, related reading and history, midnight refresh, almanac tabs, React Aria controls, persistent type scaling and native bridge.',
  );
})().catch((error) => {
  for (const w of liveWindows) w.close();
  console.error(error);
  process.exitCode = 1;
});
