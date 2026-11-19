"""Shared test helpers: puts scripts/ on the path, fake Playwright routes, temp folders.

Run every test from the source-theme repo root:
    python -m unittest discover -s shopdy-skills/store-page-from-link/tests -v
"""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

TESTS = Path(__file__).resolve().parent
SCRIPTS = TESTS.parent / "scripts"
FIXTURES = TESTS / "fixtures"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

HAS_PLAYWRIGHT = importlib.util.find_spec("playwright") is not None


def tmp_dir(prefix: str = "spfl-") -> Path:
    return Path(tempfile.mkdtemp(prefix=prefix))


class FakeRequest:
    def __init__(self, method: str, url: str, body: object | None = None, content_type: str = "application/json"):
        self.method = method
        self.url = url
        self.post_data = None if body is None else (body if isinstance(body, str) else json.dumps(body))
        self.headers = {"content-type": content_type}

    @property
    def post_data_json(self):
        return json.loads(self.post_data) if self.post_data else None


class FakeRoute:
    """What a guard did with one request: 'fallback' (let through) or 'abort'."""

    def __init__(self, method: str, url: str, body: object | None = None, content_type: str = "application/json"):
        self.request = FakeRequest(method, url, body, content_type)
        self.done: str | None = None

    def fallback(self) -> None:
        self.done = "fallback"

    def abort(self, reason: str = "") -> None:
        self.done = "abort"
