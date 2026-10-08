const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

(async () => {
  execFileSync(process.execPath, ['scripts/package-web.mjs']);
  for (const [product, entry, other] of [
    ['calendar', 'calendar.html', 'chronicle.html'],
    ['history', 'chronicle.html', 'calendar.html'],
  ]) {
    const root = `build/web/${product}`;
    assert(fs.readFileSync(root + '/index.html', 'utf8').includes(`data-product="${product}"`));
    assert(!fs.existsSync(`${root}/${other}`), 'Each package has its own entry points');
    const scope = `https://nutug.test/${product}/`;
    const events = {},
      caches = new Map(),
      removed = [];
    const old = 'nutug-ui-' + encodeURIComponent(`/${product}/`) + '-old';
    const neighbor = 'nutug-ui-' + encodeURIComponent(`/another-product/`) + '-current';
    caches.set(old, new Map());
    caches.set(neighbor, new Map());
    const context = {
      URL,
      self: {
        registration: { scope },
        skipWaiting() {},
        clients: { claim() {} },
        addEventListener(name, callback) {
          events[name] = callback;
        },
      },
      caches: {
        async keys() {
          return [...caches.keys()];
        },
        async delete(key) {
          removed.push(key);
          return caches.delete(key);
        },
        async open(key) {
          if (!caches.has(key)) caches.set(key, new Map());
          const values = caches.get(key);
          return {
            async addAll(urls) {
              for (const url of urls) {
                const path = new URL(url).pathname.slice(new URL(scope).pathname.length);
                assert(fs.existsSync(`${root}/${path}`), `Cached asset exists: ${path}`);
                values.set(url, { page: path });
              }
            },
            async match(request) {
              return values.get(typeof request === 'string' ? request : request.url);
            },
          };
        },
      },
      async fetch() {
        throw new Error('offline');
      },
    };
    vm.runInNewContext(fs.readFileSync(root + '/sw.js', 'utf8'), context);
    let pending;
    events.install({
      waitUntil(value) {
        pending = value;
      },
    });
    await pending;
    events.activate({
      waitUntil(value) {
        pending = value;
      },
    });
    await pending;
    assert(removed.includes(old));
    assert(caches.has(neighbor), 'Installing one product preserves another product offline cache');
    events.fetch({
      request: { method: 'GET', mode: 'navigate', url: scope + entry + '?date=2026-10-08' },
      respondWith(value) {
        pending = value;
      },
    });
    assert.equal((await pending).page, entry, 'Offline navigation keeps the selected product');
  }
  console.log('PASS: independent web packages, complete offline assets and cache separation.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
