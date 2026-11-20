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

/**
 * Opens a store page and tells whether it is behind a bot check. Never gets around one:
 *  - HTTP 429 (rate limit): waits as long as the site asks (Retry-After, at most 60 s), then tries once more;
 *  - headed (a visible window): a person passes the check in the window; waits for that up to `waitMs`.
 * → { blocked, status, title, reason: 'rate-limit' | 'bot-check' | null }
 */
async function openPage(page, url, { headed = false, waitMs = 180000, say = () => {} } = {}) {
  const M = require('./mirror');
  let last = { status: 0, retryAfter: null };
  const onResponse = (r) => {
    try {
      if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) last = { status: r.status(), retryAfter: r.headers()['retry-after'] || null };
    } catch (e) { /* a detached frame */ }
  };
  page.on('response', onResponse);
  const load = async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  };
  const state = async () => ({ status: last.status, title: await page.title().catch(() => ''),
    text: await page.evaluate(() => (document.body ? document.body.innerText : '').slice(0, 3000)).catch(() => '') });
  try {
    await load();
    let s = await state();
    if (M.isBlocked(s) && s.status === 429) {
      const wait = Math.min(60, Number(last.retryAfter) || 20);
      say(`rate limited (HTTP 429): waiting ${wait} s as the site asks, then one more try`);
      await page.waitForTimeout(wait * 1000);
      await load();
      s = await state();
    }
    if (M.isBlocked(s) && headed) {
      say('a bot check is open in the browser window: pass it yourself there (waiting up to ' + Math.round(waitMs / 60000) + ' min)');
      const end = Date.now() + waitMs;
      while (Date.now() < end && M.isBlocked(s)) { await page.waitForTimeout(1000); s = await state(); }
      if (!M.isBlocked(s)) await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    }
    const blocked = M.isBlocked(s);
    return { blocked, status: s.status, title: s.title, reason: blocked ? (s.status === 429 ? 'rate-limit' : 'bot-check') : null };
  } finally {
    page.off('response', onResponse);
  }
}

/** What to tell the user about a blocked page. */
function blockedHint(r, tool) {
  if (r.reason === 'rate-limit') return `the site rate-limits this computer (HTTP 429): try again in a few minutes`;
  return `bot check (HTTP ${r.status || '?'}${r.title ? ` "${r.title}"` : ''}): run again with --headed and pass the check yourself `
    + `in the window that opens, or send screenshots of the page (${tool} never gets around a bot check)`;
}

module.exports = { UA, UA_M, settle, clearPopups, injectMirror, openPage, blockedHint };
