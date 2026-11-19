import unittest

import _helpers  # noqa: F401 - puts scripts/ on the path

import shopdy


class FakeEditor(shopdy.Editor):
    """An Editor without a browser: records what it was asked to do."""

    def __init__(self, kinds: dict[str, str], fail_first: set[str] | None = None):
        self.kinds = kinds
        self.calls: list[tuple] = []
        self.fail_first = set(fail_first or ())
        self.drifted = set(fail_first or ())
        self.checks: list[bool] = []
        self.scope, self.current, self.job, self.aliases = "block", "blk_1", None, {}

    def kind_of(self, label):
        return self.kinds.get(label)

    def block_type(self, bid=None):
        return "reviews"

    def check_catalog(self, deep=False):
        self.checks.append(deep)
        if deep and "Star size" in self.drifted:
            self.kinds["Star size"] = "slider"
            return ['reviews: "Star size" number → slider']
        return []

    def _record(self, name, label, *rest):
        if label in self.fail_first:
            self.fail_first.discard(label)
            raise LookupError(f"no field labelled {label!r}")
        self.calls.append((name, label, *rest))

    def fill(self, label, value=None, html=None, nth=0):
        self._record("fill", label, value, html)

    def number(self, label, value, nth=0):
        self._record("number", label, value)

    def slider(self, label, value, nth=0):
        self._record("slider", label, value)

    def color(self, label, value, nth=0):
        self._record("color", label, value)

    def choose(self, label, option, nth=0):
        self._record("choose", label, option)

    def toggle(self, label, value, nth=0):
        self._record("toggle", label, value)

    def image(self, label, media, nth=0):
        self._record("image", label, media)

    def select(self, ref):
        self.current = ref
        return ref


class SetOpTest(unittest.TestCase):
    def run_ops(self, ed, ops):
        orig = shopdy.resolve_values
        shopdy.resolve_values = lambda _ed, op: dict(op)  # no job folder in a test
        try:
            return [shopdy.run_op(ed, op) for op in ops]
        finally:
            shopdy.resolve_values = orig

    def test_set_uses_the_kind_from_the_catalog(self):
        ed = FakeEditor({"Heading": "text", "Text": "rich", "Columns": "number", "Star size": "slider",
                         "Accent": "color", "Style": "select", "Show stars": "switch", "Photo": "image"})
        self.run_ops(ed, [{"op": "set", "label": k, "value": v} for k, v in [
            ("Heading", "Hi"), ("Text", "<p>x</p>"), ("Columns", 4), ("Star size", 18), ("Accent", "#16A34A"),
            ("Style", "Photo wall"), ("Show stars", True), ("Photo", "{{media:a.webp}}")]])
        self.assertEqual(ed.calls, [
            ("fill", "Heading", "Hi", None), ("fill", "Text", None, "<p>x</p>"), ("number", "Columns", 4),
            ("slider", "Star size", 18), ("color", "Accent", "#16A34A"), ("choose", "Style", "Photo wall"),
            ("toggle", "Show stars", True), ("image", "Photo", "{{media:a.webp}}")])

    def test_a_label_not_in_the_catalog_is_read_again_then_fails_clearly(self):
        ed = FakeEditor({})
        with self.assertRaises(LookupError) as ctx:
            self.run_ops(ed, [{"op": "set", "label": "Nope", "value": 1}])
        self.assertIn("not a field", str(ctx.exception))
        self.assertEqual(ed.checks, [True], "the block was read once more before giving up")

    def test_a_failing_field_op_fixes_the_catalog_and_runs_again_once(self):
        ed = FakeEditor({"Star size": "number"}, fail_first={"Star size"})
        [out] = self.run_ops(ed, [{"op": "set", "label": "Star size", "value": 18}])
        self.assertTrue(out["retried"])
        self.assertEqual(out["catalog"], ['reviews: "Star size" number → slider'])
        self.assertEqual(ed.calls, [("slider", "Star size", 18)])

    def test_select_checks_the_catalog(self):
        ed = FakeEditor({})
        self.run_ops(ed, [{"op": "select", "block": "blk_9"}])
        self.assertEqual(ed.checks, [False], "a quick check after selecting a block")

    def test_other_errors_are_not_retried(self):
        ed = FakeEditor({"Heading": "text"})
        ed.fill = lambda *a, **k: (_ for _ in ()).throw(ValueError("boom"))
        with self.assertRaises(ValueError):
            self.run_ops(ed, [{"op": "set", "label": "Heading", "value": "x"}])
        self.assertEqual(ed.checks, [])


if __name__ == "__main__":
    unittest.main()
