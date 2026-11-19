"""verify's comparison of the built page with the competitor, section by section.

- STYLES_JS (run on a section of the competitor at fetch time, and on the block that stands for it in the editor at
  verify time): the first heading, paragraph and button — font, size, weight, colour; button background and radius.
- style_diff(want, got): what differs beyond a small tolerance ("p color #62676F ≠ #111111").
- tag_loss(sent, saved): tags of an html block the shopdy sanitizer took away.
- SIMILARITY_JS: share of matching pixels of two pictures scaled to one width (in the browser, no library).
Pure Python + JS strings; the browser work is in shopdy.py `verify` and fetch_competitor.py.
"""

from __future__ import annotations

import re
from typing import Any

COLOR_TOLERANCE = 30  # euclidean RGB distance (#111 vs #161616 is 8; grey #62676F vs #111 is 145)
SIZE_TOLERANCE = 2  # px
RADIUS_TOLERANCE = 3  # px
SIMILAR = 0.75  # below: a side-by-side picture to look at (compared 160 px wide: line breaks do not count)
SIMILAR_WIDTH = 160
COMPARED_TYPES = {"html", "text"}  # the editor draws other blocks with its own preview, not the storefront markup
MIN_HEIGHT = 60  # px; a bar thinner than this has no picture worth comparing
WATCHED_TAGS = ("video", "img", "picture", "source", "svg", "details", "table", "iframe", "script", "form", "object",
                "embed", "link", "meta", "style")

STYLES_JS = r"""
(root) => {
  const shown = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const txt = (e) => (e.innerText || '').replace(/\s+/g, ' ').trim();
  const hex = (c) => { const m = (c || '').match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return c;
    if (m.length > 3 && Number(m[3]) === 0) return 'transparent';
    return '#' + m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const font = (e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const text = (e) => { const s = getComputedStyle(e);
    return { font: font(e), size: Math.round(parseFloat(s.fontSize)), weight: Number(s.fontWeight), color: hex(s.color) }; };
  const first = (sel, min) => [...root.querySelectorAll(sel)].find((e) => shown(e) && txt(e).length >= min);
  const out = {};
  const h = first('h1,h2,h3,h4', 2);
  if (h) out.h = text(h);
  const p = first('p,li', 12);
  if (p) out.p = text(p);
  const b = [...root.querySelectorAll('a,button')].find((e) => shown(e) && txt(e).length >= 2 &&
    !['transparent', '#000000'].includes(hex(getComputedStyle(e).backgroundColor)) &&
    !/rgba\(0, 0, 0, 0\)/.test(getComputedStyle(e).backgroundColor) && e.getBoundingClientRect().height >= 30);
  if (b) { const s = getComputedStyle(b); out.button = { bg: hex(s.backgroundColor), color: hex(s.color),
    radius: Math.round(parseFloat(s.borderTopLeftRadius) || 0), size: Math.round(parseFloat(s.fontSize)) }; }
  return out;
}
"""

SIMILARITY_JS = r"""
async ([a, b, width]) => {
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const h = Math.max(1, Math.round(Math.min(ia.height * width / ia.width, ib.height * width / ib.width)));
  const grab = (img) => { const c = document.createElement('canvas'); c.width = width; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, width, img.height * width / img.width); return x.getImageData(0, 0, width, h).data; };
  const da = grab(ia), db = grab(ib);
  let same = 0;
  for (let k = 0; k < da.length; k += 4) {
    const ga = (da[k] * 3 + da[k + 1] * 6 + da[k + 2]) / 10, gb = (db[k] * 3 + db[k + 1] * 6 + db[k + 2]) / 10;
    if (Math.abs(ga - gb) < 28) same++;
  }
  return same / (da.length / 4);
}
"""


def _rgb(c: str | None) -> tuple[int, int, int] | None:
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", c or "")
    return tuple(int(m.group(1)[k:k + 2], 16) for k in (0, 2, 4)) if m else None  # type: ignore[return-value]


def _far(a: str | None, b: str | None) -> bool:
    ra, rb = _rgb(a), _rgb(b)
    if ra is None or rb is None:
        return (a or "").lower() != (b or "").lower()
    return sum((x - y) ** 2 for x, y in zip(ra, rb)) ** 0.5 > COLOR_TOLERANCE


def style_diff(want: dict[str, Any], got: dict[str, Any]) -> list[str]:
    """What the built block does differently from the competitor's section (both from STYLES_JS)."""
    out: list[str] = []
    for part in ("h", "p"):
        w, g = want.get(part), got.get(part)
        if not w or not g:
            continue
        if str(g.get("font", "")).lower() != str(w.get("font", "")).lower():
            out.append(f"{part} font {g.get('font')} ≠ {w.get('font')}")
        if abs((g.get("size") or 0) - (w.get("size") or 0)) > SIZE_TOLERANCE:
            out.append(f"{part} size {g.get('size')}px ≠ {w.get('size')}px")
        if (g.get("weight") or 400) // 100 != (w.get("weight") or 400) // 100:
            out.append(f"{part} weight {g.get('weight')} ≠ {w.get('weight')}")
        if _far(g.get("color"), w.get("color")):
            out.append(f"{part} color {g.get('color')} ≠ {w.get('color')}")
    w, g = want.get("button"), got.get("button")
    if w and g:
        for key in ("bg", "color"):
            if _far(g.get(key), w.get(key)):
                out.append(f"button {key} {g.get(key)} ≠ {w.get(key)}")
        if abs((g.get("radius") or 0) - (w.get("radius") or 0)) > RADIUS_TOLERANCE:
            out.append(f"button radius {g.get('radius')}px ≠ {w.get('radius')}px")
    return out


def _count_tags(html: str) -> dict[str, int]:
    return {t: len(re.findall(rf"<{t}\b", html or "", re.I)) for t in WATCHED_TAGS}


def tag_loss(sent: str, saved: str) -> list[str]:
    """`<video> 1 → 0`: tags that were in the HTML sent to an html block and are not in what shopdy saved."""
    a, b = _count_tags(sent), _count_tags(saved)
    return [f"<{t}> {a[t]} → {b[t]}" for t in WATCHED_TAGS if b[t] < a[t]]
