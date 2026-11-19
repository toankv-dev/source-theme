import unittest

from _helpers import FakeRoute, tmp_dir

from _common import Guard

API = "https://app.test/api"
PAGE = "pg_job"


def run(guard: Guard, method: str, path: str, body: object | None = None) -> str:
    route = FakeRoute(method, API + path, body)
    guard(route)
    return route.done


class NormalModeTest(unittest.TestCase):
    """The rules the skill has always had: they must not change."""

    def setUp(self):
        self.job = tmp_dir()
        self.g = Guard(self.job, PAGE)

    def test_reads_and_allowed_writes_go_through(self):
        self.assertEqual(run(self.g, "GET", "/store-pages/x"), "fallback")
        self.assertEqual(run(self.g, "POST", "/store-pages", {"name": "a"}), "fallback")
        self.assertEqual(run(self.g, "PATCH", f"/store-pages/{PAGE}", {"blocks": {}}), "fallback")
        self.assertEqual(run(self.g, "POST", "/media/upload"), "fallback")

    def test_publish_other_pages_and_deletes_are_blocked(self):
        self.assertEqual(run(self.g, "PATCH", f"/store-pages/{PAGE}", {"status": "published"}), "abort")
        self.assertEqual(run(self.g, "PATCH", "/store-pages/someone_else", {"name": "x"}), "abort")
        self.assertEqual(run(self.g, "DELETE", f"/store-pages/{PAGE}"), "abort")
        self.assertEqual(run(self.g, "POST", "/products", {"title": "x"}), "abort")
        self.assertEqual(len(self.g.blocked), 4)
        self.assertEqual(len((self.job / "guard.log").read_text(encoding="utf-8").splitlines()), 4)


class ScanModeTest(unittest.TestCase):
    """While the catalog is scanned nothing may be written, not even to the job's own page."""

    def setUp(self):
        self.job = tmp_dir()
        self.g = Guard(self.job, PAGE)

    def test_scanning_blocks_every_write(self):
        with self.g.scanning():
            for method, path in [("PATCH", f"/store-pages/{PAGE}"), ("PUT", f"/store-pages/{PAGE}"),
                                 ("POST", "/store-pages"), ("POST", "/media/upload"),
                                 ("DELETE", f"/store-pages/{PAGE}")]:
                self.assertEqual(run(self.g, method, path, {"blocks": {}}), "abort", f"{method} {path}")
            self.assertEqual(run(self.g, "GET", f"/store-pages/{PAGE}"), "fallback")
        log = (self.job / "guard.log").read_text(encoding="utf-8")
        self.assertIn("catalog scan is read-only", log)
        self.assertEqual(len(self.g.blocked), 5)

    def test_scanning_keeps_the_session_and_the_read_only_preview(self):
        with self.g.scanning():
            self.assertEqual(run(self.g, "POST", "/auth/refresh"), "fallback")
            self.assertEqual(run(self.g, "POST", f"/store-pages/{PAGE}/main-product-preview", {}), "fallback")
        self.assertEqual(self.g.blocked, [])

    def test_scanning_ends_even_on_error(self):
        with self.assertRaises(RuntimeError):
            with self.g.scanning():
                raise RuntimeError("scan failed")
        self.assertFalse(self.g.scan)
        self.assertEqual(run(self.g, "PATCH", f"/store-pages/{PAGE}", {"blocks": {}}), "fallback")

    def test_a_guard_can_start_in_scan_mode(self):
        g = Guard(None, PAGE, scan=True)
        self.assertEqual(run(g, "PATCH", f"/store-pages/{PAGE}", {"blocks": {}}), "abort")


if __name__ == "__main__":
    unittest.main()
