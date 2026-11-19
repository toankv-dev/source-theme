import unittest

from _helpers import FIXTURES

import shopdy_blocks as SB

PAGE = (FIXTURES / "shopdy-page.html").read_text(encoding="utf-8")
BASE = "https://shop.example.test/pages/p?x=1"


class ParseTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = SB.parse(PAGE, BASE)
        cls.by_id = {b["id"]: b for b in cls.out["blocks"]}

    def test_blocks_in_page_order_with_flags(self):
        self.assertEqual([(b["id"], b["type"]) for b in self.out["blocks"]], [
            ("sp-b1", "countdown"), ("sp-b3", "html"), ("sp-b4", "cta"), ("sp-b5", "text"), ("sp-b9", "html"),
            ("sp-b6", "mainproduct"), ("sp-b7", "reviews"), ("sp-b8", "footer")])
        self.assertTrue(self.by_id["sp-b1"]["sticky"])
        self.assertTrue(self.by_id["sp-b8"]["bleed"])
        self.assertEqual(self.by_id["sp-b4"]["vis"], "desktop")
        self.assertEqual(self.by_id["sp-b5"]["vis"], "mobile")
        self.assertEqual(self.by_id["sp-b4"]["style"]["padding"], "12px 16px")
        self.assertEqual(self.out["maxWidth"], "1200px")

    def test_html_block_and_its_css_without_the_scope(self):
        b = self.by_id["sp-b3"]
        self.assertTrue(b["html"].startswith('<div class="hero">'))
        self.assertTrue(b["html"].endswith("</div>"))
        css = b["css"]
        self.assertIn("& {container-type:inline-size}", css)
        self.assertIn(".hero {display:grid;grid-template-columns:1fr 1fr}", css)
        self.assertIn(".hero h2, .hero h3 {font-size:30px}", css)
        self.assertIn("&:hover {opacity:.98}", css)
        self.assertIn("@media (max-width: 600px) {\n  .hero {grid-template-columns:1fr}\n}", css)
        self.assertIn("@keyframes pulse-x", css, "the keyframes its animation uses come along")
        self.assertNotIn("#sp-b", css)
        self.assertEqual(self.by_id["sp-b9"]["css"].strip(), ".faq summary {font-weight:700}")

    def test_media_of_a_block_with_absolute_urls(self):
        media = {m["src"]: m["url"] for m in self.by_id["sp-b3"]["media"]}
        self.assertEqual(media["/uploads/media/a/hero.webp"], "https://shop.example.test/uploads/media/a/hero.webp")
        self.assertIn("/uploads/media/a/clip.mp4", media)
        self.assertEqual(media["https://cdn.example.test/poster.jpg"], "https://cdn.example.test/poster.jpg")

    def test_fields_of_the_other_blocks(self):
        self.assertEqual(self.by_id["sp-b1"]["fields"], {"text": "Hurry: {timer} left at 50% off", "minutes": 7,
                                                         "background": "#003FFF", "color": "#FFFFFF"})
        cta = self.by_id["sp-b4"]["fields"]
        self.assertEqual((cta["text"], cta["href"], cta["background"], cta["radius"], cta["fontSize"], cta["fullWidth"]),
                         ("ORDER TODAY", "#main-product", "#003FFF", "4px", "17px", True))
        self.assertEqual(self.by_id["sp-b5"]["fields"]["html"],
                         '<p><span style="font-size:20px"><b>Feels like &amp; looks like</b></span></p>')
        foot = self.by_id["sp-b8"]["fields"]
        self.assertEqual(foot["links"], [{"text": "Privacy Policy", "href": "/policies/privacy"},
                                         {"text": "Terms of Service", "href": "/policies/terms"}])
        self.assertEqual(foot["text"], "© 2026 Made Up. All rights reserved.")
        self.assertEqual((foot["background"], foot["color"]), ("#F5F5F5", "#6B7177"))
        self.assertEqual(self.by_id["sp-b6"]["fields"], {})

    def test_reviews(self):
        r = self.by_id["sp-b7"]["fields"]
        self.assertEqual((r["columns"], r["accent"], r["starSize"]), (4, "#16A34A", 18))
        self.assertEqual((r["badge"], r["heading"], r["sub"]), ("Rated 5.0/5 by 12 customers", "What people say", "Real words."))
        self.assertEqual(len(r["items"]), 2)
        one, two = r["items"]
        self.assertEqual((one["name"], one["verified"], one["date"], one["rating"], one["title"], one["text"]),
                         ("Ann B.", True, "November 1, 2026", 4, "Nice fit", "Made-up review text."))
        self.assertEqual(one["image"]["url"], "https://shop.example.test/uploads/media/a/r1.webp")
        self.assertEqual((two["verified"], two["rating"], two.get("title"), two.get("image")), (False, 5, "", None))

    def test_a_page_not_made_with_shopdy(self):
        self.assertIsNone(SB.parse("<html><body><div class='page'><section>hi</section></div></body></html>", BASE))


if __name__ == "__main__":
    unittest.main()
