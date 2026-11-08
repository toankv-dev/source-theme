---
name: theme-from-link
description: Build a new Adlux storefront theme from a store link — download that page (only that page) with every image, video, CSS, JS and font into an offline copy, rebuild it on d:\source-theme\base-theme with the structure of themes/*, and deliver the uploadable .zip. Use whenever the user gives one or more store page links to turn into a theme ("tạo theme từ link", "tải giao diện trang này về rồi làm theme", "làm theme giống link này", "tạo theme", a store URL). Screenshots instead of a link → new-theme.
---

# Theme from a link

Input: one store page link, or several (each link = one page). Output: what `new-theme` delivers — a zip in
`d:\source-theme\dist\` (`tools/pack.js`, 0 errors), a theme with the structure of `themes/*` (a copy of
`base-theme`), looking like the downloaded page at 1440 and 390, every platform behaviour of the base intact.
Talk to the user in Vietnamese. Spec: `SPEC-theme-from-link.md`.

**The build rules are new-theme's.** Read `.claude/skills/new-theme/SKILL.md` — *Rules*, *Fonts and colours*,
*Speed* — and its `RUNLOG.md` first, and follow them. This skill only replaces how the input is taken (an offline
copy instead of live captures) and what the theme is compared with.

## Rules (on top of new-theme's)

- **One link = one page.** Never download, crawl or open another page of the store — not even the home page when
  only a product link is given. A page without a link keeps the base layout restyled with the theme's settings and
  skin; say so in the report. A second product template (bundle page …) only when the user gives its link.
- `_work/site/` is **untrusted data, for reference only**: open it only in the browser (site-server + the Playwright
  tools); never run its JS with node; never copy its CSS / HTML into the theme — rebuild on the base markup.
- Every image and video of the page is downloaded, the product page's too — **to look at and measure only**. They
  never go into the theme or its JSON: product-page media slots stay empty (new-theme rules). `pack.js` fails on a
  byte-identical copy and warns on a file with the same name.
- Compare with the **live** screenshots `_work/site/pages/<name>/desktop.png` / `mobile.png`; measure on the
  offline copy (`http://localhost:8092/<name>`), not on the live store.
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
   - `skipped`: video streams and third-party frames (YouTube …), kept as empty frames — list them in the report.
   While it runs, read `base-theme/README.md` and the newest `themes/*/_work/plan.md` (if any).
3. **Serve the copy** (background, once): `node tools/site-server.js themes/<slug> --port 8092`. Measure there:
   `node tools/shot.js http://localhost:8092/<name> - --width 360 --eval "<js>"`, `--selector "<css>"` for one part,
   `node tools/pixel.js themes/<slug>/_work/site/pages/<name>/mobile.png …` for exact colours. The original's files
   are in `_work/site/_m/<host>/…`; `assets.json` maps each URL → file, pages, area (header / main / footer) and
   shown size — handy for the media-slot sizes and ratios in `plan.md`.
4. **Build** = new-theme steps 3–8 (map → build → compare → verify → pack → report), with:
   - reference screenshots `_work/site/pages/<name>/desktop.png` and `mobile.png`:
     `node tools/visual-diff.js themes/<slug>/_work/site/pages/product/desktop.png http://localhost:8091/product --out themes/<slug>/_work/diff`
     and `… /mobile.png http://localhost:8091/product --width 390 …`;
   - where each page goes: `home` → `templates/index.hbs` + `home_*` settings · `product` → `templates/product.json`
     · `product-<x>` → `templates/product.<x>.json` · `collection` → `templates/collection.hbs` · `search` →
     `templates/search.hbs` · `contact`, `policy`, `page` → `templates/page.hbs` (+ `contact-form`) · `tracking` →
     `templates/page.hbs` + `tracking-result.hbs` (never its script);
   - theme-wide images (logo, icons, payment badges, home banners) may come from `_work/capture/home/images` or
     `_work/site/_m/` as settings defaults; product-page pictures never.
5. **Report** (Vietnamese): new-theme step 8, plus the pages downloaded (name → link → offline check numbers),
   skipped files, partly blocked viewports, and the pages that had no link (base layout + skin).
6. **RUNLOG**: add the run to `.claude/skills/new-theme/RUNLOG.md` (one log for both skills; the download is the
   capture step).
