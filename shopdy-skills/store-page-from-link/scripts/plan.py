"""Plans made by code, so Claude only reviews them.

  python -I plan.py layout --job J            score every layout against the competitor's block order
  python -I plan.py draft  --job J [--layout L] [--out build-plan.draft.json]
                                              a build plan: reshape the layout, then every block filled from
                                              source/shopdy-blocks.json (a shopdy competitor) or a skeleton from
                                              source/outline.json (any other page), with the catalog's labels only

The page starts as the chosen layout. The palette adds a block at the END of the page and "Move up" moves it one
place (store-page-editor.page.tsx `add` / `move`), so the draft deletes the layout blocks it does not keep from the
bottom up, then walks the competitor's blocks in order: a kept block is already in place (select #n), a new one is
added and moved up past the kept blocks that come after it. A field the catalog does not have is never guessed: it
goes to the summary's `review` list. Standard library only.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import catalog  # noqa: E402

FITS = 0.35  # a layout fits when it keeps at least this share of its own blocks (and 3 or more)
FONTS = ["Lato", "Poppins", "Inter"]
ALIGN = {"left": "Left", "center": "Centre", "centre": "Centre", "right": "Right"}
SHOW_ON = {"desktop": "Desktop only", "mobile": "Mobile only", "all": "Desktop and mobile"}


# ── layout ──────────────────────────────────────────────────────────────────


def lcs(a: list[str], b: list[str]) -> list[tuple[int, int]]:
    """Longest common subsequence of two type lists: [(index in a, index in b)], in order."""
    n, m = len(a), len(b)
    t = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            t[i][j] = t[i + 1][j + 1] + 1 if a[i] == b[j] else max(t[i + 1][j], t[i][j + 1])
    out, i, j = [], 0, 0
    while i < n and j < m:
        if a[i] == b[j]:
            out.append((i, j))
            i, j = i + 1, j + 1
        elif t[i + 1][j] >= t[i][j + 1]:
            i += 1
        else:
            j += 1
    return out


def score_layouts(wanted: list[str], layouts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Every layout (+ Blank page) with what it keeps, deletes and adds; the best first: a layout that fits, then the
    most blocks kept, then the fewest ops. Blank page wins only when no layout fits."""
    rows = []
    for lay in [{"name": "Blank page", "blocks": []}] + [x for x in layouts if x.get("name") != "Blank page"]:
        blocks = lay.get("blocks") or []
        pairs = lcs(blocks, wanted)
        kept = {i for i, _ in pairs}
        reuse = len(pairs)
        fits = bool(blocks) and reuse >= 3 and reuse >= FITS * len(blocks)
        rows.append({"name": lay["name"], "reuse": reuse, "of": len(blocks), "fits": fits,
                     "ops": len(blocks) + len(wanted) - 2 * reuse,
                     "keep": [blocks[i] for i in sorted(kept)],
                     "delete": [f"#{i + 1} {b}" for i, b in enumerate(blocks) if i not in kept],
                     "add": [w for j, w in enumerate(wanted) if j not in {jj for _, jj in pairs}]})
    rows.sort(key=lambda r: (not r["fits"], -r["reuse"], r["ops"]))
    if not rows[0]["fits"]:
        rows.sort(key=lambda r: r["name"] != "Blank page")
    return rows


# ── what the competitor page is made of ─────────────────────────────────────


def _load(job: Path, rel: str) -> Any:
    f = job / rel
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None


def guess_type(sec: dict[str, Any]) -> str:
    """A rough block type for a section of a page not made with shopdy."""
    hints = set(sec.get("hints") or [])
    for hint, btype in (("countdown", "countdown"), ("reviews", "reviews"), ("steps", "steps"),
                        ("comparison", "comparison"), ("slider", "slider")):
        if hint in hints:
            return btype
    if {"price", "variants"} <= hints or ({"price", "buy-button"} <= hints and sec.get("images")):
        return "mainproduct"
    if sec.get("buttons") and (sec.get("words") or 0) < 80 and not sec.get("images"):
        return "cta"
    if not sec.get("images") and not sec.get("videos") and "accordion" not in hints and not sec.get("hidden"):
        return "text"
    return "html"


