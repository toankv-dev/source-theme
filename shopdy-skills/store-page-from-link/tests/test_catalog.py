import json
import unittest

from _helpers import tmp_dir

import catalog as C


def f(label, kind="text", group="Content", **kw):
    return {"group": group, "label": label, "kind": kind, **kw}


REVIEWS = {
    "label": "Reviews", "palette": "Add Reviews block",
    "fields": [f("Style", "select", options=["Simple", "Product"]),
               f("Columns", "number", min=1, max=4, step=1),
               f("Star size", "slider", min=10, max=32, step=1),
               f("Reviews", "list", item=[f("Name"), f("Text", "textarea")])],
    "actions": ["Move up", "Move down", "Duplicate", "Delete"],
}
CTA = {"label": "CTA button", "palette": "Add CTA button block", "fields": [f("Button text"), f("Background", "color")],
       "actions": ["Delete"]}
NOTES = "# Block notes\n\nReviewed against the editor on: 2026-11-10\n\n## reviews\nBadge counts the product's reviews.\n"


def copy(entry):
    return json.loads(json.dumps(entry))


class DiffTest(unittest.TestCase):
    def test_no_change_is_empty(self):
        self.assertEqual(C.entry_diff(REVIEWS, copy(REVIEWS)), [])

    def test_values_and_numbered_labels_do_not_count(self):
        new = copy(REVIEWS)
        new["fields"][0]["value"] = "Product"
        a = copy(REVIEWS)
        a["fields"].append(f("Review 1", "textarea"))
        b = copy(REVIEWS)
        b["fields"].append(f("Review 2", "textarea"))
        self.assertEqual(C.entry_diff(REVIEWS, new), [])
        self.assertEqual(C.entry_diff(a, b), [], '"Review 1" and "Review 2" are the same field')

    def test_every_kind_of_change_reads_well(self):
        new = copy(REVIEWS)
        new["fields"][0]["kind"] = "radio"                         # Style select → radio
        new["fields"][1]["label"] = "Cols"                         # Columns gone, Cols new
        new["fields"][2].update(min=8, max=40)                     # Star size range
        new["fields"][3]["item"].append(f("Photo", "image"))       # list item field
        new["fields"].append(f("Badge text"))
        new["actions"].remove("Duplicate")
        changes = C.entry_diff(REVIEWS, new)
        self.assertIn('"Style" select → radio', changes)
        self.assertIn('-"Columns"', changes)
        self.assertIn('+"Cols"', changes)
        self.assertIn('"Star size" 10–32 → 8–40', changes)
        self.assertIn('"Reviews" item +"Photo"', changes)
        self.assertIn('+"Badge text"', changes)
        self.assertIn('-action "Duplicate"', changes)

    def test_options_change(self):
        new = copy(REVIEWS)
        new["fields"][0]["options"] = ["Simple", "Product", "Wall"]
        self.assertEqual(C.entry_diff(REVIEWS, new), ['"Style" options Simple|Product → Simple|Product|Wall'])


class LightCheckTest(unittest.TestCase):
    def test_a_read_without_options_compares_everything_else(self):
        light = copy(REVIEWS)
        for fld in light["fields"]:
            fld.pop("options", None)
        self.assertEqual(C.entry_diff(REVIEWS, light), [], "options not read are not options removed")
        light["fields"][0]["kind"] = "radio"
        self.assertEqual(C.entry_diff(REVIEWS, light), ['"Style" select → radio'])

    def test_find_field(self):
        self.assertEqual(C.find_field(REVIEWS, "star size")["kind"], "slider")
        self.assertEqual(C.find_field(REVIEWS, "Review 3 name"), None)
        entry = {"fields": [f("Review 1 name")]}
        self.assertEqual(C.find_field(entry, "Review 4 name")["label"], "Review 1 name", "numbered rows are one field")


