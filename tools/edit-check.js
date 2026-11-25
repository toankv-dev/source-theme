#!/usr/bin/env node
/*
 * One command to check a theme change (docs/SPEC-edit-check.md): the theme's preview (started once, then reused), the
 * changed element measured at desktop and phone widths, sideways scroll, console errors, an optional comparison with
 * the original, then pack.js. Numbers first; one small picture only when asked.
 *
 *   node tools/edit-check.js <theme-dir> [--page /product?template=x] [--selector "<css>"] [--widths 1440,360]
 *        [--eval "<js expression>"] [--ref <url> [--ref-selector "<css>"]] [--shot] [--audit] [--zip]
 *   node tools/edit-check.js <theme-dir> --stop        stop the theme's preview server
 *
 *   --page       the preview route (default /product): /, /product?template=<name>, /collections/all, /pages/<slug>, /checkout
 *   --selector   the part you changed: its box, font, colours, border, padding; inside it the smallest text and controls
 *                under 44 px (phone widths)
 *   --eval       a JS expression run in the page at each width (after the load), e.g. to move a slider and read the result
 *   --ref        the original (a live page or the offline copy http://localhost:8092/<name>); --ref-selector defaults to
 *                --selector: prints only the styles that differ
 *   --shot       _work/check/<part>-<width>.png (and <part>-vs-ref-<width>.png next to the original), ≤ 1200 px wide
 *   --audit      mobile-audit.js on this page at 360 px (taps, text, inputs, images, speed)
 *   --zip        pack.js makes the zip (default: validate only)
 * The preview runs in the background (themes/<slug>/_work/preview.json: port, pid) and re-reads the files on every
 * request: no restart after an edit. Exit codes: 0 fine, 1 a problem found (part missing, sideways scroll on a phone,
 * console errors, --eval threw, pack errors, audit errors), 2 usage.
 */
'use strict';
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VALUED = ['--page', '--selector', '--widths', '--eval', '--ref', '--ref-selector', '--port'];
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
const flag = (k) => args.includes('--' + k);
const dir = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const USAGE = 'usage: node tools/edit-check.js <theme-dir> [--page /product] [--selector "<css>"] [--widths 1440,360] [--eval "<js>"] '
  + '[--ref <url> [--ref-selector "<css>"]] [--shot] [--audit] [--zip] | --stop';
if (!dir || !fs.existsSync(path.join(dir, 'theme.json'))) { console.error(dir ? `no theme.json in ${dir}` : USAGE); process.exit(2); }
const THEME = path.resolve(dir);
const STATE = path.join(THEME, '_work', 'preview.json');
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
const SEL = opt('selector');
const PAGE = opt('page', '/product');
const WIDTHS = opt('widths', '1440,360').split(',').map(Number).filter(Boolean);
const slug = (s) => String(s || 'page').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase() || 'part';

// ---- the preview server ------------------------------------------------------------------------------------------

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return null; } };
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return false; } };
async function answers(port) {
  try { const r = await fetch(`http://127.0.0.1:${port}/product`, { signal: AbortSignal.timeout(4000) }); return r.status < 500; } catch (e) { return false; }
}
const portFree = (port) => new Promise((ok) => {
  const s = net.createServer();
  s.once('error', () => ok(false));
  // No host, as preview-server.js listens: on Windows 127.0.0.1 binds even when another server holds 0.0.0.0 / [::] on
  // that port, so an old preview (another theme) kept answering and the check ran on the wrong files.
  s.listen(port, () => s.close(() => ok(true)));
});

