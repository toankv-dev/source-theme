"""A competitor page that is itself a shopdy store page: read its blocks straight from the saved DOM.

    parse(html, page_url) → {"maxWidth", "blocks": [{id, type, vis, sticky, bleed, style, html?, css?, media,
                                                     fields}]} | None (not a shopdy page)

The markup is the one shopdy renders (apps/api/src/features/store-pages/application/render-page-blocks.ts):
`<div class="sp-page">` holding `<section id="sp-bN" class="sp-block sp-block--<type> sp-vis-<all|desktop|mobile>
[sp-block--sticky] [sp-block--bleed]" style="padding…">` (the main product: `sp-themed sp-block--mainproduct`).
An html block's CSS sits in a <style> with every selector prefixed by `#sp-bN` (scopeBlockCss in
packages/shared-types/src/domain/free-html.ts: `&` → the wrapper, `&x` → wrapper+x, `p` → `wrapper p`; inside
@media/@supports/@layer/@container/@scope too; @keyframes untouched). The prefix is taken off again, so the CSS can
go back into the CSS box of an html block as it is. Standard library only.
"""

from __future__ import annotations

import html as htmllib
import re
from typing import Any
from urllib.parse import urljoin

BLOCK_START = re.compile(
    r'<section\s+id="(sp-b\d+)"\s+class="([^"]*\bsp-block--[a-z0-9-]+[^"]*)"(?:\s+style="([^"]*)")?[^>]*>', re.I)
FLAGS = {"sticky", "bleed"}  # sp-block--sticky / --bleed are not the type
NESTING_AT = re.compile(r"^@(media|supports|layer|container|scope)\b", re.I)


