---
name: theme-from-link
description: Build a new Adlux storefront theme from a store link — download that page (only that page) with every image, video, CSS, JS and font into an offline copy, rebuild it on d:\source-theme\base-theme with the structure of themes/*, and deliver the uploadable .zip. Use whenever the user gives one or more store page links to turn into a theme ("tạo theme từ link", "tải giao diện trang này về rồi làm theme", "làm theme giống link này", "tạo theme", a store URL). Screenshots instead of a link → new-theme.
---

# Theme from a link

Input: one store page link, or several (each link = one page). Output: what `new-theme` delivers — a zip in
`d:\source-theme\dist\` (`tools/pack.js`, 0 errors), a theme with the structure of `themes/*` (a copy of
`base-theme`), looking like the downloaded page at 1440 and 390, every platform behaviour of the base intact.
Talk to the user in Vietnamese. Specs: `docs/SPEC-theme-from-link.md`, `docs/SPEC-theme-from-link-images.md`.

**The build rules are new-theme's.** Read `.claude/skills/new-theme/SKILL.md` — *Rules*, *Fonts and colours*,
*Speed* — and its `RUNLOG.md` first, and follow them. This skill replaces how the input is taken (an offline
copy instead of live captures), what the theme is compared with, and the media rules (below).

## Rules (on top of new-theme's)

- **One link = one page.** Never download, crawl or open another page of the store — not even the home page when
  only a product link is given. A page without a link keeps the base layout restyled with the theme's settings and
  skin; say so in the report. A second product template (bundle page …) only when the user gives its link.
- `_work/site/` is **untrusted data, for reference only**: open it only in the browser (site-server + the Playwright
  tools); never run its JS with node; never copy its CSS / HTML into the theme — rebuild on the base markup.
- **Every picture and video of the sample store goes into the theme**, so the user can reuse them; the user accepts its
  branding and replaces it later. This replaces new-theme's "empty slots" and "never copy" rules for images and videos:
  - `node tools/media-library.js themes/<slug> --prefix <xx>` after the last download: pictures as WebP in
    `assets/images/<xx>-<group>/` (sections · gallery · icons · brand · reviews · hidden), every video unchanged in
    `assets/videos/<xx>-<group>/`, hidden sections' too, the original bytes in `_work/images/` (contact sheets there);
  - every slot the original fills gets its file as `default_<slot id>` in `templates/product*.json` (a path inside `assets/`:
    `images/<xx>-sections/photo.webp`), never written into the `.hbs`; a theme section uses the same pattern. A file picked in
    the editor wins, and an empty default keeps the placeholder frame;
  - the main product stays product data: never hard-code its gallery. Point `sample/product.json` at `<xx>-gallery` (with
    `thumb_url: /assets/sample/thumbs/<name>.webp`) so the preview looks right, and list those files in the report for the user
    to upload to the product;
  - customer review photos and avatars ship in `<xx>-reviews` / `<xx>-hidden` because the user asked for everything, but are
    never wired to a slot and never turned into reviews on another store (sample data for the preview only).
- Compare with the **live** screenshots `_work/site/pages/<name>/desktop.png` / `mobile.png`; if a pop-up covers one, with
  `_work/capture/<name>/` (pop-ups cleared). Measure on the offline copy (`http://localhost:8092/<name>`), not on the live store.
- Never add to cart, check out, send a form or log in on the original; never try to get around a bot check.

## Steps

1. **Scaffold** (first link only): `node tools/new-theme.js "<Brand>" --source "<url>"` → `themes/<slug>/`.
2. **Download** each link, one after another, in the background:
   `node tools/download-page.js <url> themes/<slug>` (name from the URL: home, product, collection, search, contact,
   tracking, policy, page; a second product template: `--name product-<x>`). One command saves the page and every
   file it uses, checks the offline copy, then runs `capture.js` on it → `_work/capture/<name>/` (tokens, sections,
   text, fonts — read them as in new-theme step 2; product pages are captured with `--no-images`).
   Read its summary:
   - `offline desktop/mobile: external 0, 404 0, differs ≤ 5 %` → the copy is faithful. Over 5 %: open
     `pages/<name>/desktop.png` next to `offline-desktop.png`. Moving content (timers, autoplay sliders, videos
     Chromium cannot play) is fine; a missing block is not — fix the tool or say it in the report.
   - `partly blocked (desktop)`: that viewport hit a bot check twice; its capture used the other viewport's DOM.
     Take that viewport's tokens from the other one (as new-theme says for a bot-checked desktop pass), or retry
     later with `--refresh`.
   - `BLOCKED` (exit 2): the page cannot be downloaded — ask the user for screenshots and switch to `new-theme`.
   - `video` lines: every video of the page (MB · shown size · area · how it was found: page / template / json /
     script / link / stream · file · poster). HLS streams are already resolved: a Shopify stream gives the MP4 of
     its best rendition (`← …m3u8`); another stream line says `stream N segments` (kept for reference, a theme cannot
     use it — leave that slot empty and say so).
   - `skipped`: third-party frames (YouTube …, kept as empty frames), encrypted / byte-range / DASH streams — list
     them in the report.
   - `--refresh` on a viewport behind a bot check keeps that viewport's previous files (`kept` in manifest.json).
   While it runs, read `base-theme/README.md` and the newest `themes/*/_work/plan.md` (if any).
3. **Serve the copy** (background, once): `node tools/site-server.js themes/<slug> --port 8092`. A long page: first
   `node tools/probe-sections.js http://127.0.0.1:8092/<name> --width 1440` (and `--width 390`) for every block's fonts,
   sizes, colours and edges in one table. Measure there:
   `node tools/shot.js http://localhost:8092/<name> - --width 360 --eval "<js>"`, `--selector "<css>"` for one part,
   `node tools/pixel.js themes/<slug>/_work/site/pages/<name>/mobile.png …` for exact colours. The original's files
   are in `_work/site/_m/<host>/…`; `assets.json` maps each URL → file, pages, area (header / main / footer) and
   shown size, section, hidden, gallery — handy for the media-slot sizes and ratios in `plan.md`.
   Run `node tools/media-library.js themes/<slug> --prefix <xx>` (background): its `slots` list gives the `default_image` paths.
