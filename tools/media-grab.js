#!/usr/bin/env node
/*
 * Every picture and video of ONE store page (a competitor's product link), grouped and named, in one command
 * (docs/SPEC-media-grab.md). No mirror of the page, no screenshots: only its media, and the product data of that one
 * product. Nothing else of the store is opened.
 *
 *   node tools/media-grab.js <url> [--out <dir>] [--only <group,…>] [--desktop-only] [--refresh] [--max-mb 300]
 *                                  [--to-theme <theme-dir> --prefix <xx>] [--sheet]
 *
 *   --out          default downloads/<host>-<handle>/ at the repo root (git-ignored). Skills: themes/<slug>/_work/grab/<name>
 *   --only         keep these groups only: gallery, variants, description, sections, reviews, icons, brand, hidden
 *   --desktop-only skip the 390 px pass (faster; some pages show a few pictures on phones only)
 *   --refresh      the folder exists: download again (otherwise exit 1)
 *   --max-mb       largest file kept (each); bigger ones are listed, not saved
 *   --to-theme     then put them into that theme as media-library.js does (WebP in assets/images/<xx>-<group>/, videos,
 *                  originals in _work/images/, _work/media-map.json) and print the default_* paths; needs --prefix
 *   --sheet        also <out>/contact-<group>.png, one look at each group (for the user; skills do not read them)
 *   --headed       visible browser windows: when the site shows a bot check, YOU pass it in the window (the tool waits
 *                  up to 3 min, then goes on with what the site shows you). A rate limit (HTTP 429) is waited out once.
 *                  The tool itself never gets around a bot check.
 *
 * Where the media comes from: the rendered page at 1440 and 390 px, scrolled to the end, pop-ups closed
 * (tools/lib/collect-refs.js: img / srcset, picture sources, CSS backgrounds, video, <template>, JSON and script
 * video URLs, posters); the product data of that product (Shopify /products/<handle>.js, #sf-variants-data, JSON-LD);
 * Shopify HLS streams → the MP4 of their best rendition. Shopify pictures are asked at their original size.
 * Writes <out>/images/<group>/<NNN>-<name>.<ext> and <out>/videos/<group>/… (NNN = order on the page, a video's poster
 * next to it as <NNN>-<name>-poster.<ext>), <out>/media.json (n, group, kind, url, file, bytes, shown, alt, variant,
 * poster, via) and <out>/assets.json (for media-library.js --from). Prints at most 30 lines.
 * Downloads are untrusted data: never run them. Never adds to cart, sends a form or logs in.
 * Exit codes: 0 done, 1 usage / folder exists / error, 2 the page is behind a bot check.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const M = require('./lib/mirror');
const { UA, UA_M, settle, clearPopups, injectMirror, openPage, blockedHint } = require('./lib/page');
const { collectRefs } = require('./lib/collect-refs');
const { plan, pictureKey, realExt } = require('./lib/media-pick');
const G = require('./lib/media-grab');
const { createFetcher } = require('./lib/fetch-media');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VALUED = ['--out', '--only', '--max-mb', '--to-theme', '--prefix'];
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
const flag = (k) => args.includes('--' + k);
const url = args.find((a, i) => /^https?:\/\//i.test(a) && !VALUED.includes(args[i - 1]));
const USAGE = 'usage: node tools/media-grab.js <url> [--out <dir>] [--only <groups>] [--desktop-only] [--refresh] [--max-mb 300] '
  + '[--to-theme <theme-dir> --prefix <xx>] [--sheet] [--headed]';
if (!url) { console.error(USAGE); process.exit(1); }
if (opt('to-theme') && !opt('prefix')) { console.error('--to-theme needs --prefix <xx> (the folder prefix of these pictures in the theme)'); process.exit(1); }

const T = G.target(url);
const OUT = path.resolve(opt('out', path.join(ROOT, 'downloads', T.outName)));
const TMP = path.join(OUT, '.tmp');
const MAX = Number(opt('max-mb', 300)) * 1048576;
const ONLY = opt('only') ? new Set(opt('only').split(',').map((s) => s.trim())) : null;
const HEADED = flag('headed');
let COOKIES = []; // the store's cookies from the browser windows (a bot check a person passed): sent with the downloads
const F = createFetcher({ referer: url, maxBytes: MAX, ua: UA });
const show = (f) => { const r = path.relative(ROOT, f).replace(/\\/g, '/'); return r.startsWith('..') ? f.replace(/\\/g, '/') : r; };
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, ua: UA, mobile: false },
  { label: 'mobile', width: 390, height: 844, ua: UA_M, mobile: true },
].filter((v) => !(flag('desktop-only') && v.mobile));

if (fs.existsSync(path.join(OUT, 'media.json')) && !flag('refresh')) {
  console.error(`${show(OUT)} is already downloaded: add --refresh to download it again, or --out <other dir>`);
  process.exit(1);
}

// ---- in the page ---------------------------------------------------------------------------------------------------

/** What collectRefs does not say: pictures of the description and of the reviews, the page's JSON, embedded players. */
function pageExtras() {
  const Mi = window.__mirror;
  const base = location.href;
  const pick = (el) => {
    const out = [];
    const add = (u) => { const a = u && Mi.absUrl(u, base); if (a) out.push(a); };
    add(el.currentSrc);
    add(el.getAttribute('src'));
    add(el.getAttribute('data-src'));
    for (const at of ['srcset', 'data-srcset']) { const s = el.getAttribute(at); if (s) add(Mi.largestCandidate(s, base)); }
    return out;
  };
  const inside = (boxes) => {
    const out = [];
    boxes.forEach((box) => box.querySelectorAll('img, picture source, video, video source').forEach((el) => out.push(...pick(el))));
    return Array.from(new Set(out));
  };
  const desc = document.querySelectorAll('.product__description, .product-description, .product-single__description, '
    + '[class*="product__description"], [class*="product-description"], [data-product-description], #ProductDescription, .product .rte');
  // "review" as a word (not "preview"), or a known review app
  const reviewRe = /(^|[^a-z])reviews?(?![a-z])|jdgm|loox|stamped|okendo|yotpo/i;
  const reviews = Array.from(document.querySelectorAll('[class*="review" i], [id*="review" i], [class*="jdgm"], [class*="loox"]'))
    .filter((el) => reviewRe.test(String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) + ' ' + el.id));
  const json = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => json.push({ kind: 'ld', text: s.textContent.slice(0, 2e6) }));
  const variants = document.getElementById('sf-variants-data');
  if (variants) json.push({ kind: 'variants', text: variants.textContent.slice(0, 2e6) });
  document.querySelectorAll('script[type="application/json"][id*="ProductJson" i], script[data-product-json]')
    .forEach((s) => json.push({ kind: 'product', text: s.textContent.slice(0, 2e6) }));
  const external = Array.from(document.querySelectorAll('iframe')).map((f) => f.getAttribute('src') || f.getAttribute('data-src') || '')
    .filter((s) => /youtube\.com|youtu\.be|vimeo\.com/i.test(s));
  const shopify = !!(window.Shopify || document.querySelector('link[href*="cdn.shopify.com"], script[src*="cdn.shopify.com"], img[src*="/cdn/shop/"]'));
  return { description: inside(desc), review: inside(reviews), json, external, shopify, shopdy: !!variants };
}