def _text(fragment: str) -> str:
    fragment = re.sub(r"<svg\b.*?</svg>", "", fragment, flags=re.S | re.I)
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def _style(style: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in (style or "").split(";"):
        if ":" in part:
            k, v = part.split(":", 1)
            out[k.strip().lower()] = v.strip()
    return out


def _attr(tag: str, name: str) -> str | None:
    m = re.search(rf'\b{name}="([^"]*)"', tag)
    return htmllib.unescape(m.group(1)) if m else None


# ── CSS ─────────────────────────────────────────────────────────────────────


def _css_items(text: str) -> list[tuple[str, Any]]:
    """Top-level CSS items: ("rule", (selector, body)) or ("at", (prelude, inner items | raw body))."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    items: list[tuple[str, Any]] = []
    i, n = 0, len(text)
    while i < n:
        j = text.find("{", i)
        if j < 0:
            break
        prelude = text[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            depth += {"{": 1, "}": -1}.get(text[k], 0)
            k += 1
        body = text[j + 1:k - 1]
        if prelude.startswith("@"):
            items.append(("at", (prelude, _css_items(body) if NESTING_AT.match(prelude) else body)))
        elif prelude:
            items.append(("rule", (prelude, body.strip())))
        i = k
    return items


def _descope(selector: str, bid: str) -> str | None:
    """`#sp-b3 .x, #sp-b3` → `.x, &`; None when the selector is not this block's."""
    parts = []
    for p in selector.split(","):
        p = p.strip()
        if p == f"#{bid}":
            parts.append("&")
        elif p.startswith(f"#{bid} "):
            parts.append(p[len(bid) + 2:].strip())
        elif p.startswith(f"#{bid}") and not re.match(r"[\w-]", p[len(bid) + 1:len(bid) + 2] or " "):
            parts.append("&" + p[len(bid) + 1:])
        else:
            return None
    return ", ".join(parts)


def _block_of(selector: str) -> str | None:
    m = re.match(r"\s*#(sp-b\d+)(?![\w-])", selector)
    return m.group(1) if m else None


def block_css(styles: list[str]) -> dict[str, str]:
    """Block id → its CSS without the scope, from every <style> of the page."""
    rules: dict[str, list[str]] = {}
    keyframes: dict[str, str] = {}
    for text in styles:
        for kind, (head, body) in _css_items(text):
            if kind == "rule":
                bid = _block_of(head)
                sel = _descope(head, bid) if bid else None
                if sel is not None:
                    rules.setdefault(bid, []).append(f"{sel} {{{body}}}")
            elif isinstance(body, list):
                inner = [(h, b) for k, (h, b) in body if k == "rule"]
                bid = next((_block_of(h) for h, _ in inner if _block_of(h)), None)
                if not bid:
                    continue
                lines = [f"  {_descope(h, bid)} {{{b}}}" for h, b in inner if _descope(h, bid) is not None]
                if lines:
                    rules.setdefault(bid, []).append(f"{head} {{\n" + "\n".join(lines) + "\n}")
            elif head.lower().startswith("@keyframes"):
                keyframes[head.split(None, 1)[1].strip() if " " in head else head] = f"{head}{{{body}}}"
    out = {}
    for bid, parts in rules.items():
        css = "\n".join(parts)
        used = [kf for name, kf in keyframes.items() if re.search(rf"\b{re.escape(name)}\b", css)]
        out[bid] = "\n".join(parts + used)
    return out


# ── fields of the built-in blocks ───────────────────────────────────────────


def _media(fragment: str, base: str) -> list[dict[str, str]]:
    seen: list[str] = []
    for m in re.finditer(r'\b(?:src|poster)="([^"]+)"', fragment):
        src = htmllib.unescape(m.group(1))
        if src not in seen and not src.startswith("data:"):
            seen.append(src)
    return [{"src": s, "url": urljoin(base, s)} for s in seen]


def _fields(btype: str, inner: str, style: dict[str, str], base: str) -> dict[str, Any]:
    if btype == "countdown":
        m = re.search(r'<div class="sp-countdown"([^>]*)>(.*?)</div>', inner, re.S)
        if not m:
            return {}
        st = _style(_attr(m.group(1), "style") or "")
        text = re.sub(r'<b class="sp-timer">.*?</b>', "{timer}", m.group(2), flags=re.S)
        return {"text": _text(text), "minutes": int(_attr(m.group(1), "data-minutes") or 0),
                "background": st.get("background"), "color": st.get("color")}
    if btype == "cta":
        m = re.search(r'<a class="sp-cta"([^>]*)>(.*?)</a>', inner, re.S)
        if not m:
            return {}
        st = _style(_attr(m.group(1), "style") or "")
        return {"text": _text(m.group(2)), "href": _attr(m.group(1), "href"), "background": st.get("background"),
                "color": st.get("color"), "radius": st.get("border-radius"), "padding": st.get("padding"),
                "fontSize": st.get("font-size"), "fullWidth": st.get("width") == "100%"}
    if btype == "text":
        m = re.search(r'<div class="sp-rich">(.*)</div>\s*$', inner, re.S)
        return {"html": (m.group(1) if m else inner).strip()}
    if btype == "footer":
        links = [{"text": _text(t), "href": htmllib.unescape(h)}
                 for h, t in re.findall(r'<a href="([^"]*)"[^>]*>(.*?)</a>', inner, re.S)]
        m = re.search(r'<p class="sp-footer-text">(.*?)</p>', inner, re.S)
        return {"links": links, "text": _text(m.group(1)) if m else "", "background": style.get("background"),
                "color": style.get("color")}
    if btype == "reviews":
        return _reviews(inner, base)
    if btype == "mainproduct":
        return {}
    return {"text": _text(inner)[:300]}


def _reviews(inner: str, base: str) -> dict[str, Any]:
    head = re.search(r'<div class="sp-prv"[^>]*style="([^"]*)"', inner)
    st = _style(head.group(1)) if head else {}
    num = lambda v: int(re.sub(r"\D", "", v)) if v and re.search(r"\d", v) else None  # noqa: E731

    def one(pattern: str, where: str) -> str:
        m = re.search(pattern, where, re.S)
        return _text(m.group(1)) if m else ""

    badge = re.search(r'<div class="sp-prv-badge">(.*?)</div>', inner, re.S)
    items = []
    for card in re.findall(r'<article class="sp-prv-card">(.*?)</article>', inner, re.S):
        img = re.search(r'<img class="sp-prv-img" src="([^"]+)"', card)
        stars = re.search(r'aria-label="(\d+) out of 5"', card)
        items.append({
            "name": one(r'<div class="sp-prv-who"><b>(.*?)</b>', card),
            "verified": 'class="sp-prv-ver"' in card,
            "date": one(r'<div class="sp-prv-date">(.*?)</div>', card),
            "rating": int(stars.group(1)) if stars else None,
            "title": one(r'<b class="sp-prv-title">(.*?)</b>', card),
            "text": one(r'<p class="sp-prv-text">(.*?)</p>', card),
            "image": {"src": img.group(1), "url": urljoin(base, htmllib.unescape(img.group(1)))} if img else None,
        })
    return {
        "columns": num(st.get("--sp-prv-cols")), "accent": st.get("--sp-prv-accent"), "starSize": num(st.get("--sp-star")),
        "badge": re.sub(r"^★+\s*", "", _text(re.sub(r'<span class="sp-prv-stars">.*?</span>', "", badge.group(1), flags=re.S)))
        if badge else "",
        "heading": one(r'<h2 class="[^"]*sp-prv-h[^"]*">(.*?)</h2>', inner),
        "sub": one(r'<p class="sp-prv-sub">(.*?)</p>', inner),
        "items": items,
    }


# ── the page ────────────────────────────────────────────────────────────────


def parse(html: str, page_url: str = "") -> dict[str, Any] | None:
    page = re.search(r'<div class="sp-page"[^>]*>', html)
    starts = list(BLOCK_START.finditer(html, page.end())) if page else []
    if not starts:
        return None
    styles = re.findall(r"<style[^>]*>(.*?)</style>", html, re.S | re.I)
    css = block_css(styles)
    tail = min([i for i in (html.find("</main>", starts[-1].end()), html.find("<script", starts[-1].end())) if i > 0]
               or [len(html)])
    blocks = []
    for k, m in enumerate(starts):
        end = starts[k + 1].start() if k + 1 < len(starts) else tail
        chunk = html[m.end():end]
        close = chunk.rfind("</section>")
        inner = (chunk[:close] if close >= 0 else chunk).strip()
        classes = m.group(2).split()
        bid = m.group(1)
        btype = next(c[len("sp-block--"):] for c in classes
                     if c.startswith("sp-block--") and c[len("sp-block--"):] not in FLAGS).lower()
        vis = next((c[len("sp-vis-"):] for c in classes if c.startswith("sp-vis-")), "all")
        style = _style(htmllib.unescape(m.group(3) or ""))
        block: dict[str, Any] = {"id": bid, "type": btype, "vis": vis, "sticky": "sp-block--sticky" in classes,
                                 "bleed": "sp-block--bleed" in classes, "style": style,
                                 "media": _media(inner, page_url)}
        if btype == "html":
            block["html"] = inner
            block["css"] = css.get(bid, "")
        block["fields"] = _fields(btype, inner, style, page_url)
        blocks.append(block)
    width = None
    for text in styles:
        w = re.search(r"\.sp-page\s*\{[^}]*max-width:\s*([^;}]+)", text)
        if w:
            width = w.group(1).strip()
            break
    return {"maxWidth": width, "blocks": blocks}
