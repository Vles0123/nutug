const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { setTimeout: pause } = require('node:timers/promises');
const windows = [];
async function boot(saved = {}) {
  const errors = [],
    requests = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error.message));
  const w = new JSDOM(fs.readFileSync('public/calendar.html', 'utf8'), {
    url: 'https://nutug.test/calendar.html?date=2026-10-08',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: console,
  }).window;
  windows.push(w);
  for (const [key, value] of Object.entries(saved)) w.localStorage.setItem(key, value);
  w.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  w.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.fetch = async (url) => {
    requests.push(url);
    throw new Error('offline');
  };
  let ids = 0;
  w.crypto.randomUUID = () => `appointment-${++ids}`;
  w.eval(
    [...w.document.querySelectorAll('script[src]')]
      .map((s) => fs.readFileSync('public/' + s.getAttribute('src'), 'utf8'))
      .join('\n'),
  );
  await pause(100);
  return { w, d: w.document, errors, requests };
}
async function click(node) {
  assert(node, 'Required control exists');
  node.click();
  await pause(35);
}
async function fill(w, node, value) {
  assert(node);
  const type = node.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement : w.HTMLInputElement;
  Object.getOwnPropertyDescriptor(type.prototype, 'value').set.call(node, value);
  node.dispatchEvent(new w.Event('input', { bubbles: true }));
  await pause(25);
}
async function close(w, d) {
  d.querySelector('[role=dialog]').dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  await pause(35);
}
(async () => {
  const { calendarCopy: copy } = await import('../src/calendar-copy.mjs');
  const { eventStorageKey } = await import('../shared/calendar-events.mjs');
  const app = await boot();
  const { w, d } = app;
  assert(d.querySelector('.calendar-app'));
  assert(!d.querySelector('.product-tabs'));
  await click(d.querySelector('[data-action=new-event]'));
  await click(d.querySelector('[data-action=save-event]'));
  assert(d.querySelector('[role=alert]'), 'Invalid forms explain the issue in Mongolian');
  await pause(30);
  assert.equal(d.activeElement.name, 'title', 'An invalid title receives focus');
  await fill(w, d.querySelector('textarea[aria-label="' + copy.title + '"]'), 'ᠬᠤᠷᠠᠯ');
  await fill(w, d.querySelector('input[name=endDate]'), '2026-10-07');
  await click(d.querySelector('[data-action=save-event]'));
  await pause(30);
  assert.equal(d.activeElement.name, 'endDate', 'The field with the invalid date receives focus');
  assert(d.querySelector('[role=alert]').textContent.includes(copy.end));
  await fill(w, d.querySelector('input[name=endDate]'), '2026-10-08');
  await click(
    [...d.querySelectorAll('.repeat-field [role=radio]')].find(
      (x) => x.getAttribute('aria-label') === copy.week,
    ),
  );
  await fill(w, d.querySelector('[aria-label="' + copy.until + '"]'), '2026-10-31');
  await click(d.querySelector('[data-action=save-event]'));
  assert(!d.querySelector('.appointment-editor'));
  assert.equal(d.querySelectorAll('.appointment-dots').length, 4);
  assert.equal(JSON.parse(w.localStorage.getItem(eventStorageKey)).events.length, 1);
  await click(d.querySelector('.appointment-card'));
  await click(d.querySelector('[data-action=edit-event]'));
  await fill(w, d.querySelector('textarea[aria-label="' + copy.title + '"]'), 'ᠪᠢᠴᠢᠭ');
  await click(d.querySelector('[data-action=save-event]'));
  assert(d.querySelector('.appointment-card').textContent.includes('ᠪᠢᠴᠢᠭ'));
  await click(d.querySelector('[data-date="2026-10-15"]'));
  await click(d.querySelector('.appointment-card'));
  await click(d.querySelector('[data-action=delete-occurrence]'));
  assert.equal(d.querySelectorAll('.appointment-dots').length, 3);
  await click(d.querySelector('[data-action=undo-event]'));
  assert.equal(d.querySelectorAll('.appointment-dots').length, 4);
  await click(d.querySelector('.appointment-card'));
  await click(d.querySelector('[data-action=edit-occurrence]'));
  await fill(w, d.querySelector('textarea[aria-label="' + copy.title + '"]'), 'ᠬᠤᠷᠠᠯ');
  await click(d.querySelector('[data-action=save-event]'));
  const edited = JSON.parse(w.localStorage.getItem(eventStorageKey)).events;
  assert.equal(edited.length, 2);
  assert.deepEqual(edited.find((item) => item.repeat === 'weekly').exceptions, ['2026-10-15']);
  assert.equal(edited.find((item) => item.repeat === 'none').startDate, '2026-10-15');
  await click(d.querySelector('[data-view=year]'));
  assert.equal(d.querySelectorAll('[data-year-month]').length, 12);
  await click(d.querySelector('[data-year-month="2026-10"]'));
  await click(d.querySelector('[data-view=week]'));
  assert.equal(d.querySelectorAll('.week-day').length, 7);
  await click(d.querySelector('[data-view=day]'));
  assert(d.querySelector('.day-workspace'));
  await click(d.querySelector('[data-action=product-settings]'));
  await click(d.querySelector('[data-skin-choice=paper]'));
  assert.equal(d.documentElement.dataset.skin, 'paper');
  await close(w, d);
  const saved = {};
  for (let i = 0; i < w.localStorage.length; i++) {
    const key = w.localStorage.key(i);
    saved[key] = w.localStorage.getItem(key);
  }
  const reloaded = await boot(saved);
  assert.equal(reloaded.d.documentElement.dataset.skin, 'paper');
  assert.equal(
    JSON.parse(reloaded.w.localStorage.getItem(eventStorageKey)).events[0].title,
    'ᠪᠢᠴᠢᠭ',
  );
  assert.equal(app.requests.length, 0, 'Calendar never requests the historical content feed');
  const text =
    d.body.textContent +
    [...d.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join('');
  assert(!/[A-Za-z\u3400-\u9fff\u0400-\u04ff]/.test(text));
  assert.deepEqual(app.errors, []);
  assert.deepEqual(reloaded.errors, []);
  const corrupt = await boot({ [eventStorageKey]: 'broken' });
  assert(corrupt.d.querySelector('[role=alert]'));
  assert.equal(corrupt.w.localStorage.getItem(eventStorageKey), 'broken');
  windows.forEach((w) => w.close());
  console.log(
    'PASS: independent calendar, event CRUD, recurring exception/undo, four views, saved skins and offline persistence.',
  );
})().catch((error) => {
  windows.forEach((w) => w.close());
  console.error(error);
  process.exitCode = 1;
});
