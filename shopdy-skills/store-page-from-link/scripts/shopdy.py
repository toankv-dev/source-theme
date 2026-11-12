"""Drive the shopdy admin (Adlux Promax) in a real Chromium for one store-page job.

  python -I scripts/shopdy.py <command> [options]

  login                         open /login, sign in with SHOPDY_EMAIL / SHOPDY_PASSWORD from .env
                                (or let the user sign in by hand in the window); the profile keeps it
  options                       stores (with products) and page layouts this account can use — read only
  create  --job J --name N --store S [--layout L] [--product P] [--slug X]
                                New page dialog → editor; the page stays Draft; id saved in state.json
  upload-media --job J [--only GLOB]
                                upload assets/images + assets/videos to /media, write media-map.json
  build   --job J --plan FILE [--from N]
                                run a build plan (JSON ops, see references/editor-ui.md) in the editor,
                                saving after every `save` op and at the end; resumable with --from
  inspect --job J [--block REF] add --fields to list the inspector controls of that block
  shot    --job J [--view pc|mobile] [--phone]
                                editor canvas, screen by screen, into _work/<job>/shots/
  verify  --job J               status must be Draft + phone checks at 360 px + screenshots
  exec    --job J --script FILE run a Python snippet with `s` (Session), `page`, `job`, `state`, `ed` in scope

Every command runs behind the guard in _common.py: a request that would publish the page, delete
anything, edit another page, or write outside the allow-list is aborted and logged in guard.log.

Playwright APIs (official docs): get_by_role / get_by_label / get_by_test_id
https://playwright.dev/python/docs/locators, set_input_files https://playwright.dev/python/docs/input,
expect_response https://playwright.dev/python/docs/network
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import (  # noqa: E402
    PHONE_VIEWPORT,
    Session,
    die,
    emit,
    job_dir,
    load_state,
    log_line,
    now_iso,
    save_state,
)

# PAGE_BLOCK_LABELS in packages/shared-types/src/domain/page-block.ts — the palette tile is
# "Add <label> block" (block-palette.tsx).
BLOCK_LABELS = {
    "header": "Header", "heading": "Heading", "byline": "Author line", "share": "Share buttons",
    "text": "Text", "image": "Image", "slider": "Slider", "feature": "Image + text",
    "steps": "Numbered steps", "cta": "CTA button", "offer": "Offer box", "mainproduct": "Main product",
    "product": "Side product card", "stickybar": "Sticky bottom button", "comparison": "Comparison table",
    "reviews": "Reviews", "countdown": "Countdown", "html": "Custom HTML", "divider": "Divider",
    "spacer": "Spacer", "footer": "Footer",
}
BUTTON_TYPES = {"cta", "offer", "product", "stickybar"}
UPLOADABLE = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".mp4", ".webm", ".ogv", ".ogg", ".mov"}


# ── small helpers ───────────────────────────────────────────────────────────


def exact(text: str) -> re.Pattern[str]:
    return re.compile(rf"^\s*{re.escape(text)}\s*$")


def page_id_of(state: dict[str, Any]) -> str:
    pid = state.get("pageId")
    if not pid:
        die("This job has no page yet. Run: shopdy.py create --job ...")
    return pid


def fetch_page(s: Session, pid: str) -> dict[str, Any]:
    return s.api("GET", f"/store-pages/{pid}")


def assert_draft(page_dto: dict[str, Any]) -> None:
    if page_dto.get("status") != "draft":
        die(
            f"PAGE IS NOT DRAFT (status={page_dto.get('status')}). Stop and tell the user: "
            "the skill never publishes; they must set it back to Draft themselves.",
            code=3,
        )


# ── the editor ──────────────────────────────────────────────────────────────


class Editor:
    """The page editor at /store-pages/<id>/edit (store-page-editor.page.tsx)."""

    def __init__(self, s: Session, job: Path, state: dict[str, Any]):
        self.s, self.page, self.job, self.state = s, s.page, job, state
        self.pid = page_id_of(state)
        self.aliases: dict[str, str] = state.setdefault("aliases", {})
        self.current: str | None = None
        self.scope = "block"  # "page" = the Page settings panel (no block selected)

    # navigation
    def open(self) -> None:
        self.s.goto(f"/store-pages/{self.pid}/edit")
        self.page.get_by_test_id("canvas-scroll").wait_for(timeout=30_000)
        palette = self.page.get_by_test_id("block-palette")
        if not palette.is_visible():
            show = self.page.get_by_role("button", name="Show block palette")
            if show.count():
                show.click()
        palette.wait_for(timeout=10_000)

    # blocks on the canvas, in page order
    def ids(self) -> list[str]:
        ids = self.page.eval_on_selector_all(
            "[data-testid=canvas-scroll] [data-block-id]", "els => els.map(e => e.dataset.blockId)"
        )
        seen: list[str] = []
        for i in ids:
            if i not in seen:
                seen.append(i)
        return seen

    def resolve(self, ref: str | int) -> str:
        """alias → id, `#3` → third block (1-based), anything else → a block id."""
        if isinstance(ref, int) or (isinstance(ref, str) and ref.startswith("#")):
            n = int(str(ref).lstrip("#"))
            ids = self.ids()
            if not 1 <= n <= len(ids):
                raise ValueError(f"no block #{n} (page has {len(ids)})")
            return ids[n - 1]
        return self.aliases.get(ref, ref)

    def inspector(self):
        if self.scope == "page":
            return self.page.locator("aside").filter(
                has=self.page.get_by_text("Page settings", exact=True)).first
        return self.page.get_by_test_id("block-inspector")

    def page_settings(self) -> None:
        """Deselect every block so the right panel shows Page settings (name, product, layout,
        font, content width, background). Escape is ignored while a field has focus."""
        self.page.evaluate("() => document.activeElement && document.activeElement.blur()")
        self.page.keyboard.press("Escape")
        self.scope = "page"
        self.current = None
        self.inspector().wait_for(timeout=10_000)

    def open_sections(self) -> None:
        """Open the inspector's closed groups ("Spacing & layout", "Visibility" start closed;
        inspector-fields.tsx `Section` = a Radix Collapsible whose trigger is its first child)."""
        closed = self.inspector().locator("div.border-b > button[aria-expanded=false]")
        for _ in range(8):
            if not closed.count():
                return
            closed.first.click()

    def select(self, ref: str | int) -> str:
        bid = self.resolve(ref)
        self.scope = "block"
        self.page.keyboard.press("Escape")  # close a stray menu (image options, link popover)
        wrap = self.page.locator(f'[data-testid=canvas-scroll] [data-block-id="{bid}"]').first
        wrap.scroll_into_view_if_needed()
        # page-canvas.tsx BlockShell: role=button "Select <Label> block", selects on Enter when it
        # has focus itself. A mouse click lands on the block's own widgets instead (an empty
        # image opens its "Image options" menu), so use the keyboard.
        shell = wrap.get_by_role("button", name=re.compile(r"^Select .+ block$")).first
        shell.press("Enter")
        self.inspector().wait_for(timeout=10_000)
        try:  # the inspector header shows the block id under its type
            self.inspector().get_by_text(bid, exact=True).first.wait_for(timeout=5_000)
        except Exception:  # noqa: BLE001
            raise RuntimeError(f"block {bid} did not become selected")
        self.open_sections()
        self.current = bid
        return bid

    def add(self, btype: str, alias: str | None) -> str:
        label = BLOCK_LABELS.get(btype)
        if not label:
            raise ValueError(f"unknown block type {btype!r}; one of {sorted(BLOCK_LABELS)}")
        self.scope = "block"
        before = set(self.ids())
        self.page.get_by_test_id("block-palette").get_by_role(
            "button", name=f"Add {label} block", exact=True
        ).click()
        self.page.wait_for_function(
            "n => new Set([...document.querySelectorAll('[data-testid=canvas-scroll] [data-block-id]')]"
            ".map(e => e.dataset.blockId)).size > n",
            arg=len(before),
        )
        new = [i for i in self.ids() if i not in before]
        bid = new[0]
        if alias:
            self.aliases[alias] = bid
        self.current = bid
        self.inspector().wait_for(timeout=10_000)
        self.open_sections()
        return bid

    # inspector fields
    def row(self, label: str, nth: int = 0):
        lab = self.inspector().locator("label").filter(has_text=exact(label))
        if lab.count() <= nth:
            raise LookupError(f"no field labelled {label!r} in the inspector — run inspect --fields")
        return lab.nth(nth).locator("xpath=..")

    def control(self, label: str, nth: int = 0):
        insp = self.inspector()
        direct = insp.get_by_label(label, exact=True)
        cands = [direct.nth(i) for i in range(direct.count())]
        cands = [c for c in cands if c.is_visible() and c.evaluate("e => e.type !== 'color'")]
        if len(cands) > nth:
            c = cands[nth]
            # A labelled wrapper (CodeMirror's div[role=group]) holds the editable box inside it.
            where = c.evaluate(
                "e => e.matches('input,textarea,select,[contenteditable]:not([contenteditable=false]),"
                "[role=combobox],[role=switch],[role=checkbox]') ? 'self'"
                " : e.querySelector('.cm-content') ? 'cm' : e.querySelector('[contenteditable]') ? 'ce' : 'self'"
            )
            if where == "cm":
                return c.locator(".cm-content").first
            if where == "ce":
                return c.locator("[contenteditable]").first
            return c
        row = self.row(label, nth)
        # Editable box first: a rich text row also holds its toolbar's controls.
        for sel in (
            "[contenteditable=true], [contenteditable=plaintext-only]",
            ".cm-content",
            "textarea",
            "input:not([type=color]):not([type=file]):not([type=hidden])",
            "[role=combobox]",
            "[role=switch], [role=checkbox]",
        ):
            loc = row.locator(sel)
            if loc.count():
                return loc.first
        raise LookupError(f"field {label!r} has no input control")

    def fill(self, label: str, value: str | None = None, html: str | None = None, nth: int = 0) -> None:
        ctl = self.control(label, nth)
        kind = ctl.evaluate(
            "e => e.classList.contains('cm-content') ? 'code' : e.isContentEditable ? 'rich' : e.tagName.toLowerCase()"
        )
        if kind == "code":
            self._code(ctl, value or "")
        elif html is not None and kind == "rich":
            ctl.click()
            ctl.evaluate(
                "(e, h) => { e.innerHTML = h; e.dispatchEvent(new InputEvent('input', {bubbles: true})); }", html
            )
            ctl.blur()
        else:
            ctl.fill(value or "")
            ctl.blur()  # EditableText commits on blur

    def _code(self, ctl, text: str) -> None:
        """CodeMirror: select everything, then type the new text in one input event."""
        ctl.click()
        self.page.keyboard.press("Control+A")
        self.page.keyboard.press("Delete")
        if text:
            self.page.keyboard.insert_text(text)

    def number(self, label: str, value: int | float, nth: int = 0) -> None:
        inp = self.row(label, nth).locator("input[type=number], input[type=range]").first
        if inp.get_attribute("type") == "range":
            inp.evaluate(
                "(e, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;"
                " set.call(e, String(v)); e.dispatchEvent(new Event('input', {bubbles: true}));"
                " e.dispatchEvent(new Event('change', {bubbles: true})); }",
                value,
            )
        else:
            inp.fill(str(value))
            inp.blur()

    def color(self, label: str, value: str, nth: int = 0) -> None:
        txt = self.row(label, nth).locator("input:not([type=color])").first
        txt.fill(value)
        txt.blur()

    def choose(self, label: str, option: str, nth: int = 0) -> None:
        insp = self.inspector()
        combo = insp.get_by_role("combobox", name=label, exact=True)
        if not combo.count():
            try:
                combo = self.row(label, nth).locator("[role=combobox], select")
            except LookupError:
                combo = insp.locator("nothing-here")
        if combo.count():
            c = combo.nth(nth if combo.count() > nth else 0)
            if c.evaluate("e => e.tagName") == "SELECT":
                c.select_option(label=option)
                return
            c.click()
            self.page.get_by_role("option", name=option, exact=True).click()
            return
        row = self.row(label, nth)
        for role in ("radio", "button", "tab"):
            target = row.get_by_role(role, name=option, exact=True)
            if target.count():
                target.first.click()
                return
        raise LookupError(f"no option {option!r} under {label!r}")

    def toggle(self, label: str, value: bool, nth: int = 0) -> None:
        insp = self.inspector()
        ctl = None
        for role in ("switch", "checkbox"):
            cand = insp.get_by_role(role, name=label, exact=True)
            if cand.count():
                ctl = cand.nth(nth if cand.count() > nth else 0)
                break
        if ctl is None:
            ctl = self.row(label, nth).locator("[role=switch], [role=checkbox], input[type=checkbox]").first
        on = ctl.evaluate("e => e.getAttribute('aria-checked') === 'true' || e.checked === true")
        if bool(on) != bool(value):
            ctl.click()

    def image(self, label: str, media: str, nth: int = 0) -> str:
        url = media_url(self.job, media)
        insp = self.inspector()
        box = insp.get_by_label(f"{label} URL", exact=True)  # ImageField (inspector-fields.tsx)
        if box.count():
            box.nth(nth if box.count() > nth else 0).fill(url)
            box.nth(nth if box.count() > nth else 0).blur()
            return url
        for row_label in ("…or paste a URL", label):  # the Image block's own URL row
            try:
                inp = self.row(row_label, nth).locator("input").first
                if inp.count():
                    inp.fill(url)
                    inp.blur()
                    return url
            except LookupError:
                continue
        raise LookupError(f"no image URL box for {label!r}")

    def click(self, name: str, role: str = "button", scope: str = "inspector", nth: int = 0) -> None:
        root = self.inspector() if scope == "inspector" else self.page
        root.get_by_role(role, name=name, exact=True).nth(nth).click()

    def block_action(self, title: str) -> None:
        """Toolbar of the selected block: Move up, Move down, Duplicate, Delete, Convert to editable blocks."""
        bid = self.current or ""
        wrap = self.page.locator(f'[data-testid=canvas-scroll] [data-block-id="{bid}"]').first
        btn = wrap.get_by_role("button", name=title, exact=True)
        if not btn.count():
            btn = self.page.get_by_role("button", name=title, exact=True)
        btn.first.click()

    # save
    def save(self) -> dict[str, Any]:
        btn = self.page.get_by_role("banner").get_by_role("button", name="Save", exact=True)
        if not btn.count():
            btn = self.page.get_by_role("button", name="Save", exact=True)
        with self.page.expect_response(
            lambda r: r.request.method == "PATCH" and re.search(rf"/api/store-pages/{self.pid}$", r.url) is not None,
            timeout=30_000,
        ) as info:
            btn.first.click()
        res = info.value
        body = res.json() if res.ok else {}
        data = body.get("data", {}) if isinstance(body, dict) else {}
        if not res.ok:
            raise RuntimeError(f"save failed: HTTP {res.status} {body}")
        assert_draft(data)
        out = {"status": data.get("status"), "blocks": len(((data.get("blocks") or {}).get("blocks")) or [])}
        if data.get("sanitizedAway"):
            out["sanitizedAway"] = data["sanitizedAway"]
        return out

    def fields(self) -> list[dict[str, Any]]:
        return self.inspector().evaluate(
            """root => {
                const out = [];
                const FIELD = 'input:not([type=hidden]):not([type=file]),textarea,select,[contenteditable],[role=combobox],[role=switch],[role=checkbox],.cm-content';
                // Editable box first: a rich text row also holds its toolbar's <select>s.
                const pick = (el) => el && (el.querySelector('[contenteditable]') || el.querySelector('.cm-content') ||
                  el.querySelector('textarea') || el.querySelector('input:not([type=hidden]):not([type=file]):not([type=color])') ||
                  el.querySelector('[role=combobox],[role=switch],[role=checkbox]') || el.querySelector('input[type=color]') || el.querySelector('select'));
                for (const lab of root.querySelectorAll('label')) {
                  const row = lab.parentElement;
                  let ctl = lab.htmlFor && document.getElementById(lab.htmlFor);
                  if (ctl && !ctl.matches(FIELD)) ctl = pick(ctl);
                  if (!ctl) ctl = pick(row);
                  let kind = '', value = '';
                  if (ctl) {
                    kind = ctl.classList && ctl.classList.contains('cm-content') ? 'code'
                      : ctl.isContentEditable ? 'rich' : (ctl.getAttribute('role') || ctl.type || ctl.tagName.toLowerCase());
                    value = ctl.isContentEditable || kind === 'code' ? ctl.innerText : (ctl.value ?? ctl.getAttribute('aria-checked') ?? ctl.innerText);
                  }
                  out.push({ label: lab.innerText.trim(), kind, value: String(value || '').slice(0, 120) });
                }
                for (const el of root.querySelectorAll('[aria-label]')) {
                  if (el.closest('label')) continue;
                  const tag = el.tagName.toLowerCase();
                  if (['input', 'textarea'].includes(tag) || el.isContentEditable || el.getAttribute('role') === 'combobox')
                    out.push({ label: el.getAttribute('aria-label'), kind: el.isContentEditable ? 'rich' : (el.getAttribute('role') || el.type || tag), value: String(el.value ?? el.innerText ?? '').slice(0, 120), via: 'aria-label' });
                }
                const buttons = [...root.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.innerText || '').trim()).filter(Boolean);
                out.push({ buttons: [...new Set(buttons)] });
                return out;
            }"""
        )

    def screens(self, out_dir: Path, prefix: str, max_n: int = 30) -> list[str]:
        """The canvas only (no admin chrome), one screen per file, top to bottom."""
        self.page.keyboard.press("Escape")
        scroller = self.page.get_by_test_id("canvas-scroll")
        total, view = scroller.evaluate("e => [e.scrollHeight, e.clientHeight]")
        files = []
        n = min(max_n, max(1, -(-total // max(view, 1))))
        for i in range(n):
            scroller.evaluate(f"e => e.scrollTo(0, {i * view})")
            self.page.wait_for_timeout(300)
            f = out_dir / f"{prefix}-{i + 1:02d}.png"
            scroller.screenshot(path=str(f))
            files.append(f.name)
        scroller.evaluate("e => e.scrollTo(0, 0)")
        return files

    def viewport(self, which: str) -> None:
        # The PC / Mobile toggle sits in the editor's top bar ([data-page-header]); the inspector's
        # "Show on" row has its own Mobile option, so never look for it page-wide.
        header = self.page.locator("[data-page-header]")
        header.get_by_role("button", name="Mobile" if which == "mobile" else "PC", exact=True).first.click()
        self.page.wait_for_timeout(500)


# ── media map ───────────────────────────────────────────────────────────────


def media_map(job: Path) -> dict[str, Any]:
    f = job / "media-map.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def media_url(job: Path, ref: str) -> str:
    """A file name (or path) from assets/ → its shopdy media URL. A full https URL passes through."""
    if ref.startswith(("http://", "https://", "/")):
        return ref
    mm = media_map(job)
    name = Path(ref).name
    hit = mm.get(name) or next((v for k, v in mm.items() if k.endswith(name)), None)
    if not hit:
        raise LookupError(f"{name} is not in media-map.json — run upload-media first")
    return hit["url"]


# ── commands ────────────────────────────────────────────────────────────────


def cmd_login(args: argparse.Namespace) -> None:
    with Session(headless_flag=args.headless) as s:
        s.goto("/store-pages")
        s.page.wait_for_timeout(1500)
        if s.logged_in():
            emit({"loggedIn": True, "url": s.page.url, "note": "already signed in (saved profile)"})
            return
        if "/login" not in s.page.url:
            s.goto("/login")
        email, password = s.env.get("SHOPDY_EMAIL"), s.env.get("SHOPDY_PASSWORD")
        if email and password:
            s.page.get_by_test_id("login-email").fill(email)
            s.page.get_by_test_id("login-password").fill(password)
            s.page.get_by_test_id("login-submit").click()
        else:
            print("No SHOPDY_EMAIL / SHOPDY_PASSWORD in .env: sign in by hand in the window (5 minutes).",
                  file=sys.stderr)
        try:
            s.page.wait_for_function(
                "() => { try { const a = JSON.parse(localStorage.getItem('adlux:auth')||'null');"
                " return !!(a && a.state && a.state.accessToken) && !location.pathname.startsWith('/login'); }"
                " catch { return false; } }",
                timeout=300_000 if not (email and password) else 30_000,
            )
        except Exception:  # noqa: BLE001
            err = s.page.locator("[role=alert], .text-destructive").first
            msg = err.inner_text() if err.count() else "no redirect after sign-in"
            die(f"login failed: {msg} (wrong account? captcha? the account may be pending approval)")
        emit({"loggedIn": True, "url": s.page.url})


def cmd_options(args: argparse.Namespace) -> None:
    with Session(headless_flag=True) as s:
        s.ensure_logged_in()
        opts = s.api("GET", "/store-pages/options")
        layouts = s.api("GET", "/page-layouts")
    emit({
        "stores": [{"id": st["id"], "name": st["name"], "products": [
            {"listingId": p["listingId"], "title": p["title"]} for p in st.get("products", [])][:50]}
            for st in opts.get("stores", [])],
        "layouts": [{"id": layout_row.get("id"), "name": layout_row.get("name"),
                     "builtinKey": layout_row.get("builtinKey"), "description": layout_row.get("description", ""),
                     "blocks": [b.get("type") for b in ((layout_row.get("document") or {}).get("blocks") or [])]}
                    for layout_row in (layouts if isinstance(layouts, list) else layouts.get("items", []))],
        "note": "'Blank page' is always available as layout 'blank'.",
    })


def cmd_create(args: argparse.Namespace) -> None:
    job = job_dir(args.job)
    state = load_state(job)
    if state.get("pageId"):
        die(f"this job already has page {state['pageId']} — never create a second page for one job")
    with Session(job=job, headless_flag=args.headless) as s:
        s.ensure_logged_in()
        p = s.page
        s.goto("/store-pages")
        p.get_by_role("button", name=re.compile(r"New page")).first.click()
        dlg = p.get_by_role("dialog")
        dlg.get_by_role("combobox", name="Pick a store").click()
        p.get_by_label("Search domain").fill(args.store)
        p.get_by_role("option", name=re.compile(re.escape(args.store), re.I)).first.click()
        if args.product:
            # product-picker.tsx: a plain button with aria-haspopup="listbox", not a combobox
            dlg.get_by_role("button", name="Product it sells").click()
            p.get_by_label("Search products").fill(args.product)
            p.get_by_role("listbox", name="Products").get_by_role(
                "option", name=re.compile(re.escape(args.product), re.I)).first.click()
        layout = args.layout or "Blank page"
        if layout.lower() == "blank":
            layout = "Blank page"
        radios = dlg.get_by_role("radiogroup", name="Layout")
        radios.wait_for()
        radios.get_by_role("radio", name=layout, exact=True).first.click()
        dlg.get_by_placeholder("Floor Gap Fixer story").fill(args.name)
        if args.slug:
            dlg.get_by_label("Page slug").fill(args.slug)
        ai = dlg.get_by_role("checkbox", name=re.compile("Write the copy and make the photos with AI"))
        if ai.count() and ai.get_attribute("aria-checked") == "true":
            ai.click()  # the copy comes from the competitor page, not the AI autoflow
        with p.expect_response(
            lambda r: r.request.method == "POST" and re.search(r"/api/store-pages/?$", r.url) is not None,
            timeout=30_000,
        ) as info:
            dlg.get_by_role("button", name="Create and open editor").click()
        res = info.value
        body = res.json()
        if not res.ok:
            die(f"create failed: HTTP {res.status} {body}")
        data = body.get("data", body)
        assert_draft(data)
        state.update(pageId=data["id"], pageName=data.get("name"), slug=data.get("slug"),
                     storeId=data.get("storeId"), storeName=data.get("storeName"), layout=layout,
                     product=data.get("productTitle"), createdPageAt=now_iso())
        save_state(job, state)
        p.wait_for_url(re.compile(rf"/store-pages/{data['id']}/edit"), timeout=30_000)
        emit({"pageId": data["id"], "name": data.get("name"), "slug": data.get("slug"),
              "store": data.get("storeName"), "status": data.get("status"), "layout": layout,
              "editor": f"{s.base}/store-pages/{data['id']}/edit"})


def cmd_upload_media(args: argparse.Namespace) -> None:
    job = job_dir(args.job)
    mm = media_map(job)
    wanted: set[str] | None = None
    if args.plan:  # only what the plan uses, not every icon of the competitor page
        plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
        ops = plan["ops"] if isinstance(plan, dict) else plan
        wanted = media_refs([{**o, "_job": str(job)} for o in ops])
    files = []
    for sub in ("assets/images", "assets/videos"):
        for f in sorted((job / sub).glob("*")):
            if f.suffix.lower() not in UPLOADABLE or f.name in mm:
                continue
            if args.only and not fnmatch.fnmatch(f.name, args.only):
                continue
            if wanted is not None and f.name not in wanted:
                continue
            if f.suffix.lower() not in (".mp4", ".webm", ".ogv", ".ogg", ".mov") and f.stat().st_size > 10 * 1024 * 1024:
                print(f"skip {f.name}: over 10 MB", file=sys.stderr)
                continue
            files.append(f)
    failed: list[str] = []
    with Session(job=job, headless_flag=args.headless) as s:
        s.ensure_logged_in()
        p = s.page
        done: list[int] = []

        def on_response(res: Any) -> None:
            if res.request.method == "POST" and re.search(r"/api/media/upload$", res.url):
                done.append(res.status)
                if not res.ok:
                    failed.append(f"HTTP {res.status}")

        p.on("response", on_response)
        # A re-run (or an earlier run that stopped half-way) must not upload a file twice.
        already = {f.name: _find_media(s, f) for f in files}
        for name, hit in already.items():
            if hit and hit.get("filename") == name:
                mm[name] = {"url": hit["url"], "id": hit.get("id"), "mimeType": hit.get("mimeType")}
        files_to_send = [f for f in files if f.name not in mm]
        for start in range(0, len(files_to_send), args.batch):
            batch = files_to_send[start:start + args.batch]
            s.goto("/media")
            p.locator("#media-upload-file-trigger").click()
            dlg = p.get_by_role("dialog")
            dlg.locator("input[type=file]").first.set_input_files([str(f) for f in batch])
            target = len(done) + len(batch)
            p.locator("#media-upload-btn").click()
            # The dialog hands the queue to a background uploader and may close itself:
            # count the upload responses instead of waiting on the dialog.
            for _ in range(1200):
                if len(done) >= target:
                    break
                p.wait_for_timeout(500)
            p.keyboard.press("Escape")
        for f in files_to_send:
            hit = _find_media(s, f)
            if hit:
                mm[f.name] = {"url": hit["url"], "id": hit.get("id"), "mimeType": hit.get("mimeType")}
    (job / "media-map.json").write_text(json.dumps(mm, ensure_ascii=False, indent=2), encoding="utf-8")
    missing = [f.name for f in files if f.name not in mm]
    emit({"sent": len(files_to_send), "alreadyInLibrary": len(files) - len(files_to_send),
          "inMap": len(mm), "missing": missing, "httpErrors": failed})


def _find_media(s: Session, f: Path) -> dict[str, Any] | None:
    """The media library item uploaded from this file (names are unique: <job>-NNN-<name>)."""
    from urllib.parse import quote

    items = _walk_media(s.api("GET", f"/media?search={quote(f.stem)}&pageSize=20"))
    return next((i for i in items if i.get("filename") == f.name), None) or \
        next((i for i in items if f.stem in str(i.get("filename", ""))), None)


def _walk_media(node: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(node, dict):
        if "filename" in node and "url" in node:
            found.append(node)
        for v in node.values():
            found += _walk_media(v)
    elif isinstance(node, list):
        for v in node:
            found += _walk_media(v)
    return found


MEDIA_TOKEN = re.compile(r"\{\{media:([^}]+)\}\}")


def media_refs(ops: list[dict[str, Any]]) -> set[str]:
    """File names a plan uses: `media` fields and {{media:<file>}} tokens (in values or value files)."""
    names: set[str] = set()
    for op in ops:
        if op.get("media"):
            names.add(Path(op["media"]).name)
        for key in ("value", "html"):
            if isinstance(op.get(key), str):
                names.update(Path(m.strip()).name for m in MEDIA_TOKEN.findall(op[key]))
        if op.get("value_file") and Path(op["_job"], op["value_file"]).exists():
            text = Path(op["_job"], op["value_file"]).read_text(encoding="utf-8")
            names.update(Path(m.strip()).name for m in MEDIA_TOKEN.findall(text))
    return {n for n in names if not n.startswith(("http://", "https://"))}


def resolve_values(ed: Editor, op: dict[str, Any]) -> dict[str, Any]:
    """`value_file` (path inside the job folder) → value; {{media:<file>}} → its shopdy URL."""
    op = dict(op)
    if op.get("value_file"):
        op["value"] = (ed.job / op["value_file"]).read_text(encoding="utf-8")
    for key in ("value", "html"):
        if isinstance(op.get(key), str):
            op[key] = MEDIA_TOKEN.sub(lambda m: media_url(ed.job, m.group(1).strip()), op[key])
    return op


def run_op(ed: Editor, op: dict[str, Any]) -> Any:
    op = resolve_values(ed, op)
    kind = op["op"]
    nth = int(op.get("nth", 0))
    if op.get("scope") == "page" and ed.scope != "page":
        ed.page_settings()
    if kind == "page":
        return ed.page_settings()
    if kind == "add":
        return ed.add(op["type"], op.get("as"))
    if kind == "select":
        return ed.select(op.get("block", op.get("index")))
    if kind == "fill":
        return ed.fill(op["label"], op.get("value"), op.get("html"), nth)
    if kind == "number":
        return ed.number(op["label"], op["value"], nth)
    if kind == "color":
        return ed.color(op["label"], op["value"], nth)
    if kind == "choose":
        return ed.choose(op["label"], op["option"], nth)
    if kind == "toggle":
        return ed.toggle(op["label"], bool(op["value"]), nth)
    if kind == "image":
        return ed.image(op["label"], op["media"], nth)
    if kind == "click":
        return ed.click(op["name"], op.get("role", "button"), op.get("scope", "inspector"), nth)
    if kind == "action":
        return ed.block_action(op["name"])
    if kind == "press":
        ed.page.keyboard.press(op["key"])
        return None
    if kind == "wait":
        ed.page.wait_for_timeout(int(op.get("ms", 500)))
        return None
    if kind == "save":
        return ed.save()
    if kind == "note":
        return op.get("text")
    raise ValueError(f"unknown op {kind!r}")


def cmd_build(args: argparse.Namespace) -> None:
    job = job_dir(args.job)
    state = load_state(job)
    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    ops = plan["ops"] if isinstance(plan, dict) else plan
    prev = state.get("build", {})
    same_plan = prev.get("plan") == str(Path(args.plan).resolve()) and not prev.get("finished")
    start = args.start if args.start is not None else (int(prev.get("next", 0)) if same_plan else 0)
    done_since_save = 0
    results = []
    with Session(job=job, page_id=page_id_of(state), headless_flag=args.headless) as s:
        s.ensure_logged_in()
        assert_draft(fetch_page(s, page_id_of(state)))
        ed = Editor(s, job, state)
        ed.open()
        i = start
        try:
            for i in range(start, len(ops)):
                op = ops[i]
                out = run_op(ed, op)
                results.append({"i": i, "op": op["op"], "out": out})
                done_since_save = 0 if op["op"] == "save" else done_since_save + 1
                if op["op"] == "save":
                    state["build"] = {"plan": str(Path(args.plan).resolve()), "next": i + 1, "at": now_iso()}
                    save_state(job, state)
            if done_since_save:
                results.append({"i": len(ops), "op": "save", "out": ed.save()})
            state["build"] = {"plan": str(Path(args.plan).resolve()), "next": len(ops), "at": now_iso(),
                              "finished": True}
            save_state(job, state)
        except Exception as err:  # noqa: BLE001
            shots = job / "errors"
            shots.mkdir(exist_ok=True)
            shot = shots / f"op-{i:03d}.png"
            s.page.screenshot(path=str(shot))
            try:
                fields = ed.fields() if ed.inspector().count() else []
            except Exception:  # noqa: BLE001
                fields = []
            log_line(job, "build.log", f"op {i} {ops[i]} failed: {err}")
            save_state(job, state)
            emit({"failedAt": i, "op": ops[i], "error": str(err)[:600], "screenshot": str(shot),
                  "inspectorFields": fields, "resumeFromLastSave": state.get("build", {}).get("next", start),
                  "blockedRequests": s.guard.blocked,
                  "note": "work since the last `save` op is NOT saved; fix the plan and re-run with --from"})
            sys.exit(5)
    emit({"ran": len(results), "from": start, "results": results[-15:], "aliases": state.get("aliases"),
          "blockedRequests": s.guard.blocked})
    if s.guard.blocked:
        sys.exit(6)  # something tried a write the skill never makes: look at guard.log before going on


def cmd_inspect(args: argparse.Namespace) -> None:
    job = job_dir(args.job)
    state = load_state(job)
    pid = page_id_of(state)
    with Session(job=job, page_id=pid, headless_flag=True) as s:
        s.ensure_logged_in()
        dto = fetch_page(s, pid)
        rev = {v: k for k, v in state.get("aliases", {}).items()}
        blocks = (dto.get("blocks") or {}).get("blocks") or []
        out: dict[str, Any] = {
            "status": dto.get("status"), "name": dto.get("name"), "slug": dto.get("slug"),
            "store": dto.get("storeName"), "product": dto.get("productTitle"),
            "blocks": [{"n": n + 1, "id": b["id"], "alias": rev.get(b["id"]), "type": b["type"],
                        "summary": _summary(b)} for n, b in enumerate(blocks)],
        }
        if args.block:
            ed = Editor(s, job, state)
            ed.open()
            ed.select(args.block)
            if args.fields:
                out["fields"] = ed.fields()
    emit(out)


def _summary(b: dict[str, Any]) -> str:
    for key in ("text", "heading", "title", "label", "headline", "logoText", "name", "url", "imageUrl", "html"):
        v = b.get(key)
        if isinstance(v, str) and v.strip():
            return re.sub(r"<[^>]+>", " ", v).strip()[:90]
    if b.get("slides"):
        return f"{len(b['slides'])} slides"
    if b.get("items"):
        return f"{len(b['items'])} items"
    return ""


def cmd_shot(args: argparse.Namespace) -> None:
    job = job_dir(args.job)
    state = load_state(job)
    out_dir = job / "shots"
    out_dir.mkdir(exist_ok=True)
    with Session(job=job, page_id=page_id_of(state), headless_flag=True, phone=args.phone) as s:
        s.ensure_logged_in()
        ed = Editor(s, job, state)
        s.goto(f"/store-pages/{ed.pid}/edit")
        s.page.get_by_test_id("canvas-scroll").wait_for(timeout=30_000)
        prefix = "phone" if args.phone else f"editor-{args.view}"
        if not args.phone:
            ed.viewport(args.view)
        files = ed.screens(out_dir, prefix)
    emit({"dir": str(out_dir), "files": files})


PHONE_CHECKS_JS = r"""
() => {
  const screen = document.querySelector('[data-testid=device-screen]') || document.querySelector('[data-testid=canvas-scroll]');
  if (!screen) return { error: 'no device screen' };
  const sr = screen.getBoundingClientRect();
  const problems = [];
  // Editor chrome inside a block (toolbar, select overlay, drag handle) is not page content.
  // Editor notes on a block (page-canvas.tsx chips) — their causes are in contentProblems.
  const CHIP = /^(Hidden on (desktop|mobile)|No destination|Follows the reader|Pinned to the bottom|Scrolls to Main Product|\d+ clicks?)$/;
  const chrome = (e) => !!e.closest('[aria-label$=" block actions"], [aria-label="Drag to reorder"], [data-testid=drop-placeholder]') ||
    /^Select .+ block$/.test(e.getAttribute('aria-label') || '') || CHIP.test((e.textContent || '').trim());
  // Hover-only editor chrome (the block's type badge is display:none, the image overlay
  // opacity:0 until hovered) is not on the page a buyer sees.
  const shown = (e) => {
    if (!e.getClientRects().length) return false;
    for (let x = e; x && !(x.dataset && x.dataset.blockId); x = x.parentElement) {
      const cs = getComputedStyle(x);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    }
    return true;
  };
  // Real sideways scroll only: a slider track clipped by its own overflow is fine.
  const wide = [];
  if (screen.scrollWidth > screen.clientWidth + 1) wide.push(`screen ${screen.scrollWidth}px > ${screen.clientWidth}px`);
  for (const b of screen.querySelectorAll('[data-block-id]')) {
    const ov = getComputedStyle(b).overflowX;
    if (ov === 'visible' && b.scrollWidth > b.clientWidth + 1) wide.push(`block ${b.dataset.blockId} ${b.scrollWidth}px > ${b.clientWidth}px`);
  }
  if (wide.length) problems.push({ check: 'sideways overflow (wider than the phone)', where: wide.slice(0, 10) });
  const small = [];
  for (const el of screen.querySelectorAll('[data-block-id] *')) {
    if (chrome(el) || !shown(el)) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) small.push(`${fs}px “${el.textContent.trim().slice(0, 40)}”`);
  }
  if (small.length) problems.push({ check: 'text under 12 px', where: small.slice(0, 10) });
  const taps = [...screen.querySelectorAll('[data-block-id] a[href], [data-block-id] button')].filter((b) => {
    const r = b.getBoundingClientRect();
    return !chrome(b) && shown(b) && r.width > 0 && r.height > 0 && r.height < 44 && (b.innerText || '').trim().length > 2;
  }).slice(0, 10).map((b) => `${Math.round(b.getBoundingClientRect().height)}px “${b.innerText.trim().slice(0, 30)}”`);
  if (taps.length) problems.push({ check: 'buttons/links under 44 px tall', where: taps });
  const broken = [...screen.querySelectorAll('[data-block-id] img')].filter((i) => i.complete && i.naturalWidth === 0)
    .slice(0, 10).map((i) => i.getAttribute('src'));
  if (broken.length) problems.push({ check: 'broken images', where: broken });
  return { width: Math.round(sr.width), problems };
}
"""


def cmd_verify(args: argparse.Namespace) -> None:
    job = job_dir(args.job)
    state = load_state(job)
    pid = page_id_of(state)
    out_dir = job / "shots"
    out_dir.mkdir(exist_ok=True)
    report: dict[str, Any] = {"pageId": pid}
    with Session(job=job, page_id=pid, headless_flag=True) as s:
        s.ensure_logged_in()
        dto = fetch_page(s, pid)
        report.update(status=dto.get("status"), name=dto.get("name"), slug=dto.get("slug"),
                      store=dto.get("storeName"), product=dto.get("productTitle"),
                      editor=f"{s.base}/store-pages/{pid}/edit")
        assert_draft(dto)
        blocks = (dto.get("blocks") or {}).get("blocks") or []
        content: list[str] = []
        for n, b in enumerate(blocks, 1):
            t = b["type"]
            if t in BUTTON_TYPES and not b.get("href"):
                content.append(f"#{n} {t}: button has no destination (Goes to)")
            if t == "image" and not b.get("url"):
                content.append(f"#{n} image: no picture")
            if t in ("feature", "offer", "steps") and "imageUrl" in b and not b.get("imageUrl"):
                content.append(f"#{n} {t}: no picture")
            if t == "slider" and any(not sl.get("url") for sl in b.get("slides", [])):
                content.append(f"#{n} slider: a slide has no picture")
            if t in ("heading", "text") and not re.sub(r"<[^>]+>", "", b.get("text", "")).strip():
                content.append(f"#{n} {t}: empty")
        report["blocks"] = len(blocks)
        report["contentProblems"] = content
        ed = Editor(s, job, state)
        s.goto(f"/store-pages/{pid}/edit")
        s.page.get_by_test_id("canvas-scroll").wait_for(timeout=30_000)
        ed.viewport("pc")
        report["desktopShots"] = ed.screens(out_dir, "verify-pc")
        ed.viewport("mobile")
        report["mobileFrame"] = s.page.evaluate(PHONE_CHECKS_JS)
        report["mobileShots"] = ed.screens(out_dir, "verify-mobile")
    with Session(job=job, page_id=pid, headless_flag=True, phone=True) as s:  # the editor itself on a 360 px phone
        s.goto(f"/store-pages/{pid}/edit")
        s.page.get_by_test_id("canvas-scroll").wait_for(timeout=30_000)
        report["phone360"] = {
            "viewport": PHONE_VIEWPORT,
            "pageScrollsSideways": s.page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"),
            "checks": s.page.evaluate(PHONE_CHECKS_JS),
        }
        report["phoneShots"] = Editor(s, job, state).screens(out_dir, "verify-phone360")
    report["shotsDir"] = str(out_dir)
    report["ok"] = not content and not (report["mobileFrame"] or {}).get("problems") \
        and not report["phone360"]["pageScrollsSideways"]
    state["lastVerify"] = {"at": now_iso(), "ok": report["ok"]}
    save_state(job, state)
    (job / "verify.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    emit(report)


def cmd_exec(args: argparse.Namespace) -> None:
    job = job_dir(args.job)
    state = load_state(job)
    code = Path(args.script).read_text(encoding="utf-8")
    with Session(job=job, page_id=state.get("pageId"), headless_flag=args.headless) as s:
        s.ensure_logged_in()
        ed = Editor(s, job, state) if state.get("pageId") else None
        scope = {"s": s, "page": s.page, "job": job, "state": state, "ed": ed, "re": re, "json": json}
        exec(compile(code, args.script, "exec"), scope)  # noqa: S102 - our own snippet, written by Claude for this job
        save_state(job, state)
        emit({"ok": not s.guard.blocked, "result": scope.get("result"), "blockedRequests": s.guard.blocked})
    if s.guard.blocked:
        sys.exit(6)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add(name: str, fn: Any, job: bool = True) -> argparse.ArgumentParser:
        sp = sub.add_parser(name)
        sp.set_defaults(fn=fn)
        if job:
            sp.add_argument("--job", required=True)
        sp.add_argument("--headless", action="store_true", default=None)
        return sp

    add("login", cmd_login, job=False)
    add("options", cmd_options, job=False)
    sp = add("create", cmd_create)
    sp.add_argument("--name", required=True)
    sp.add_argument("--store", required=True, help="store domain (or part of it) as shown in the picker")
    sp.add_argument("--layout", help="layout card name, e.g. 'Advertorial'; 'blank' for Blank page")
    sp.add_argument("--product", help="product title (optional)")
    sp.add_argument("--slug")
    sp = add("upload-media", cmd_upload_media)
    sp.add_argument("--only", help="glob on file names")
    sp.add_argument("--plan", help="upload only the files this build plan uses")
    sp.add_argument("--batch", type=int, default=15)
    sp = add("build", cmd_build)
    sp.add_argument("--plan", required=True)
    sp.add_argument("--from", dest="start", type=int)
    sp = add("inspect", cmd_inspect)
    sp.add_argument("--block", help="alias, block id or #N")
    sp.add_argument("--fields", action="store_true")
    sp = add("shot", cmd_shot)
    sp.add_argument("--view", choices=["pc", "mobile"], default="mobile")
    sp.add_argument("--phone", action="store_true", help="open the editor in a 360 px phone instead")
    add("verify", cmd_verify)
    sp = add("exec", cmd_exec)
    sp.add_argument("--script", required=True)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