def competitor(job: Path) -> tuple[str, list[dict[str, Any]]]:
    """("shopdy", blocks of shopdy-blocks.json) or ("outline", sections of outline.json with a guessed type)."""
    sb = _load(job, "source/shopdy-blocks.json")
    if sb and sb.get("blocks"):
        return "shopdy", sb["blocks"]
    outline = _load(job, "source/outline.json") or {}
    secs = [dict(s, type=guess_type(s), id=f"s{s['i']:02d}") for s in outline.get("sections") or []
            if (s.get("words") or 0) > 0 or s.get("images")]
    if any("countdown" in (o.get("hints") or []) for o in outline.get("overlays") or []):
        o = next(o for o in outline["overlays"] if "countdown" in (o.get("hints") or []))
        secs.insert(0, {"id": "o00", "type": "countdown", "lines": [o.get("text", "")], "sticky": True})
    return "outline", secs


def layouts_of(job: Path, cat: dict[str, Any]) -> list[dict[str, Any]]:
    if cat.get("layouts"):
        return cat["layouts"]
    opts = _load(job.parent, "options.json") or {}
    return opts.get("layouts") or []


# ── the draft ───────────────────────────────────────────────────────────────


class Draft:
    def __init__(self, job: Path, cat: dict[str, Any], state: dict[str, Any]):
        self.job, self.cat, self.state = job, cat, state
        self.ops: list[dict[str, Any]] = []
        self.review: list[str] = []
        self.deferred: list[tuple[int, dict[str, Any]]] = []  # (block position, op) run after every block exists
        self.position = 0
        assets = _load(job, "source/assets.json") or []
        self.media = {a["url"]: Path(a["file"]).name for a in assets if a.get("url") and a.get("file")}

    def entry(self, btype: str) -> dict[str, Any] | None:
        return self.cat.get("page") if btype == "page" else self.cat.get("blocks", {}).get(btype)

    def set(self, btype: str, where: str, label: str, value: Any, optional: bool = False, **extra: Any) -> None:
        """A `set` op when the catalog has the field, else a line for Claude to check. `optional`: a field that
        only shows once an earlier op changed the block (a reviews style): the op goes in anyway; the build reads
        the block again when it is missing, and skips it with a warning if it still is."""
        if value is None or value == "":
            if value is None and label in ("Goes to", "Style", "Font", "Align", "Show on"):
                self.review.append(f"{where} {btype}: \"{label}\" — no matching option in the catalog, set it by hand")
            return
        fld = catalog.find_field(self.entry(btype), label)
        if fld is None and optional:
            self.ops.append({"op": "set", "label": label, "value": value, "optional": True, **extra})
            return
        if fld is None:
            self.review.append(f"{where} {btype}: no field \"{label}\" in the catalog — {label} = {str(value)[:60]}")
            return
        if fld.get("options") and fld.get("kind") in ("select", "choice", "radio") and value not in fld["options"]:
            self.review.append(f"{where} {btype}: \"{label}\" has no option {value!r} ({' | '.join(fld['options'])})")
            return
        op = {"op": "set", "label": label, "value": value, **extra}
        if btype == "page":
            op["scope"] = "page"
        self.ops.append(op)

    def option(self, btype: str, label: str, pattern: str) -> str | None:
        fld = catalog.find_field(self.entry(btype), label) or {}
        return next((o for o in fld.get("options") or [] if re.search(pattern, o, re.I)), None)

    def tokens(self, html: str, media: list[dict[str, str]]) -> str:
        for m in media:
            name = self.media.get(m.get("url", ""))
            if name:
                html = html.replace(f'"{m["src"]}"', f'"{{{{media:{name}}}}}"')
            else:
                self.review.append(f"picture not downloaded: {m.get('url', '')[:100]}")
        return html

    # page settings
    def page(self, width: Any, background: str | None, font: str | None) -> None:
        self.ops.append({"op": "page"})
        if font:
            self.set("page", "page", "Font", font if font in FONTS else "System default")
        if width:
            w = int(re.sub(r"\D", "", str(width)) or 0)
            if w:
                self.set("page", "page", "Content width", max(320, min(1600, w)))
        if background:
            self.set("page", "page", "Page background", background)

    # one shopdy block → its fields
    def spacing(self, b: dict[str, Any]) -> None:
        t, where, st = b["type"], b["id"], b.get("style") or {}
        pad = [int(x) for x in re.findall(r"(\d+)px", st.get("padding", ""))]
        if pad:
            self.set(t, where, "Padding ↕", pad[0])
            self.set(t, where, "Padding ↔", pad[1] if len(pad) > 1 else pad[0])
        if st.get("text-align") in ALIGN:
            self.set(t, where, "Align", ALIGN[st["text-align"]])
        if b.get("vis") and b["vis"] != "all":
            self.set(t, where, "Show on", SHOW_ON.get(b["vis"]))

    def fill_shopdy(self, b: dict[str, Any]) -> None:
        t, where, f = b["type"], b["id"], b.get("fields") or {}
        if t == "countdown":
            self.set(t, where, "Text", f.get("text"))
            self.set(t, where, "Minutes", f.get("minutes"))
            self.set(t, where, "Background", f.get("background"))
            self.set(t, where, "Text colour", f.get("color"))
            if b.get("sticky"):
                self.review.append(f"{where} countdown: sticky (stick to the top) — no such field in the catalog, set it by hand")
        elif t == "cta":
            self.set(t, where, "Button text", f.get("text"))
            href = f.get("href") or ""
            if href.startswith("#main-product") or ("checkout" in href.lower() and self.state.get("product")):
                pattern = r"main product" if href.startswith("#main-product") else r"^Checkout:"
                if catalog.find_field(self.entry(t), "Goes to"):
                    # The option's wording depends on the page ("Scroll to the Main Product block" exists only once
                    # the page has one): picked live, at the end, when every block is there.
                    self.deferred.append((self.position, {"op": "set", "label": "Goes to", "match": pattern}))
                else:
                    self.review.append(f"{where} cta: no field \"Goes to\" in the catalog — destination {href}")
            elif href:
                self.set(t, where, "…or a custom URL", href)
            self.set(t, where, "Button colour", f.get("background"))
            self.set(t, where, "Text colour", f.get("color"))
            r = re.sub(r"\D", "", f.get("radius") or "")
            if r:
                self.set(t, where, "Corner radius", int(r))
            if f.get("fullWidth"):
                self.review.append(f"{where} cta: full width — check the button size in the editor")
        elif t == "text":
            self.set(t, where, "Text", f.get("html"))
        elif t == "html":
            sec = self.job / "sections"
            sec.mkdir(exist_ok=True)
            (sec / f"{where}.html").write_text(self.tokens(b.get("html", ""), b.get("media") or []), encoding="utf-8")
            (sec / f"{where}.css").write_text(b.get("css", ""), encoding="utf-8")
            self.ops.append({"op": "fill", "label": "HTML", "value_file": f"sections/{where}.html"})
            self.ops.append({"op": "fill", "label": "CSS", "value_file": f"sections/{where}.css"})
        elif t == "footer":
            self.set(t, where, "Text", re.sub(r"\b20\d\d\b", "{year}", f.get("text") or ""))
            for k, link in enumerate(f.get("links") or []):
                if k:
                    self.ops.append({"op": "click", "name": "Add link"})
                self.set(t, where, f"Link {k + 1} label", link.get("text"))
                self.set(t, where, f"Link {k + 1} address", link.get("href"))
            self.set(t, where, "Block background", f.get("background"))
        elif t == "reviews":
            self.reviews(b)
        elif t == "mainproduct":
            self.review.append(f"{where} mainproduct: drawn by the store's theme and product (block-notes.md); "
                               "check the page's product")
        else:
            self.review.append(f"{where} {t}: no filling rule — fill it from source/shopdy-blocks.json")
        if t != "footer":
            bg = (b.get("style") or {}).get("background")
            if bg:
                self.set(t, where, "Block background", bg)
        self.spacing(b)

    def reviews(self, b: dict[str, Any]) -> None:
        t, where, f = "reviews", b["id"], b.get("fields") or {}
        self.set(t, where, "Heading", f.get("heading"))
        items = f.get("items") or []
        if any(it.get("image") for it in items):
            self.set(t, where, "Style", self.option(t, "Style", r"photo"))
        self.set(t, where, "Star size", f.get("starSize"), optional=True)
        self.set(t, where, "Columns on desktop", f.get("columns"), optional=True)
        if f.get("accent"):
            self.review.append(f"{where} reviews: accent colour {f['accent']} (stars / verified tick)")
        name_field = catalog.find_field(self.entry(t), "Review 1 name") or {}
        have = int(name_field.get("count") or 1)
        for k, it in enumerate(items):
            if k >= have:
                self.ops.append({"op": "click", "name": "Add review"})
            self.set(t, where, f"Review {k + 1} name", it.get("name"), optional=True)
            self.set(t, where, f"Review {k + 1} title", it.get("title"), optional=True)
            self.set(t, where, f"Review {k + 1} text", it.get("text"), optional=True)
            self.set(t, where, f"Review {k + 1} when", it.get("date"), optional=True)
            self.set(t, where, "Rating", it.get("rating"), optional=True, nth=k)
            photo = self.media.get((it.get("image") or {}).get("url", ""))
            if photo:
                self.ops.append({"op": "item-image", "item": f"Review {k + 1}", "media": f"{{{{media:{photo}}}}}",
                                 "optional": True})
            elif it.get("image"):
                self.review.append(f"{where} reviews: review {k + 1} photo not downloaded")
        if len(items) < have:
            self.review.append(f"{where} reviews: the block starts with {have} reviews, the competitor has {len(items)}: "
                               "remove the extra ones")
        for key in ("badge", "sub"):
            if f.get(key):
                self.review.append(f"{where} reviews: {key} = {f[key][:80]}")

    def fill_outline(self, s: dict[str, Any]) -> None:
        t, where = s["type"], s["id"]
        lines = s.get("lines") or []
        if t == "countdown":
            self.set(t, where, "Text", re.sub(r"\b\d{1,2}:\d{2}(:\d{2})?\b", "{timer}", lines[0] if lines else ""))
        elif t == "cta" and s.get("buttons"):
            btn = s["buttons"][0]
            self.set(t, where, "Button text", btn.get("text"))
        elif t == "text" and lines:
            self.set(t, where, "Text", "".join(f"<p>{x}</p>" for x in lines))
        self.review.append(f"{where} {t}: from digest.md {where} — check / finish it (texts, colours, pictures)")