class SaveTest(unittest.TestCase):
    def setUp(self):
        self.dir = tmp_dir("catalog-")

    def test_first_save_writes_json_and_md_and_logs_nothing(self):
        changes = C.save(self.dir, {"reviews": REVIEWS, "cta": CTA}, job="j1", sha="4122adb", notes=NOTES,
                         full=True, layouts=[{"name": "Advertorial", "blocks": ["cta", "reviews"]}])
        self.assertEqual(changes, [])
        data = json.loads((self.dir / "block-catalog.json").read_text(encoding="utf-8"))
        self.assertEqual(sorted(data["blocks"]), ["cta", "reviews"])
        self.assertEqual(data["sha"], "4122adb")
        self.assertTrue((self.dir / "block-catalog.md").exists())
        self.assertFalse((self.dir / "changes.log").exists(), "a first scan is not a fix")

    def test_unchanged_check_does_not_touch_the_file(self):
        C.save(self.dir, {"reviews": REVIEWS}, job="j1", notes=NOTES, full=True)
        f_ = self.dir / "block-catalog.json"
        before = f_.read_bytes()
        stamp = f_.stat().st_mtime_ns
        self.assertEqual(C.save(self.dir, {"reviews": copy(REVIEWS)}, job="j2", notes=NOTES), [])
        self.assertEqual(f_.read_bytes(), before)
        self.assertEqual(f_.stat().st_mtime_ns, stamp)

    def test_a_drift_is_written_logged_and_returned(self):
        C.save(self.dir, {"reviews": REVIEWS}, job="j1", notes=NOTES, full=True)
        new = copy(REVIEWS)
        new["fields"].append(f("Badge text"))
        changes = C.save(self.dir, {"reviews": new}, job="j2", notes=NOTES)
        self.assertEqual(changes, ['reviews: +"Badge text"'])
        log = (self.dir / "changes.log").read_text(encoding="utf-8")
        self.assertIn("j2", log)
        self.assertIn('reviews: +"Badge text"', log)
        data = C.load(self.dir)
        added = [x for x in data["blocks"]["reviews"]["fields"] if x["label"] == "Badge text"][0]
        self.assertTrue(added.get("firstSeen"), "a field found after the first scan remembers when")

    def test_a_check_adds_and_updates_but_never_drops_a_hidden_field(self):
        C.save(self.dir, {"reviews": REVIEWS}, job="j1", notes=NOTES, full=True)
        # A "Photo wall" reviews block: Columns hidden by its style, one field more, Star size range changed.
        seen = copy(REVIEWS)
        seen["fields"] = [x for x in seen["fields"] if x["label"] != "Columns"]
        seen["fields"][1].update(min=8, max=40)
        seen["fields"].append(f("Stars and verified tick", "switch"))
        changes = C.save(self.dir, {"reviews": seen}, job="j2", notes=NOTES, merge=True)
        self.assertEqual(sorted(changes), sorted(['reviews: "Star size" 10–32 → 8–40', 'reviews: +"Stars and verified tick"']))
        labels = [x["label"] for x in C.load(self.dir)["blocks"]["reviews"]["fields"]]
        self.assertIn("Columns", labels, "a field the current settings hide stays")
        self.assertEqual(C.save(self.dir, {"reviews": seen}, job="j3", notes=NOTES, merge=True), [],
                         "the same block again is no change")
        self.assertEqual(C.merge_entry(C.load(self.dir)["blocks"]["reviews"], seen)["fields"][-1]["label"],
                         "Stars and verified tick")

    def test_two_writers_each_keep_their_block(self):
        C.save(self.dir, {"reviews": REVIEWS}, job="j1", notes=NOTES, full=True)
        C.save(self.dir, {"cta": CTA}, job="j2", notes=NOTES)
        new = copy(REVIEWS)
        new["fields"].append(f("Badge text"))
        C.save(self.dir, {"reviews": new}, job="j3", notes=NOTES)
        data = C.load(self.dir)
        self.assertEqual(sorted(data["blocks"]), ["cta", "reviews"])
        self.assertEqual(len(data["blocks"]["reviews"]["fields"]), 5)

    def test_removed_types_are_marked_not_dropped(self):
        C.save(self.dir, {"reviews": REVIEWS, "cta": CTA}, job="j1", notes=NOTES, full=True)
        changes = C.save(self.dir, {}, job="j2", notes=NOTES, removed=["cta"])
        self.assertEqual(changes, ["cta: removed from the palette"])
        self.assertEqual(C.load(self.dir)["blocks"]["cta"]["status"], "removed")


