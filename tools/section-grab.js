#!/usr/bin/env node
/*
 * ONE part of a competitor's page, found by its heading (docs/SPEC-section-grab.md): what it looks like (a picture at
 * 1440 and 390), its texts with their fonts and colours, buttons, layout (items per row, scroll), interactions
 * (slider, arrows, dots, accordion), a short DOM outline, and its pictures and videos downloaded. For "make it like that
 * part of <link>": read section.md first, open the pictures only if the numbers are not enough.
 *
 *   node tools/section-grab.js <url> --heading "<text of its heading>" [--out <dir>] [--desktop-only] [--headed]
 *                                    [--to-theme <theme-dir> --prefix <xx>] [--refresh] [--max-mb 300]
 *
 *   --out       default downloads/<host>-<handle>/section-<heading>/   (skills: themes/<slug>/_work/grab/<name>)
 *   --headed    visible windows: pass a bot check yourself (see media-grab.js); a rate limit is waited out once
 *   --to-theme  add its pictures and videos to the theme's media library (media-library.js --from), needs --prefix
 * Writes <out>/section.md (READ THIS FIRST), desktop.png, mobile.png, outline.html, section.json, media/<NNN>-<name>.<ext>,
 * media.json, assets.json. Only that one page is opened; downloads are untrusted data.
 * Exit codes: 0 done, 1 usage / folder exists / error, 2 the page is behind a bot check, 3 no such heading (the page's
 * headings are listed).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const M = require('./lib/mirror');
const { UA, UA_M, settle, clearPopups, injectMirror, openPage, blockedHint } = require('./lib/page');
const G = require('./lib/media-grab');
const { createFetcher } = require('./lib/fetch-media');
const { safeName, stem, realExt } = require('./lib/media-pick');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VALUED = ['--heading', '--out', '--to-theme', '--prefix', '--max-mb'];
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
const flag = (k) => args.includes('--' + k);
const url = args.find((a, i) => /^https?:\/\//i.test(a) && !VALUED.includes(args[i - 1]));
const HEADING = opt('heading');
const USAGE = 'usage: node tools/section-grab.js <url> --heading "<text>" [--out <dir>] [--desktop-only] [--headed] '
  + '[--to-theme <theme-dir> --prefix <xx>] [--refresh] [--max-mb 300]';
if (!url || !HEADING) { console.error(USAGE); process.exit(1); }
if (opt('to-theme') && !opt('prefix')) { console.error('--to-theme needs --prefix <xx>'); process.exit(1); }
const T = G.target(url);
const OUT = path.resolve(opt('out', path.join(ROOT, 'downloads', T.outName, 'section-' + (safeName(HEADING) || 'part'))));
const HEADED = flag('headed');
const show = (f) => { const r = path.relative(ROOT, f).replace(/\\/g, '/'); return r.startsWith('..') ? f.replace(/\\/g, '/') : r; };
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, ua: UA, mobile: false },
  { label: 'mobile', width: 390, height: 844, ua: UA_M, mobile: true },
].filter((v) => !(flag('desktop-only') && v.mobile));
if (fs.existsSync(path.join(OUT, 'section.json')) && !flag('refresh')) {
  console.error(`${show(OUT)} is already there: add --refresh to grab it again, or --out <other dir>`);
  process.exit(1);
}

// ---- in the page ---------------------------------------------------------------------------------------------------

/** The smallest visible element holding the heading text, then its section (a section-like ancestor, else the
 *  largest ancestor below 60 % of the page). Marks it data-section-grab. */
function findSection(heading) {
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const want = norm(heading);
  const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const hits = Array.from(document.querySelectorAll('body *')).filter((e) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(e.tagName)
    && visible(e) && norm(e.innerText).includes(want) && norm(e.innerText).length <= want.length + 60);
  hits.sort((a, b) => norm(a.innerText).length - norm(b.innerText).length);
  const h = hits[0];
  if (!h) {
    return { found: false, headings: Array.from(document.querySelectorAll('h1, h2, h3')).filter(visible)
      .map((e) => norm(e.innerText).slice(0, 80)).filter(Boolean).slice(0, 30) };
  }
  const pageH = document.documentElement.scrollHeight;
  const ok = (e) => e && e !== document.body && e !== document.documentElement && e.getBoundingClientRect().height < pageH * 0.6;
  let sec = h.closest('section, .shopify-section, [id^="shopify-section"], [data-section-id], [data-section-type]');
  if (!ok(sec)) {
    let e = h;
    while (e.parentElement && ok(e.parentElement)) e = e.parentElement;
    sec = e;
  }
  sec.setAttribute('data-section-grab', '1');
  return { found: true };
}

