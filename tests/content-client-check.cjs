const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
(async () => {
  const { ContentClient, memoryStore } = await import('../src/content-client.mjs');
  const manifest = JSON.parse(fs.readFileSync('content-dist/manifest.json', 'utf8'));
  let online = true,
    current = manifest,
    corrupt = false;
  const requests = [];
  const fetcher = async (value) => {
    if (!online) throw new Error('offline');
    const path = new URL(value).pathname.slice(1);
    requests.push(path);
    if (path === 'manifest.json') return new Response(JSON.stringify(current));
    if (corrupt && path === current.core.path) return new Response('{}');
    return new Response(fs.readFileSync('content-dist/' + path));
  };
  const store = memoryStore(),
    client = new ContentClient({
      manifestUrl: 'https://content.test/manifest.json',
      store,
      fetcher,
    });
  const initial = await client.load();
  assert.equal(initial.catalog.length, 484);
  assert.equal(
    requests.length,
    4,
    'Bootstrap downloads only manifest, core, directory and search index',
  );
  const first = await client.document(initial.catalog[0]);
  assert.equal(first.id, initial.catalog[0].id);
  const loaded = requests.length;
  await client.document(initial.catalog[0]);
  assert.equal(requests.length, loaded, 'Verified article is read from cache');
  online = false;
  const reopened = new ContentClient({ manifestUrl: client.manifestUrl, store, fetcher });
  assert.equal((await reopened.load()).manifest.revision, manifest.revision);
  assert.equal((await reopened.document(initial.catalog[0])).id, first.id);
  await assert.rejects(() => reopened.document(initial.catalog[90]));
  online = true;
  await client.downloadOffline();
  online = false;
  assert.equal((await reopened.document(initial.catalog[473])).id, initial.catalog[473].id);
  online = true;
  requests.length = 0;
  await client.checkForUpdates();
  assert.deepEqual(requests, ['manifest.json'], 'Unchanged content needs only the small manifest');
  current = {
    ...manifest,
    revision: 'a'.repeat(24),
    core: { path: 'objects/' + 'b'.repeat(64) + '.json', sha256: 'b'.repeat(64), bytes: 2 },
  };
  corrupt = true;
  assert.equal(await client.checkForUpdates(), false);
  assert.equal(
    (await store.get(client.key('head'))).revision,
    manifest.revision,
    'Rejected update preserves the verified snapshot',
  );
  current = { ...manifest, revision: 'c'.repeat(24) };
  corrupt = false;
  assert.equal(await client.checkForUpdates(), true);
  assert.equal(
    client.active.manifest.revision,
    manifest.revision,
    'Active reading session keeps its snapshot',
  );
  assert.equal(
    (await store.get(client.key('head'))).revision,
    current.revision,
    'Next launch uses fully cached update',
  );
  online = false;
  const updated = new ContentClient({ manifestUrl: client.manifestUrl, store, fetcher });
  assert.equal((await updated.load()).manifest.revision, current.revision);
  assert.equal((await updated.document(initial.catalog[473])).id, initial.catalog[473].id);
  await assert.rejects(() =>
    updated.object({ ...manifest.core, path: 'https://outside.test/data.json' }),
  );
  online = true;
  current = manifest;
  assert.equal(await client.checkForUpdates(), false);
  assert.equal(client.getStatus().updateReady, false);
  assert.equal(
    (await store.get(client.key('head'))).revision,
    manifest.revision,
    'Withdrawn update restores the active revision',
  );
  for (let page = 0; page < manifest.deviceCatalog.pageCount; page++) {
    const part = JSON.parse(
      fs.readFileSync(
        'content-dist/' + manifest.deviceCatalog.path.replace('{page}', page),
        'utf8',
      ),
    );
    assert(part.entries.length <= 8);
    assert.equal(part.revision, manifest.revision);
    for (const entry of part.entries) {
      const bytes = fs.readFileSync('content-dist/' + entry.document.path);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.document.sha256);
    }
  }
  for (const file of [
    'data.js',
    'knowledge-data.js',
    'tribes-data.js',
    'tribal-knowledge-data.js',
    'calendar-data.js',
    'almanac-data.js',
    'native-search.json',
  ])
    assert(!fs.existsSync('public/' + file), 'UI package excludes ' + file);
  console.log(
    'PASS: versioned content, verified on-demand documents, complete offline cache, unchanged update check, corrupted update rollback, staged revision, and 61 device directory pages.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
