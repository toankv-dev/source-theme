import unittest

import _helpers  # noqa: F401 - puts scripts/ on the path

import digest as D


def heading(text, size="30px", weight="800", color="rgb(0, 0, 0)", tag="h2"):
    return {"tag": tag, "text": text, "fontFamily": "Poppins", "fontSize": size, "fontWeight": weight, "color": color,
            "align": "left"}


DESKTOP = {
    "title": "Made-up page", "height": 3000, "bodyFont": "Poppins, sans-serif", "bodyBg": "rgb(255, 255, 255)",
    "bodyColor": "rgb(17, 17, 17)", "headingFont": "Poppins", "contentWidth": 1100,
    "overlays": [{"tag": "div", "cls": "bar", "h": 40, "top": "0px", "bottom": "auto",
                  "text": "Hurry: 4:59 left", "hints": ["countdown"]}],
    "sections": [
        {"i": 0, "y": 0, "h": 700, "w": 1440, "bg": "rgb(255, 255, 255)", "hints": [], "words": 120,
         "headings": [heading("Men Are Switching To This")],
         "lines": ["Men Are Switching To This", "A made-up first line.", "Second line."],
         "hidden": [], "textColor": "rgb(17, 17, 17)", "mediaFirst": False, "imageSide": "left",
         "buttons": [{"text": "ORDER NOW", "href": "#main-product", "bg": "rgb(0, 63, 255)", "color": "rgb(255, 255, 255)",
                      "radius": "4px", "w": 600, "h": 52}],
         "images": [{"src": "https://shop.test/a/hero.webp", "alt": "Hero", "w": 600, "h": 600}],
         "videos": [], "embeds": []},
        {"i": 1, "y": 700, "h": 900, "w": 1440, "bg": "rgb(255, 255, 255)", "hints": ["accordion"], "words": 300,
         "headings": [heading("Frequently Asked Questions", "28px")],
         "lines": ["Frequently Asked Questions", "Is it washable?", "Does it smell?"],
         "hidden": ["Yes, 100 washes.", "No, never."], "textColor": "rgb(17, 17, 17)", "mediaFirst": False,
         "imageSide": None, "buttons": [], "images": [],
         "videos": [{"src": "https://shop.test/a/clip.mp4", "poster": "", "autoplay": True, "loop": True, "muted": True}],
         "embeds": []},
        {"i": 2, "y": 1600, "h": 300, "w": 1440, "bg": "rgb(245, 245, 245)", "hints": [], "words": 40,
         "headings": [heading("Desktop only trust row", "20px")], "lines": ["Desktop only trust row", "Badges"],
         "hidden": [], "textColor": "rgb(107, 113, 119)", "mediaFirst": False, "imageSide": None,
         "buttons": [], "images": [], "videos": [], "embeds": []},
    ],
}
MOBILE = {
    "height": 5000, "overlays": [],
    "sections": [
        {"i": 0, "y": 0, "h": 900, "headings": [heading("Men Are Switching To This", "22px")],
         "lines": ["Men Are Switching To This", "A made-up first line.", "Second line."], "hidden": [],
         "mediaFirst": True, "imageSide": None, "words": 120},
        {"i": 1, "y": 900, "h": 1200, "headings": [heading("Frequently Asked Questions", "22px")],
         "lines": ["Frequently Asked Questions", "Is it washable?", "Does it smell?"], "hidden": ["Yes, 100 washes."],
         "mediaFirst": False, "imageSide": None, "words": 300},
    ],
}
ASSETS = [{"url": "https://shop.test/a/hero.webp", "file": "assets/images/j-001-hero.webp", "contentType": "image/webp"},
          {"url": "https://shop.test/a/clip.mp4", "file": "assets/videos/j-002-clip.mp4", "contentType": "video/mp4"}]


class DigestTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.md = D.render(DESKTOP, MOBILE, ASSETS, url="https://shop.test/p", shopdy_blocks=None)

    def test_page_line(self):
        self.assertIn("background #FFFFFF · text #111111 · font Poppins · content ≈1100 px", self.md)
        self.assertIn('Fixed / sticky: top bar 40 px "Hurry: 4:59 left" (countdown)', self.md)
        self.assertIn("Buttons: #003FFF text #FFFFFF radius 4px (×1)", self.md)

    def test_sections_with_verbatim_and_hidden_text(self):
        self.assertIn("## s00 · y 0 · h 700", self.md)
        self.assertIn('H2 30px/800 #000000: "Men Are Switching To This"', self.md)
        self.assertIn("A made-up first line.", self.md)
        self.assertIn("Hidden (FAQ answers, closed tabs): Yes, 100 washes. | No, never.", self.md)
        self.assertIn('"ORDER NOW" #003FFF/#FFFFFF r4px → #main-product', self.md)

    def test_media_by_downloaded_file(self):
        self.assertIn("j-001-hero.webp 600×600 (image left)", self.md)
        self.assertIn("j-002-clip.mp4 video autoplay loop muted", self.md)

    def test_phone_differences(self):
        self.assertIn("Phone: picture above the text · H2 22px", self.md)
        self.assertIn("Phone: not shown on the phone", self.md.split("## s02")[1])

    def test_shopdy_pages_point_at_their_blocks(self):
        md = D.render(DESKTOP, MOBILE, ASSETS, url="https://shop.test/p", shopdy_blocks=18)
        self.assertIn("Made with shopdy: 18 blocks in source/shopdy-blocks.json", md)

    def test_a_long_page_stays_under_6000_tokens(self):
        big = dict(DESKTOP, sections=[dict(DESKTOP["sections"][0], i=i, y=i * 500,
                                           lines=[f"line {i}-{j} " + "word " * 30 for j in range(40)])
                                      for i in range(40)])
        md = D.render(big, {"sections": []}, ASSETS, url="u", shopdy_blocks=None)
        self.assertLess(len(md) / 4, 6000)
        self.assertIn("source/text.md", md, "what was cut says where the rest is")

    def test_overview_layout_fits_the_page_in_one_picture(self):
        import fetch_competitor as F

        cols, s = F._layout(1440, 8352)  # owearfit at 1440
        self.assertEqual(cols, 2)
        self.assertLessEqual(cols * 1440 * s, F.OVERVIEW_EDGE)
        self.assertLessEqual(8352 * s / cols, F.OVERVIEW_EDGE + 1)
        cols, s = F._layout(390, 14000)  # a long phone page: more, narrower columns
        self.assertGreaterEqual(cols, 5)
        self.assertGreater(s, 0.5)

    def test_hex(self):
        self.assertEqual(D.hex_color("rgb(0, 63, 255)"), "#003FFF")
        self.assertEqual(D.hex_color("rgba(0, 0, 0, 0)"), "transparent")
        self.assertEqual(D.hex_color("#abc"), "#abc")


if __name__ == "__main__":
    unittest.main()