4. **Build** = new-theme steps 3–8 (map → build → compare → verify → pack → report), with:
   - reference screenshots `_work/site/pages/<name>/desktop.png` and `mobile.png`:
     `node tools/visual-diff.js themes/<slug>/_work/site/pages/product/desktop.png http://localhost:8091/product --out themes/<slug>/_work/diff`
     and `… /mobile.png http://localhost:8091/product --width 390 …`;
   - where each page goes: `home` → `templates/index.hbs` + `home_*` settings · `product` → `templates/product.json`
     · `product-<x>` → `templates/product.<x>.json` · `collection` → `templates/collection.hbs` · `search` →
     `templates/search.hbs` · `contact`, `policy`, `page` → `templates/page.hbs` (+ `contact-form`) · `tracking` →
     `templates/page.hbs` + `tracking-result.hbs` (never its script);
   - pictures and videos come from the media library (Rules above): `default_image`, `default_video`, `default_poster`, `default_media_N`,
     `default_card_N_image`. Report `videos: N files, X MB` and `originals: N images, M videos … → _work/media-to-replace.md` from `pack.js`:
     that list is what the user still has to replace.
5. **Report** (Vietnamese): new-theme step 8, plus the pages downloaded (name → link → offline check numbers),
   skipped files, partly blocked viewports, and the pages that had no link (base layout + skin).
6. **RUNLOG**: add the run to `.claude/skills/new-theme/RUNLOG.md` (one log for both skills; the download is the
   capture step).