async function pass(browser, vp, cookies) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: vp.ua, deviceScaleFactor: 1,
    isMobile: vp.mobile, hasTouch: vp.mobile });
  if (cookies.length) await ctx.addCookies(cookies).catch(() => {}); // a check passed in the first window stays passed
  const page = await ctx.newPage();
  const streams = new Set();
  const media = new Set();
  page.on('request', (req) => {
    const u = req.url();
    if (!/^https?:/i.test(u)) return;
    if (M.isStream(u)) streams.add(u);
    else if (req.resourceType() === 'media') media.add(u);
  });
  try {
    const open = await openPage(page, url, { headed: HEADED, say: (s) => console.error(`${vp.label}: ${s}`) });
    if (open.blocked) return { blocked: true, open };
    await clearPopups(page);
    await settle(page);
    await clearPopups(page);
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await injectMirror(page);
    const refs = await page.evaluate(collectRefs);
    const extras = await page.evaluate(pageExtras);
    return { blocked: false, refs, extras, streams: [...streams], media: [...media], cookies: await ctx.cookies().catch(() => []) };
  } finally {
    await ctx.close();
  }
}

// Files: tools/lib/fetch-media.js (image/* and video/* only, --max-mb, cookies, slower retries).

// ---- main ----------------------------------------------------------------------------------------------------------

