"""Reads every field of the editor's inspector panel (the block inspector, or Page settings) into catalog entries:
{group, label, kind, options?, min?, max?, step?, value?, count?}. Kinds: text, textarea, rich, code, number,
slider, color, image, select, choice, switch, checkbox, radio.

The markup it knows (shopdy-promax apps/web/src/features/store-pages/components, read once by the maintainer):
- inspector-fields.tsx: Section = `div.border-b` > trigger button > title; Row = label + control in a
  `div.space-y-1.5`; NumberField `input[type=number]`; RangeField `input[type=range]` (Playwright cannot `fill` it);
  ColorField `input[type=color]` + a text box; ImageField = label, "Choose or upload", `input[aria-label="<label> URL"]`.
- shadcn / Radix Select: `button[role=combobox]`, its options only exist while it is open.
- rich-text-toolbar.tsx: `[role=toolbar]` with its own selects: not fields.
- list rows carry numbered aria-labels ("Review 2 name") and repeated ones ("Rating"): merged into one field.
- block-toolbar.tsx: `[aria-label="<Label> block actions"]` buttons with a title.
No Playwright import here: `page` / `root` are passed in.
"""

from __future__ import annotations

import re
from typing import Any

INSPECTOR_JS = r"""
(root) => {
  const txt = (e) => (e ? (e.innerText || e.textContent || '') : '').replace(/\s+/g, ' ').trim();
  const shown = (e) => {
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
    }
    return true;
  };
  const groupOf = (e) => {
    const sec = e.closest('.border-b');
    if (!sec || !root.contains(sec)) return '';
    const trigger = [...sec.children].find((c) => c.tagName === 'BUTTON');
    return trigger ? txt(trigger) : '';
  };
  const rowOf = (e) => {
    for (let n = e.parentElement; n && n !== root; n = n.parentElement) {
      if (n.classList.contains('space-y-1.5') || n.classList.contains('space-y-2')) return n;
    }
    return null;
  };
  const labelFor = (e) => {
    for (let n = e, i = 0; n && n !== root && i < 3; n = n.parentElement, i++) {
      if (n.id) {
        const l = root.querySelector(`label[for="${CSS.escape(n.id)}"]`);
        if (l) return txt(l);
      }
    }
    return '';
  };
  const labelOf = (e) => {
    const aria = e.getAttribute('aria-label');
    if (aria) return aria;
    const by = labelFor(e);
    if (by) return by;
    const lb = e.getAttribute('aria-labelledby');
    if (lb && document.getElementById(lb)) return txt(document.getElementById(lb));
    const row = rowOf(e);
    const l = row && row.querySelector('label');
    if (l && !l.contains(e)) return txt(l);
    const g = e.closest('[role=group][aria-label]');
    return g && root.contains(g) ? g.getAttribute('aria-label') : '';
  };
  const num = (v) => (v === null || v === '' || isNaN(Number(v)) ? undefined : Number(v));
  const out = [];
  const seen = new Set();
  const SEL = 'input:not([type=hidden]):not([type=file]),textarea,select,[role=combobox],[role=switch],' +
    '[role=checkbox],[contenteditable=true],.cm-content,button[aria-pressed]';
  let ref = 0;
  for (const e of root.querySelectorAll(SEL)) {
    if (seen.has(e) || !shown(e) || e.closest('[role=toolbar]')) continue;
    if (e.closest('.cm-content') && !e.classList.contains('cm-content')) continue;
    const type = (e.getAttribute('type') || '').toLowerCase();
    // the text box beside a colour picker is the same field
    if (e.tagName === 'INPUT' && type !== 'color' && e.parentElement && e.parentElement.querySelector('input[type=color]')) continue;
    const f = { group: groupOf(e) };
    if (e.matches('button[aria-pressed]')) {
      const sibs = [...e.parentElement.querySelectorAll(':scope > button[aria-pressed]')];
      sibs.forEach((s) => seen.add(s));
      Object.assign(f, { kind: 'choice', label: labelOf(e.parentElement) || labelOf(e), options: sibs.map(txt),
        value: txt(sibs.find((s) => s.getAttribute('aria-pressed') === 'true')) });
    } else if (e.classList.contains('cm-content')) {
      Object.assign(f, { kind: 'code', label: labelOf(e.closest('.cm-editor') || e) || labelOf(e), value: txt(e).slice(0, 60) });
    } else if (e.isContentEditable) {
      Object.assign(f, { kind: 'rich', label: labelOf(e), value: txt(e).slice(0, 60) });
    } else if (e.getAttribute('role') === 'combobox') {
      e.setAttribute('data-spfl', String(ref));
      Object.assign(f, { kind: 'select', label: labelOf(e), value: txt(e), ref: ref++ });
    } else if (e.getAttribute('role') === 'switch' || e.getAttribute('role') === 'checkbox') {
      Object.assign(f, { kind: e.getAttribute('role'), label: labelOf(e), value: e.getAttribute('aria-checked') });
    } else if (e.tagName === 'SELECT') {
      Object.assign(f, { kind: 'select', label: labelOf(e), options: [...e.options].map((o) => txt(o)), value: e.value });
    } else if (e.tagName === 'TEXTAREA') {
      Object.assign(f, { kind: 'textarea', label: labelOf(e), value: e.value.slice(0, 60) });
    } else if (/ URL$/.test(e.getAttribute('aria-label') || '') && rowOf(e) &&
               [...rowOf(e).querySelectorAll('button')].some((b) => /choose or upload|change image/i.test(txt(b)))) {
      Object.assign(f, { kind: 'image', label: e.getAttribute('aria-label').replace(/ URL$/, ''), value: e.value.slice(0, 60) });
    } else if (/^…or paste a(n image)? URL/i.test(labelOf(e))) {
      // the Image block: "Choose or upload image" + a Row "…or paste a URL" (block-inspector.tsx)
      Object.assign(f, { kind: 'image', label: 'Image', via: labelOf(e), value: e.value.slice(0, 60) });
    } else {
      const kind = { range: 'slider', number: 'number', color: 'color', checkbox: 'checkbox', radio: 'radio' }[type] || 'text';
      Object.assign(f, { kind, label: labelOf(e), value: String(e.value ?? '').slice(0, 60) });
      if (kind === 'slider' || kind === 'number') Object.assign(f, { min: num(e.getAttribute('min')),
        max: num(e.getAttribute('max')), step: kind === 'slider' ? num(e.getAttribute('step')) ?? 1 : undefined });
    }
    seen.add(e);
    if (f.label) out.push(f);
  }
  return out;
}
"""

