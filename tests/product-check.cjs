const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { setTimeout: pause } = require('node:timers/promises');
const windows = [];
async function boot(page, clock) {
  let online = page.startsWith('chronicle.html');
  const calls = [],
    errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (e) => errors.push(e.message));
  const w = new JSDOM(fs.readFileSync('public/' + page.split('?')[0], 'utf8'), {
    url: 'https://nutug.test/' + page,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: console,
  }).window;
  windows.push(w);
  const NativeDate = w.Date;
  if (clock)
    w.Date = class extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [clock.now]));
      }
      static now() {
        return clock.now;
      }
    };
  w.fetch = async (value) => {
    calls.push(value);
    if (!online) throw new Error('offline');
    const path = new URL(value).pathname;
    const start = path.indexOf('/releases/');
    return new Response(
      fs.readFileSync('content-dist/' + (start < 0 ? 'manifest.json' : path.slice(start + 1))),
    );
  };
  w.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.eval(
    [...w.document.querySelectorAll('script[src]')]
      .map((s) => fs.readFileSync('public/' + s.getAttribute('src'), 'utf8'))
      .join('\n'),
  );
  for (let i = 0; i < 100 && !w.document.querySelector('.product-app,.calendar-app'); i++)
    await pause(10);
  return {
    w,
    d: w.document,
    calls,
    errors,
    online: () => {
      online = true;
    },
  };
}
async function click(element) {
  assert(element);
  element.click();
  await pause(45);
}
async function key(w, element, value) {
  assert(element);
  element.dispatchEvent(new w.KeyboardEvent('keydown', { key: value, bubbles: true }));
  await pause(45);
}
(async () => {
  const { civilDate, moveMonth, moveDate, monthDays, currentDate } =
    await import('../shared/calendar.mjs');
  assert.equal(moveMonth('2024-01-31', 1), '2024-02-29');
  assert.equal(moveMonth('2025-01-31', 1), '2025-02-28');
  assert.equal(moveMonth('2026-12-31', 1), '2027-01-31');
  assert.equal(moveDate('2000-02-28', 1), '2000-02-29');
  assert.equal(currentDate('Asia/Shanghai', new Date('2026-10-06T16:00:00Z')), '2026-10-07');
  assert.equal(monthDays('2026-02').filter((d) => d.inMonth).length, 28);
  assert.equal(monthDays('2028-02').filter((d) => d.inMonth).length, 29);
  for (const month of ['1901-01', '2100-12'])
    for (const day of monthDays(month)) assert(civilDate(day.iso));
  const { orderedEvents } = await import('../shared/history.mjs');
  const uncertain = orderedEvents([
    { date: '12 ᠳᠤᠭᠠᠷ ᠵᠠᠭᠤᠨ ᠤ ᠰᠡᠭᠦᠯ', precision: 'period', startYear: 1100, endYear: 1199 },
  ])[0];
  assert.equal(uncertain.start, null, 'An uncertain period is not treated as an exact year range');
  const clock = { now: Date.parse('2026-10-06T15:59:50Z') };
  const app = await boot('index.html', clock);
  let { w, d } = app;
  assert(d.querySelector('.ordinary-calendar'), 'Calendar starts before any content request');
  assert.equal(
    app.calls.length,
    0,
    'Fresh calendar launch works without a content connection or saved content',
  );
  assert.equal(
    d.querySelectorAll('a[href="chronicle.html"]').length,
    0,
    'Calendar has its own navigation',
  );
  const selected = () => d.querySelector('[data-selected-date]').dataset.selectedDate;
  assert.equal(selected(), '2026-10-06');
  clock.now = Date.parse('2026-10-06T16:00:10Z');
  d.dispatchEvent(new w.Event('visibilitychange'));
  await pause(45);
  assert.equal(selected(), '2026-10-07');
  await click(d.querySelector('[data-date="2026-10-05"]'));
  clock.now = Date.parse('2026-10-07T16:00:10Z');
  d.dispatchEvent(new w.Event('visibilitychange'));
  await pause(45);
  assert.equal(selected(), '2026-10-05', 'Chosen dates stay selected over midnight');
  await click(d.querySelector('[data-action="next-month"]'));
  assert(d.querySelector('.month-title').textContent.includes('2026 / 11'));
  await click(d.querySelector('[data-action="today"]'));
  assert.equal(selected(), '2026-10-08');
  await key(w, d.querySelector('[data-date="2026-10-08"]'), 'PageDown');
  assert.equal(selected(), '2026-11-08');
  assert.equal(d.activeElement.dataset.date, '2026-11-08');
  await key(w, d.activeElement, 'Home');
  assert.equal(selected(), '2026-11-01');
  await key(w, d.activeElement, 'ArrowLeft');
  assert.equal(selected(), '2026-10-31');
  await click(d.querySelector('[data-action="choose-month"]'));
  const input = d.querySelector('.picker-year input');
  Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(input, '2000');
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  await pause(45);
  await click(d.querySelectorAll('.picker-months button')[1]);
  await click(d.querySelector('[data-date="2000-02-29"]'));
  assert.equal(selected(), '2000-02-29');
  assert(new URL(w.location.href).searchParams.get('date') === '2000-02-29');
  await click(d.querySelector('[data-action="product-settings"]'));
  assert(d.querySelector('input[type=range]'));
  await key(w, d.querySelector('[role=dialog]'), 'Escape');
  const historyApp = await boot('chronicle.html');
  ({ w, d } = historyApp);
  for (let i = 0; i < 100 && !d.querySelector('.chronicle-entry'); i++) await pause(20);
  assert(d.querySelectorAll('.year-rail button').length >= 16);
  await click(d.querySelector('[data-action="chronicle-contents"]'));
  assert(d.querySelectorAll('[data-contents-event]').length > 0);
  if (d.querySelector('[data-history-period="mongol-empire"]'))
    await click(d.querySelector('[data-history-period="mongol-empire"]'));
  await click(d.querySelector('[data-contents-event="mongol-empire-1206"]'));
  assert(!d.querySelector('[role=dialog]'), 'Choosing a period returns to the reading surface');
  assert(historyApp.calls.length >= 2, 'History reads the independent content interface');
  assert(
    historyApp.calls.every((url) => url.endsWith('manifest.json') || url.endsWith('core.json')),
    'Chronology fetches only its own content',
  );
  await click(d.querySelector('[data-event="mongol-empire-1206"]'));
  const first = d.querySelector('.chronicle-entry').dataset.eventId;
  assert(w.location.hash.includes(first));
  await click(d.querySelector('[data-action="event-people"]'));
  await click(d.querySelector('[data-person="temujin"]'));
  assert.equal(d.querySelector('[data-person-record]').dataset.personRecord, 'temujin');
  assert(d.querySelector('.person-reading'), 'Person opens as a readable biography');
  assert(!d.querySelector('[data-network]'), 'Biography keeps the full reading area');
  const radios = d.querySelectorAll('.person-controls [role="radio"]');
  await click(radios[1]);
  assert(d.querySelectorAll('[data-network] [data-node]').length > 1);
  const related = [...d.querySelectorAll('[data-network] [data-node]')].find(
    (node) => node.dataset.node !== 'temujin',
  );
  const relatedId = related.dataset.node;
  await click(related);
  assert.equal(d.querySelector('[data-person-record]').dataset.personRecord, relatedId);
  await click(d.querySelector('[data-action="person-back"]'));
  assert.equal(d.querySelector('[data-person-record]').dataset.personRecord, 'temujin');
  await key(w, d.querySelector('[role=dialog]'), 'Escape');
  assert.equal(
    d.activeElement.dataset.action,
    'event-people',
    'Closing a person restores the event context control',
  );
  await click(d.querySelector('[data-action="chronicle-next"]'));
  assert.notEqual(d.querySelector('.chronicle-entry').dataset.eventId, first);
  w.history.back();
  await pause(80);
  assert.equal(d.querySelector('.chronicle-entry').dataset.eventId, first);
  await click(d.querySelector('[data-action="chronicle-search"]'));
  const search = d.querySelector('.search-input');
  Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value').set.call(
    search,
    '1263',
  );
  search.dispatchEvent(new w.Event('input', { bubbles: true }));
  await pause(60);
  assert.equal(
    d.querySelectorAll('[data-search-event]').length,
    2,
    'Year search finds ranges containing that year',
  );
  await click(d.querySelector('[data-search-event]'));
  assert(!d.querySelector('[role=dialog]'));
  const visible =
    d.body.textContent +
    [...d.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ');
  assert(
    !/[\u3400-\u9fff\u0400-\u04ffA-Za-z]/u.test(visible),
    'Product controls and content use Traditional Mongolian',
  );
  assert.equal(app.errors.length, 0, app.errors.join('\n'));
  assert.equal(historyApp.errors.length, 0, historyApp.errors.join('\n'));
  for (const date of ['1901-01-01', '2100-12-31']) {
    const edge = await boot('calendar.html?date=' + date);
    assert.equal(edge.d.querySelector('[data-selected-date]').dataset.selectedDate, date);
    const control = edge.d.querySelector(
      date.startsWith('1901') ? '[data-action="previous-month"]' : '[data-action="next-month"]',
    );
    assert(control.disabled);
    assert.equal(edge.errors.length, 0, edge.errors.join('\n'));
  }
  for (const window of windows) window.close();
  console.log(
    'PASS: offline-first independent calendar and history, dual dates, month/year and keyboard navigation, midnight behavior, range boundaries, chronological reading, year-range search and contextual people.',
  );
})().catch((error) => {
  for (const window of windows) window.close();
  console.error(error);
  process.exitCode = 1;
});
