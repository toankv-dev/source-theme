/*
 * Downloads the pictures and videos of one page (tools/media-grab.js, tools/section-grab.js): image/* and video/* only,
 * at most maxBytes each, the page as Referer, the store's cookies from the browser (a bot check a person passed with
 * --headed), and a slower second and third try when a CDN refuses a burst (403 / 408 / 429 / 5xx).
 *
 *   const F = createFetcher({ referer, maxBytes, ua });  F.setCookies(cookies)
 *   await F.fetchFile(url, dest) → { bytes, type } | { tooBig } | { error, status }
 *   await F.fetchText(url, accept) → text | null
 *   await F.download(items, (item) => dest) → sets item.result; retries what a CDN refused
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
  svg: 'image/svg+xml', mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const RETRY = new Set([403, 408, 429, 500, 502, 503, 504]);

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k]); } }));
}

function createFetcher({ referer, maxBytes = 300 * 1048576, ua }) {
  let cookies = [];
  const cookieHeader = (u) => {
    let host;
    try { host = new URL(u).hostname; } catch (e) { return {}; }
    const jar = cookies.filter((c) => { const d = String(c.domain || '').replace(/^\./, ''); return host === d || host.endsWith('.' + d); });
    return jar.length ? { Cookie: jar.map((c) => `${c.name}=${c.value}`).join('; ') } : {};
  };
  const headers = (u, accept) => ({ 'User-Agent': ua, Referer: referer, Accept: accept || '*/*', ...cookieHeader(u) });

  async function fetchFile(u, dest) {
    let res;
    try {
      res = await fetch(u, { headers: headers(u), signal: AbortSignal.timeout(10 * 60000) });
    } catch (e) { return { error: String((e && e.message) || e).slice(0, 80) }; }
    if (!res.ok || !res.body) return { error: 'HTTP ' + res.status, status: res.status };
    let type = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!/^(image|video)\//.test(type)) {
      const ext = ((new URL(u).pathname.match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
      if (!BY_EXT[ext] || (type && !/octet-stream|binary/.test(type))) {
        await res.body.cancel().catch(() => {});
        return { error: 'not a picture or video (' + (type || 'no type') + ')' };
      }
      type = BY_EXT[ext];
    }
    const len = Number(res.headers.get('content-length') || 0);
    if (len > maxBytes) { await res.body.cancel().catch(() => {}); return { tooBig: len }; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const fh = fs.openSync(dest, 'w');
    let bytes = 0;
    let over = false;
    try {
      for await (const chunk of res.body) {
        bytes += chunk.length;
        if (bytes > maxBytes) { over = true; break; }
        fs.writeSync(fh, chunk);
      }
    } catch (e) {
      fs.closeSync(fh);
      fs.rmSync(dest, { force: true });
      return { error: String((e && e.message) || e).slice(0, 80) };
    }
    fs.closeSync(fh);
    if (over) { fs.rmSync(dest, { force: true }); return { tooBig: bytes }; }
    return { bytes, type };
  }

  async function fetchText(u, accept) {
    try {
      const res = await fetch(u, { headers: headers(u, accept), signal: AbortSignal.timeout(60000) });
      return res.ok ? await res.text() : null;
    } catch (e) { return null; }
  }

  /** Every item gets .result; a CDN that refused a burst usually answers a slower second try. */
  async function download(items, destOf, { concurrency = 6, waits = [1500, 5000] } = {}) {
    const attempt = async (it) => { it.result = await fetchFile(it.url, destOf(it)); };
    await pool(items, concurrency, attempt);
    for (const wait of waits) {
      const again = items.filter((it) => it.result && RETRY.has(it.result.status));
      if (!again.length) break;
      await new Promise((ok) => setTimeout(ok, wait));
      await pool(again, 2, attempt);
    }
  }

  return { fetchFile, fetchText, download, setCookies: (c) => { cookies = c || []; } };
}

module.exports = { createFetcher, pool, BY_EXT };
