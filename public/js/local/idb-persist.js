// The farm's save in the browser (GitHub Pages build): the same interface server/persist.js gives the engine and
// the scheduler, kept in IndexedDB instead of files.
//
//   store 'kv'       'snapshot' -> { schema, savedAt, version, state, server }  (the newest snapshot)
//   store 'journal'  one record per accepted action (keyPath v) with v > snapshot.version
//
// Every accepted action is journaled (put, fire-and-forget) before its delta goes out, so a closed tab loses at most
// the writes IndexedDB had not committed; snapshots come every cfg.snapshotMs and when the page is hidden.
// open() must resolve before the farm is loaded: load() is synchronous, as the server's is.

const DB_NAME = 'mnkiswan-meadow.farm';
const DB_VERSION = 1;

function req(r) {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

export class IdbPersist {
  constructor({ log = console, name = DB_NAME } = {}) {
    this.log = log;
    this.name = name;
    this.db = null;
    this.loaded = { snapshot: null, lines: [] };
    this.saving = null;
    this.again = null;
    this.stats = { lastSaveAt: null, lastSaveV: null, lastBackupAt: null, lastError: null, journaled: 0,
      timing: { n: 0, lastCutMs: null, maxCutMs: 0, lastWriteMs: null, maxWriteMs: 0, bytes: 0 } };
  }

  /** Open the database and read the save into memory (await before load()). */
  async open() {
    const r = indexedDB.open(this.name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('journal')) db.createObjectStore('journal', { keyPath: 'v' });
    };
    this.db = await req(r);
    const tx = this.db.transaction(['kv', 'journal'], 'readonly');
    const snapshot = await req(tx.objectStore('kv').get('snapshot'));
    const lines = await req(tx.objectStore('journal').getAll());
    const from = snapshot && Number.isSafeInteger(snapshot.version) ? snapshot.version : 0;
    this.loaded = { snapshot: snapshot || null, lines: lines.filter((l) => l.v > from).sort((a, b) => a.v - b.v) };
    return this;
  }

  load() {
    const { snapshot, lines } = this.loaded;
    return { snapshot, lines: [...lines], warnings: [], source: snapshot ? 'snapshot' : 'none' };
  }

  quarantine(tag, info) {
    this.log.error(`save: ${tag}`, info);
    return `indexedDB:${this.name}`;
  }

  incident(name, data) { this.log.warn(`save incident ${name}`, data); }
  preMigrate() { return `indexedDB:${this.name}`; }
  adoptInherited() {}
  openJournal() {}
  syncTick() {}

  discardJournals() {
    if (!this.db) return;
    try { this.db.transaction('journal', 'readwrite').objectStore('journal').clear(); } catch (err) { this.log.warn('journal clear failed', err); }
  }

  /** One accepted action (synchronous for the engine; the IndexedDB write commits on its own). */
  append(line) {
    if (!this.db) return;
    this.db.transaction('journal', 'readwrite').objectStore('journal').put(structuredClone(line));
    this.stats.journaled++;
  }

  snapshot(getCut) {
    if (this.saving) { this.again = getCut; return this.saving; }
    this.saving = (async () => {
      try {
        let cut = getCut;
        while (cut) {
          this.again = null;
          await this.snapshotOnce(cut());
          cut = this.again;
        }
      } catch (err) {
        this.stats.lastError = String(err && err.message || err);
        throw err;
      } finally {
        this.saving = null;
      }
    })();
    return this.saving;
  }

  /** Write the cut now: its JSON is taken synchronously (the state keeps changing after this call). */
  snapshotOnce({ state, server, version }) {
    const t0 = performance.now();
    const json = JSON.stringify({ schema: state.schema, savedAt: Date.now(), version, state, server });
    const snap = JSON.parse(json);
    const cutMs = performance.now() - t0;
    if (!this.db) return Promise.resolve();
    const tx = this.db.transaction(['kv', 'journal'], 'readwrite');
    tx.objectStore('kv').put(snap, 'snapshot');
    tx.objectStore('journal').delete(IDBKeyRange.upperBound(version));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        const tm = this.stats.timing;
        tm.n++; tm.lastCutMs = cutMs; tm.maxCutMs = Math.max(tm.maxCutMs, cutMs); tm.bytes = json.length;
        this.stats.lastSaveAt = Date.now();
        this.stats.lastSaveV = version;
        this.stats.lastError = null;
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('save aborted'));
    });
  }

  close() {}

  /** Wipe the farm (Settings > start over in the static build). */
  async wipe() {
    if (!this.db) return;
    const tx = this.db.transaction(['kv', 'journal'], 'readwrite');
    tx.objectStore('kv').clear();
    tx.objectStore('journal').clear();
    await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; tx.onabort = r; });
  }
}
