import unittest

from _helpers import FIXTURES, HAS_PLAYWRIGHT

import compare as C

WANT = {"h": {"font": "Poppins", "size": 30, "weight": 800, "color": "#000000"},
        "p": {"font": "Poppins", "size": 16, "weight": 400, "color": "#111111"},
        "button": {"bg": "#003FFF", "color": "#FFFFFF", "radius": 4, "size": 17}}


class StyleDiffTest(unittest.TestCase):
    def test_the_grey_text_of_last_time_is_caught(self):
        got = {"h": dict(WANT["h"]), "p": dict(WANT["p"], color="#62676F"), "button": dict(WANT["button"])}
        self.assertEqual(C.style_diff(WANT, got), ["p color #62676F ≠ #111111"])

    def test_small_differences_are_not_reported(self):
        got = {"h": dict(WANT["h"], size=31, color="#020202"), "p": dict(WANT["p"], font="poppins"),
               "button": dict(WANT["button"], radius=5)}
        self.assertEqual(C.style_diff(WANT, got), [])

    def test_every_kind_of_difference(self):
        got = {"h": dict(WANT["h"], size=22, weight=400, font="Lato"), "p": dict(WANT["p"]),
               "button": dict(WANT["button"], bg="#000000", radius=40)}
        diffs = C.style_diff(WANT, got)
        self.assertIn("h size 22px ≠ 30px", diffs)
        self.assertIn("h weight 400 ≠ 800", diffs)
        self.assertIn("h font Lato ≠ Poppins", diffs)
        self.assertIn("button bg #000000 ≠ #003FFF", diffs)
        self.assertIn("button radius 40px ≠ 4px", diffs)

    def test_missing_parts_on_either_side_are_not_differences(self):
        self.assertEqual(C.style_diff({"h": WANT["h"]}, {"p": WANT["p"]}), [])


class TagLossTest(unittest.TestCase):
    def test_tags_the_sanitizer_took_away(self):
        sent = '<div><video autoplay muted></video><img src="a"><details><summary>Q</summary></details><script>x</script></div>'
        saved = '<div><img src="a"><details><summary>Q</summary></details></div>'
        self.assertEqual(C.tag_loss(sent, saved), ["<video> 1 → 0", "<script> 1 → 0"])
        self.assertEqual(C.tag_loss(saved, saved), [])


@unittest.skipUnless(HAS_PLAYWRIGHT, "playwright is not installed")
class InBrowserTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright

        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.page = cls.browser.new_page()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def test_styles_js_reads_heading_paragraph_button(self):
        self.page.set_content('<section id="x" style="font-family:Poppins"><h2 style="font-size:30px;font-weight:800;color:#000">Title</h2>'
                              '<p style="color:rgb(17,17,17);font-size:16px">Some words here.</p>'
                              '<a href="#" style="background:#003FFF;color:#fff;border-radius:4px;font-size:17px;padding:10px">Buy</a></section>')
        got = self.page.locator("#x").evaluate(C.STYLES_JS)
        self.assertEqual(got["h"], {"font": "Poppins", "size": 30, "weight": 800, "color": "#000000"})
        self.assertEqual(got["p"]["color"], "#111111")
        self.assertEqual((got["button"]["bg"], got["button"]["radius"]), ("#003FFF", 4))

    def test_similarity_of_two_pictures(self):
        png = (FIXTURES / "red.png").read_bytes() if (FIXTURES / "red.png").exists() else None
        self.page.set_content('<canvas id="a" width="60" height="40"></canvas><canvas id="b" width="60" height="40"></canvas>')
        a = self.page.evaluate("() => { const c = document.getElementById('a'); const x = c.getContext('2d');"
                               " x.fillStyle = '#fff'; x.fillRect(0, 0, 60, 40); x.fillStyle = '#e11'; x.fillRect(0, 0, 60, 20);"
                               " return c.toDataURL(); }")
        b = self.page.evaluate("() => { const c = document.getElementById('b'); const x = c.getContext('2d');"
                               " x.fillStyle = '#111'; x.fillRect(0, 0, 60, 40); return c.toDataURL(); }")
        self.assertGreaterEqual(self.page.evaluate(C.SIMILARITY_JS, [a, a, 60]), 0.95)
        self.assertLess(self.page.evaluate(C.SIMILARITY_JS, [a, b, 60]), 0.5)
        del png


if __name__ == "__main__":
    unittest.main()
