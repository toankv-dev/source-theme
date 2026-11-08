/*
 * Playwright page helpers shared by capture.js and download-page.js.
 *
 *   UA, UA_M                 desktop Chrome / iPhone Safari user agents
 *   settle(page)             waits, scrolls the whole page (lazy images load), back to the top
 *   clearPopups(page, keep)  closes newsletter / cookie pop-ups (Escape, hides big fixed layers) unless keep
 *   injectMirror(page)       makes tools/lib/mirror.js available in the page as window.__mirror
 */
'use strict';
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function settle(page) {
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}

// Closes newsletter / cookie pop-ups: Escape, then hides fixed layers covering most of the screen.
async function clearPopups(page, keep) {
  if (keep) return;
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    document.querySelectorAll('body *').forEach((el) => {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed' && s.position !== 'sticky') return;
      const r = el.getBoundingClientRect();
      const big = r.width * r.height > vw * vh * 0.35;
      const z = parseInt(s.zIndex, 10) || 0;
      const isChrome = /header|announcement|topbar|nav/i.test(el.className + ' ' + el.id + ' ' + el.tagName);
      if (big && z > 10 && !isChrome) el.style.setProperty('display', 'none', 'important');
    });
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
  });
}

let mirrorSource = null;
// page.evaluate runs outside the page's CSP, so this works on stores that forbid inline scripts.
async function injectMirror(page) {
  if (!mirrorSource) {
    const src = fs.readFileSync(path.join(__dirname, 'mirror.js'), 'utf8');
    mirrorSource = '(() => { const module = { exports: {} }; ' + src + '\n; window.__mirror = module.exports; })()';
  }
  await page.evaluate(mirrorSource);
}

module.exports = { UA, UA_M, settle, clearPopups, injectMirror };