async function preview() {
  const st = readState();
  if (st && st.theme === THEME && pidAlive(st.pid) && (await answers(st.port))) return { ...st, reused: true };
  let port = Number(opt('port', 0));
  if (!port) for (let p = 8091; p < 8200; p++) if (await portFree(p)) { port = p; break; }
  const child = spawn(process.execPath, [path.join(__dirname, 'preview-server.js'), THEME, '--port', String(port)],
    { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  const state = { theme: THEME, port, pid: child.pid, started: new Date().toISOString() };
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
  for (let i = 0; i < 80 && !(await answers(port)); i++) await new Promise((r) => setTimeout(r, 250));
  if (!(await answers(port))) throw new Error(`the preview did not start on port ${port}`);
  if (!pidAlive(child.pid)) { fs.rmSync(STATE, { force: true }); throw new Error(`port ${port} is answered by another server (the new preview exited): stop it or pass --port`); }
  return { ...state, reused: false };
}

function stop() {
  const st = readState();
  if (st && pidAlive(st.pid)) { try { process.kill(st.pid); } catch (e) { /* gone */ } }
  fs.rmSync(STATE, { force: true });
  console.log(st ? `preview stopped (port ${st.port})` : 'no preview running for this theme');
}

// ---- in the page -------------------------------------------------------------------------------------------------

/** Runs in the page: sideways scroll, and the part's box and styles. */
function probe({ sel, vw }) {
  const hex = (c) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || '');
    if (!m) return c;
    if (m[4] !== undefined && Number(m[4]) === 0) return 'transparent';
    return '#' + [m[1], m[2], m[3]].map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('') + (m[4] !== undefined && Number(m[4]) < 1 ? `/${m[4]}` : '');
  };
  const doc = document.documentElement;
  // against the screen width asked for: a phone widens its layout to fit content that sticks out (innerWidth grows)
  const out = { overflow: Math.max(0, doc.scrollWidth - vw, doc.scrollWidth - innerWidth) };
  if (!sel) return out;
  const all = Array.from(document.querySelectorAll(sel));
  out.count = all.length;
  const el = all.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || all[0];
  if (!el) return out;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  const border = s.borderTopWidth !== '0px' && s.borderTopStyle !== 'none' ? `${s.borderTopWidth} ${s.borderTopStyle} ${hex(s.borderTopColor)}` : 'none';
  let minText = null;
  const small = [];
  for (const e of [el, ...el.querySelectorAll('*')]) {
    const er = e.getBoundingClientRect();
    if (er.width === 0 || er.height === 0) continue;
    const own = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own) { const fs_ = parseFloat(getComputedStyle(e).fontSize); minText = minText === null ? fs_ : Math.min(minText, fs_); }
    if (/^(A|BUTTON|SELECT|SUMMARY|INPUT)$/.test(e.tagName) || e.getAttribute('role') === 'button') {
      if (er.width < 44 || er.height < 44) small.push(`${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''} ${Math.round(er.width)}×${Math.round(er.height)}`);
    }
  }
  out.el = {
    visible: r.width > 0 && r.height > 0,
    box: [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)],
    font: `${s.fontFamily.split(',')[0].replace(/["']/g, '').trim()} ${s.fontSize}/${s.fontWeight}`, lineHeight: s.lineHeight,
    color: hex(s.color), background: hex(s.backgroundColor), border, radius: s.borderTopLeftRadius, padding: s.padding,
    margin: s.margin, display: s.display, align: s.textAlign, letterSpacing: s.letterSpacing, transform: s.textTransform,
    text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50), minText, smallTaps: small.slice(0, 4), smallCount: small.length,
  };
  return out;
}

// ---- pictures ----------------------------------------------------------------------------------------------------

function sideBySide(a, b, out) {
  const { PNG } = require('pngjs');
  const imgs = [a, b].map((f) => PNG.sync.read(fs.readFileSync(f)));
  const scaled = imgs.map((img) => {
    const k = Math.min(1, 590 / img.width, 1600 / img.height);
    const w = Math.max(1, Math.round(img.width * k));
    const h = Math.max(1, Math.round(img.height * k));
    const o = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (Math.min(img.height - 1, Math.floor(y / k)) * img.width + Math.min(img.width - 1, Math.floor(x / k))) * 4;
        const di = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) o.data[di + c] = img.data[si + c];
      }
    }
    return o;
  });
  const W = scaled[0].width + scaled[1].width + 20;
  const H = Math.max(scaled[0].height, scaled[1].height);
  const o = new PNG({ width: W, height: H });
  o.data.fill(255);
  let x0 = 0;
  for (const s of scaled) {
    for (let y = 0; y < s.height; y++) s.data.copy(o.data, (y * W + x0) * 4, y * s.width * 4, (y + 1) * s.width * 4);
    x0 += s.width + 20;
  }
  fs.writeFileSync(out, PNG.sync.write(o));
}

