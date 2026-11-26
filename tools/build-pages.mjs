#!/usr/bin/env node
// Build the static GitHub Pages edition of MNKISWAN Meadow into dist-pages/ (or OUT).
//
//   BASE=https://mnkiswan.github.io/mnkiswan-meadow node tools/build-pages.mjs
//
// There is no Node server on GitHub Pages, so the farm's server code runs inside the page (public/js/local/): the
// page's entry is js/local/boot.js instead of js/main.js, and the import map sends `node:crypto` and
// `node:perf_hooks` to small browser stand-ins. Everything else is the server's own "host variant" of the game page
// (server/static.js indexHtml with a base): every module, stylesheet and asset is named under BASE, with the repo's
// layout there (BASE/public, BASE/shared, BASE/server, BASE/vendor/three).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StaticFiles, MOUNTS, packSpecs } from '../server/static.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.BASE || 'https://mnkiswan.github.io/mnkiswan-meadow').replace(/\/+$/, '');
const OUT = path.resolve(ROOT, process.env.OUT || 'dist-pages');
const PAGE = 'pages.html';

MOUNTS.unshift(['/server/', 'server/']);

const rel = (u) => u.replace(/^\//, '');
function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
function copyDir(from, to, skip = () => false) {
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (skip(a, e)) continue;
    if (e.isDirectory()) copyDir(a, b, skip);
    else copyFile(a, b);
  }
}

// 1. the game page with the in-page farm as its entry
const src = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
let page = src.replace(/(<script\b[^>]*type="module"[^>]*src=")\/js\/main\.js(")/, '$1/js/local/boot.js$2');
if (page === src) throw new Error('index.html: the /js/main.js entry was not found');
page = page.replace(/("imports"\s*:\s*\{)/, `$1\n      "node:crypto": "/js/local/shim-crypto.js",\n      "node:perf_hooks": "/js/local/shim-perf-hooks.js",`);
const pagePath = path.join(ROOT, 'public', PAGE);
fs.writeFileSync(pagePath, page);
let html;
const sf = new StaticFiles({ root: ROOT, log: console });
try {
  sf.gamePage = PAGE;
  html = sf.indexHtml(PAGE, BASE).body.toString('utf8');
} finally {
  fs.rmSync(pagePath, { force: true });
}

// 2. the page as a static file: no fall-back watchdog (there is no "this server" to fall back to), and the icons and
//    the manifest under the base too
html = html.replace(/\n?\s*<script>\(function\(\)\{var B=[\s\S]*?\}\)\(\);<\/script>/, '');
html = html.replace(/<link\b[^>]*\brel=["'](manifest|icon|apple-touch-icon|shortcut icon)["'][^>]*>/gi,
  (tag) => tag.replace(/\bhref=(["'])\/(?!\/)([^"']*)\1/, (_all, q, u) => `href=${q}${BASE}/public/${u.split('?')[0]}${q}`));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

// 3. the files: public/ and shared/ whole; the server modules and three.js files the page's graph names
copyDir(path.join(ROOT, 'public'), path.join(OUT, 'public'), (a) => a === pagePath);
copyDir(path.join(ROOT, 'shared'), path.join(OUT, 'shared'));
const map = JSON.parse(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/.exec(html)[1]);
let named = 0;
for (const u of Object.values(map.imports)) {
  if (!u.startsWith(BASE) || u.endsWith('/')) continue;         // a prefix entry (three/addons/): its files are named too
  const p = u.slice(BASE.length).split('?')[0];
  if (p.startsWith('/server/')) copyFile(path.join(ROOT, rel(p)), path.join(OUT, rel(p)));
  else if (p.startsWith('/vendor/three/')) copyFile(path.join(ROOT, 'node_modules/three', p.slice('/vendor/three/'.length)), path.join(OUT, rel(p)));
  named++;
}

// 4. the asset packs (the server builds them on request): one .bin per family and the index, under BASE/public
const packs = sf.packIndex().index;
for (const id of Object.keys(packs)) {
  const body = sf.packBody(id, null);
  if (body) {
    fs.mkdirSync(path.join(OUT, 'public/assets/packs'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'public/assets/packs', `${id}.bin`), body.body);
  }
}
fs.mkdirSync(path.join(OUT, 'public/assets/packs'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'public/assets/packs/index.json'), JSON.stringify(packs));
void packSpecs;

// 5. the web app manifests: start at this page, icons under the base
for (const name of ['manifest.webmanifest', 'manifest.pl.webmanifest']) {
  const f = path.join(OUT, 'public', name);
  if (!fs.existsSync(f)) continue;
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  m.start_url = `${BASE}/`;
  m.scope = `${BASE}/`;
  if (m.id) m.id = `${BASE}/`;
  for (const i of m.icons || []) if (typeof i.src === 'string' && i.src.startsWith('/')) i.src = `${BASE}/public${i.src}`;
  fs.writeFileSync(f, JSON.stringify(m, null, 2));
}

// 6. the privacy page at BASE/privacy/ (the game links /privacy)
for (const p of ['privacy.html']) {
  const f = path.join(ROOT, 'public', p);
  if (!fs.existsSync(f)) continue;
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace(/\b(href|src)=(["'])\/(?!\/)([^"']*)\2/g, (_all, a, q, u) => `${a}=${q}${BASE}/public/${u}${q}`);
  fs.mkdirSync(path.join(OUT, 'privacy'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'privacy', 'index.html'), h);
}

let bytes = 0;
let files = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const a = path.join(d, e.name);
    if (e.isDirectory()) walk(a); else { files++; bytes += fs.statSync(a).size; }
  }
})(OUT);
console.log(`built ${OUT}: ${files} files, ${(bytes / 1048576).toFixed(1)} MB, ${named} modules in the import map, base ${BASE}`);
