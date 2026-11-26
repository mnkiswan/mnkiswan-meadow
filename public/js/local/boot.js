// Entry of the GitHub Pages build (tools/build-pages.mjs renders index.html with this instead of main.js):
// open the farm in this page (host.js), point the game's socket and /api calls at it, then start the game as usual.
import { openLocalFarm, installLocalNet } from './host.js';

// Node timers the server modules use (server/outbox.js)
if (typeof globalThis.setImmediate !== 'function') {
  globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
  globalThis.clearImmediate = (t) => clearTimeout(t);
}

const build = document.querySelector('meta[name="hh-build"]')?.getAttribute('content') || null;

function blocked(text) {
  const el = document.createElement('div');
  el.setAttribute('role', 'alert');
  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;'
    + 'background:#f6efe1;color:#3b2f22;font:600 18px/1.5 system-ui,sans-serif;text-align:center;z-index:99999';
  el.textContent = text;
  document.body.appendChild(el);
}

async function start() {
  const hh = await openLocalFarm({ build });
  installLocalNet(hh);
  window.__meadow = { hh };
  await import('../main.js');
}

// One tab plays the farm at a time: two tabs would each run the farm and overwrite each other's save.
if (navigator.locks?.request) {
  navigator.locks.request('mnkiswan-meadow.farm', { ifAvailable: true }, async (lock) => {
    if (!lock) {
      blocked('MNKISWAN Meadow is already open in another tab. Close it there (or switch to that tab) to play here.');
      return;
    }
    await start();
    await new Promise(() => {});        // hold the lock while this tab lives
  }).catch((err) => { console.error(err); blocked('The farm could not start in this browser.'); });
} else {
  start().catch((err) => { console.error(err); blocked('The farm could not start in this browser.'); });
}