/** Runs in the page (window.__mirror injected): the marked section's look, texts, buttons, media, layout, interactions. */
function describe() {
  const sec = document.querySelector('[data-section-grab]');
  const Mi = window.__mirror;
  const base = location.href;
  const hex = (c) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || '');
    if (!m) return c;
    if (m[4] !== undefined && Number(m[4]) === 0) return 'transparent';
    return '#' + [m[1], m[2], m[3]].map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('') + (m[4] !== undefined && Number(m[4]) < 1 ? `/${m[4]}` : '');
  };
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const boxOf = (r) => [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)];
  const fontOf = (s) => `${s.fontFamily.split(',')[0].replace(/["']/g, '').trim()} ${s.fontSize}/${s.fontWeight}`;
  const ss = getComputedStyle(sec);
  const texts = [];
  const seen = new Set();
  for (const e of sec.querySelectorAll('*')) {
    if (!vis(e) || /^(script|style|svg|path)$/i.test(e.tagName)) continue;
    const own = Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (!own) continue;
    const s = getComputedStyle(e);
    const t = { tag: e.tagName.toLowerCase(), text: own.slice(0, 120), font: fontOf(s), lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
      transform: s.textTransform, color: hex(s.color), align: s.textAlign, box: boxOf(e.getBoundingClientRect()) };
    const k = t.text + t.font + t.color;
    if (seen.has(k)) continue;
    seen.add(k);
    texts.push(t);
    if (texts.length >= 40) break;
  }
  const buttons = Array.from(sec.querySelectorAll('a, button, [role="button"]')).filter(vis).slice(0, 12).map((e) => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { text: (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40), font: fontOf(s),
      background: hex(s.backgroundColor), color: hex(s.color), radius: s.borderTopLeftRadius, padding: s.padding,
      border: s.borderTopWidth !== '0px' && s.borderTopStyle !== 'none' ? `${s.borderTopWidth} ${s.borderTopStyle} ${hex(s.borderTopColor)}` : 'none',
      size: [Math.round(r.width), Math.round(r.height)] };
  });
  const media = [];
  const add = (u, e, kind, extra) => {
    const a = u && Mi.absUrl(u, base);
    if (!a || media.some((x) => x.url === a)) return;
    const r = e.getBoundingClientRect();
    media.push({ kind, url: a, shown: [Math.round(r.width), Math.round(r.height)], ...extra });
  };
  sec.querySelectorAll('img').forEach((e) => {
    const set = e.getAttribute('srcset') || e.getAttribute('data-srcset');
    add(set ? Mi.largestCandidate(set, base) : (e.currentSrc || e.getAttribute('src') || e.getAttribute('data-src')), e, 'image', { alt: e.getAttribute('alt') || '' });
  });
  sec.querySelectorAll('video').forEach((v) => {
    const source = v.querySelector('source');
    const src = v.currentSrc || v.getAttribute('src') || (source && source.getAttribute('src')) || v.getAttribute('data-src');
    add(src, v, 'video', { poster: v.getAttribute('poster') ? Mi.absUrl(v.getAttribute('poster'), base) : null,
      autoplay: v.autoplay, loop: v.loop, muted: v.muted, controls: v.controls, playsinline: v.playsInline });
  });
  [sec, ...sec.querySelectorAll('*')].forEach((e) => {
    const bg = getComputedStyle(e).backgroundImage;
    if (bg && bg !== 'none') for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) add(m[1], e, 'background', {});
  });
  // The list of repeated items (cards, clips, logos …): how many per row, how many visible, does it scroll sideways.
  let list = null;
  let best = 1;
  for (const e of [sec, ...sec.querySelectorAll('*')]) {
    if (e.children.length < 2) continue;
    const keys = Array.from(e.children).map((c) => c.tagName + '.' + String(c.className || '').split(' ')[0]);
    const top = Math.max(...keys.map((k) => keys.filter((x) => x === k).length));
    if (top > best) { best = top; list = e; }
  }
  let row = null;
  if (list) {
    const items = Array.from(list.children).filter(vis);
    if (items.length) {
      const ls = getComputedStyle(list);
      const top0 = items[0].getBoundingClientRect().top;
      const inRow = items.filter((c) => Math.abs(c.getBoundingClientRect().top - top0) < 4);
      const onScreen = inRow.filter((c) => { const r = c.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; }).length;
      const scrolls = /(auto|scroll)/.test(ls.overflowX) && list.scrollWidth > list.clientWidth + 2;
      const r0 = items[0].getBoundingClientRect();
      row = { items: items.length, perRow: inRow.length, onScreen, display: ls.display, gap: ls.gap,
        columns: ls.gridTemplateColumns && ls.gridTemplateColumns !== 'none' ? ls.gridTemplateColumns : null,
        scroll: scrolls ? (ls.scrollSnapType && ls.scrollSnapType !== 'none' ? 'horizontal scroll with snap' : 'horizontal scroll') : null,
        item: [Math.round(r0.width), Math.round(r0.height)] };
    }
  }
  const ix = [];
  if (sec.querySelector('input[type="range"]')) ix.push('range input (slider)');
  if (sec.querySelector('[draggable="true"]')) ix.push('draggable element');
  if (sec.querySelector('details, summary, [aria-expanded]')) ix.push('accordion / toggle');
  const arrows = Array.from(sec.querySelectorAll('button, a, [role="button"]')).filter((e) => /prev|next|arrow|‹|›|«|»|←|→/i
    .test((e.getAttribute('aria-label') || '') + ' ' + String(e.className || '') + ' ' + (e.innerText || ''))).length;
  if (arrows) ix.push(`${arrows} arrow button(s)`);
  if (sec.querySelector('[class*="dot" i], [class*="pagination" i], [class*="bullet" i]')) ix.push('dots / pagination');
  const lib = (String(sec.innerHTML).match(/\b(swiper|slick|splide|flickity|glide|keen-slider|owl-carousel)\b/i) || [])[1];
  if (lib) ix.push(`carousel library: ${lib.toLowerCase()}`);
  if (row && row.scroll) ix.push(row.scroll);
  if (sec.querySelector('video[autoplay]')) ix.push('autoplay video');
  return { box: boxOf(sec.getBoundingClientRect()), background: hex(ss.backgroundColor), backgroundImage: ss.backgroundImage !== 'none',
    padding: ss.padding, tag: sec.tagName.toLowerCase(), classes: String(sec.className || '').slice(0, 120), texts, buttons, media, row, interactions: ix };
}