// ---- main ----------------------------------------------------------------------------------------------------------

async function measure(browser, url, sel, width, { evalCode, shot, ref }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 800 : 900 }, deviceScaleFactor: 1,
    isMobile: width < 600, hasTouch: width < 600 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e).split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().split('\n')[0]); });
  try {
    if (ref) {
      const { openPage } = require('./lib/page');
      const o = await openPage(page, url);
      if (o.blocked) return { blocked: true };
    } else await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(600);
    const res = await page.evaluate(probe, { sel: sel || null, vw: width });
    if (evalCode) {
      res.eval = await page.evaluate(async (code) => {
        try { const v = await (0, eval)(code); return JSON.stringify(v === undefined ? null : v); } catch (e) { return 'ERROR ' + e.message; }
      }, evalCode);
    }
    if (shot) {
      fs.mkdirSync(path.dirname(shot), { recursive: true });
      const loc = sel ? page.locator(sel).first() : null;
      if (loc && (await loc.isVisible().catch(() => false))) await loc.screenshot({ path: shot });
      else await page.screenshot({ path: shot });
      res.shot = shot;
    }
    res.errors = ref ? [] : errors; // the original's own console errors are not ours
    return res;
  } finally {
    await ctx.close();
  }
}

const STYLE_KEYS = ['font', 'lineHeight', 'color', 'background', 'border', 'radius', 'padding', 'letterSpacing', 'transform', 'align', 'display'];
const short = (e) => e ? `box ${e.box.slice(0, 2).join(',')} ${e.box[2]}×${e.box[3]} · ${e.font} ${e.color} on ${e.background} · border ${e.border} · radius ${e.radius} · padding ${e.padding}` : '';