def draft(job: Path, cat: dict[str, Any], layouts: list[dict[str, Any]] | None = None,
          layout: str | None = None) -> tuple[dict[str, Any], dict[str, Any]]:
    state = _load(job, "state.json") or {}
    kind, items = competitor(job)
    layouts = layouts if layouts is not None else layouts_of(job, cat)
    name = layout or state.get("layout") or "Blank page"
    lay = next((x for x in layouts if x.get("name") == name), {"name": "Blank page", "blocks": []})
    blocks = lay.get("blocks") or []
    wanted = [x["type"] for x in items]
    pairs = lcs(blocks, wanted)
    kept_for = {j: i for i, j in pairs}  # wanted index → layout index
    d = Draft(job, cat, state)

    outline = _load(job, "source/outline.json") or {}
    sb = _load(job, "source/shopdy-blocks.json") or {}
    d.page(sb.get("maxWidth") or outline.get("contentWidth"),
           _hex(outline.get("bodyBg")) if outline.get("bodyBg") else None,
           _font(outline.get("bodyFont")))

    for i in sorted(set(range(len(blocks))) - set(kept_for.values()), reverse=True):
        d.ops += [{"op": "select", "block": f"#{i + 1}"}, {"op": "action", "name": "Delete"}]
    for p, it in enumerate(items):
        if p in kept_for:
            d.ops.append({"op": "select", "block": f"#{p + 1}"})
        else:
            alias = f"{it['type']}-{it['id']}"
            d.ops.append({"op": "add", "type": it["type"], "as": alias})
            after = sum(1 for q in kept_for if q > p)
            d.ops += [{"op": "action", "name": "Move up"}] * after
        d.ops.append({"op": "note", "section": it["id"], "block": f"#{p + 1}"})
        d.position = p + 1
        if kind == "shopdy":
            d.fill_shopdy(it)
        else:
            d.fill_outline(it)
        d.ops.append({"op": "save"})
    for pos, op in d.deferred:
        d.ops += [{"op": "select", "block": f"#{pos}"}, op]
    if d.deferred:
        d.ops.append({"op": "save"})
    summary = {"layout": lay["name"], "from": kind, "blocks": len(items), "kept": len(pairs),
               "deleted": len(blocks) - len(pairs), "added": len(items) - len(pairs), "ops": len(d.ops),
               "review": d.review}
    return {"ops": d.ops}, summary


