#!/usr/bin/env node
// node tools/scripts/remove-review-form.js <theme-dir> [css files…]  (default assets/css/sections.css)
// Removes every customer review-writing form from <theme-dir>: buttons, the review-form snippet, its settings,
// ui.js initReviewForm and the form's CSS. node no-review-form.js <theme-dir> [css files…]
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const cssFiles = process.argv.slice(3).length ? process.argv.slice(3) : ['assets/css/sections.css'];
const P = (f) => path.join(dir, f);
const log = (m) => console.log(dir + ': ' + m);

// ---- reviews.hbs
const hp = P('sections/reviews.hbs');
if (fs.existsSync(hp)) {
  let s = fs.readFileSync(hp, 'utf8');
  s = s.replace(/\n[ \t]*\{\{#unless \(eq section\.settings\.show_form false\)\}\}<button[^\n]*data-review-write[^\n]*\{\{\/unless\}\}/g, '');
  s = s.replace(/\n[ \t]*\{\{#unless \(eq section\.settings\.show_form false\)\}\}\{\{> review-form\}\}\{\{\/unless\}\}/g, '');
  // empty state existed only to offer the form → nothing when there are no reviews
  s = s.replace(/\{\{else\}\}\n\{\{#unless \(eq section\.settings\.show_form false\)\}\}[\s\S]*?\{\{> review-form\}\}\n<\/div>\n\{\{\/unless\}\}\n\{\{\/if\}\}/, '{{/if}}');
  s = s.replace(/,? and a "Write a review" form that posts to the\n\s*reviews API \(multipart, X-CSRF-TOKEN\) — new reviews wait for the store's approval\./, '. No review form:\n      shoppers never write reviews on the storefront (the store adds them in the admin).');
  s = s.replace(/ With no reviews the\n\s*section shows only the form button \(or nothing when the form is switched off\)\./, ' With no reviews the\n      section renders nothing.');
  s = s.replace('Write / Filter / Sort (icons)', 'Filter / Sort (icons)');
  if (/review-form|data-review-write|show_form/.test(s)) throw new Error('form left in reviews.hbs');
  fs.writeFileSync(hp, s); log('reviews.hbs: form removed');
}
// ---- any other markup that still includes the snippet / write buttons
for (const sub of ['sections', 'snippets', 'templates', 'layout']) {
  if (!fs.existsSync(P(sub))) continue;
  for (const f of fs.readdirSync(P(sub))) {
    if (!f.endsWith('.hbs') || f === 'review-form.hbs') continue;
    const p = P(sub + '/' + f); const s = fs.readFileSync(p, 'utf8');
    if (/\{\{> ?review-form|data-review-write|data-review-form/.test(s)) console.log('  CHECK BY HAND: ' + sub + '/' + f + ' still has a review form / write button');
  }
}
if (fs.existsSync(P('snippets/review-form.hbs'))) { fs.unlinkSync(P('snippets/review-form.hbs')); log('snippets/review-form.hbs deleted'); }

// ---- schema
const sp = P('sections/reviews.schema.json');
if (fs.existsSync(sp)) {
  const sc = JSON.parse(fs.readFileSync(sp, 'utf8'));
  const n = sc.settings.length;
  sc.settings = sc.settings.filter((x) => !['show_form', 'write_label'].includes(x.id));
  sc.settings.forEach((x) => { if (x.type === 'paragraph' && /written by shoppers/.test(x.content || '')) x.content = "Shows the product's real reviews, added in the admin. There is no review form on the storefront."; if (x.id === 'layout' && x.info) x.info = x.info.replace('Write button', 'no Write button').replace('icon-only Filter / Sort and the no Write button', 'icon-only Filter / Sort'); });
  fs.writeFileSync(sp, JSON.stringify(sc, null, 2) + '\n'); log('schema: ' + (n - sc.settings.length) + ' form settings removed');
}

// ---- ui.js
const up = P('assets/js/ui.js');
if (fs.existsSync(up)) {
  let s = fs.readFileSync(up, 'utf8');
  const a = s.indexOf('  function initReviewForm() {');
  if (a > -1) {
    const b = s.indexOf('\n  function ', a + 10);
    s = s.slice(0, a) + s.slice(b + 1);
    s = s.replace('initReviews, initReviewForm,', 'initReviews,');
    if (s.includes('initReviewForm')) throw new Error('initReviewForm still referenced');
    fs.writeFileSync(up, s); log('ui.js: initReviewForm removed');
  }
}

// ---- CSS: rules whose selectors are only about the form
for (const rel of cssFiles) {
  const cp = P(rel); if (!fs.existsSync(cp)) continue;
  let s = fs.readFileSync(cp, 'utf8'); const before = s.length;
  const formSel = (sel) => sel.split(',').every((x) => /\.b-rform|\.b-reviews__write|data-review-(form|modal|write|msg)/.test(x));
  // flat rules and rules inside @media (one level)
  s = s.replace(/(^|\n)([ \t]*)([^{}@\n][^{}]*)\{[^{}]*\}/g, (m, nl, ind, sel) => (formSel(sel.trim()) ? nl.length ? '' : '' : m));
  s = s.replace(/@media[^{]+\{\s*\}/g, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(cp, s); log(rel + ': ' + (before - s.length) + ' bytes of form CSS removed');
}
