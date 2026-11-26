// The farm's server, run inside the page (GitHub Pages build: no Node server there). It is the real server code
// (server/engine.js, sessions.js, router.js, presence.js, together.js, scheduler.js, migrations.js) wired as
// server/app.js openFarm() wires it, with the save in IndexedDB (idb-persist.js) and an in-page socket pair
// instead of the `ws` server. The game client is unchanged: it opens what it thinks is a WebSocket and talks the
// same protocol.
//
//   const hh = await openLocalFarm()
//   installLocalNet(hh)      globalThis.WebSocket -> LocalWebSocket; fetch('/api/...') answered here
import { Engine } from '../../../server/engine.js';
import { Sessions } from '../../../server/sessions.js';
import { Presence } from '../../../server/presence.js';
import { Together } from '../../../server/together.js';
import { Scheduler } from '../../../server/scheduler.js';
import { ServerClock } from '../../../server/clock.js';
import { handleMessage } from '../../../server/router.js';
import { migrate, backfill, backfillStarter, CURRENT } from '../../../server/migrations.js';
import { createFarm, validateState, DEFAULT_TZ } from '../../../shared/rules/state.js';
import { isTimeZone } from '../../../shared/rules/calendar.js';
import { spawnAt } from '../../../shared/rules/grid.js';
import { CONTENT_HASH } from '../../../shared/content/index.js';
import { RULES_VERSION } from '../../../shared/rules/index.js';
import { LIMITS, CLOSE, PROTOCOL_VERSION, parseClientMessage } from '../../../shared/net/protocol.js';
import { IdbPersist } from './idb-persist.js';

export const LOCAL_VERSION = '0.1.0';

const quietLog = {
  info: (...a) => console.info('[farm]', ...a),
  warn: (...a) => console.warn('[farm]', ...a),
  error: (...a) => console.error('[farm]', ...a),
  debug: () => {},
};

function machineTz() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isTimeZone(tz) ? tz : DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

/** server/app.js loadFarm(), without files: the snapshot + journal from IndexedDB, migrated and replayed. */
function loadFarm(persist, { log, tz }) {
  const { snapshot, lines } = persist.load();
  let state;
  let server;
  if (snapshot) {
    state = migrate(snapshot.state, { log });
    server = snapshot.server || {};
    if (Number.isSafeInteger(snapshot.state.schema) && snapshot.state.schema < CURRENT) log.warn(`save migrated to schema ${CURRENT}`);
  } else {
    const seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
    state = createFarm(seed, Date.now(), tz);
    log.info('a new farm was created');
  }
  server = { clock: { lastNow: 0, devOffset: 0 }, clients: {}, auth: {}, ...server };
  const clock = new ServerClock(server.clock, { dev: false, log });
  if (snapshot) backfill(state, { now: clock.now(), tz });
  const engine = new Engine({ state, server, clock, dev: false, log });
  let replayed = 0;
  let togetherPaidMin = 0;
  for (const line of lines) {
    try {
      engine.replay(line);
      replayed++;
      const min = line.ext && line.ext.togetherMin;
      if (Number.isSafeInteger(min) && min > 0) togetherPaidMin += min;
    } catch (err) {
      log.error(`replay stopped at v${engine.v}: ${err.message}; ${lines.length - replayed} line(s) dropped`);
      persist.discardJournals();
      break;
    }
  }
  if (snapshot) backfillStarter(state, { now: clock.now() });
  state.meta.contentHash = CONTENT_HASH;
  if (!snapshot || typeof state.meta.tz !== 'string') state.meta.tz = tz;
  const problems = validateState(state, { now: clock.now() });
  if (problems.length) log.error(`loaded state has ${problems.length} problem(s)`, problems);
  return { state, server, clock, engine, replayed, togetherPaidMin };
}

/** Open the farm in the page (server/app.js openFarm() for one local farm). */
export async function openLocalFarm({ log = quietLog, build = null } = {}) {
  const persist = await new IdbPersist({ log }).open();
  const tz = machineTz();
  const cfg = { mode: 'single', dev: false, tz, tzExplicit: false, replayAnyway: false, passphrase: null, slots: 2,
    snapshotMs: 15_000, version: LOCAL_VERSION, heartbeatMs: undefined, anonIdleMs: undefined, awayGraceMs: undefined };
  const { engine, clock, replayed, server: sidecar, togetherPaidMin } = loadFarm(persist, { log, tz });
  engine.journal = persist;
  engine.incident = (name, data) => persist.incident(name, data);
  const hh = { cfg, log, persist, engine, clock, parse: parseClientMessage, startedAt: Date.now(), perf: null };
  hh.static = { build };
  hh.presence = new Presence(clock, (msg) => hh.sessions.presenceOut(msg), { spawnOf: (pid) => spawnAt(engine.state, pid) });
  const saved = sidecar.live && sidecar.live.together;
  const savedAcc = saved && Number.isSafeInteger(saved.acc) ? saved.acc : 0;
  hh.together = new Together({ online: () => hh.sessions.onlinePids(), poses: () => hh.presence.p,
    acc: Math.max(0, savedAcc - togetherPaidMin * 60_000) });
  hh.sessions = new Sessions({ engine, clock, presence: hh.presence, together: hh.together, cfg, log,
    save: () => hh.scheduler.save(), build, perf: null });
  hh.scheduler = new Scheduler({ engine, persist, clock, cfg, log, perf: null,
    live: () => ({ online: hh.sessions.onlinePids().sort(), together: hh.together.snapshot(clock.now()) }) });
  engine.facts = hh.together;
  engine.onDelta = (d) => hh.sessions.broadcast(d);
  engine.onCommit = () => hh.scheduler.requestArm();
  if (replayed) log.info(`replayed ${replayed} action(s); farm at v${engine.v}`);
  hh.sessions.awayAtBoot();
  hh.scheduler.start();
  await hh.scheduler.save();
  hh.presence.start();
  hh.sessions.startHeartbeat();
  // a hidden page may never come back (a closed tab, a phone that kills it): save now
  const saveNow = () => { hh.scheduler.save(); };
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
  addEventListener('pagehide', saveNow);
  return hh;
}