def _hex(c: str | None) -> str | None:
    m = re.match(r"rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)", c or "")
    return "#" + "".join(f"{int(v):02X}" for v in m.groups()) if m else c


def _font(f: str | None) -> str | None:
    name = (f or "").split(",")[0].strip().strip("\"'")
    return name or None


# ── commands ────────────────────────────────────────────────────────────────


def main() -> None:
    from _common import job_dir  # noqa: E402 - only the CLI needs the job folders

    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("layout", "draft"):
        sp = sub.add_parser(name)
        sp.add_argument("--job", required=True)
        if name == "draft":
            sp.add_argument("--layout", help="layout name (default: the one the page was created with)")
            sp.add_argument("--out", default="build-plan.draft.json")
    args = ap.parse_args()
    job = job_dir(args.job)
    cat = catalog.load()
    if args.cmd == "layout":
        kind, items = competitor(job)
        rows = score_layouts([x["type"] for x in items], layouts_of(job, cat))
        (job / "layout-score.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
        best = rows[0]
        print(f"layout {best['name']}  keeps {best['reuse']}/{best['of']}  fits {best['fits']}  ops {best['ops']}  "
              f"(from {kind}: {len(items)} blocks)")
        print(f"  keep: {', '.join(best['keep']) or '-'}")
        print(f"  delete: {', '.join(best['delete']) or '-'}")
        print(f"  add: {', '.join(best['add']) or '-'}")
        print("next   " + " · ".join(f"{r['name']} {r['reuse']}/{r['of']}{' fits' if r['fits'] else ''}" for r in rows[1:4]))
        if not best["fits"]:
            print("no layout fits: build from Blank page and draft a 'new built-in layout' ticket (rule 11)")
        print(f"full   {job / 'layout-score.json'}")
        return
    plan, summary = draft(job, cat, layout=args.layout)
    out = job / args.out
    out.write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"draft {out.name}: layout {summary['layout']} · {summary['blocks']} blocks (kept {summary['kept']}, "
          f"deleted {summary['deleted']}, added {summary['added']}) · {summary['ops']} ops · from {summary['from']}")
    for line in summary["review"][:40]:
        print(f"  check: {line}")
    if len(summary["review"]) > 40:
        print(f"  … {len(summary['review']) - 40} more in the plan's notes")
    print(f"next: read it, fix what `check` lists, then upload-media --plan {out.name} and build --plan {out.name}")


if __name__ == "__main__":
    main()
