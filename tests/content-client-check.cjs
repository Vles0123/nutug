const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const { ContentClient, memoryStore } = await import('../src/content-client.mjs');
  const manifest = JSON.parse(fs.readFileSync('content-dist/manifest.json', 'utf8'));
  const prefix = `releases/${manifest.version}/`;
  let online = true,
    current = manifest,
    fault = null;
  const requests = [];
  const version = (name) => JSON.parse(JSON.stringify(manifest).replaceAll(manifest.version, name));
  const fetcher = async (value) => {
    if (!online) throw new Error('offline');
    const path = new URL(value).pathname.slice(1);
    requests.push(path);
    if (path === 'manifest.json') return new Response(JSON.stringify(current));
    const suffix = path.split('/').slice(2).join('/');
    if (suffix === fault?.path) {
      if (fault.body !== undefined) return new Response(fault.body);
      throw new Error('interrupted download');
    }
    const text = fs.readFileSync('content-dist/' + prefix + suffix, 'utf8');
    return new Response(text.replaceAll(prefix, path.split('/').slice(0, 2).join('/') + '/'));
  };
  const store = memoryStore();
  const create = () =>
    new ContentClient({ manifestUrl: 'https://content.test/manifest.json', store, fetcher });
  const client = create();
  const initial = await client.load();
  assert.equal(initial.catalog.length, 484);
  assert.equal(
    requests.length,
    4,
    'Bootstrap downloads the manifest, core, directory and search index',
  );
  const first = await client.document(initial.catalog[0]);
  const loaded = requests.length;
  await client.document(initial.catalog[0]);
  assert.equal(requests.length, loaded, 'A read article comes from the local cache');
  online = false;
  const reopened = create();
  assert.equal((await reopened.load()).manifest.version, manifest.version);
  assert.equal((await reopened.document(initial.catalog[0])).id, first.id);
  await assert.rejects(() => reopened.document(initial.catalog[90]));
  online = true;
  requests.length = 0;
  assert.equal(await client.checkForUpdates(), false);
  assert.deepEqual(requests, ['manifest.json'], 'An unchanged version only requests the manifest');

  current = version('next');
  fault = { path: 'core.json', body: '{' };
  assert.equal(await client.checkForUpdates(), false);
  assert.equal((await store.get(client.key('head'))).version, manifest.version);
  fault = { path: 'core.json', body: '{}' };
  assert.equal(
    await client.checkForUpdates(),
    false,
    'An unusable JSON document preserves the previous version',
  );
  fault = null;
  assert.equal(
    await client.checkForUpdates(),
    true,
    'The same version can be retried after a failed download',
  );
  assert.equal(
    client.active.manifest.version,
    manifest.version,
    'The current reader keeps its version',
  );
  assert.equal((await store.get(client.key('head'))).version, 'next');
  online = false;
  const updated = create();
  const next = await updated.load();
  assert.equal(next.manifest.version, 'next');
  assert.equal(
    (await updated.document(next.catalog[0])).id,
    first.id,
    'Previously read articles are available after an offline restart',
  );
  await assert.rejects(() => updated.document(next.catalog[90]));
  online = true;
  requests.length = 0;
  assert.equal(await client.checkForUpdates(), true);
  assert.deepEqual(
    requests,
    ['manifest.json'],
    'An already staged version is not downloaded again',
  );

  current = manifest;
  assert.equal(await client.checkForUpdates(), false);
  assert.equal(client.getStatus().updateReady, false);
  assert.equal(
    (await store.get(client.key('head'))).version,
    manifest.version,
    'A withdrawn update restores the active version',
  );

  fault = { path: 'offline.json', body: '{}' };
  await assert.rejects(() => client.downloadOffline());
  assert.equal(
    client.getStatus().offlineReady,
    false,
    'Incomplete downloads do not show offline completion',
  );
  fault = null;
  await client.downloadOffline();
  assert.equal(client.getStatus().offlineReady, true);
  online = false;
  for (const record of initial.catalog)
    assert.equal((await reopened.document(record)).id, record.id);
  online = true;
  current = version('complete-update');
  fault = { path: 'offline.json' };
  assert.equal(
    await client.checkForUpdates(),
    false,
    'A failed full download preserves the previous offline library',
  );
  assert.equal((await store.get(client.key('head'))).version, manifest.version);
  fault = null;
  assert.equal(await client.checkForUpdates(), true);
  online = false;
  const allUpdated = create();
  const complete = await allUpdated.load();
  assert.equal(complete.manifest.version, 'complete-update');
  for (const record of complete.catalog)
    assert.equal((await allUpdated.document(record)).id, record.id);
  await assert.rejects(() => allUpdated.resource('https://outside.test/data.json'));

  online = true;
  current = version('bad-document');
  const partialStore = memoryStore();
  const partial = new ContentClient({
    manifestUrl: client.manifestUrl,
    store: partialStore,
    fetcher,
  });
  const partialSnapshot = await partial.load();
  const record = partialSnapshot.catalog[0];
  fault = { path: record.document.split('/').slice(2).join('/'), body: '{}' };
  await assert.rejects(() => partial.document(record));
  fault = null;
  assert.equal(
    (await partial.document(record)).id,
    record.id,
    'A failed article request can be retried',
  );
  current = version('failed-read-update');
  fault = { path: record.document.split('/').slice(2).join('/') };
  assert.equal(await partial.checkForUpdates(), false);
  assert.equal((await partialStore.get(partial.key('head'))).version, 'bad-document');

  current = manifest;
  fault = null;
  requests.length = 0;
  const coreStore = memoryStore();
  const coreClient = new ContentClient({
    manifestUrl: client.manifestUrl,
    store: coreStore,
    fetcher,
    scope: 'core',
  });
  const coreSnapshot = await coreClient.load();
  assert.equal(requests.length, 2, 'History loads only the manifest and core');
  const reviewedEventIds = JSON.parse(fs.readFileSync('docs/history-source-review.json', 'utf8'))
    .events.map((event) => event.id)
    .sort();
  assert.deepEqual(
    coreSnapshot.core.events.map((event) => event.id).sort(),
    reviewedEventIds,
    'The history feed includes the full reviewed chronology',
  );
  await coreClient.downloadOffline();
  online = false;
  const offlineCore = new ContentClient({
    manifestUrl: client.manifestUrl,
    store: coreStore,
    fetcher,
    scope: 'core',
  });
  assert.deepEqual(
    (await offlineCore.load()).core.events.map((event) => event.id).sort(),
    reviewedEventIds,
    'Offline history retains the complete chronology',
  );
  online = true;
  current = version('core-update');
  assert.equal(await coreClient.checkForUpdates(), true);
  assert.equal(coreClient.active.manifest.version, manifest.version);
  assert.equal(coreClient.update.manifest.version, 'core-update');
  const deviceIds = [];
  for (let page = 0; page < manifest.deviceCatalog.pageCount; page++) {
    const part = JSON.parse(
      fs.readFileSync(
        'content-dist/' + manifest.deviceCatalog.path.replace('{page}', page),
        'utf8',
      ),
    );
    assert(part.entries.length <= 8);
    assert.equal(part.version, manifest.version);
    for (const entry of part.entries) {
      const doc = JSON.parse(fs.readFileSync('content-dist/' + entry.document, 'utf8'));
      assert.equal(doc.id, entry.id);
      deviceIds.push(entry.id);
    }
  }
  assert.deepEqual(
    deviceIds,
    initial.catalog.map((record) => record.id),
    'Device pages cover the complete ordered catalog',
  );
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
    'PASS: version-only updates, cached reading, complete offline library, failed-download retries, staged updates, fallback and 61 device catalog pages.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
