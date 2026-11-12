"""Shared helpers for the store-page-from-link scripts: config, job folders, job state,
and the browser session with its safety guard.

Playwright for Python (sync API). APIs used here, checked against the official docs:
  launch_persistent_context  https://playwright.dev/python/docs/api/class-browsertype#browser-type-launch-persistent-context
  context.route / glob rules https://playwright.dev/python/docs/network#modify-requests
  route.abort / fallback     https://playwright.dev/python/docs/api/class-route
  request.post_data_json     https://playwright.dev/python/docs/api/class-request
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SKILL_DIR = Path(__file__).resolve().parent.parent
WORK_DIR = SKILL_DIR / "_work"
# One persistent Chromium profile: log in once. SHOPDY_PROFILE_DIR keeps a second account
# (local dev vs production) in its own profile.
PROFILE_DIR = Path(os.environ.get("SHOPDY_PROFILE_DIR") or WORK_DIR / ".profile")
ENV_FILE = SKILL_DIR / ".env"

# Editor needs the lg layout (palette rail + canvas + inspector), so a wide window.
DESKTOP_VIEWPORT = {"width": 1600, "height": 1000}
PHONE_VIEWPORT = {"width": 360, "height": 780}


# ── config ──────────────────────────────────────────────────────────────────


def load_env() -> dict[str, str]:
    """Read `.env` next to SKILL.md (KEY=VALUE lines); real env vars win."""
    values: dict[str, str] = {}
    if ENV_FILE.exists():
        for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            values[key.strip()] = val.strip().strip('"').strip("'")
    for key in ("SHOPDY_URL", "SHOPDY_EMAIL", "SHOPDY_PASSWORD", "SHOPDY_HEADLESS"):
        if os.environ.get(key):
            values[key] = os.environ[key]
    return values


def base_url(env: dict[str, str]) -> str:
    url = env.get("SHOPDY_URL", "").rstrip("/")
    if not url:
        die("SHOPDY_URL is not set. Copy .env.example to .env next to SKILL.md and fill it in.")
    return url


def headless(env: dict[str, str], flag: bool | None) -> bool:
    if flag is not None:
        return flag
    return env.get("SHOPDY_HEADLESS", "0") in ("1", "true", "yes")


# ── output ──────────────────────────────────────────────────────────────────


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def emit(obj: Any) -> None:
    """Every command ends by printing one JSON object (what Claude reads back)."""
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def slugify(text: str, max_len: int = 40) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return (s or "x")[:max_len].strip("-") or "x"


# ── job folder + state ──────────────────────────────────────────────────────


def job_dir(arg: str) -> Path:
    """`--job` takes a job name (folder under _work/) or a path."""
    p = Path(arg)
    if not p.is_absolute() and len(p.parts) == 1:
        p = WORK_DIR / arg
    p.mkdir(parents=True, exist_ok=True)
    return p.resolve()


def load_state(job: Path) -> dict[str, Any]:
    f = job / "state.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    return {"job": job.name, "createdAt": now_iso(), "aliases": {}, "build": {}, "tickets": []}


def save_state(job: Path, state: dict[str, Any]) -> None:
    state["updatedAt"] = now_iso()
    (job / "state.json").write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def log_line(job: Path, name: str, text: str) -> None:
    with (job / name).open("a", encoding="utf-8") as fh:
        fh.write(f"{now_iso()} {text}\n")


# ── the guard ───────────────────────────────────────────────────────────────
#
# Writes the skill is allowed to make on shopdy. Everything else that is not a
# GET/HEAD/OPTIONS is BLOCKED and logged to <job>/guard.log. Never add a publish
# or delete route here: the page must stay a draft (rule 12) and the skill never
# deletes anything.

ALLOWED_WRITES: list[tuple[str, re.Pattern[str]]] = [
    ("POST", re.compile(r"/api/auth/(login|refresh|logout|me)\b")),
    ("POST", re.compile(r"/api/store-pages/?$")),  # create one page
    ("POST", re.compile(r"/api/store-pages/[^/]+/main-product-preview$")),  # editor preview (read-only)
    ("POST", re.compile(r"/api/media/(upload|upload-url|upload-url-batch)$")),
    # PATCH /api/store-pages/<id> is checked separately: only the job's own page, never published.
]


class Guard:
    def __init__(self, job: Path | None, page_id: str | None):
        self.job = job
        self.page_id = page_id
        self.blocked: list[str] = []

    def _block(self, route: Any, why: str) -> None:
        req = route.request
        line = f"BLOCKED {req.method} {req.url} — {why}"
        self.blocked.append(line)
        print(line, file=sys.stderr)
        if self.job:
            log_line(self.job, "guard.log", line)
        route.abort("blockedbyclient")

    def __call__(self, route: Any) -> None:
        req = route.request
        method = req.method.upper()
        if method in ("GET", "HEAD", "OPTIONS"):
            route.fallback()
            return
        path = re.sub(r"[?#].*$", "", req.url)
        body_text = req.post_data or ""
        body: Any = None
        if body_text and "multipart/form-data" not in (req.headers.get("content-type") or ""):
            try:
                body = req.post_data_json
            except Exception:  # noqa: BLE001 - a non-JSON body is fine, it just has no status
                body = None
        if _says_published(body) or re.search(r'"status"\s*:\s*"published"', body_text):
            self._block(route, "would PUBLISH a page (rule: pages stay Draft)")
            return
        if method == "DELETE":
            self._block(route, "deletes are never allowed")
            return
        m = re.search(r"/api/store-pages/([^/]+)$", path)
        if method in ("PATCH", "PUT") and m:
            if self.page_id and m.group(1) == self.page_id:
                route.fallback()
                return
            self._block(route, f"edits a page that is not this job's page ({self.page_id})")
            return
        for verb, pattern in ALLOWED_WRITES:
            if method == verb and pattern.search(path):
                route.fallback()
                return
        if "/api/" not in path:
            route.fallback()  # not the shopdy API (fonts, analytics of the admin app itself)
            return
        self._block(route, "write not on the skill's allow-list")


def _says_published(body: Any) -> bool:
    if isinstance(body, dict):
        if str(body.get("status", "")).lower() == "published":
            return True
        return any(_says_published(v) for k, v in body.items() if k in ("input", "data", "page"))
    return False


# ── browser session ─────────────────────────────────────────────────────────


class Session:
    """`with Session(...) as s:` → s.ctx, s.page, s.base, s.guard. Closes the browser on exit."""

    def __init__(
        self,
        job: Path | None = None,
        page_id: str | None = None,
        headless_flag: bool | None = None,
        viewport: dict[str, int] | None = None,
        phone: bool = False,
    ):
        self.env = load_env()
        self.base = base_url(self.env)
        self.job = job
        self.guard = Guard(job, page_id)
        self.headless = headless(self.env, headless_flag)
        self.viewport = viewport or (PHONE_VIEWPORT if phone else DESKTOP_VIEWPORT)
        self.phone = phone

    def __enter__(self) -> "Session":
        from playwright.sync_api import sync_playwright

        PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        self._pw = sync_playwright().start()
        kwargs: dict[str, Any] = {
            "headless": self.headless,
            "viewport": self.viewport,
            "accept_downloads": False,
        }
        if self.phone:
            kwargs.update(is_mobile=True, has_touch=True, device_scale_factor=2)
        # One profile directory cannot be opened twice: run one command at a time.
        self.ctx = self._pw.chromium.launch_persistent_context(str(PROFILE_DIR), **kwargs)
        self.ctx.set_default_timeout(20_000)
        self.ctx.route("**/api/**", self.guard)
        self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()
        return self

    def __exit__(self, *exc: Any) -> None:
        try:
            self.ctx.close()
        finally:
            self._pw.stop()

    # ── helpers on the logged-in app ────────────────────────────────────────

    def goto(self, path: str) -> None:
        self.page.goto(f"{self.base}{path}", wait_until="domcontentloaded")

    def logged_in(self) -> bool:
        token = self.page.evaluate(
            """() => { try { const a = JSON.parse(localStorage.getItem('adlux:auth') || 'null');
                       return !!(a && a.state && a.state.accessToken); } catch { return false; } }"""
        )
        return bool(token) and "/login" not in self.page.url

    def ensure_logged_in(self) -> None:
        self.goto("/store-pages")
        try:
            self.page.wait_for_load_state("networkidle", timeout=10_000)
        except Exception:  # noqa: BLE001 - an app that keeps a socket open never goes idle
            pass
        if not self.logged_in():
            die("Not logged in. Run: python -I scripts/shopdy.py login", code=4)

    def api(self, method: str, path: str, body: Any = None) -> Any:
        """Call /api with the app's own token (same origin). Returns the unwrapped `data`."""
        res = self.page.evaluate(
            """async ([method, path, body]) => {
                const a = JSON.parse(localStorage.getItem('adlux:auth') || 'null');
                const s = (a && a.state) || {};
                const headers = { 'Content-Type': 'application/json' };
                if (s.accessToken) headers['Authorization'] = 'Bearer ' + s.accessToken;
                if (s.workspaceId) headers['x-workspace-id'] = s.workspaceId;
                const r = await fetch('/api' + path, { method, headers,
                    body: body == null ? undefined : JSON.stringify(body) });
                let json = null; try { json = await r.json(); } catch {}
                return { status: r.status, json };
            }""",
            [method, path, body],
        )
        status, payload = res["status"], res["json"]
        if status == 401:
            die("The shopdy session expired. Run: python -I scripts/shopdy.py login", code=4)
        if status >= 400 or not isinstance(payload, dict) or payload.get("success") is False:
            err = (payload or {}).get("error") if isinstance(payload, dict) else None
            raise RuntimeError(f"{method} /api{path} → {status}: {err or payload}")
        return payload.get("data", payload)

    def wait(self, ms: int) -> None:
        self.page.wait_for_timeout(ms)


def retry(fn: Any, attempts: int = 3, delay: float = 1.0) -> Any:
    last: Exception | None = None
    for _ in range(attempts):
        try:
            return fn()
        except Exception as err:  # noqa: BLE001
            last = err
            time.sleep(delay)
    assert last is not None
    raise last
