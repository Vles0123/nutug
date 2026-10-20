const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const pause = () => new Promise((r) => setTimeout(r, 50));
async function waitFor(predicate) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert(Date.now() < deadline, 'Calendar initialization completed');
    await pause();
  }
}

(async () => {
  const { normalizeTheme, decodeTheme, encodeTheme } =
    await import('../shared/calendar-themes.mjs');
  const fixture = decodeTheme(fs.readFileSync('tests/fixtures/calendar-theme.json', 'utf8'));
  assert.deepEqual(decodeTheme(encodeTheme(fixture)), fixture);
  for (const value of [
    { ...fixture, version: 2 },
    { ...fixture, name: ' ' },
    { ...fixture, id: '../bad' },
    { ...fixture, colors: { ...fixture.colors, accent: 'url(x)' } },
    { ...fixture, colors: { background: '#000000' } },
  ])
    assert.throws(() => normalizeTheme(value));
  assert.throws(() => decodeTheme(' '.repeat(65537)));
  assert.throws(() => decodeTheme('{'));
  const { preferenceKey } = await import('../src/calendar-skins.mjs');
  async function boot(saved) {
    const w = new JSDOM(fs.readFileSync('public/calendar.html', 'utf8'), {
      url: 'https://theme.test/calendar.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      virtualConsole: new VirtualConsole(),
    }).window;
    if (saved) w.localStorage.setItem(preferenceKey, saved);
    let id = 0;
    w.crypto.randomUUID = () => `new-${++id}`;
    w.TextEncoder = TextEncoder;
    w.Blob = Blob;
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    w.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.fetch = async () => {
      throw Error('offline');
    };
    w.URL.createObjectURL = (b) => {
      w.exported = b;
      return 'blob:test';
    };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
    for (const s of w.document.querySelectorAll('script[src]'))
      w.eval(fs.readFileSync('public/' + s.getAttribute('src'), 'utf8'));
    await waitFor(
      () => w.document.querySelector('.calendar-app') && w.document.documentElement.dataset.skin,
    );
    return w;
  }
  const w = await boot(),
    d = w.document;
  const click = async (selector) => {
    assert(d.querySelector(selector), selector);
    d.querySelector(selector).click();
    await pause();
  };
  const input = async (selector, value) => {
    const el = d.querySelector(selector);
    assert(el, selector);
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement : w.HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
    await pause();
  };
  await click('[data-action=product-settings]');
  await click('[data-theme-action=new]');
  await click('[data-theme-action=save]');
  assert(d.querySelector('[role=alert]'));
  await input('[data-theme-name]', fixture.name);
  for (const [key, value] of Object.entries(fixture.colors))
    await input(`[data-theme-color=${key}]`, value);
  await click('[data-theme-action=save]');
  let state = JSON.parse(w.localStorage.getItem(preferenceKey));
  assert.equal(state.themes.length, 1);
  assert.equal(d.documentElement.style.getPropertyValue('--canvas'), fixture.colors.background);
  await click('[data-theme-action=export]');
  assert.deepEqual(decodeTheme(await w.exported.text()).colors, fixture.colors);
  const reloaded = await boot(JSON.stringify(state));
  assert.equal(
    reloaded.document.documentElement.style.getPropertyValue('--label'),
    fixture.colors.text,
  );
  reloaded.close();
  await click('[data-theme-action=edit]');
  await input('[data-theme-name]', 'ᠬᠥᠬᠡ');
  await input('[data-theme-hex=background]', '#18222F');
  await input('[data-theme-hex=text]', '#E3EDFA');
  await input('[data-theme-hex=accent]', '#91B7EE');
  await click('[data-theme-action=save]');
  assert.equal(JSON.parse(w.localStorage.getItem(preferenceKey)).themes.length, 1);
  assert.equal(d.documentElement.dataset.skin, 'dark');
  assert.equal(d.documentElement.style.getPropertyValue('--on-accent'), '#000000');
  const darkReload = await boot(w.localStorage.getItem(preferenceKey));
  assert.equal(darkReload.document.documentElement.style.getPropertyValue('--canvas'), '#18222F');
  darkReload.close();
  const savedBeforeCancel = w.localStorage.getItem(preferenceKey);
  await click('[data-theme-action=edit]');
  await input('[data-theme-name]', 'ᠬᠤᠷᠠᠯ');
  await click('[data-theme-action=cancel]');
  assert.equal(w.localStorage.getItem(preferenceKey), savedBeforeCancel);
  const incoming = async (text) => {
    const el = d.querySelector('[data-theme-file]');
    Object.defineProperty(el, 'files', {
      configurable: true,
      value: [{ size: Buffer.byteLength(text), text: async () => text }],
    });
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
    await pause();
  };
  state = w.localStorage.getItem(preferenceKey);
  await incoming('{');
  assert.equal(w.localStorage.getItem(preferenceKey), state);
  await incoming(encodeTheme(fixture));
  assert.equal(JSON.parse(w.localStorage.getItem(preferenceKey)).themes.length, 2);
  await click('[data-theme-action=delete]');
  assert.equal(JSON.parse(w.localStorage.getItem(preferenceKey)).themes.length, 1);
  assert.equal(d.documentElement.style.getPropertyValue('--canvas'), '');
  await click('[data-skin-choice=dark]');
  assert.equal(d.documentElement.dataset.skin, 'dark');
  w.close();
  console.log(
    'PASS: theme validation, create/edit/delete, palette application, reload, file roundtrip, duplicate import and malformed-file preservation.',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
