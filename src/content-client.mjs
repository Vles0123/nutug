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
      const request = indexedDB.open('nutug-content-v1', 1);
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

export async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export class ContentClient {
  constructor({ manifestUrl, store, fetcher = globalThis.fetch.bind(globalThis) }) {
    this.manifestUrl = manifestUrl;
    this.store = store;
    this.fetcher = fetcher;
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
    return `${this.manifestUrl}:${name}`;
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
      const bytes = await response.arrayBuffer();
      return {
        arrayBuffer: async () => bytes,
        json: async () => JSON.parse(new TextDecoder().decode(bytes)),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  descriptor(value) {
    if (
      !value ||
      !/^[a-f0-9]{64}$/.test(value.sha256) ||
      !Number.isSafeInteger(value.bytes) ||
      value.bytes <= 0 ||
      value.bytes > 32 * 1024 * 1024
    )
      throw new Error('Invalid content descriptor');
    this.url(value.path);
    return value;
  }
  async object(descriptor, offline = false) {
    this.descriptor(descriptor);
    const key = 'object:' + descriptor.sha256;
    const cached = await this.store.get(key);
    if (
      cached &&
      cached.byteLength === descriptor.bytes &&
      (await sha256(cached)) === descriptor.sha256
    )
      return JSON.parse(new TextDecoder().decode(cached));
    if (offline) throw new Error('Content is not cached');
    if (this.pending.has(key)) return this.pending.get(key);
    const operation = (async () => {
      const bytes = await (await this.request(this.url(descriptor.path))).arrayBuffer();
      if (bytes.byteLength !== descriptor.bytes || (await sha256(bytes)) !== descriptor.sha256)
        throw new Error('Content integrity mismatch');
      const value = JSON.parse(new TextDecoder().decode(bytes));
      await this.store.put(key, bytes);
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
    if (manifest?.schemaVersion !== 1 || !/^[a-f0-9]{24}$/.test(manifest.revision))
      throw new Error('Unsupported content manifest');
    for (const key of ['core', 'catalog', 'search', 'offline']) this.descriptor(manifest[key]);
    return manifest;
  }
  async snapshot(manifest, offline = false) {
    this.validateManifest(manifest);
    const [core, catalog, search] = await Promise.all([
      this.object(manifest.core, offline),
      this.object(manifest.catalog, offline),
      this.object(manifest.search, offline),
    ]);
    if (
      !core.people ||
      !core.knowledge?.ui ||
      !Array.isArray(catalog) ||
      catalog.length !== manifest.counts.entries ||
      new Set(catalog.map((a) => a.id)).size !== catalog.length
    )
      throw new Error('Invalid content snapshot');
    for (const record of catalog) {
      if (!record.id || !record.title) throw new Error('Invalid catalog entry');
      this.descriptor(record.document);
    }
    return { manifest, core, catalog, search };
  }
  async load() {
    const saved = await this.store.get(this.key('head'));
    if (saved) {
      try {
        this.active = await this.snapshot(saved, true);
        this.setStatus({ offlineReady: !!(await this.store.get('offline:' + saved.revision)) });
        return this.active;
      } catch {}
    }
    const manifest = this.validateManifest(await (await this.request(this.manifestUrl)).json());
    this.active = await this.snapshot(manifest);
    await this.store.put(this.key('head'), manifest);
    this.setStatus({ offlineReady: !!(await this.store.get('offline:' + manifest.revision)) });
    return this.active;
  }
  async checkForUpdates() {
    if (this.status.checking || this.status.downloading) return;
    this.setStatus({ checking: true, error: false });
    try {
      const manifest = this.validateManifest(await (await this.request(this.manifestUrl)).json());
      if (manifest.revision === this.active?.manifest.revision) {
        if (this.update) {
          this.update = null;
          await this.store.put(this.key('head'), manifest);
          this.setStatus({ updateReady: false });
        }
        return false;
      }
      const snapshot = await this.snapshot(manifest);
      if (await this.store.get(this.key('keepOffline'))) await this.cacheSnapshot(snapshot);
      else {
        const previous = new Map((this.active?.catalog || []).map((record) => [record.id, record]));
        for (const record of snapshot.catalog) {
          const old = previous.get(record.id);
          if (
            old &&
            old.document.sha256 !== record.document.sha256 &&
            (await this.store.get('object:' + old.document.sha256))
          )
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
    const value = await this.object(record.document);
    if (value.id !== record.id || !Array.isArray(value.paragraphs) || !Array.isArray(value.sources))
      throw new Error('Invalid article document');
    return value;
  }
  async cacheSnapshot(snapshot) {
    const pack = await this.object(snapshot.manifest.offline),
      writes = [];
    this.setStatus({
      downloading: true,
      progress: 0,
      total: snapshot.catalog.length,
      error: false,
    });
    for (const [index, record] of snapshot.catalog.entries()) {
      const item = pack[record.id];
      if (
        !item ||
        item.descriptor.sha256 !== record.document.sha256 ||
        item.document.id !== record.id
      )
        throw new Error('Offline content mismatch');
      const bytes = new TextEncoder().encode(JSON.stringify(item.document) + '\n');
      if ((await sha256(bytes)) !== record.document.sha256)
        throw new Error('Offline content integrity mismatch');
      writes.push(['object:' + record.document.sha256, bytes.buffer]);
      if (index % 16 === 0) this.setStatus({ progress: index + 1 });
    }
    writes.push(['offline:' + snapshot.manifest.revision, true]);
    await this.store.putMany(writes);
    this.setStatus({ progress: snapshot.catalog.length, offlineReady: true });
  }
  async downloadOffline() {
    if (this.status.downloading || this.status.checking) return;
    this.setStatus({ downloading: true, error: false, total: this.active.catalog.length });
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
