"""The block catalog of the shopdy page builder, kept on this machine in <skill>/catalog/:

  block-catalog.json  every block type: its inspector fields (label, kind, options, min/max/step), actions
  block-catalog.md    the same, short, for Claude to read instead of the shopdy source
  changes.log         one line per fix: when the editor no longer matched the file and the file was rewritten

The file is made once (full scan of the editor, see shopdy.py `catalog`) and then corrected piece by piece whenever
an inspector that is open anyway does not match it. This module is the pure part: compare, merge, write, render.
Standard library only.
"""

from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

FORMAT = 1
SKILL_DIR = Path(__file__).resolve().parent.parent
CATALOG_DIR = SKILL_DIR / "catalog"
NOTES_FILE = SKILL_DIR / "references" / "block-notes.md"
MAX_OPTIONS = 8


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── reading and writing the file ────────────────────────────────────────────


def load(directory: Path = CATALOG_DIR) -> dict[str, Any]:
    f = Path(directory) / "block-catalog.json"
    if not f.exists():
        return {"format": FORMAT, "blocks": {}}
    data = json.loads(f.read_text(encoding="utf-8"))
    data.setdefault("blocks", {})
    return data


def _write_atomic(path: Path, text: str) -> None:
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    for attempt in range(5):  # Windows refuses a replace while another process reads the file
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            if attempt == 4:
                raise
            time.sleep(0.2)


def notes_text(path: Path = NOTES_FILE) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


# ── comparing ───────────────────────────────────────────────────────────────


def norm_label(label: str) -> str:
    """'Review 2 ' → 'review #': numbered rows of a list are the same field."""
    return re.sub(r"\d+", "#", re.sub(r"\s+", " ", str(label or "")).strip()).lower()


