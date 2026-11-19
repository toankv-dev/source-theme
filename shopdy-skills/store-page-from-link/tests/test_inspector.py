import unittest

from _helpers import FIXTURES, HAS_PLAYWRIGHT


@unittest.skipUnless(HAS_PLAYWRIGHT, "playwright is not installed")
class InspectorReaderTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright

        import inspector_js

        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.page = cls.browser.new_page()
        cls.page.goto((FIXTURES / "inspector.html").as_uri())
        root = cls.page.get_by_test_id("block-inspector")
        cls.fields = inspector_js.read(cls.page, root)
        cls.actions = inspector_js.read_actions(cls.page, "blk_1")
        cls.by_label = {f["label"]: f for f in cls.fields}

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def test_every_kind(self):
        kinds = {label: f["kind"] for label, f in self.by_label.items()}
        self.assertEqual(kinds["Heading"], "text")
        self.assertEqual(kinds["Style"], "select")
        self.assertEqual(kinds["Reviews from"], "select")
        self.assertEqual(kinds["Columns on desktop"], "number")
        self.assertEqual(kinds["Star size"], "slider")
        self.assertEqual(kinds["Background"], "color")
        self.assertEqual(kinds["Hero image"], "image")
        self.assertEqual(kinds["Image"], "image", 'the Image block\'s "…or paste a URL" row')
        self.assertEqual(kinds["Show stars"], "switch")
        self.assertEqual(kinds["Text"], "rich")
        self.assertEqual(kinds["Align"], "choice")
        self.assertEqual(kinds["Note"], "textarea")
        self.assertEqual(kinds["HTML"], "code")

    def test_options_and_ranges(self):
        self.assertEqual(self.by_label["Style"]["options"], ["Simple", "Product"])
        self.assertEqual(self.by_label["Reviews from"]["options"], ["Written here", "Product reviews", "Both"])
        self.assertEqual(self.by_label["Align"]["options"], ["Left", "Center", "Right"])
        star = self.by_label["Star size"]
        self.assertEqual((star["min"], star["max"], star["step"]), (10, 32, 1))
        self.assertEqual((self.by_label["Columns on desktop"]["min"], self.by_label["Columns on desktop"]["max"]), (1, 4))
        self.assertEqual(self.page.locator("[role=listbox]").count(), 0, "every select was closed again")
        self.assertTrue(self.page.get_by_test_id("block-inspector").is_visible(),
                        "closed without Escape, which would deselect the block in the editor")
        self.assertEqual(self.page.get_by_role("combobox").first.inner_text(), "Product", "the value did not change")

    def test_groups_including_a_closed_one(self):
        self.assertEqual(self.by_label["Heading"]["group"], "Content")
        self.assertEqual(self.by_label["Padding top"]["group"], "Spacing & layout")

    def test_what_is_left_out_or_merged(self):
        labels = [f["label"] for f in self.fields]
        self.assertNotIn("Paragraph style", labels, "the rich text toolbar is not a field")
        self.assertNotIn("Font size", labels)
        self.assertNotIn("Hidden field", labels)
        self.assertEqual(labels.count("Background"), 1, "the colour's text box is the same field")
        self.assertEqual(sum(1 for x in labels if x.endswith(" name")), 1, "Review 1 name / Review 2 name are one field")
        self.assertEqual(labels.count("Rating"), 1)
        self.assertEqual(self.by_label["Rating"]["count"], 2)

    def test_block_actions(self):
        self.assertEqual(self.actions, ["Move up", "Move down", "Duplicate", "Delete"])


if __name__ == "__main__":
    unittest.main()