async function main() {
  // --headed: a visible window, so a person can pass a bot check (MEDIA_GRAB_HEADLESS=1 keeps it hidden, for the tests)
  const browser = await chromium.launch({ headless: !HEADED || process.env.MEDIA_GRAB_HEADLESS === '1' });
  const passes = [];
  try {
    for (const vp of VIEWPORTS) {
      const p = await pass(browser, vp, COOKIES);
      if (p.cookies) COOKIES = p.cookies;
      passes.push({ vp, ...p });
    }
  } finally {
    await browser.close();
  }
  const blocked = passes.filter((p) => p.blocked).map((p) => p.vp.label);
  const ok = passes.filter((p) => !p.blocked);
  if (!ok.length) {
    console.error(`${blocked.join(' + ')}: ${blockedHint(passes[0].open, 'media-grab')}. Nothing downloaded.`);
    process.exit(2);
  }

  // Candidates, by URL (Shopify pictures at their original size), in page order.
  const cand = new Map();
  let order = 0;
  const add = (raw, info = {}) => {
    if (!raw || !/^https?:/i.test(raw)) return null;
    const u = G.shopifyOriginal(raw);
    const c = cand.get(u) || { url: u, order: Infinity, raws: new Set(), hidden: undefined };
    c.raws.add(raw);
    c.order = Math.min(c.order, order++);
    if (info.area) c.area = c.area === 'main' || info.area === 'main' ? 'main' : (c.area || info.area);
    if (info.w || info.h) c.rendered = { w: Math.max((c.rendered || {}).w || 0, info.w || 0), h: Math.max((c.rendered || {}).h || 0, info.h || 0) };
    if (info.section && !c.section) c.section = info.section;
    if (info.hidden !== undefined) c.hidden = c.hidden === undefined ? info.hidden : c.hidden && info.hidden;
    for (const k of ['gallery', 'variant', 'description', 'review', 'poster']) if (info[k]) c[k] = true;
    // where a video was found: the page's own markup / data first, a request seen on the network only when nothing else
    if (info.via && (!c.via || (c.via === 'network' && info.via !== 'network'))) c.via = info.via;
    if (info.alt && !c.alt) c.alt = info.alt;
    if (info.variantTitle && !c.variantTitle) c.variantTitle = info.variantTitle;
    cand.set(u, c);
    return c;
  };
  const streams = new Map(); // stream URL → { info, poster }
  const posterOf = new Map(); // video URL → poster URL
  let external = 0;
  for (const p of ok) {
    const { refs, extras } = p;
    for (const u of refs.urls) if (refs.media[u] || refs.via[u]) add(u, { ...(refs.media[u] || {}), via: refs.via[u] });
    for (const u of [...refs.streams, ...p.streams]) {
      const s = streams.get(u) || { info: {}, poster: null };
      Object.assign(s.info, refs.media[u] || {});
      s.poster = s.poster || refs.posters[u] || null;
      streams.set(u, s);
    }
    for (const u of p.media) add(u, { via: 'network' });
    for (const [video, poster] of Object.entries(refs.posters || {})) {
      if (!M.isStream(video)) posterOf.set(G.shopifyOriginal(video), G.shopifyOriginal(poster));
      add(poster, { poster: true });
    }
    for (const u of extras.description) add(u, { description: true });
    for (const u of extras.review) add(u, { review: true });
    external = Math.max(external, new Set(extras.external).size);
  }

  // The product data of this one product.
  let data = null;
  if (T.productJs) {
    const text = await F.fetchText(T.productJs, 'application/json');
    try { data = text ? G.productJsMedia(JSON.parse(text), T.productJs) : null; } catch (e) { data = null; }
    if (data && !data.images.length && !data.videos.length) data = null;
  }
  if (data) {
    const variantPics = new Map(data.variantImages.map((v) => [G.shopifyOriginal(v.url), v.variant]));
    for (const img of data.images) {
      const u = G.shopifyOriginal(img.url);
      add(img.url, variantPics.has(u) ? { variant: true, variantTitle: variantPics.get(u), alt: img.alt } : { gallery: true, alt: img.alt });
    }
    for (const v of data.variantImages) add(v.url, { variant: true, variantTitle: v.variant });
    for (const v of data.videos) {
      if (v.stream) { const s = streams.get(v.url) || { info: { gallery: true }, poster: null }; s.poster = s.poster || v.poster; streams.set(v.url, s); } else {
        add(v.url, { gallery: true, via: 'json' });
        if (v.poster) { posterOf.set(G.shopifyOriginal(v.url), G.shopifyOriginal(v.poster)); add(v.poster, { poster: true }); }
      }
    }
    external = Math.max(external, data.external.length);
  }
  for (const p of ok) {
    for (const j of p.extras.json) {
      for (const x of G.jsonMedia(j.text, j.kind, url)) add(x.url, { gallery: x.gallery && !(data && j.kind === 'ld'), variant: x.variant });
    }
  }

  // Streams: a Shopify HLS stream → the MP4 of its best rendition; any other stream is not one file.
  const notes = [];
  let streamSkips = 0;
  for (const [u, s] of streams) {
    const text = /\.mpd(\?|#|$)/i.test(u) ? null : await F.fetchText(u);
    const best = text ? M.hlsVariants(text, u)[0] : null;
    const mp4 = best ? M.shopifyMp4(best.url) : null;
    if (!mp4) { streamSkips++; notes.push(`stream (not one file): ${u}`); continue; }
    add(mp4, { ...s.info, via: 'stream' });
    if (s.poster) { posterOf.set(G.shopifyOriginal(mp4), G.shopifyOriginal(s.poster)); add(s.poster, { poster: true }); }
  }

  // Download.
  if (flag('refresh')) for (const d of ['images', 'videos', '.tmp']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  const list = [...cand.values()];
  const failed = [];
  const tooBig = [];
  for (const c of list) c.tmp = path.join(TMP, crypto.createHash('sha1').update(c.url).digest('hex').slice(0, 16));
  F.setCookies(COOKIES);
  await F.download(list, (c) => c.tmp);
  for (const c of list) {
    const r = c.result;
    if (r.error) failed.push(`${c.url} (${r.error})`);
    else if (r.tooBig) tooBig.push(`${c.url} (${(r.tooBig / 1048576).toFixed(1)} MB)`);
    else { c.bytes = r.bytes; c.contentType = r.type; }
  }

  // Groups, deduplication (the heaviest copy of each picture), names.
  const assets = {};
  const posters = new Set(posterOf.values()); // a poster is saved next to its video, not counted as a picture
  for (const c of list) {
    if (!c.bytes || posters.has(c.url)) continue;
    assets[c.url] = { file: c.tmp, contentType: c.contentType, bytes: c.bytes, area: c.area, rendered: c.rendered, section: c.section,
      hidden: c.hidden, gallery: !!c.gallery, ...(c.variant ? { variant: true } : {}), ...(c.description ? { description: true } : {}),
      ...(c.review ? { review: true } : {}) };
  }
  const picked = plan(assets);
  const keyOrder = new Map();
  for (const c of list) { const k = pictureKey(c.url); keyOrder.set(k, Math.min(keyOrder.has(k) ? keyOrder.get(k) : Infinity, c.order)); }
  const items = [...picked.images.map((i) => ({ ...i, kind: 'image' })), ...picked.videos.map((v) => ({ ...v, kind: 'video' }))]
    .filter((i) => !ONLY || ONLY.has(i.group))
    .sort((a, b) => keyOrder.get(pictureKey(a.url)) - keyOrder.get(pictureKey(b.url)) || (a.url < b.url ? -1 : 1));
  const imagesOk = Object.values(assets).filter((a) => /^image\//.test(a.contentType));
  const pixels = imagesOk.filter((a) => a.bytes < 200).length;
  const keptImages = picked.images.length;
  const collapsed = list.reduce((n, c) => n + c.raws.size - 1, 0);
  const otherGroups = ONLY ? picked.images.length + picked.videos.length - items.length : 0;

  // Write.
  const media = [];
  const assetsOut = {};
  items.forEach((it, i) => {
    const c = cand.get(it.url);
    const dir = it.kind === 'image' ? 'images' : 'videos';
    const rel = `${dir}/${it.group}/${G.fileName(i + 1, it.name, it.ext)}`;
    fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
    fs.renameSync(it.file, path.join(OUT, rel));
    const e = { n: i + 1, group: it.group, kind: it.kind, url: it.url, file: rel, bytes: it.bytes };
    if (it.rendered && (it.rendered.w || it.rendered.h)) e.shown = it.rendered;
    if (c && c.alt) e.alt = c.alt;
    if (c && c.variantTitle) e.variant = c.variantTitle;
    if (it.kind === 'video') {
      const pu = posterOf.get(it.url);
      const pc = pu && cand.get(pu);
      if (pc && pc.bytes && fs.existsSync(pc.tmp)) {
        const prel = `videos/${it.group}/${G.fileName(i + 1, it.name + '-poster', realExt(pc.contentType, pc.url))}`;
        fs.copyFileSync(pc.tmp, path.join(OUT, prel));
        e.poster = prel;
      }
      e.via = (c && c.via) || 'page';
    }
    media.push(e);
    assetsOut[it.url] = { file: rel, contentType: it.contentType, bytes: it.bytes, area: it.area, rendered: it.rendered, section: it.section,
      hidden: it.hidden, gallery: it.group === 'gallery', ...(it.group === 'variants' ? { variant: true } : {}),
      ...(it.group === 'description' ? { description: true } : {}), ...(it.group === 'reviews' ? { review: true } : {}) };
  });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'media.json'), JSON.stringify(media, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'assets.json'), JSON.stringify(assetsOut, null, 2) + '\n');
  fs.rmSync(TMP, { recursive: true, force: true });

  if (flag('sheet')) {
    for (const g of new Set(media.filter((m) => m.kind === 'image').map((m) => m.group))) {
      spawnSync(process.execPath, [path.join(__dirname, 'contact-sheet.js'), path.join(OUT, 'images', g), path.join(OUT, `contact-${g}.png`)], { stdio: 'ignore', timeout: 120000 });
    }
  }

  for (const f of failed.slice(0, 5)) notes.push(`failed: ${f}`);
  for (const f of tooBig.slice(0, 5)) notes.push(`too big: ${f}`);
  if (otherGroups) notes.push(`${otherGroups} files of other groups left out (--only)`);
  const store = data || ok.some((p) => p.extras.shopify) ? 'shopify' : ok.some((p) => p.extras.shopdy) ? 'shopdy' : 'other';
  const lines = G.summary({
    url, out: show(OUT), store, blocked,
    productData: data ? { images: data.images.length, videos: data.videos.length } : null,
    images: media.filter((m) => m.kind === 'image'), videos: media.filter((m) => m.kind === 'video'),
    skipped: { pixels, duplicates: collapsed + Math.max(0, imagesOk.length - pixels - keptImages), 'too big': tooBig.length,
      failed: failed.length, streams: streamSkips, 'youtube / vimeo': external },
    notes, list: show(path.join(OUT, 'media.json')),
  });
  console.log(lines.join('\n'));

  if (opt('to-theme')) {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'media-library.js'), path.resolve(opt('to-theme')), '--from', OUT,
      '--prefix', opt('prefix'), ...(flag('sheet') ? [] : ['--no-sheet'])], { stdio: 'inherit' });
    process.exit(r.status || 0);
  }
}

main().catch((e) => { console.error('media-grab: ' + ((e && e.stack) || e)); process.exit(1); });