def _keyed(fields: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    """(group, label with numbers as #) → the first such field. Rows of a list ("Review 1", "Review 2", "Rating" ×6)
    are one field, so how many rows a page has never looks like a change (inspector_js.merge_repeats does the same)."""
    out: dict[tuple[str, str], dict[str, Any]] = {}
    for fld in fields or []:
        out.setdefault((str(fld.get("group") or "").lower(), norm_label(fld.get("label", ""))), fld)
    return out


def _range(fld: dict[str, Any]) -> str | None:
    if fld.get("min") is None and fld.get("max") is None:
        return None
    lo = "" if fld.get("min") is None else _num(fld["min"])
    hi = "" if fld.get("max") is None else _num(fld["max"])
    return f"{lo}–{hi}"


def _num(v: Any) -> str:
    return str(int(v)) if isinstance(v, float) and v.is_integer() else str(v)


def field_diff(old: list[dict[str, Any]], new: list[dict[str, Any]], prefix: str = "") -> list[str]:
    a, b = _keyed(old), _keyed(new)
    changes: list[str] = []
    for key, fld in a.items():
        if key not in b:
            changes.append(f'{prefix}-"{fld.get("label")}"')
    for key, nf in b.items():
        of = a.get(key)
        label = nf.get("label")
        if of is None:
            changes.append(f'{prefix}+"{label}"')
            continue
        if of.get("kind") != nf.get("kind"):
            changes.append(f'{prefix}"{label}" {of.get("kind")} → {nf.get("kind")}')
        if "options" in nf and (of.get("options") or []) != (nf.get("options") or []):  # absent = not read
            changes.append(f'{prefix}"{label}" options {"|".join(of.get("options") or [])} → '
                           f'{"|".join(nf.get("options") or [])}')
        if _range(of) != _range(nf) or of.get("step") != nf.get("step"):
            changes.append(f'{prefix}"{label}" {_range(of) or "?"} → {_range(nf) or "?"}'
                           + (f" step {of.get('step')} → {nf.get('step')}" if of.get("step") != nf.get("step") else ""))
        if of.get("item") or nf.get("item"):
            changes += field_diff(of.get("item") or [], nf.get("item") or [], prefix=f'{prefix}"{label}" item ')
    return changes


def find_field(entry: dict[str, Any] | None, label: str) -> dict[str, Any] | None:
    """The field of a catalog entry with this label (numbers in the label do not matter: "Review 4 name")."""
    want = norm_label(label)
    for fld in (entry or {}).get("fields") or []:
        if norm_label(fld.get("label", "")) == want:
            return fld
    return None


def entry_diff(old: dict[str, Any], new: dict[str, Any]) -> list[str]:
    changes = field_diff(old.get("fields") or [], new.get("fields") or [])
    oa, na = old.get("actions") or [], new.get("actions") or []
    changes += [f'-action "{x}"' for x in oa if x not in na] + [f'+action "{x}"' for x in na if x not in oa]
    if old.get("palette") and new.get("palette") and old["palette"] != new["palette"]:
        changes.append(f'palette "{old["palette"]}" → "{new["palette"]}"')
    return changes


def _generic_options(label: str, options: list[str]) -> list[str]:
    """The store's own products in a select ("Checkout: Tank", a product picker) → placeholders, so the catalog
    reads the same on every store."""
    out: list[str] = []
    for i, o in enumerate(options):
        if o.startswith("Checkout: "):
            o = "Checkout: <product>"
        elif re.search(r"\bproduct\b", label, re.I) and i > 0:
            o = "<a product of the store>"
        if o not in out:
            out.append(o)
    return out


def _generic_fields(fields: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for fld in fields or []:
        fld = dict(fld)
        if fld.get("options"):
            fld["options"] = _generic_options(str(fld.get("label") or ""), list(fld["options"]))
        if fld.get("item"):
            fld["item"] = _generic_fields(fld["item"])
        fld.pop("value", None)  # what this page holds, not what the editor offers
        out.append(fld)
    return out


def generic(entry: dict[str, Any]) -> dict[str, Any]:
    entry = dict(entry)
    entry["fields"] = _generic_fields(entry.get("fields") or [])
    return entry


def merge_entry(old: dict[str, Any] | None, new: dict[str, Any]) -> dict[str, Any]:
    """What a check of one open block teaches: fields seen now replace or join the old ones; fields not seen stay,
    as the block's current settings may hide them (a "Photo wall" reviews block shows other fields than "Quote
    cards"). Only a full scan drops fields."""
    if old is None:
        return dict(new)
    seen = _keyed(new.get("fields") or [])
    merged: list[dict[str, Any]] = []
    for key, fld in _keyed(old.get("fields") or []).items():
        if key in seen:
            nf = dict(seen.pop(key))
            if "options" not in nf and fld.get("options"):
                nf["options"] = fld["options"]  # a quick read leaves the options out
            elif fld.get("options") and nf.get("options"):
                # options depend on the page too ("Scroll to the Main Product block" only once there is one)
                nf["options"] = list(fld["options"]) + [o for o in nf["options"] if o not in fld["options"]]
            merged.append(nf)
        else:
            merged.append(fld)
    merged += list(seen.values())
    out = dict(old)
    out.update({k: v for k, v in new.items() if k not in ("fields", "actions")})
    out["fields"] = merged
    out["actions"] = list(dict.fromkeys((old.get("actions") or []) + (new.get("actions") or [])))
    return out


def _stamp_new_fields(old: dict[str, Any] | None, new: dict[str, Any], when: str) -> None:
    """Fields that were not in the old entry remember when they were first seen (the first scan stamps nothing)."""
    if old is None:
        return
    before = _keyed(old.get("fields") or [])
    prev_stamp = {k: v.get("firstSeen") for k, v in before.items()}
    for key, fld in _keyed(new.get("fields") or []).items():
        if key not in before:
            fld["firstSeen"] = when
        elif prev_stamp.get(key):
            fld["firstSeen"] = prev_stamp[key]


# ── saving ──────────────────────────────────────────────────────────────────


def save(
    directory: Path,
    updates: dict[str, dict[str, Any]],
    *,
    job: str = "",
    sha: str | None = None,
    notes: str | None = None,
    full: bool = False,
    removed: list[str] | None = None,
    layouts: list[dict[str, Any]] | None = None,
    page: dict[str, Any] | None = None,
    base: str | None = None,
    merge: bool = False,
) -> list[str]:
    """Merges `updates` (type → entry, as just read in the editor) into the newest file and writes it if anything
    changed. `full` = a full scan (the first one, or --refresh). `merge` = a check of one open block (merge_entry:
    never drops a field). Returns the changes, `"<type>: <change>"`; a first scan returns [] (it is not a fix).
    Only fixes are logged in changes.log."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    when = now_iso()
    cat = load(directory)
    existed = (directory / "block-catalog.json").exists()
    blocks = cat["blocks"]
    changes: list[str] = []
    if page is not None:
        page = generic(page)
    for btype, entry in updates.items():
        old = blocks.get(btype)
        entry = generic(merge_entry(old, entry) if merge else entry)
        entry.setdefault("type", btype)
        entry["status"] = entry.get("status") if merge and entry.get("status") else (entry.get("status") or "ok")
        if old is None:
            if existed:
                changes.append(f"{btype}: new block")
        else:
            changes += [f"{btype}: {c}" for c in entry_diff(old, entry)]
            if old.get("status") != entry["status"] and entry["status"] != "ok":
                changes.append(f"{btype}: {entry['status']}")
        _stamp_new_fields(old if existed else None, entry, when)
        entry["checked"] = when
        if job:
            entry["job"] = job
        blocks[btype] = entry
    for btype in removed or []:
        if btype in blocks and blocks[btype].get("status") != "removed":
            blocks[btype]["status"] = "removed"
            changes.append(f"{btype}: removed from the palette")
    if page is not None:
        if cat.get("page") and existed:
            changes += [f"page settings: {c}" for c in field_diff(cat["page"].get("fields") or [], page.get("fields") or [])]
        cat["page"] = page
    if layouts is not None:
        old_names = [x.get("name") for x in cat.get("layouts") or []]
        new_names = [x.get("name") for x in layouts]
        if existed and cat.get("layouts") is not None and old_names != new_names:
            changes.append(f"layouts: {' | '.join(old_names)} → {' | '.join(new_names)}")
        cat["layouts"] = layouts
    if existed and not changes and not full:
        return []
    cat.update(format=FORMAT, updated=when)
    if sha is not None:
        cat["sha"] = sha
    if base is not None:
        cat["base"] = base
    _write_atomic(directory / "block-catalog.json", json.dumps(cat, ensure_ascii=False, indent=1))
    _write_atomic(directory / "block-catalog.md", render_md(cat, notes_text() if notes is None else notes))
    if changes and existed:
        with (directory / "changes.log").open("a", encoding="utf-8") as log:
            for c in changes:
                log.write(f"{when}\t{job or '-'}\t{c}\n")
    return changes if existed else []


# ── palette ─────────────────────────────────────────────────────────────────


def type_for(palette_label: str, known: dict[str, str]) -> str:
    """'Add CTA button block' → 'cta' (known type → label map), else a slug of the label."""
    label = re.sub(r"^Add\s+|\s+block$", "", palette_label.strip())
    for btype, lab in known.items():
        if lab.lower() == label.lower():
            return btype
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


def palette_diff(cat: dict[str, Any], palette_labels: list[str]) -> tuple[list[str], list[str]]:
    """(palette buttons the catalog does not know, catalog types whose button is gone)."""
    by_palette = {e.get("palette"): t for t, e in cat.get("blocks", {}).items() if e.get("status") != "removed"}
    new = [p for p in palette_labels if p not in by_palette]
    missing = [t for p, t in by_palette.items() if p not in palette_labels]
    return new, missing


# ── the short version for Claude ────────────────────────────────────────────


def _notes_date(notes: str) -> str:
    m = re.search(r"Reviewed against the editor on:\s*(\d{4}-\d{2}-\d{2})", notes)
    return m.group(1) if m else ""


def _covered(btype: str, notes: str) -> bool:
    return re.search(rf"^##\s+{re.escape(btype)}\b", notes, re.M) is not None


def _field_md(fld: dict[str, Any], reviewed: str) -> str:
    out = f"{fld.get('label')} {fld.get('kind')}"
    if fld.get("options"):
        opts = list(fld["options"])
        out += "[" + "|".join(opts[:MAX_OPTIONS]) + ("|…" if len(opts) > MAX_OPTIONS else "") + "]"
    elif _range(fld):
        out += f"[{_range(fld)}]"
    if fld.get("item"):
        out += "{" + " · ".join(_field_md(x, reviewed) for x in fld["item"]) + "}"
    if fld.get("firstSeen") and fld["firstSeen"][:10] > reviewed:
        out += " MỚI"
    return out


def _groups_md(fields: list[dict[str, Any]], reviewed: str) -> dict[str, str]:
    groups: dict[str, list[str]] = {}
    for fld in fields or []:
        groups.setdefault(fld.get("group") or "Fields", []).append(_field_md(fld, reviewed))
    return {g: f"{g}: " + " · ".join(items) for g, items in groups.items()}


def _fields_md(fields: list[dict[str, Any]], reviewed: str) -> list[str]:
    return list(_groups_md(fields, reviewed).values())


def _shared_groups(blocks: dict[str, Any], reviewed: str) -> dict[str, str]:
    """Groups that are exactly the same in at least 3 blocks (spacing, visibility…): printed once."""
    seen: dict[tuple[str, str], int] = {}
    for e in blocks.values():
        for g, text in _groups_md(e.get("fields") or [], reviewed).items():
            seen[(g, text)] = seen.get((g, text), 0) + 1
    shared: dict[str, str] = {}
    for (g, text), n in seen.items():
        if n >= 3 and n >= max((m for (g2, _), m in seen.items() if g2 == g), default=0):
            shared[g] = text
    return shared


def render_md(cat: dict[str, Any], notes: str) -> str:
    reviewed = _notes_date(notes)
    blocks = cat.get("blocks", {})
    shared = _shared_groups(blocks, reviewed)
    lines = [
        f"# Block catalog (made on this machine) · prod {cat.get('sha') or '?'} · updated "
        f"{str(cat.get('updated') or '?')[:10]} · {len(blocks)} blocks",
        "Use this instead of the shopdy source. Field = label kind[options|min–max]{list item fields}. "
        "MỚI = not covered by references/block-notes.md yet: trust this file, not old notes.",
        "",
    ]
    if cat.get("page"):
        lines += ["## Page settings (`\"scope\": \"page\"`)"] + _fields_md(cat["page"].get("fields") or [], reviewed) + [""]
    if cat.get("layouts"):
        lines.append("Layouts: " + " | ".join(f"{x.get('name')} ({', '.join(x.get('blocks') or [])})"
                                             for x in cat["layouts"]))
        lines.append("")
    if shared:
        lines += ["## Groups most blocks share (only where a block says \"same as every block\")"]
        lines += list(shared.values()) + [""]
    for btype in sorted(blocks):
        e = blocks[btype]
        mark = "" if _covered(btype, notes) else " MỚI"
        status = "" if e.get("status") in (None, "ok") else f" [{e['status']}{': ' + e['error'] if e.get('error') else ''}]"
        lines.append(f"## {btype} ({e.get('label') or btype}){mark}{status}")
        own, same = [], []
        for g, text in _groups_md(e.get("fields") or [], reviewed).items():
            (same if shared.get(g) == text else own).append(g if shared.get(g) == text else text)
        lines += own
        if same:
            lines.append("same as every block: " + ", ".join(same))
        if e.get("actions"):
            lines.append("actions: " + ", ".join(e["actions"]))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def show(cat: dict[str, Any], btype: str, notes: str = "") -> str:
    """One block, as in the .md."""
    one = dict(cat, blocks={btype: cat["blocks"][btype]}) if btype in cat.get("blocks", {}) else None
    if one is None:
        return f"no block {btype!r}; known: {', '.join(sorted(cat.get('blocks', {})))}"
    one.pop("layouts", None)
    one.pop("page", None)
    return render_md(one, notes).split("\n", 3)[-1]
