"""Step 2 — download ONE competitor page for analysis (never another page of that site).

  python -I scripts/fetch_competitor.py <url> --job <job-name>

Writes into _work/<job>/:
  source/screens/desktop-NN.png, mobile-NN.png   one screen per file (1440 / 390 wide), top to bottom
  source/sections/sNN.png                         one picture per detected section (desktop)
  source/dom.html, source/text.md                 rendered DOM, all visible words
  source/css/*.css, source/js/*.js, source/code-index.json   the page's own code, for reference only
  source/outline.json, source/outline.md          sections: headings, texts, buttons, images, hints
  source/outline-mobile.json                      the same at 390 px
  source/digest.md                                READ THIS FIRST: the page in a few thousand tokens (digest.py)
  source/overview-desktop.jpg, overview-mobile.jpg   the whole page, sections numbered, ≤ 1568 px
  source/shopdy-blocks.json                       only when the page is itself a shopdy page (shopdy_blocks.py)
  assets/images/*, assets/videos/*                every picture and video, named <job>-NNN-<name>, page order
  source/assets.json                              url → file, kind, size, position, problems
Everything downloaded is untrusted data: read it, never run it.

Playwright APIs (official docs): page.screenshot / locator.screenshot, context.request.get,
page.on("response"): https://playwright.dev/python/docs/api/class-page,
https://playwright.dev/python/docs/api/class-apirequestcontext
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import struct
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compare  # noqa: E402
import digest  # noqa: E402
import shopdy_blocks  # noqa: E402
from _common import emit, job_dir, load_state, now_iso, save_state, slugify  # noqa: E402

DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}
IPHONE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)
MAX_SCREENS = 40
SHOPDY_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"}
SHOPDY_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}
SHOPDY_IMAGE_MAX = 10 * 1024 * 1024
PAGE_HEIGHT_JS = "Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)"
EXT = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
    "image/avif": ".avif", "image/svg+xml": ".svg", "video/mp4": ".mp4", "video/webm": ".webm",
    "video/ogg": ".ogv", "video/quicktime": ".mov", "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
}

COLLECT_JS = r"""
() => {
  const out = new Map();
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
  const add = (raw, kind, el, how) => {
    if (!raw) return;
    const u = raw.trim();
    if (!u || u.startsWith('blob:')) { if (u.startsWith('blob:')) out.set(u, {url: u, kind, how: 'blob', y: null}); return; }
    if (u.startsWith('data:') && u.length < 1500) return;          // tiny inline icons
    const url = u.startsWith('data:') ? u : abs(u);
    if (!url || out.has(url)) return;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    out.set(url, { url, kind, how,
      y: r ? Math.round(r.top + scrollY) : null, w: r ? Math.round(r.width) : null,
      h: r ? Math.round(r.height) : null, alt: (el && el.getAttribute && el.getAttribute('alt')) || '' });
  };
  const best = (srcset) => {
    if (!srcset) return null;
    let top = null, score = -1;
    for (const part of srcset.split(',')) {
      const [u, d] = part.trim().split(/\s+/);
      const n = d ? parseFloat(d) * (d.endsWith('x') ? 1000 : 1) : 1;
      if (u && n > score) { score = n; top = u; }
    }
    return top;
  };
  for (const img of document.querySelectorAll('img')) {
    add(best(img.getAttribute('srcset')) || img.currentSrc || img.src, 'image', img, 'img');
    for (const a of ['data-src', 'data-lazy-src', 'data-original', 'data-zoom-image']) add(img.getAttribute(a), 'image', img, a);
    add(best(img.getAttribute('data-srcset')), 'image', img, 'data-srcset');
  }
  for (const s of document.querySelectorAll('picture source')) add(best(s.getAttribute('srcset')), 'image', s.parentElement, 'picture');
  for (const v of document.querySelectorAll('video')) {
    add(v.currentSrc || v.getAttribute('src'), 'video', v, 'video');
    for (const s of v.querySelectorAll('source')) add(s.getAttribute('src'), 'video', v, 'video-source');
    add(v.getAttribute('poster'), 'image', v, 'poster');
  }
  for (const el of document.querySelectorAll('body *')) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') for (const m of bg.matchAll(/url\(["']?(.*?)["']?\)/g)) add(m[1], 'image', el, 'background');
  }
  for (const el of document.querySelectorAll('svg image')) add(el.getAttribute('href') || el.getAttribute('xlink:href'), 'image', el, 'svg-image');
  const og = document.querySelector('meta[property="og:image"]'); if (og) add(og.content, 'image', null, 'og:image');
  for (const l of document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')) add(l.href, 'image', null, 'icon');
  for (const f of document.querySelectorAll('iframe')) add(f.src, 'embed', f, 'iframe');
  return [...out.values()];
}
"""

OUTLINE_JS = r"""
() => {
  const vh = innerHeight;
  const visible = (el) => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity !== 0 && r.height >= 24 && r.width >= 40;
  };
  const isOverlay = (el) => { const p = getComputedStyle(el).position; return p === 'fixed' || p === 'sticky'; };
  const overlays = [];
  const leaves = [];
  const split = (el, depth) => {
    const kids = [...el.children].filter((k) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK'].includes(k.tagName) && visible(k));
    const h = el.getBoundingClientRect().height;
    // A wrapper with one visible child (#app, main, .page) is not a section: go through it.
    if (kids.length === 1 && h > 1.6 * vh && depth < 12 && !isOverlay(kids[0])) { split(kids[0], depth); return; }
    if (depth > 0 && (h <= 1.6 * vh || kids.length < 2 || depth >= 6)) { leaves.push(el); return; }
    for (const k of kids) {
      if (isOverlay(k) && k.getBoundingClientRect().height < vh) { overlays.push(k); continue; }
      split(k, depth + 1);
    }
  };
  split(document.body, 0);
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const color = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; e = e.parentElement; } return 'rgb(255, 255, 255)'; };
  const style = (el) => { const s = getComputedStyle(el);
    return { fontFamily: s.fontFamily.split(',')[0].replace(/["']/g, ''), fontSize: s.fontSize, fontWeight: s.fontWeight, color: s.color, align: s.textAlign }; };
  const hint = (el) => {
    const blob = (el.className && el.className.baseVal === undefined ? el.className : '') + ' ' +
      [...el.querySelectorAll('[class]')].slice(0, 400).map((x) => typeof x.className === 'string' ? x.className : '').join(' ');
    const t = txt(el), out = [];
    if (/swiper|slick|carousel|splide|flickity|glide|slider/i.test(blob)) out.push('slider');
    if (/count-?down|timer/i.test(blob) || /\b\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}\b/.test(t)) out.push('countdown');
    if (/review|testimonial|rating|stars?\b|trustpilot|judge|loox|yotpo|okendo/i.test(blob)) out.push('reviews');
    if (el.querySelector('details, [aria-expanded]') || /accordion|faq|collaps/i.test(blob)) out.push('accordion');
    if (/\btabs?\b|tab-/i.test(blob)) out.push('tabs');
    if (el.querySelector('table')) out.push('table');
    if (el.querySelector('form, input:not([type=hidden])')) out.push('form');
    if (el.querySelector('iframe')) out.push('embed');
    if (el.querySelector('video')) out.push('video');
    if (/add to cart|buy now|order now|checkout|claim|get \d+% off|shop now/i.test(t)) out.push('buy-button');
    if (/\$\s?\d|€\s?\d|£\s?\d|\d+[.,]\d{2}\s?(usd|eur|vnd|₫)/i.test(t)) out.push('price');
    if (el.querySelector('select, [role=radiogroup], [class*=variant], [class*=option]')) out.push('variants');
    if (/marquee|ticker|announcement/i.test(blob)) out.push('marquee');
    if (/compar|vs\.?\b|versus/i.test(blob + ' ' + t.slice(0, 300))) out.push('comparison');
    if (/step\s*\d|how (it|to) (works|use)/i.test(t)) out.push('steps');
    return [...new Set(out)];
  };
  const sections = leaves.map((el, i) => {
    el.setAttribute('data-spc-section', String(i));
    const r = el.getBoundingClientRect();
    const heads = [...el.querySelectorAll('h1,h2,h3,h4,h5,h6,[class*=heading],[class*=title]')]
      .filter(visible).slice(0, 8).map((h) => ({ tag: h.tagName.toLowerCase(), text: txt(h).slice(0, 200), ...style(h) }))
      .filter((h) => h.text);
    const paras = [...el.querySelectorAll('p,li,blockquote')].filter(visible).map(txt).filter((t) => t.length > 2).slice(0, 12).map((t) => t.slice(0, 400));
    const buttons = [...el.querySelectorAll('a,button,[role=button],input[type=submit]')].filter(visible).map((b) => {
      const s = getComputedStyle(b), br = b.getBoundingClientRect();
      return { text: txt(b).slice(0, 80) || b.value || b.getAttribute('aria-label') || '', href: b.getAttribute('href') || '',
        bg: s.backgroundColor, color: s.color, radius: s.borderRadius, w: Math.round(br.width), h: Math.round(br.height) };
    }).filter((b) => b.text).slice(0, 12);
    const images = [...el.querySelectorAll('img')].filter(visible).slice(0, 24).map((im) => ({
      src: im.currentSrc || im.src, alt: im.alt || '', w: Math.round(im.getBoundingClientRect().width), h: Math.round(im.getBoundingClientRect().height) }));
    const videos = [...el.querySelectorAll('video')].map((v) => ({ src: v.currentSrc || v.src, poster: v.poster || '', autoplay: v.autoplay, loop: v.loop, muted: v.muted }));
    const embeds = [...el.querySelectorAll('iframe')].map((f) => f.src);
    // every visible line, verbatim, in reading order (digest.md)
    const raw = (el.innerText || '').split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const lines = [];
    let size = 0;
    for (const l of raw) { if (lines[lines.length - 1] === l) continue; if ((size += l.length) > 6000) break; lines.push(l); }
    // words the visitor only sees after a click: closed <details>, hidden accordion / tab panels
    const hidden = [];
    const walk = (n) => {
      for (const k of n.children) {
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'SVG'].includes(k.tagName)) continue;
        const s = getComputedStyle(k), kr = k.getBoundingClientRect();
        const inClosed = k.parentElement && k.parentElement.tagName === 'DETAILS' && !k.parentElement.open && k.tagName !== 'SUMMARY';
        if (inClosed || s.display === 'none' || s.visibility === 'hidden' || (kr.width === 0 && kr.height === 0)) {
          const t = (k.textContent || '').replace(/\s+/g, ' ').trim();
          if (t.length > 2 && !hidden.includes(t)) hidden.push(t.slice(0, 600));
          continue;
        }
        walk(k);
      }
    };
    walk(el);
    // where the first big picture sits against the first text: side by side (left / right) or stacked
    const media = [...el.querySelectorAll('img,video')].filter(visible).find((m) => m.getBoundingClientRect().width >= 120);
    const firstText = [...el.querySelectorAll('h1,h2,h3,h4,p,li')].filter(visible).find((t) => txt(t).length > 2);
    const firstPara = [...el.querySelectorAll('p,li')].filter(visible).find((t) => txt(t).length > 10);
    let imageSide = null, mediaFirst = false;
    if (media && firstText) {
      const mr = media.getBoundingClientRect(), tr = firstText.getBoundingClientRect();
      const stacked = mr.bottom <= tr.top + 8 || tr.bottom <= mr.top + 8;
      imageSide = stacked ? (mr.top < tr.top ? 'top' : 'bottom') : (mr.left + mr.width / 2 < tr.left + tr.width / 2 ? 'left' : 'right');
      mediaFirst = stacked && mr.top < tr.top;
    }
    return { i, tag: el.tagName.toLowerCase(), id: el.id || '', cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
      y: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width), bg: color(el),
      headings: heads, texts: paras, lines, hidden: hidden.slice(0, 30), textColor: firstPara ? getComputedStyle(firstPara).color : '',
      imageSide, mediaFirst, buttons, images, videos, embeds, hints: hint(el), words: txt(el).length };
  });
  // content width: from the left edge of the leftmost paragraph to the right edge of the rightmost one
  const paras = [...document.querySelectorAll('p,h2,h3')].filter((p) => visible(p) && txt(p).length > 30).map((p) => p.getBoundingClientRect());
  const contentWidth = paras.length ? Math.round((Math.max(...paras.map((r) => r.right)) - Math.min(...paras.map((r) => r.left))) / 10) * 10 : null;
  const h1 = [...document.querySelectorAll('h1,h2')].find(visible);
  const over = overlays.map((el) => ({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 120),
    h: Math.round(el.getBoundingClientRect().height), top: getComputedStyle(el).top, bottom: getComputedStyle(el).bottom, text: txt(el).slice(0, 200), hints: hint(el) }));
  const body = getComputedStyle(document.body);
  return { title: document.title, lang: document.documentElement.lang || '', description: (document.querySelector('meta[name=description]') || {}).content || '',
    height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), bodyFont: body.fontFamily, bodyBg: color(document.body),
    bodyColor: body.color, headingFont: h1 ? getComputedStyle(h1).fontFamily.split(',')[0].replace(/["']/g, '') : '', contentWidth,
    sections, overlays: over };
}
"""


def auto_scroll(page) -> None:
    """Walk to the bottom so lazy images and videos load, then back to the top."""
    page.evaluate(
        """async () => {
            const step = Math.max(300, Math.floor(innerHeight * 0.8));
            const tall = () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
            for (let y = 0, i = 0; y < tall() && i < 200; y += step, i++) {
              scrollTo(0, y); await new Promise((r) => setTimeout(r, 180));
            }
            scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
        }"""
    )


def dismiss_popups(page) -> None:
    page.keyboard.press("Escape")
    page.evaluate(
        """() => {   // hide what covers the screen (newsletter / cookie pop-ups) for the screenshots only
            for (const el of document.querySelectorAll('body *')) {
              const s = getComputedStyle(el); if (s.position !== 'fixed') continue;
              const r = el.getBoundingClientRect();
              if (r.width * r.height > innerWidth * innerHeight * 0.35) el.style.setProperty('display', 'none', 'important');
            }
            // Undo a pop-up's scroll lock only. Forcing overflow on a height:100% body would turn
            // the body into its own scroller and the page would measure one screen tall.
            for (const el of [document.documentElement, document.body]) {
              if (getComputedStyle(el).overflowY === 'hidden') el.style.setProperty('overflow', 'visible', 'important');
            }
        }"""
    )


def screens(page, out: Path, prefix: str) -> list[str]:
    """One screenshot per screen height, top to bottom (readable, unlike one 15 000 px image)."""
    files = []
    total = page.evaluate(PAGE_HEIGHT_JS)
    vh = page.viewport_size["height"]
    n = min(MAX_SCREENS, max(1, -(-total // vh)))
    for i in range(n):
        page.evaluate(f"scrollTo(0, {i * vh})")
        page.wait_for_timeout(250)
        f = out / f"{prefix}-{i + 1:02d}.png"
        page.screenshot(path=str(f))
        files.append(f.name)
    page.evaluate("scrollTo(0, 0)")
    return files


HIDE_OVERLAYS_JS = r"""
(target) => { for (const e of document.querySelectorAll('body *')) {
  const p = getComputedStyle(e).position;
  if ((p === 'fixed' || p === 'sticky') && !e.contains(target) && !target.contains(e)) {
    e.setAttribute('data-spfl-hid', e.style.visibility || ''); e.style.visibility = 'hidden'; } } }