/** A short DOM outline of the marked section: tags, 3 classes, src / href, own text. */
function outline() {
  const sec = document.querySelector('[data-section-grab]');
  const out = [];
  let len = 0;
  const walk = (e, depth) => {
    if (len > 8000 || depth > 14 || /^(script|style|noscript|template|svg|path)$/i.test(e.tagName)) return;
    const cls = String(e.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    const own = Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    const attrs = cls ? [`class="${cls}"`] : [];
    for (const a of ['src', 'href', 'type', 'poster', 'data-src']) { const v = e.getAttribute(a); if (v) attrs.push(`${a}="${v.slice(0, 80)}"`); }
    const line = '  '.repeat(depth) + `<${e.tagName.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}>${own}`;
    out.push(line);
    len += line.length;
    for (const c of e.children) walk(c, depth + 1);
  };
  walk(sec, 0);
  return out.join('\n');
}

// ---- the summary -------------------------------------------------------------------------------------------------

function layoutLine(v) {
  const r = v.row;
  const list = r ? ` · ${r.items} items, ${r.perRow} per row${r.onScreen !== r.perRow ? `, ${r.onScreen} on screen` : ''}, item ${r.item.join('×')}${r.gap && r.gap !== 'normal' ? `, gap ${r.gap}` : ''}${r.columns ? `, columns ${r.columns}` : ''}${r.scroll ? ` (${r.scroll})` : ''}` : '';
  return `${v.box[2]}×${v.box[3]} at y ${v.box[1]} · background ${v.background}${v.backgroundImage ? ' + image' : ''} · padding ${v.padding}${list}`;
}

/** Interactions of both widths; what only the phone shows is marked "(phone)". */
function interactionsOf(views) {
  const d = (views.desktop && views.desktop.interactions) || [];
  const m = (views.mobile && views.mobile.interactions) || [];
  return [...d, ...m.filter((x) => !d.includes(x)).map((x) => (views.desktop ? x + ' (phone)' : x))];
}

function markdown(views, media) {
  const d = views.desktop || views.mobile;
  const L = [`# Section "${HEADING}"`, '', `${url}`, ''];
  for (const [label, v] of Object.entries(views)) L.push(`- ${label}: ${layoutLine(v)}`);
  L.push('', `## Texts (${views.desktop ? 'desktop' : 'phone'})`);
  for (const t of d.texts.slice(0, 25)) L.push(`- ${t.tag} "${t.text}" · ${t.font} · line ${t.lineHeight} · ${t.color} · ${t.align}${t.transform !== 'none' ? ' · ' + t.transform : ''}${t.letterSpacing !== 'normal' ? ' · spacing ' + t.letterSpacing : ''}`);
  if (views.desktop && views.mobile) {
    const changed = views.mobile.texts.filter((t) => { const o = views.desktop.texts.find((x) => x.text === t.text); return o && o.font !== t.font; });
    if (changed.length) { L.push('', '## On the phone'); for (const t of changed.slice(0, 10)) L.push(`- "${t.text.slice(0, 40)}" · ${t.font} · line ${t.lineHeight}`); }
  }
  if (d.buttons.length) {
    L.push('', '## Buttons');
    const seen = new Map(); // the same button repeated (one per card) is one line "× n"
    for (const b of d.buttons) {
      const k = `"${b.text}" · ${b.font} · ${b.color} on ${b.background} · radius ${b.radius} · padding ${b.padding} · border ${b.border} · ${b.size.join('×')}`;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    for (const [k, n] of seen) L.push(`- ${k}${n > 1 ? ` × ${n}` : ''}`);
  }
  const n = (k) => media.filter((m) => m.kind === k).length;
  L.push('', `## Media (${n('video')} videos, ${n('image')} pictures)`);
  for (const m of media) {
    const flags = m.kind === 'video' ? ['autoplay', 'loop', 'muted', 'controls', 'playsinline'].filter((k) => m[k]).join(' ') : '';
    L.push(`- ${m.file || m.url} · ${m.kind} · shown ${m.shown.join('×')}${flags ? ' · ' + flags : ''}${m.posterFile ? ' · poster ' + m.posterFile : ''}${m.error ? ' · NOT SAVED: ' + m.error : ''}`);
  }
  const ix = interactionsOf(views);
  L.push('', '## Interactions', `- ${ix.length ? ix.join(' · ') : 'none found (static)'}`);
  L.push('', `Pictures: ${Object.keys(views).map((k) => k + '.png').join(', ')} · DOM: outline.html · all numbers: section.json`);
  return L.join('\n') + '\n';
}

// ---- main ----------------------------------------------------------------------------------------------------------

async function main() {
  if (flag('refresh')) for (const f of ['media', 'section.json', 'section.md', 'outline.html', 'media.json', 'assets.json', 'desktop.png', 'mobile.png']) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
  const browser = await chromium.launch({ headless: !HEADED || process.env.MEDIA_GRAB_HEADLESS === '1' });
  const views = {};
  let cookies = [];
  let blocked = null;
  let missing = null;
  let tree = '';
  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: vp.ua, deviceScaleFactor: 1,
        isMobile: vp.mobile, hasTouch: vp.mobile });
      if (cookies.length) await ctx.addCookies(cookies).catch(() => {});
      const page = await ctx.newPage();
      try {
        const open = await openPage(page, url, { headed: HEADED, say: (s) => console.error(`${vp.label}: ${s}`) });
        if (open.blocked) { blocked = blocked || open; continue; }
        await clearPopups(page);
        await settle(page);
        await clearPopups(page);
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await injectMirror(page);
        const found = await page.evaluate(findSection, HEADING);
        if (!found.found) { missing = missing || found; continue; }
        views[vp.label] = await page.evaluate(describe);
        if (!tree) tree = await page.evaluate(outline);
        fs.mkdirSync(OUT, { recursive: true });
        await page.locator('[data-section-grab]').first().screenshot({ path: path.join(OUT, vp.label + '.png') }).catch(() => {});
        cookies = await ctx.cookies().catch(() => cookies);
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (!Object.keys(views).length) {
    if (missing) { console.error(`no "${HEADING}" on the page. Its headings: ${missing.headings.join(' · ') || '(none)'}`); process.exit(3); }
    console.error(`${blockedHint(blocked || {}, 'section-grab')}. Nothing saved.`);
    process.exit(2);
  }

  // Its media (both widths), Shopify pictures at their original size, a Shopify stream as its MP4.
  const F = createFetcher({ referer: url, maxBytes: Number(opt('max-mb', 300)) * 1048576, ua: UA });
  F.setCookies(cookies);
  const byUrl = new Map();
  for (const v of Object.values(views)) {
    for (const m of v.media) {
      const u = G.shopifyOriginal(m.url);
      if (!byUrl.has(u)) byUrl.set(u, { ...m, url: u });
    }
  }
  for (const m of byUrl.values()) {
    if (m.kind === 'video' && M.isStream(m.url)) {
      const text = await F.fetchText(m.url);
      const best = text ? M.hlsVariants(text, m.url)[0] : null;
      const mp4 = best ? M.shopifyMp4(best.url) : null;
      if (mp4) { m.stream = m.url; m.url = mp4; } else m.error = 'a stream, not one file';
    }
  }
  const media = [...byUrl.values()];
  const files = media.filter((m) => !m.error);
  const posters = files.filter((m) => m.poster).map((m) => ({ url: G.shopifyOriginal(m.poster), of: m }));
  const tmp = path.join(OUT, '.tmp');
  const all = [...files, ...posters];
  for (const it of all) it.tmp = path.join(tmp, crypto.createHash('sha1').update(it.url).digest('hex').slice(0, 16));
  await F.download(all, (it) => it.tmp);
  const assets = {};
  files.forEach((m, i) => {
    const r = m.result || {};
    if (!r.bytes) { m.error = r.error || (r.tooBig ? 'over --max-mb' : 'not saved'); return; }
    m.file = `media/${G.fileName(i + 1, safeName(stem(m.url)), realExt(r.type, m.url))}`;
    m.bytes = r.bytes;
    fs.mkdirSync(path.join(OUT, 'media'), { recursive: true });
    fs.renameSync(m.tmp, path.join(OUT, m.file));
    assets[m.url] = { file: m.file, contentType: r.type, bytes: r.bytes, area: 'main', rendered: { w: m.shown[0], h: m.shown[1] },
      section: safeName(HEADING), hidden: false, gallery: false };
  });
  for (const p of posters) {
    const r = p.result || {};
    if (!r.bytes || !p.of.file) continue;
    p.of.posterFile = p.of.file.replace(/\.[a-z0-9]+$/i, '') + '-poster.' + realExt(r.type, p.url);
    fs.renameSync(p.tmp, path.join(OUT, p.of.posterFile));
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  const clean = (v) => ({ ...v, media: undefined });
  fs.writeFileSync(path.join(OUT, 'section.json'), JSON.stringify({ url, heading: HEADING, views: Object.fromEntries(Object.entries(views).map(([k, v]) => [k, clean(v)])),
    media: media.map(({ tmp: _t, result: _r, ...m }) => m) }, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'media.json'), JSON.stringify(media.filter((m) => m.file).map(({ tmp: _t, result: _r, ...m }, i) => ({ n: i + 1, ...m })), null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'assets.json'), JSON.stringify(assets, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'outline.html'), tree + '\n');
  fs.writeFileSync(path.join(OUT, 'section.md'), markdown(views, media));

  const d = views.desktop || views.mobile;
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  const saved = media.filter((m) => m.file);
  const lines = [`section-grab "${HEADING}" · ${url} → ${show(OUT)}`];
  for (const [label, v] of Object.entries(views)) lines.push(`${label.padEnd(8)}${layoutLine(v)}`);
  lines.push(`texts ${d.texts.length} · buttons ${d.buttons.length} · media ${saved.filter((m) => m.kind === 'video').length} videos, `
    + `${saved.filter((m) => m.kind !== 'video').length} pictures (${mb(saved.reduce((n, m) => n + (m.bytes || 0), 0))})`
    + `${media.length > saved.length ? ` · not saved ${media.length - saved.length}` : ''} · interactions: ${interactionsOf(views).join(', ') || 'none'}`);
  if (blocked) lines.push(`blocked: ${VIEWPORTS.filter((v) => !views[v.label]).map((v) => v.label).join(', ')} (${blockedHint(blocked, 'section-grab')})`);
  lines.push(`read  ${show(path.join(OUT, 'section.md'))} first · pictures desktop.png / mobile.png · outline.html · section.json`);
  console.log(lines.join('\n'));

  if (opt('to-theme')) {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'media-library.js'), path.resolve(opt('to-theme')), '--from', OUT,
      '--prefix', opt('prefix'), '--no-sheet'], { stdio: 'inherit' });
    process.exit(r.status || 0);
  }
}

main().catch((e) => { console.error('section-grab: ' + ((e && e.stack) || e)); process.exit(1); });
