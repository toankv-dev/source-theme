import json
import unittest

from _helpers import tmp_dir

import plan as P

OWEARFIT = ["countdown", "html", "cta", "html", "html", "html", "cta", "text", "html", "html", "cta", "html", "html",
            "html", "mainproduct", "reviews", "html", "footer"]
LAYOUTS = [
    {"name": "News article + product card", "blocks": ["heading", "byline", "text", "image", "feature", "feature",
                                                        "steps", "comparison", "reviews", "offer", "product", "stickybar", "footer"]},
    {"name": "Advertorial", "blocks": ["header", "countdown", "heading", "image", "text", "cta", "heading", "text",
                                       "heading", "text", "heading", "text", "cta", "reviews", "cta", "footer"]},
    {"name": "Listicle", "blocks": ["header", "countdown", "heading", "text", "heading", "text", "heading", "text",
                                    "heading", "text", "cta", "reviews", "cta", "footer"]},
]


def f(label, kind="text", group="Content", **kw):
    return {"group": group, "label": label, "kind": kind, **kw}


SHARED = [f("Padding ↕", "number", "Spacing & layout", min=0, max=160), f("Padding ↔", "number", "Spacing & layout", min=0, max=160),
          f("Align", "select", "Spacing & layout", options=["Left", "Centre", "Right"]),
          f("Block background", "color", "Spacing & layout"),
          f("Show on", "select", "Visibility", options=["Desktop and mobile", "Mobile only", "Desktop only"])]
GOES = f("Goes to", "select", options=["Scroll to the Main Product block", "Nowhere yet", "Checkout: <product>"])
CATALOG = {
    "page": {"fields": [f("Font", "select", "Page", options=["Lato", "Poppins", "Inter", "System default"]),
                        f("Content width", "number", "Page", min=320, max=1600), f("Page background", "color", "Page")]},
    "blocks": {
        "countdown": {"label": "Countdown", "fields": [f("Text"), f("Minutes", "number", min=1, max=120),
                                                       f("Background", "color", "Style"), f("Text colour", "color", "Style")] + SHARED},
        "cta": {"label": "CTA button", "fields": [f("Button text"), GOES, f("…or a custom URL"), f("Button colour", "color", "Style"),
                                                  f("Text colour", "color", "Style"), f("Corner radius", "number", "Style", min=0, max=999)] + SHARED},
        "text": {"label": "Text", "fields": [f("Text", "rich")] + SHARED},
        "html": {"label": "Custom HTML", "fields": [f("HTML", "code"), f("CSS", "code")] + SHARED},
        "mainproduct": {"label": "Main product", "fields": [f("Product", "select")] + SHARED},
        "footer": {"label": "Footer", "fields": [f("Text", "textarea"), f("Link 1 label"), f("Link 1 address"),
                                                 f("Small print", "textarea")] + SHARED},
        "reviews": {"label": "Reviews", "fields": [f("Heading"), f("Style", "select", options=["Quote cards with stars", "Photo wall"]),
                                                   f("Review 1 name", count=3), f("Review 1 text", "textarea", count=3),
                                                   f("Rating", "number", min=1, max=5, count=3)] + SHARED},
    },
}


def block(i, btype, fields=None, **kw):
    return {"id": f"sp-b{i}", "type": btype, "vis": kw.get("vis", "all"), "sticky": kw.get("sticky", False),
            "bleed": False, "style": kw.get("style", {"padding": "16px 16px", "text-align": "left"}),
            "media": kw.get("media", []), "fields": fields or {}, **({"html": kw["html"], "css": kw["css"]} if btype == "html" else {})}


SHOPDY = {"maxWidth": "1200px", "blocks": [
    block(1, "countdown", {"text": "Hurry {timer}", "minutes": 5, "background": "#003FFF", "color": "#FFFFFF"}, sticky=True,
          style={"padding": "0px 0px", "text-align": "center"}),
    block(2, "html", html='<div class="h"><img src="/uploads/a/hero.webp"></div>', css=".h {display:grid}",
          media=[{"src": "/uploads/a/hero.webp", "url": "https://shop.test/uploads/a/hero.webp"}]),
    block(3, "cta", {"text": "ORDER NOW", "href": "#main-product", "background": "#003FFF", "color": "#FFFFFF", "radius": "4px",
                     "fullWidth": True}, vis="desktop"),
    block(4, "mainproduct"),
    block(5, "footer", {"links": [{"text": "Privacy Policy", "href": "/policies/privacy"}, {"text": "Terms", "href": "/policies/terms"}],
                        "text": "© 2026 Shop. All rights reserved.", "background": "#F5F5F5", "color": "#6B7177"}),
]}