"""
SHOW_OVERLAYS_JS = r"""
() => { for (const e of document.querySelectorAll('[data-spfl-hid]')) {
  e.style.visibility = e.getAttribute('data-spfl-hid'); e.removeAttribute('data-spfl-hid'); } }
"""


def section_shot(loc, path: Path) -> bool:
    """A picture of one section without the sticky bars / chat bubbles of the rest of the page over it."""
    try:
        loc.evaluate(HIDE_OVERLAYS_JS)
        loc.screenshot(path=str(path))
        return True
    except Exception:  # noqa: BLE001 - a section of zero height
        return False
    finally:
        try:
            loc.page.evaluate(SHOW_OVERLAYS_JS)
        except Exception:  # noqa: BLE001
            pass


OVERVIEW_EDGE = 1568  # the longest side Claude reads a picture at without shrinking it


def _layout(width: int, height: float, edge: int = OVERVIEW_EDGE) -> tuple[int, float]:
    """(columns, scale) that show a page of width × height biggest in an edge × edge picture."""
    best = (1, 0.0)
    for c in range(1, 13):
        s = min(edge / (c * width), c * edge / height)
        if s > best[1]:
            best = (c, s)
    return best


def overview(browser, png: bytes, marks: list[tuple[int, str]], out_dir: Path, name: str) -> list[str]:
    """The full-page screenshot cut into side-by-side columns, a red line and number at the top of every section,
    in pictures of at most 1568 px a side (a very long page: 2–4 pictures). Returns the file names."""
    width, height = struct.unpack(">II", png[16:24])
    parts = 1
    while parts < 4 and _layout(width, height / parts)[1] < 0.22:
        parts += 1
    data = "https://spfl-overview.local/full.png"  # served by the route below: the picture crosses the driver once
    page = browser.new_page()
    page.route("https://spfl-overview.local/**", lambda r: r.fulfill(status=200, body=png, content_type="image/png"))
    files = []
    try:
        for k in range(parts):
            top, part_h = k * height / parts, height / parts
            cols, s = _layout(width, part_h)
            col_h = part_h / cols
            html = [f"<style>body{{margin:0;background:#777}}.p{{background:url({data}) no-repeat;"
                    f"background-size:{width * s:.1f}px {height * s:.1f}px;position:relative;overflow:hidden}}"
                    ".m{position:absolute;left:0;right:0;border-top:2px solid #e11d48}"
                    ".m span{background:#e11d48;color:#fff;font:700 13px/1.2 sans-serif;padding:1px 5px}</style>",
                    f'<img src="{data}" style="display:none" id="pre"><div style="display:flex;gap:6px">']
            for j in range(cols):
                c_top = top + j * col_h
                html.append(f'<div class="p" style="width:{width * s:.1f}px;height:{col_h * s:.1f}px;'
                            f'background-position:0 -{c_top * s:.1f}px">')
                for y, label in marks:
                    if c_top <= y < c_top + col_h:
                        html.append(f'<div class="m" style="top:{(y - c_top) * s:.1f}px"><span>{label}</span></div>')
                html.append("</div>")
            html.append("</div>")
            page.set_viewport_size({"width": int(cols * (width * s + 6)), "height": int(col_h * s) + 2})
            page.set_content("".join(html))
            page.wait_for_function("() => document.getElementById('pre').complete")
            f = f"{name}.jpg" if parts == 1 else f"{name}-{k + 1}.jpg"
            page.screenshot(path=str(out_dir / f), type="jpeg", quality=72, full_page=True)
            files.append(f)
    finally:
        page.close()
    return files


def safe_name(url: str, idx: int, prefix: str, ctype: str) -> str:
    if url.startswith("data:"):
        stem = "inline"
    else:
        stem = Path(unquote(urlparse(url).path)).stem or "file"
    stem = slugify(stem, 40)
    ext = EXT.get(ctype.split(";")[0].strip().lower(), "")
    if not ext:
        ext = Path(urlparse(url).path).suffix.lower()[:6] if not url.startswith("data:") else ".bin"
    return f"{prefix}-{idx:03d}-{stem}{ext}"


def download_assets(ctx, page_url: str, found: list[dict], job: Path, prefix: str) -> list[dict]:
    img_dir, vid_dir = job / "assets" / "images", job / "assets" / "videos"
    img_dir.mkdir(parents=True, exist_ok=True)
    vid_dir.mkdir(parents=True, exist_ok=True)
    seen_hash: dict[str, str] = {}
    rows = []
    ordered = sorted(found, key=lambda a: (a.get("y") is None, a.get("y") or 0))
    idx = 0
    for a in ordered:
        url, kind = a["url"], a["kind"]
        row = {**a, "file": None, "problem": None}
        if kind == "embed":
            row["problem"] = "iframe embed (YouTube/Vimeo/...): not downloadable; the html block strips <iframe>"
            rows.append(row)
            continue
        if a.get("how") == "blob":
            row["problem"] = "blob: stream (HLS/MSE video): not downloadable as a file"
            rows.append(row)
            continue
        try:
            if url.startswith("data:"):
                head, _, data = url.partition(",")
                ctype = head[5:].split(";")[0] or "application/octet-stream"
                body = base64.b64decode(data) if ";base64" in head else unquote(data).encode()
            else:
                res = ctx.request.get(url, headers={"referer": page_url}, timeout=180_000, fail_on_status_code=False)
                if not res.ok:
                    row["problem"] = f"HTTP {res.status}"
                    rows.append(row)
                    continue
                ctype = (res.headers.get("content-type") or "").split(";")[0].strip().lower()
                body = res.body()
        except Exception as err:  # noqa: BLE001
            row["problem"] = f"download failed: {err}"[:200]
            rows.append(row)
            continue
        if len(body) < 120:
            row["problem"] = "tracking pixel / empty"
            rows.append(row)
            continue
        digest = hashlib.sha1(body).hexdigest()
        if digest in seen_hash:
            row["file"], row["duplicateOf"] = seen_hash[digest], seen_hash[digest]
            rows.append(row)
            continue
        if not ctype.startswith(("image/", "video/")):
            guess = Path(urlparse(url).path).suffix.lower()
            ctype = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".jpg": "image/jpeg",
                     ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
                     ".svg": "image/svg+xml", ".avif": "image/avif"}.get(guess, ctype)
        idx += 1
        is_video = ctype.startswith("video/")
        name = safe_name(url, idx, prefix, ctype)
        target = (vid_dir if is_video else img_dir) / name
        target.write_bytes(body)
        rel = target.relative_to(job).as_posix()
        seen_hash[digest] = rel
        row.update(file=rel, contentType=ctype, bytes=len(body))
        if is_video and ctype not in SHOPDY_VIDEO_TYPES:
            row["problem"] = f"{ctype} is not a type the shopdy media library takes (mp4/webm/ogg/mov)"
        if not is_video and ctype not in SHOPDY_IMAGE_TYPES:
            row["problem"] = f"{ctype} is not a type the shopdy media library takes (jpg/png/webp/gif/avif); svg → inline in an html block"
        if not is_video and len(body) > SHOPDY_IMAGE_MAX:
            row["problem"] = "over the 10 MB image limit of the shopdy media library: shrink before upload"
        rows.append(row)
    return rows


def outline_md(outline: dict, url: str) -> str:
    lines = [f"# Outline — {outline['title']}", "", f"Source: {url}", f"Height: {outline['height']} px · "
             f"body font: {outline['bodyFont']} · background: {outline['bodyBg']}", ""]
    if outline["overlays"]:
        lines += ["## Fixed / sticky elements", ""]
        for o in outline["overlays"]:
            lines.append(f"- `{o['tag']}.{o['cls'][:40]}` h={o['h']} top={o['top']} bottom={o['bottom']} "
                         f"hints={o['hints']} — {o['text'][:120]}")
        lines.append("")
    for s in outline["sections"]:
        lines.append(f"## s{s['i']:02d} · y={s['y']} h={s['h']} · bg {s['bg']} · hints: {', '.join(s['hints']) or '—'}")
        lines.append(f"Screenshot: `source/sections/s{s['i']:02d}.png`")
        for h in s["headings"][:4]:
            lines.append(f"- **{h['tag']}** ({h['fontFamily']} {h['fontSize']} {h['fontWeight']} {h['color']}): {h['text']}")
        for t in s["texts"][:5]:
            lines.append(f"- {t[:200]}")
        for b in s["buttons"][:5]:
            lines.append(f"- button “{b['text']}” → {b['href'] or '(no href)'} · bg {b['bg']} · {b['w']}×{b['h']}")
        if s["images"]:
            lines.append(f"- {len(s['images'])} image(s), first {s['images'][0]['w']}×{s['images'][0]['h']}")
        if s["videos"]:
            lines.append(f"- {len(s['videos'])} video(s)")
        if s["embeds"]:
            lines.append(f"- embeds: {', '.join(s['embeds'][:3])}")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("--job", required=True, help="job name (folder under _work/) or path")
    ap.add_argument("--timeout", type=int, default=60_000)
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    job = job_dir(args.job)
    src = job / "source"
    for d in ("screens", "sections", "css", "js"):
        (src / d).mkdir(parents=True, exist_ok=True)
    prefix = slugify(job.name, 24)
    code_index: list[dict] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=DESKTOP, locale="en-US")
        page = ctx.new_page()

        def on_response(res):  # the page's own CSS / JS, saved for reading only
            try:
                rtype = res.request.resource_type
                if rtype not in ("stylesheet", "script") or not res.ok:
                    return
                body = res.body()
                folder = "css" if rtype == "stylesheet" else "js"
                name = f"{len(code_index) + 1:03d}-{slugify(Path(urlparse(res.url).path).stem or 'inline', 40)}." + folder
                (src / folder / name).write_bytes(body)
                code_index.append({"url": res.url, "file": f"source/{folder}/{name}", "bytes": len(body)})
            except Exception:  # noqa: BLE001 - a response that went away is not worth failing the run
                pass

        page.on("response", on_response)
        page.goto(args.url, wait_until="domcontentloaded", timeout=args.timeout)
        try:
            page.wait_for_load_state("networkidle", timeout=15_000)
        except Exception:  # noqa: BLE001
            pass
        auto_scroll(page)
        try:
            page.wait_for_load_state("networkidle", timeout=10_000)
        except Exception:  # noqa: BLE001
            pass
        final_url = page.url
        dismiss_popups(page)
        (src / "dom.html").write_text(page.content(), encoding="utf-8")
        (src / "text.md").write_text(page.evaluate("document.body.innerText"), encoding="utf-8")
        found = page.evaluate(COLLECT_JS)
        outline = page.evaluate(OUTLINE_JS)
        # The look of every section (and of every block of a shopdy page): what verify compares the build with.
        styles = page.evaluate(
            "() => { const f = " + compare.STYLES_JS + "; const out = {};"
            " document.querySelectorAll('[data-spc-section]').forEach((e) =>"
            "   out['s' + String(e.getAttribute('data-spc-section')).padStart(2, '0')] = f(e));"
            " document.querySelectorAll('section[id^=\"sp-b\"]').forEach((e) => { out[e.id] = f(e); }); return out; }")
        (src / "styles.json").write_text(json.dumps(styles, ensure_ascii=False, indent=1), encoding="utf-8")
        desktop_full = page.screenshot(full_page=True)
        desktop_files = screens(page, src / "screens", "desktop")
        for el in page.locator('section[id^="sp-b"]').all():  # a shopdy page: one picture per block
            if not section_shot(el, src / "sections" / f"{el.get_attribute('id')}.png"):
                pass  # a block of zero height
        for s in outline["sections"]:
            if not section_shot(page.locator(f'[data-spc-section="{s["i"]}"]'), src / "sections" / f"s{s['i']:02d}.png"):
                s["screenshotProblem"] = True
        assets = download_assets(ctx, final_url, found, job, prefix)

        mctx = browser.new_context(viewport=MOBILE, user_agent=IPHONE_UA, is_mobile=True, has_touch=True,
                                   device_scale_factor=1, locale="en-US")
        mpage = mctx.new_page()
        mpage.goto(final_url, wait_until="domcontentloaded", timeout=args.timeout)
        try:
            mpage.wait_for_load_state("networkidle", timeout=15_000)
        except Exception:  # noqa: BLE001
            pass
        auto_scroll(mpage)
        dismiss_popups(mpage)
        mobile_found = mpage.evaluate(COLLECT_JS)
        known = {a["url"] for a in found}
        extra = [a for a in mobile_found if a["url"] not in known]  # mobile-only pictures (art direction)
        if extra:
            assets += download_assets(mctx, final_url, extra, job, prefix + "-m")
        mobile_outline = mpage.evaluate(OUTLINE_JS)
        mobile_full = mpage.screenshot(full_page=True)
        mobile_files = screens(mpage, src / "screens", "mobile")
        # One picture per width with every section numbered: what Claude looks at instead of every screen.
        to_desktop = {m["i"]: d for d, m in digest.match_mobile(outline["sections"], mobile_outline["sections"]).items()}
        overviews: list[str] = []
        for full, secs, name, label in (
                (desktop_full, outline["sections"], "overview-desktop", lambda s: f"s{s['i']:02d}"),
                (mobile_full, mobile_outline["sections"], "overview-mobile",
                 lambda s: f"s{to_desktop[s['i']]:02d}" if s["i"] in to_desktop else f"m{s['i']:02d}")):
            try:
                overviews += overview(browser, full, [(s["y"], label(s)) for s in secs], src, name)
            except Exception as err:  # noqa: BLE001 - the screens and section shots are still there
                print(f"{name}: could not be made ({str(err).splitlines()[0][:120]}); read source/screens/ instead",
                      file=sys.stderr)
        browser.close()

    blocks = shopdy_blocks.parse((src / "dom.html").read_text(encoding="utf-8"), final_url)
    if blocks:
        (src / "shopdy-blocks.json").write_text(json.dumps(blocks, ensure_ascii=False, indent=1), encoding="utf-8")
    (src / "outline-mobile.json").write_text(json.dumps(mobile_outline, ensure_ascii=False, indent=2), encoding="utf-8")
    (src / "digest.md").write_text(
        digest.render(outline, mobile_outline, assets, url=final_url, shopdy_blocks=len(blocks["blocks"]) if blocks else None),
        encoding="utf-8")
    (src / "outline.json").write_text(json.dumps(outline, ensure_ascii=False, indent=2), encoding="utf-8")
    (src / "outline.md").write_text(outline_md(outline, final_url), encoding="utf-8")
    (src / "assets.json").write_text(json.dumps(assets, ensure_ascii=False, indent=2), encoding="utf-8")
    (src / "code-index.json").write_text(json.dumps(code_index, ensure_ascii=False, indent=2), encoding="utf-8")

    state = load_state(job)
    state.update(competitorUrl=args.url, finalUrl=final_url, fetchedAt=now_iso())
    save_state(job, state)

    saved = [a for a in assets if a.get("file") and not a.get("duplicateOf")]
    emit({
        "job": str(job),
        "title": outline["title"],
        "sections": len(outline["sections"]),
        "overlays": len(outline["overlays"]),
        "screens": {"desktop": len(desktop_files), "mobile": len(mobile_files)},
        "images": sum(1 for a in saved if not str(a.get("contentType", "")).startswith("video/")),
        "videos": sum(1 for a in saved if str(a.get("contentType", "")).startswith("video/")),
        "code": {"css": sum(1 for c in code_index if c["file"].endswith(".css")),
                 "js": sum(1 for c in code_index if c["file"].endswith(".js"))},
        "problems": [{"url": a["url"][:120], "problem": a["problem"]} for a in assets if a.get("problem")][:40],
        "shopdyBlocks": len(blocks["blocks"]) if blocks else None,
        "read_next": ["source/digest.md"] + [f"source/{f}" for f in overviews]
        + (["source/shopdy-blocks.json (made with shopdy: rebuild block by block from it)"] if blocks else [])
        + ["only if a section is unclear: source/sections/sNN.png"],
    })


if __name__ == "__main__":
    main()