ACTIONS_JS = r"""
(id) => {
  const wrap = document.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
  const bar = wrap && wrap.querySelector('[aria-label$=" block actions"]');
  if (!bar) return [];
  return [...new Set([...bar.querySelectorAll('button')].map((b) => b.getAttribute('title') || b.getAttribute('aria-label') || '').filter(Boolean))];
}
"""

CLOSED_SECTIONS = "div.border-b > button[aria-expanded=false]"


def _norm(label: str) -> str:
    return re.sub(r"\d+", "#", re.sub(r"\s+", " ", label).strip()).lower()


def merge_repeats(fields: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One field per (group, label with numbers as #): rows of a list ("Review 2 name", "Rating" ×6) are one field.
    `count` says how many there were (not compared: it follows the content)."""
    out: dict[tuple[str, str], dict[str, Any]] = {}
    for fld in fields:
        key = (fld.get("group") or "", _norm(fld.get("label") or ""))
        if key in out:
            out[key]["count"] = out[key].get("count", 1) + 1
            continue
        out[key] = {k: v for k, v in fld.items() if v is not None}
    return list(out.values())


def open_sections(root: Any) -> None:
    closed = root.locator(CLOSED_SECTIONS)
    for _ in range(12):
        if not closed.count():
            return
        closed.first.click()


def _close_listbox(page: Any, box: Any, current: str) -> None:
    """Close an open Radix select by picking the option it already has (no change). Never Escape: in the editor
    Escape also deselects the block, and the inspector being read goes away."""
    if not box.count():
        return
    same = box.get_by_role("option", name=current, exact=True)
    try:
        (same.first if same.count() else box.get_by_role("option").first).click(timeout=2_000)
    except Exception:  # noqa: BLE001
        page.keyboard.press("Escape")  # last resort; read() notices a lost inspector


def read(page: Any, root: Any, with_options: bool = True) -> list[dict[str, Any]]:
    """Every field of the panel `root` (a Playwright locator). Opens closed sections, opens each Radix select to read
    its options and closes it again with the option it already had; never changes a value. `with_options=False`: a
    quick read (one evaluate) that leaves the options of Radix selects out."""
    open_sections(root)
    fields = root.evaluate(INSPECTOR_JS)
    for fld in fields:
        ref = fld.pop("ref", None)
        if ref is None or not with_options:
            continue
        fld["options"] = []
        if not root.is_visible():
            continue  # the panel went away (a last-resort Escape): keep the field, without its options
        box = page.get_by_role("listbox").last
        try:
            root.locator(f'[data-spfl="{ref}"]').click(timeout=3_000)
            box.wait_for(timeout=3_000)
            fld["options"] = [t.strip() for t in box.get_by_role("option").all_inner_texts()]
        except Exception:  # noqa: BLE001 - a select that will not open still is a field
            pass
        finally:
            _close_listbox(page, box, str(fld.get("value") or ""))
    return merge_repeats(fields)


def read_actions(page: Any, block_id: str) -> list[str]:
    return page.evaluate(ACTIONS_JS, block_id)