class LayoutTest(unittest.TestCase):
    def test_owearfit_keeps_most_with_advertorial(self):
        best = P.score_layouts(OWEARFIT, LAYOUTS)[0]
        self.assertEqual(best["name"], "Advertorial")
        self.assertEqual(best["reuse"], 6)
        self.assertTrue(best["fits"])
        self.assertEqual(len(best["delete"]), 10)
        self.assertEqual(len(best["add"]), 12)

    def test_blank_page_when_nothing_is_kept(self):
        best = P.score_layouts(["html", "html"], LAYOUTS)[0]
        self.assertEqual(best["name"], "Blank page")
        self.assertEqual(P.score_layouts([], LAYOUTS)[0]["name"], "Blank page")

    def test_lcs_keeps_order(self):
        pairs = P.lcs(["a", "b", "c", "a"], ["c", "a", "b"])
        self.assertEqual(len(pairs), 2)
        self.assertTrue(all(pairs[k][0] < pairs[k + 1][0] and pairs[k][1] < pairs[k + 1][1] for k in range(len(pairs) - 1)))


class DraftTest(unittest.TestCase):
    def setUp(self):
        self.job = tmp_dir("plan-")
        (self.job / "source").mkdir()
        (self.job / "source" / "shopdy-blocks.json").write_text(json.dumps(SHOPDY), encoding="utf-8")
        (self.job / "source" / "assets.json").write_text(json.dumps(
            [{"url": "https://shop.test/uploads/a/hero.webp", "file": "assets/images/j-001-hero.webp"}]), encoding="utf-8")
        (self.job / "state.json").write_text(json.dumps({"layout": "Advertorial", "product": "Boxer"}), encoding="utf-8")
        layouts = [{"name": "Advertorial", "blocks": ["header", "countdown", "heading", "cta", "reviews", "footer"]}]
        self.plan, self.summary = P.draft(self.job, CATALOG, layouts)
        self.ops = self.plan["ops"]

    def test_reshape_deletes_bottom_up_then_builds_in_order(self):
        deletes = [o for o in self.ops if o.get("op") == "action" and o.get("name") == "Delete"]
        selects_before_delete = [self.ops[i - 1]["block"] for i, o in enumerate(self.ops) if o in deletes]
        self.assertEqual(selects_before_delete, ["#5", "#3", "#1"], "reviews, heading, header: from the bottom")
        notes = [o for o in self.ops if o.get("op") == "note" and o.get("section")]
        self.assertEqual([n["section"] for n in notes], ["sp-b1", "sp-b2", "sp-b3", "sp-b4", "sp-b5"])

    def test_new_blocks_move_up_past_the_kept_ones_after_them(self):
        i = next(k for k, o in enumerate(self.ops) if o.get("op") == "add" and o.get("type") == "html")
        moves = 0
        for o in self.ops[i + 1:]:
            if o.get("op") == "action" and o.get("name") == "Move up":
                moves += 1
            else:
                break
        self.assertEqual(moves, 2, "the kept cta and footer come after it")

    def test_fields_use_only_catalog_labels(self):
        sets = [o for o in self.ops if o.get("op") == "set"]
        labels = {o["label"] for o in sets}
        known = {x["label"] for e in CATALOG["blocks"].values() for x in e["fields"]} | {x["label"] for x in CATALOG["page"]["fields"]}
        self.assertTrue({P.catalog.norm_label(x) for x in labels} <= {P.catalog.norm_label(x) for x in known}, labels - known)
        get = lambda label: [o["value"] for o in sets if o["label"] == label]  # noqa: E731
        self.assertIn("Hurry {timer}", get("Text"))
        self.assertIn(5, get("Minutes"))
        goes = [k for k, o in enumerate(self.ops) if o.get("label") == "Goes to"]
        self.assertEqual([self.ops[k]["match"] for k in goes], ["main product"])
        self.assertGreater(goes[0], max(k for k, o in enumerate(self.ops) if o.get("type") == "mainproduct"),
                           "set once the Main product block is on the page")
        self.assertEqual(self.ops[goes[0] - 1], {"op": "select", "block": "#3"})
        self.assertIn("Desktop only", get("Show on"))
        self.assertIn(4, get("Corner radius"))
        self.assertIn("Poppins", get("Font") or ["Poppins"])
        self.assertIn(1200, get("Content width"))
        self.assertEqual(get("Link 2 label"), ["Terms"])

    def test_html_goes_to_files_with_media_tokens(self):
        fills = [o for o in self.ops if o.get("op") == "fill" and o.get("value_file")]
        self.assertEqual([o["label"] for o in fills], ["HTML", "CSS"])
        html = (self.job / fills[0]["value_file"]).read_text(encoding="utf-8")
        self.assertIn("{{media:j-001-hero.webp}}", html)
        self.assertNotIn("/uploads/a/hero.webp", html)

    def test_saves_and_summary(self):
        self.assertEqual(self.ops[-1]["op"], "save")
        self.assertGreaterEqual(sum(1 for o in self.ops if o["op"] == "save"), 5)
        self.assertIn("sticky", " ".join(self.summary["review"]).lower(), "a field the catalog lacks is listed, not guessed")


if __name__ == "__main__":
    unittest.main()