/** The /api/status body (server/http.js status()). */
export function status(hh) {
  const ps = hh.persist.stats;
  return {
    ok: !hh.engine.degraded && !ps.lastError, degraded: hh.engine.degraded, version: hh.cfg.version,
    proto: PROTOCOL_VERSION, rules: RULES_VERSION, contentHash: CONTENT_HASH, buildHash: hh.static.build, assets: null,
    schema: hh.engine.state.schema, v: hh.engine.v, serverNow: hh.clock.now(), startedAt: hh.startedAt,
    uptimeS: Math.floor((Date.now() - hh.startedAt) / 1000), tz: hh.engine.state.meta.tz, dev: false,
    slots: hh.sessions.slotList(), online: hh.sessions.onlinePids().sort(), connections: hh.sessions.conns.size,
    save: { lastAt: ps.lastSaveAt, lastV: ps.lastSaveV, lastBackupAt: null, lastError: ps.lastError, journaled: ps.journaled },
    nextSystemDueAt: hh.scheduler.dueAt, perf: null, local: true,
  };
}

const later = (fn) => setTimeout(fn, 0);

/** The server's end of an in-page socket: what Sessions, Outbox and the router expect of a `ws` socket. */
class ServerEnd {
  constructor(client) {
    this.client = client;
    this.readyState = 1;
    this.bufferedAmount = 0;
    this.conn = null;
    this.onclose = null;
  }

  send(s) {
    if (this.readyState !== 1) return;
    later(() => this.client._receive(String(s)));
  }

  ping() { if (this.conn) this.conn.missed = 0; }

  close(code = 1000, reason = '') {
    if (this.readyState >= 2) return;
    this.readyState = 3;
    later(() => { this.client._closed(code, reason); this.onclose?.(); });
  }

  terminate() { this.close(1006, ''); }
}

/** The page's end: a drop-in for the browser's WebSocket for the game's own socket (net/socket.js). */
export function makeLocalWebSocket(hh, Native) {
  return class LocalWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url, protocols) {
      if (!/\/ws(\?|$)/.test(String(url))) return new Native(url, protocols);   // anything else is a real socket
      this.url = String(url);
      this.readyState = 0;
      this.bufferedAmount = 0;
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
      this.peer = new ServerEnd(this);
      later(() => {
        if (this.readyState !== 0) return;
        const conn = hh.sessions.open(this.peer, 'local');
        if (!conn) return;
        this.peer.conn = conn;
        this.peer.onclose = () => hh.sessions.close(conn);
        this.readyState = 1;
        this.onopen?.({ type: 'open' });
      });
    }

    send(data) {
      if (this.readyState !== 1) return;
      const raw = String(data);
      later(() => { if (this.peer.conn && this.peer.readyState === 1) handleMessage(hh, this.peer.conn, raw); });
    }

    close(code = 1000, reason = '') {
      if (this.readyState >= 2) return;
      this.readyState = 2;
      const conn = this.peer.conn;
      this.peer.readyState = 3;
      later(() => {
        if (conn) hh.sessions.close(conn);
        this._closed(code, reason);
      });
    }

    _receive(s) { if (this.readyState === 1) this.onmessage?.({ data: s, type: 'message' }); }

    _closed(code, reason) {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.onclose?.({ code, reason, wasClean: code === 1000, type: 'close' });
    }

    addEventListener(type, fn) { this[`on${type}`] = fn; }
    removeEventListener() {}
  };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Route this page's sockets and its /api calls to the in-page farm. */
export function installLocalNet(hh) {
  const Native = globalThis.WebSocket;
  globalThis.WebSocket = makeLocalWebSocket(hh, Native);
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    let u;
    try { u = new URL(typeof input === 'string' ? input : input.url, location.href); } catch { return nativeFetch(input, init); }
    if (u.origin !== location.origin || !u.pathname.startsWith('/api/')) return nativeFetch(input, init);
    if (u.pathname === '/api/status') return Promise.resolve(json(status(hh)));
    // the in-game AI helper, ideas box, star count and the rest need the real server: "not here"
    return Promise.resolve(json({ error: 'not available in the browser edition' }, 404));
  };
}

export { CLOSE, LIMITS };