async function main() {
  if (flag('stop')) return stop();
  const lines = [];
  let problem = false;
  const pv = await preview();
  const url = `http://127.0.0.1:${pv.port}${PAGE.startsWith('/') ? PAGE : '/' + PAGE}`;
  lines.push(`edit-check ${rel(THEME)} · ${url} (preview ${pv.reused ? 'running' : 'started'}, pid ${pv.pid})`);
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const part = slug(SEL);
  const checkDir = path.join(THEME, '_work', 'check');
  const results = {};
  try {
    for (const w of WIDTHS) {
      results[w] = await measure(browser, url, SEL, w, { evalCode: opt('eval'), shot: flag('shot') ? path.join(checkDir, `${part}-${w}.png`) : null });
      if (opt('ref')) {
        results[w].ref = await measure(browser, opt('ref'), opt('ref-selector', SEL), w,
          { shot: flag('shot') ? path.join(checkDir, `${part}-ref-${w}.png`) : null, ref: true });
      }
    }
  } finally {
    await browser.close();
  }

  const scroll = [];
  const errs = new Set();
  for (const w of WIDTHS) {
    const r = results[w];
    if (SEL) {
      if (!r.count) { lines.push(`${String(w).padStart(5)}  ${SEL}: not found`); problem = true; } else {
        const e = r.el;
        lines.push(`${String(w).padStart(5)}  ${SEL}${r.count > 1 ? ` (${r.count} matches, the first visible)` : ''}${e.visible ? '' : ' HIDDEN'}  ${short(e)}`);
        if (e.text) lines.push(`       text "${e.text}"${e.minText !== null ? ` · smallest text ${e.minText}px` : ''}`);
        if (w < 600 && e.minText !== null && e.minText < 12) lines.push(`       WARN text under 12 px on a phone (${e.minText}px)`);
        if (w < 600 && e.smallCount) lines.push(`       WARN ${e.smallCount} control(s) under 44 px: ${e.smallTaps.join(', ')}`);
      }
    }
    scroll.push(`${w}: ${r.overflow ? `SIDEWAYS SCROLL ${r.overflow}px` : 'no sideways scroll'}`);
    if (r.overflow && w < 600) problem = true;
    for (const e of r.errors || []) errs.add(e);
    if (r.eval !== undefined) {
      // 1500: one probe of several elements (e.g. every cart line) fits; a JSON string's \n print as new lines
      lines.push(`eval ${String(w).padStart(5)}: ${String(r.eval).slice(0, 1500).replace(/\\n/g, '\n       ')}`);
      if (String(r.eval).startsWith('ERROR')) problem = true;
    }
    if (r.ref) {
      if (r.ref.blocked) lines.push(`ref  ${String(w).padStart(5)}: the original is behind a bot check`);
      else if (!r.ref.el) lines.push(`ref  ${String(w).padStart(5)}: ${opt('ref-selector', SEL) || '(page)'} not found on the original`);
      else if (r.el) {
        const diff = STYLE_KEYS.filter((k) => String(r.el[k]) !== String(r.ref.el[k])).map((k) => `${k} ${r.el[k]} vs ${r.ref.el[k]}`);
        const size = `size ${r.el.box[2]}×${r.el.box[3]} vs ${r.ref.el.box[2]}×${r.ref.el.box[3]}`;
        lines.push(`ref  ${String(w).padStart(5)}: ${diff.length ? diff.join(' · ') : 'same styles'} · ${size}`);
      }
      if (r.shot && r.ref.shot && fs.existsSync(r.ref.shot)) {
        const vs = path.join(checkDir, `${part}-vs-ref-${w}.png`);
        sideBySide(r.shot, r.ref.shot, vs);
        r.vs = vs;
      }
    }
  }
  lines.push(`page   ${scroll.join(' · ')} · console errors ${errs.size}${errs.size ? ': ' + [...errs].slice(0, 2).join(' | ').slice(0, 200) : ''}`);
  if (errs.size) problem = true;
  const shots = WIDTHS.map((w) => results[w].vs || results[w].shot).filter(Boolean);
  if (shots.length) lines.push(`shot   ${shots.map(rel).join(' · ')}`);

  if (flag('audit')) {
    const a = spawnSync(process.execPath, [path.join(__dirname, 'mobile-audit.js'), `http://127.0.0.1:${pv.port}`, '--pages', PAGE, '--width', '360'],
      { encoding: 'utf8', timeout: 300000 });
    const out = String(a.stdout || '').trim().split('\n');
    const items = out.filter((l) => /\b(error|warn)\b/i.test(l) && !/error\(s\)/.test(l)).slice(0, 6);
    lines.push(`audit  ${out[out.length - 1] || 'no output'}`, ...items.map((l) => '       ' + l.trim().slice(0, 160)));
    if (a.status) problem = true;
  }

  const pk = spawnSync(process.execPath, [path.join(__dirname, 'pack.js'), THEME, ...(flag('zip') ? [] : ['--no-zip'])], { encoding: 'utf8', timeout: 300000 });
  const po = String(pk.stdout || '').split('\n');
  const summary = po.find((l) => /errors, \d+ warnings/.test(l)) || 'pack: no summary';
  const zip = po.find((l) => /^Packed /.test(l));
  lines.push(`pack   ${summary.replace(/^.*?(\d+ errors)/, '$1')}${zip ? ' · ' + zip.replace(/^Packed \d+ files → /, '').replace(/\\/g, '/') : ''}`);
  for (const l of po.filter((x) => /^ERROR|^WARN.*design map/.test(x)).slice(0, 5)) lines.push('       ' + l.trim().slice(0, 180));
  if (pk.status) problem = true;

  console.log(lines.join('\n'));
  process.exit(problem ? 1 : 0);
}

main().catch((e) => { console.error('edit-check: ' + ((e && e.message) || e)); process.exit(1); });
