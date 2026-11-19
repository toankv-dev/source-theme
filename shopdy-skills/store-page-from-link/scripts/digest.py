"""source/digest.md: the competitor page in a few thousand tokens, so it can be analysed without the DOM or 18
screenshots. Built from outline.json (desktop 1440), outline-mobile.json (phone 390) and assets.json.

    render(outline, outline_mobile, assets, url, shopdy_blocks) → markdown

Standard library only.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path
from typing import Any

MAX_CHARS = 23_000  # ≈ 5 700 tokens
SECTION_TEXT = 1_400  # verbatim text per section before it is cut


def hex_color(c: str | None) -> str:
    """'rgb(0, 63, 255)' → '#003FFF'; a fully transparent colour → 'transparent'; anything else as it is."""
    if not c:
        return "?"
    m = re.match(r"rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)", c)
    if not m:
        return c
    if m.group(4) is not None and float(m.group(4)) == 0:
        return "transparent"
    return "#" + "".join(f"{int(v):02X}" for v in m.group(1, 2, 3))


def _font(f: str | None) -> str:
    return (f or "?").split(",")[0].strip().strip("\"'")


def _words(sec: dict[str, Any]) -> set[str]:
    text = " ".join([h.get("text", "") for h in sec.get("headings") or []] + (sec.get("lines") or [])[:8])
    return set(re.findall(r"[a-z0-9]{3,}", text.lower()))


def match_mobile(desktop: list[dict[str, Any]], mobile: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    """Desktop section index → the phone section with the most words in common (≥ 30 % of the smaller set)."""
    out: dict[int, dict[str, Any]] = {}
    mw = [(m, _words(m)) for m in mobile]
    for d in desktop:
        dw = _words(d)
        if not dw:
            continue
        best, score = None, 0.0
        for m, w in mw:
            if not w:
                continue
            s = len(dw & w) / min(len(dw), len(w))
            if s > score:
                best, score = m, s
        if best is not None and score >= 0.3:
            out[d["i"]] = best
    return out


def _heading_line(h: dict[str, Any]) -> str:
    return (f'{h.get("tag", "h?").upper()} {h.get("fontSize", "?")}/{h.get("fontWeight", "?")} '
            f'{hex_color(h.get("color"))}: "{h.get("text", "")[:160]}"')


def _media(sec: dict[str, Any], by_url: dict[str, str]) -> list[str]:
    out = []
    side = sec.get("imageSide")
    for k, im in enumerate(sec.get("images") or []):
        name = by_url.get(im.get("src", ""), Path(str(im.get("src", ""))).name[:60] or "?")
        where = f" (image {side})" if side and k == 0 else ""
        out.append(f"{name} {im.get('w')}×{im.get('h')}{where}")
    for v in sec.get("videos") or []:
        name = by_url.get(v.get("src", ""), Path(str(v.get("src", ""))).name[:60] or "video")
        flags = " ".join(f for f in ("autoplay", "loop", "muted") if v.get(f))
        out.append(f"{name} video {flags}".rstrip())
    for e in sec.get("embeds") or []:
        out.append(f"embed {e[:80]}")
    return out


def _phone(d: dict[str, Any], m: dict[str, Any] | None) -> str:
    if m is None:
        return "Phone: not shown on the phone" if (d.get("words") or 0) > 0 else ""
    notes = []
    if m.get("mediaFirst") and not d.get("mediaFirst"):
        notes.append("picture above the text")
    dh, mh = (d.get("headings") or [None])[0], (m.get("headings") or [None])[0]
    if dh and mh and dh.get("fontSize") != mh.get("fontSize"):
        notes.append(f"{mh.get('tag', 'h').upper()} {mh.get('fontSize')}")
    hidden_now = [t for t in (d.get("hidden") or []) if t not in (m.get("hidden") or [])]
    if hidden_now and len(hidden_now) < len(d.get("hidden") or []):
        notes.append(f"{len(hidden_now)} of the hidden texts show")
    return "Phone: " + " · ".join(notes) if notes else ""


def _section(d: dict[str, Any], m: dict[str, Any] | None, by_url: dict[str, str], budget: int) -> str:
    head = f"## s{d['i']:02d} · y {d.get('y')} · h {d.get('h')}"
    if d.get("hints"):
        head += " · " + ", ".join(d["hints"])
    if d.get("bg"):
        head += f" · bg {hex_color(d['bg'])}"
    lines = [head]
    for h in (d.get("headings") or [])[:6]:
        lines.append(_heading_line(h))
    if d.get("textColor"):
        lines.append(f"Text colour {hex_color(d['textColor'])}")
    text = "\n".join(t for t in (d.get("lines") or []) if t.strip())
    if len(text) > budget:
        text = text[:budget].rsplit("\n", 1)[0] + f"\n… ({len(text) - budget} more chars in source/text.md)"
    if text:
        lines.append("Text:\n" + text)
    if d.get("hidden"):
        lines.append("Hidden (FAQ answers, closed tabs): " + " | ".join(t[:300] for t in d["hidden"][:20]))
    btns = [f'"{b.get("text", "")[:60]}" {hex_color(b.get("bg"))}/{hex_color(b.get("color"))} r{b.get("radius")}'
            + (f" → {b['href'][:80]}" if b.get("href") else "") for b in (d.get("buttons") or [])[:6]]
    if btns:
        lines.append("Buttons: " + " · ".join(btns))
    media = _media(d, by_url)
    if media:
        lines.append("Media: " + " · ".join(media))
    phone = _phone(d, m)
    if phone:
        lines.append(phone)
    return "\n".join(lines)


def render(outline: dict[str, Any], outline_mobile: dict[str, Any] | None, assets: list[dict[str, Any]], url: str = "",
           shopdy_blocks: int | None = None) -> str:
    by_url = {a["url"]: Path(a["file"]).name for a in assets if a.get("url") and a.get("file")}
    secs = outline.get("sections") or []
    mobile = (outline_mobile or {}).get("sections") or []
    matched = match_mobile(secs, mobile)
    all_btns = Counter((hex_color(b.get("bg")), hex_color(b.get("color")), b.get("radius"))
                       for s in secs for b in s.get("buttons") or [] if hex_color(b.get("bg")) not in ("transparent", "?"))
    head = [
        f"# Digest · {outline.get('title', '')}",
        f"{url}",
        f"Page: {outline.get('height')} px at 1440 · background {hex_color(outline.get('bodyBg'))} · text "
        f"{hex_color(outline.get('bodyColor'))} · font {_font(outline.get('bodyFont'))}"
        + (f" (headings {outline['headingFont']})" if outline.get("headingFont") and
           _font(outline.get("headingFont")) != _font(outline.get("bodyFont")) else "")
        + (f" · content ≈{outline['contentWidth']} px" if outline.get("contentWidth") else ""),
    ]
    if all_btns:
        head.append("Buttons: " + " · ".join(f"{bg} text {fg} radius {r} (×{n})" for (bg, fg, r), n in all_btns.most_common(4)))
    for o in outline.get("overlays") or []:
        where = "top" if str(o.get("top", "")).startswith("0") else "bottom"
        head.append(f'Fixed / sticky: {where} bar {o.get("h")} px "{o.get("text", "")[:120]}"'
                    + (f" ({', '.join(o['hints'])})" if o.get("hints") else ""))
    if shopdy_blocks:
        head.append(f"Made with shopdy: {shopdy_blocks} blocks in source/shopdy-blocks.json (types, values, CSS): "
                    "rebuild from that file, not from this text.")
    head.append(f"Sections: {len(secs)} · phone sections: {len(mobile)} · pictures: overview-desktop / overview-mobile "
                "jpg, one section: source/sections/sNN.png")
    out = "\n".join(head) + "\n"
    budget = SECTION_TEXT
    while True:
        body = "\n\n".join(_section(d, matched.get(d["i"]), by_url, budget) for d in secs)
        if len(out) + len(body) <= MAX_CHARS or budget <= 200:
            break
        budget = int(budget * 0.7)
    return out + "\n" + body + "\n"
