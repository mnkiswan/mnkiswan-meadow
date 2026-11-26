#!/usr/bin/env node
// Render the MNKISWAN Meadow wordmarks (tools/brand/logo.html) into public/assets/art and public/assets/landing.
//   CHROME=<path to chrome or edge> node tools/brand/render-logos.mjs
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
const page_ = pathToFileURL(path.join(ROOT, 'tools/brand/logo.html')).href;
const art = (n) => path.join(ROOT, 'public/assets/art', n);
const landing = (n) => path.join(ROOT, 'public/assets/landing', n);

const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] });
try {
  const page = await browser.newPage();
  for (const [layout, w, h, outs] of [
    ['stack', 1200, 538, [[art('logo.png'), 1, 'png'], [art('logo.webp'), 1, 'webp']]],
    ['wide', 1400, 336, [[art('logo-wide.png'), 1, 'png'], [art('logo-wide.webp'), 1, 'webp'],
      [landing('logo-wide_1120.webp'), 1120 / 1400, 'webp'], [landing('logo-wide_880.webp'), 880 / 1400, 'webp'],
      [landing('logo-wide_560.webp'), 560 / 1400, 'webp']]],
  ]) {
    for (const [out, scale, type] of outs) {
      await page.setViewport({ width: w, height: h, deviceScaleFactor: scale });
      await page.goto(`${page_}?layout=${layout}`);
      await page.waitForFunction(() => document.title === 'ready');
      await page.screenshot({ path: out, type, omitBackground: true, ...(type === 'webp' ? { quality: 92 } : {}) });
      console.log('wrote', path.relative(ROOT, out));
    }
  }
} finally {
  await browser.close();
}
