const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { setTimeout: pause } = require('node:timers/promises');
const windows = [];
async function boot(saved = {}, { withoutLunar = false, rejectLunar = false } = {}) {
  const errors = [],
    requests = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error.message));
  console.on('error', (error) => errors.push(String(error)));
  const w = new JSDOM(fs.readFileSync('public/calendar.html', 'utf8'), {
    url: 'https://nutug.test/calendar.html?date=2026-10-08',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: console,
  }).window;
  windows.push(w);
  w.addEventListener('error', (event) => errors.push(event.error?.stack || event.message));
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
  for (const script of w.document.querySelectorAll('script[src]')) {
    const path = script.getAttribute('src');
    if (withoutLunar && /(?:vendor\/lunar|chinese-almanac-core)/.test(path)) continue;
    w.eval(fs.readFileSync('public/' + path, 'utf8'));
    if (rejectLunar && path.includes('chinese-almanac-core')) {
      w.ChineseAlmanac = {
        compute() {
          throw new Error('Gregorian display called the lunar engine');
        },
      };
    }
  }
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
  const { preferenceKey } = await import('../src/calendar-skins.mjs');
  const app = await boot();
  const { w, d } = app;
  assert(d.querySelector('.calendar-app'), JSON.stringify(app.errors));
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
  assert.equal(d.querySelectorAll('.timeline-day-column').length, 7);
  await click(d.querySelector('[data-view=day]'));
  assert(d.querySelector('.calendar-time-layout.single-day'));
  assert.equal(d.querySelectorAll('[data-action=timeline-add-slot]').length, 48);
  const selectedSlotDate = new URL(w.location.href).searchParams.get('date');
  await click(d.querySelector('[data-slot-minute="870"]'));
  assert.equal(d.querySelector('[name=startDate]').value, selectedSlotDate);
  assert.equal(d.querySelector('[name=startTime]').value, '14:30');
  assert.equal(d.querySelector('[name=endTime]').value, '15:30');
  await fill(w, d.querySelector('textarea[name=title]'), 'ᠪᠢᠴᠢᠭ');
  await click(d.querySelector('[data-action=save-event]'));
  assert(d.querySelector('.timeline-event').getAttribute('aria-label').includes('14:30'));
  await click(d.querySelector('.timeline-event'));
  assert(d.querySelector('[data-action=edit-event]'));
  await close(w, d);
  await click(d.querySelector('[data-slot-minute="1410"]'));
  assert.equal(d.querySelector('[name=endDate]').value, '2026-10-02');
  assert.equal(d.querySelector('[name=endTime]').value, '00:30');
  await close(w, d);

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
  await click(d.querySelector('[data-action=product-settings]'));
  await click(d.querySelector('[data-calendar-mode=gregorian]'));
  assert.equal(JSON.parse(w.localStorage.getItem(preferenceKey)).lunar, false);
  await close(w, d);
  assert.equal(d.querySelectorAll('.timeline-lunar').length, 0);
  const beforeInvalidJump = new URL(w.location.href).searchParams.get('date');
  await click(d.querySelector('[data-action=choose-month]'));
  await fill(w, d.querySelector('[name=calendar-date]'), '2100-02-29');
  await click(d.querySelector('[data-action=jump-date]'));
  assert.equal(d.activeElement.name, 'calendar-date');
  assert.equal(d.activeElement.getAttribute('aria-invalid'), 'true');
  assert.equal(new URL(w.location.href).searchParams.get('date'), beforeInvalidJump);
  await fill(w, d.querySelector('[name=calendar-date]'), '᠒᠐᠒᠘/᠒/᠒᠙');
  await click(d.querySelector('[data-action=jump-date]'));
  assert(!d.querySelector('[role=dialog]'));
  assert.equal(d.querySelector('time').dateTime, '2028-02-29');
  await click(d.querySelector('[data-view=month]'));
  assert.equal(d.querySelectorAll('.day-cell:not(.outside-month)').length, 29);
  assert.equal(d.querySelectorAll('.lunar-number, .compact-lunar').length, 0);
  assert(
    !d.querySelector('[data-date="2028-02-29"]').getAttribute('aria-label').includes(copy.lunar),
  );
  for (const view of ['year', 'week', 'day', 'month']) {
    await click(d.querySelector(`[data-view=${view}]`));
    await click(d.querySelector('[data-action=choose-month]'));
    await fill(w, d.querySelector('[name=calendar-date]'), '２０２６．１２．３１');
    await click(d.querySelector('[data-action=jump-date]'));
    assert.equal(new URL(w.location.href).searchParams.get('date'), '2026-12-31');
  }
  const civilOnly = await boot(
    { [preferenceKey]: JSON.stringify({ lunar: false }) },
    { rejectLunar: true },
  );
  await click(civilOnly.d.querySelector('[data-view=day]'));
  assert.equal(civilOnly.d.querySelectorAll('.timeline-lunar').length, 0);
  assert.deepEqual(civilOnly.errors, []);
  const noLunar = await boot({}, { withoutLunar: true });
  assert(noLunar.d.querySelector('[data-date="2026-10-08"]'));
  await click(noLunar.d.querySelector('[data-view=day]'));
  assert.equal(noLunar.d.querySelector('time').dateTime, '2026-10-08');
  assert.deepEqual(noLunar.errors, []);
  assert.deepEqual(app.errors, []);
  const corrupt = await boot({ [eventStorageKey]: 'broken' });
  assert(corrupt.d.querySelector('[role=alert]'));
  assert.equal(corrupt.w.localStorage.getItem(eventStorageKey), 'broken');
  windows.forEach((w) => w.close());
  console.log(
    'PASS: independent Gregorian calendar, dual display, leap-day jumps with Mongolian digits, event CRUD, recurring exception/undo, four views, saved skins and offline persistence.',
  );
})().catch((error) => {
  windows.forEach((w) => w.close());
  console.error(error);
  process.exitCode = 1;
});