class StoreSpecificOptionsTest(unittest.TestCase):
    """Options that list the store's products must not look like a change on the next store."""

    def test_products_and_checkouts_become_placeholders(self):
        a = {"fields": [f("Goes to", "select", options=["Scroll to the Main Product block", "Nowhere yet", "Checkout: Tank"]),
                        f("Product this page sells", "select", options=["No product", "Tank", "Shorts"])]}
        b = {"fields": [f("Goes to", "select", options=["Scroll to the Main Product block", "Nowhere yet", "Checkout: Boxer",
                                                         "Checkout: Boxer 3-pack"]),
                        f("Product this page sells", "select", options=["No product", "Boxer"])]}
        ga, gb = C.generic(a), C.generic(b)
        self.assertEqual(ga["fields"][0]["options"], ["Scroll to the Main Product block", "Nowhere yet", "Checkout: <product>"])
        self.assertEqual(ga["fields"][1]["options"], ["No product", "<a product of the store>"])
        self.assertEqual(C.entry_diff(ga, gb), [])

    def test_save_stores_the_generic_form(self):
        d = tmp_dir("catalog-")
        C.save(d, {"cta": {"label": "CTA", "fields": [f("Goes to", "select", options=["Nowhere yet", "Checkout: Tank"])]}},
               job="j1", notes=NOTES, full=True)
        changes = C.save(d, {"cta": {"label": "CTA", "fields": [f("Goes to", "select", options=["Nowhere yet", "Checkout: Boxer"])]}},
                         job="j2", notes=NOTES)
        self.assertEqual(changes, [])
        self.assertNotIn("Tank", (d / "block-catalog.json").read_text(encoding="utf-8"))


class PaletteTest(unittest.TestCase):
    def test_new_and_missing_palette_entries(self):
        cat = {"blocks": {"reviews": REVIEWS, "cta": CTA}}
        new, missing = C.palette_diff(cat, ["Add Reviews block", "Add Quiz block"])
        self.assertEqual(new, ["Add Quiz block"])
        self.assertEqual(missing, ["cta"])

    def test_type_for_a_palette_label(self):
        known = {"cta": "CTA button", "reviews": "Reviews"}
        self.assertEqual(C.type_for("Add CTA button block", known), "cta")
        self.assertEqual(C.type_for("Add Size chart block", known), "size-chart")


class RenderTest(unittest.TestCase):
    def test_md_is_compact_and_marks_what_the_notes_do_not_cover(self):
        new_field = f("Badge text", firstSeen="2026-11-12T09:00:00Z")
        reviews = copy(REVIEWS)
        reviews["fields"].append(new_field)
        cat = {"updated": "2026-11-12T09:00:00Z", "sha": "4122adb", "blocks": {"reviews": reviews, "cta": CTA},
               "page": {"fields": [f("Font", "select", group="Page", options=["Lato", "Poppins"])]}}
        md = C.render_md(cat, NOTES)
        self.assertIn("## cta (CTA button) MỚI", md, "no `## cta` section in the notes")
        self.assertNotIn("## reviews (Reviews) MỚI", md)
        self.assertIn('Star size slider[10–32]', md)
        self.assertIn('Style select[Simple|Product]', md)
        self.assertIn("Badge text text MỚI", md, "added after the notes were reviewed")
        self.assertIn("Reviews list{Name text · Text textarea}", md)
        self.assertIn("Font select[Lato|Poppins]", md)

    def test_groups_every_block_shares_are_printed_once(self):
        shared = [f("Padding top", "number", group="Spacing & layout", min=0, max=200),
                  f("Padding bottom", "number", group="Spacing & layout", min=0, max=200),
                  f("Show on", "radio", group="Visibility", options=["All", "Desktop", "Mobile"])]
        blocks = {f"type{i}": {"label": f"Block {i}", "fields": [f(f"Own {i}")] + copy(shared)} for i in range(4)}
        md = C.render_md({"blocks": blocks}, NOTES)
        self.assertEqual(md.count("Padding top number[0–200]"), 1)
        self.assertIn("same as every block: Spacing & layout, Visibility", md)

    def test_21_realistic_blocks_fit_in_about_4000_tokens(self):
        shared = [f(n, "number", group="Spacing & layout", min=0, max=200)
                  for n in ("Padding top", "Padding bottom", "Margin top", "Margin bottom", "Max width")]
        shared += [f("Show on", "radio", group="Visibility", options=["All", "Desktop", "Mobile"]),
                   f("Background", "color", group="Style"), f("Text color", "color", group="Style")]
        own = [f("Heading"), f("Text", "rich"), f("Button text"), f("Button link"), f("Align", "radio",
               options=["Left", "Center", "Right"]), f("Image", "image"), f("Image side", "select",
               options=["Left", "Right", "Top"]), f("Items", "list", item=[f("Title"), f("Text", "textarea"), f("Icon", "image")])]
        blocks = {f"type{i}": {"label": f"Block {i}", "palette": f"Add Block {i} block", "fields": own + shared,
                               "actions": ["Move up", "Move down", "Duplicate", "Delete"]} for i in range(21)}
        md = C.render_md({"blocks": blocks}, NOTES)
        self.assertLess(len(md) / 4, 4000)


if __name__ == "__main__":
    unittest.main()
