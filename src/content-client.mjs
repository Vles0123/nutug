import {
  assertManifest,
  assertSnapshot,
  assertDocument,
  assertCore,
} from '../shared/content-contract.mjs';

export function memoryStore() {
  const values = new Map();
  return {
    persistent: false,
    get: async (key) => values.get(key),
    put: async (key, value) => {
      values.set(key, value);
    },
    putMany: async (entries) => {
      for (const [key, value] of entries) values.set(key, value);
    },
  };
}

export async function browserStore() {
  if (typeof indexedDB === 'undefined') return memoryStore();
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('nutug-content-v2', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('content');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return {
      persistent: true,
      get: (key) =>
        new Promise((resolve, reject) => {
          const request = db.transaction('content').objectStore('content').get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
      put: (key, value) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('content', 'readwrite');
          tx.objectStore('content').put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        }),
      putMany: (entries) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('content', 'readwrite'),
            store = tx.objectStore('content');
          for (const [key, value] of entries) store.put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        }),
    };
  } catch {
    return memoryStore();
  }
}

export class ContentClient {
  constructor({
    manifestUrl,
    store,
    fetcher = globalThis.fetch.bind(globalThis),
    scope = 'library',
  }) {
    this.manifestUrl = manifestUrl;
    this.store = store;
    this.fetcher = fetcher;
    this.scope = scope;
    this.listeners = new Set();
    this.pending = new Map();
    this.active = null;
    this.update = null;
    this.status = {
      checking: false,
      downloading: false,
      progress: 0,
      total: 0,
      offlineReady: false,
      updateReady: false,
      error: false,
    };
    this.subscribe = (listener) => {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    };
    this.getStatus = () => this.status;
  }
  setStatus(change) {
    this.status = { ...this.status, ...change };
    for (const listener of this.listeners) listener();
  }
  key(name) {
    return `${this.manifestUrl}:${this.scope === 'core' ? 'core:' : ''}${name}`;
  }
  url(path) {
    const base = new URL('.', this.manifestUrl),
      url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      throw new Error('Invalid content path');
    return url.href;
  }
  async request(url) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.fetcher(url, {
        cache: 'no-cache',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Content HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
  resourceKey(path) {
    return 'resource:' + this.url(path);
  }
  async resource(path, offline = false, validate = () => {}) {
    const key = this.resourceKey(path);
    const cached = await this.store.get(key);
    if (cached !== undefined) {
      try {
        validate(cached);
        return cached;
      } catch (error) {
        if (offline) throw error;
      }
    }
    if (offline) throw new Error('Content is not cached');
    if (this.pending.has(key)) {
      const value = await this.pending.get(key);
      validate(value);
      return value;
    }
    const operation = (async () => {
      const value = await this.request(this.url(path));
      validate(value);
      await this.store.put(key, value);
      return value;
    })();
    this.pending.set(key, operation);
    try {
      return await operation;
    } finally {
      this.pending.delete(key);
    }
  }
  validateManifest(manifest) {
    return assertManifest(manifest);
  }
  async snapshot(manifest, offline = false) {
    this.validateManifest(manifest);
    if (this.scope === 'core') {
      const core = await this.resource(manifest.core, offline, assertCore);
      return { manifest, core };
    }
    const [core, catalog, search] = await Promise.all([
      this.resource(manifest.core, offline),
      this.resource(manifest.catalog, offline),
      this.resource(manifest.search, offline),
    ]);
    const snapshot = { manifest, core, catalog, search };
    try {
      assertSnapshot(snapshot);
    } catch (error) {
      await this.store.putMany(
        [manifest.core, manifest.catalog, manifest.search].map((path) => [
          this.resourceKey(path),
          undefined,
        ]),
      );
      throw error;
    }
    return snapshot;
  }
  async load() {
    const saved = await this.store.get(this.key('head'));
    if (saved) {
      try {
        this.active = await this.snapshot(saved, true);
        this.setStatus({
          offlineReady: !!(await this.store.get(this.key('offline:' + saved.version))),
        });
        return this.active;
      } catch {}
    }
    const manifest = this.validateManifest(await this.request(this.manifestUrl));
    this.active = await this.snapshot(manifest);
    await this.store.put(this.key('head'), manifest);
    this.setStatus({
      offlineReady: !!(await this.store.get(this.key('offline:' + manifest.version))),
    });
    return this.active;
  }
  async checkForUpdates() {
    if (this.status.checking || this.status.downloading) return;
    this.setStatus({ checking: true, error: false });
    try {
      const manifest = this.validateManifest(await this.request(this.manifestUrl));
      if (manifest.version === this.active?.manifest.version) {
        if (this.update) {
          this.update = null;
          await this.store.put(this.key('head'), manifest);
          this.setStatus({ updateReady: false });
        }
        return false;
      }
      if (manifest.version === this.update?.manifest.version) return true;
      const snapshot = await this.snapshot(manifest);
      if (this.scope === 'core') {
        await this.cacheSnapshot(snapshot);
      } else if (await this.store.get(this.key('keepOffline'))) await this.cacheSnapshot(snapshot);
      else {
        const previous = new Map((this.active?.catalog || []).map((record) => [record.id, record]));
        for (const record of snapshot.catalog) {
          const old = previous.get(record.id);
          if (old && (await this.store.get(this.resourceKey(old.document))) !== undefined)
            await this.document(record);
        }
      }
      await this.store.put(this.key('head'), manifest);
      this.update = snapshot;
      this.setStatus({ updateReady: true });
      return true;
    } catch (error) {
      this.setStatus({ error: true });
      return false;
    } finally {
      this.setStatus({ checking: false, downloading: false });
    }
  }
  async document(record) {
    return this.resource(record.document, false, (value) => assertDocument(value, record.id));
  }
  async cacheSnapshot(snapshot) {
    if (this.scope === 'core') {
      await this.resource(snapshot.manifest.core, false, assertCore);
      await this.store.put(this.key('offline:' + snapshot.manifest.version), true);
      this.setStatus({ progress: 1, total: 1, offlineReady: true });
      return;
    }
    this.setStatus({
      downloading: true,
      progress: 0,
      total: snapshot.catalog.length,
      error: false,
    });
    const pack = await this.resource(snapshot.manifest.offline, false, (value) => {
      for (const record of snapshot.catalog) assertDocument(value?.[record.id], record.id);
    });
    const writes = [];
    for (const [index, record] of snapshot.catalog.entries()) {
      writes.push([this.resourceKey(record.document), pack[record.id]]);
      if (index % 16 === 0) this.setStatus({ progress: index + 1 });
    }
    writes.push([this.key('offline:' + snapshot.manifest.version), true]);
    await this.store.putMany(writes);
    this.setStatus({ progress: snapshot.catalog.length });
    if (snapshot === this.active) this.setStatus({ offlineReady: true });
  }
  async downloadOffline() {
    if (this.status.downloading || this.status.checking) return;
    this.setStatus({ downloading: true, error: false, total: this.active.catalog?.length || 1 });
    try {
      await this.cacheSnapshot(this.active);
      if (this.update) await this.cacheSnapshot(this.update);
      await this.store.put(this.key('keepOffline'), true);
    } catch (error) {
      this.setStatus({ error: true });
      throw error;
    } finally {
      this.setStatus({ downloading: false });
    }
  }
  start() {
    const check = () => this.checkForUpdates();
    globalThis.addEventListener?.('online', check);
    check();
    return () => globalThis.removeEventListener?.('online', check);
  }
}
