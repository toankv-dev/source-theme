#!/usr/bin/env node
/*
 * Lunara Vesnacharm — small, anchored edits of the Lunara files it shares with hushflex (docs/plan-lunara-vesnacharm.md).
 * Each edit: find an exact anchor, replace it; skipped when its "done" marker is already in the file; stops with an
 * error when the anchor moved (so a re-copy from hushflex never half-applies).
 *
 *   node themes/lunara---vesnacharm/_src/patch-vn.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');
const CHEVRON = (d) => '<svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';

const EDITS = [
  // ---- T3: highlight variable + vn-chrome.css on every page that prints gs-head (not checkout)
  {
    file: 'snippets/gs-head.hbs', done: 'css/vn-chrome.css',
    find: '<link rel="stylesheet" href="{{assets_url}}/css/custom.css">',
    replace: '<link rel="stylesheet" href="{{assets_url}}/css/custom.css">\n'
      + '<link rel="stylesheet" href="{{assets_url}}/css/vn-chrome.css">\n'
      + '<style>:root{--vn-hl:{{#if settings.highlight}}{{settings.highlight}}{{else}}#790236{{/if}};}</style>',
  },
  // ---- T3: rotating top bar — the main colour, solid, when no background is set (user 2026-11-20: "darker, bigger
  //      text, as tammycharm.com"; was a pale gradient of it), text size from vn_topbar_size, ‹ › arrows.
  //      The first entry moves a header.hbs patched before (pale gradient) to it; skipped on a fresh copy.
  {
    file: 'sections/header.hbs', done: '--vn-tb-size:{{#if settings.vn_topbar_size}}', optional: true,
    find: '{{else}}var(--vn-hl-07);background-image:var(--vn-grad){{/if}};color:',
    replace: '{{else}}var(--vn-hl,#790236){{/if}};--vn-tb-size:{{#if settings.vn_topbar_size}}{{settings.vn_topbar_size}}{{else}}14{{/if}}px;color:',
  },
  {
    file: 'sections/header.hbs', done: '--vn-tb-size:{{#if settings.vn_topbar_size}}',
    find: '{{else}}var(--lu-primary,#124F9F){{/if}};color:',
    replace: '{{else}}var(--vn-hl,#790236){{/if}};--vn-tb-size:{{#if settings.vn_topbar_size}}{{settings.vn_topbar_size}}{{else}}14{{/if}}px;color:',
  },
  {
    file: 'sections/header.hbs', done: 'data-vn-tb="-1"',
    find: '<div class="lt-in" data-lt-text=',
    replace: '<div class="vn-tb"><button type="button" class="vn-tb__arrow" data-vn-tb="-1" aria-label="Previous message" hidden>'
      + CHEVRON('M10 2 2 10l8 8') + '</button><div class="lt-in" data-lt-text=',
  },
  {
    file: 'sections/header.hbs', done: 'data-vn-tb="1"',
    find: 'Free Shipping On All Orders{{/if}}"></div><script>',
    replace: 'Free Shipping On All Orders{{/if}}"></div><button type="button" class="vn-tb__arrow" data-vn-tb="1" aria-label="Next message" hidden>'
      + CHEVRON('m2 2 8 8-8 8') + '</button></div><script>',
  },
  {
    file: 'sections/header.hbs', done: 'function go(d)',
    find: "var i=0;setInterval(function(){els[i].classList.remove('on');i=(i+1)%els.length;els[i].classList.add('on');},4000);",
    replace: "var i=0,t;function go(d){els[i].classList.remove('on');i=(i+d+els.length)%els.length;els[i].classList.add('on');}"
      + "function start(){clearInterval(t);t=setInterval(function(){go(1);},4000);}start();"
      + "Array.prototype.forEach.call(bar.querySelectorAll('[data-vn-tb]'),function(b){b.hidden=false;b.addEventListener('click',function(){go(+b.getAttribute('data-vn-tb'));start();});});",
  },
  // ---- T4: two-row header (logo centred, menu below) = Dawn's built-in header--top-center
  {
    file: 'sections/header.hbs', done: 'class="header header--top-center',
    find: 'class="header header--middle-center header--mobile-center',
    replace: 'class="header header--top-center header--mobile-center',
  },
  // ---- T5: footer in 5 columns (logo + email · Shop By · Information · Customer Service · newsletter) + #111 bottom
  //      bar; keeps #lu-ft, data-ms-year, #lu-newsletter-email, data-lu-newsletter (the footer script) and everything
  //      after </footer> (#ms-card-tpl, quick-add modal)
  {
    file: 'sections/footer.hbs', done: 'class="ft-shell vn-ft"',
    start: '<div class="ft-shell">',
    end: '</footer>',
    replace: fs.readFileSync(path.join(__dirname, 'vn-footer.hbs'), 'utf8').trim(),
  },
  // ---- T6: "NN% OFF" badge on every product card (#ms-card-tpl: home catalog + related); theme.js and related.hbs
  //      already fill [data-ms-badge] [data-ms-pct] and empty it when there is no compare-at price
  {
    file: 'sections/footer.hbs', done: 'class="vn-badge" data-ms-badge',
    find: '<div class="card__inner ratio" style="--ratio-percent: 100.0%;"><div class="card__media">',
    replace: '<div class="card__inner ratio" style="--ratio-percent: 100.0%;"><span class="vn-badge" data-ms-badge><span data-ms-pct></span>% OFF</span><div class="card__media">',
  },
  // ---- live fix 1: logo width from Theme settings > Header (vn_logo_width / vn_logo_width_mobile)
  {
    file: 'snippets/gs-head.hbs', done: '--vn-logo-w:',
    find: '{{else}}#790236{{/if}};}</style>',
    replace: '{{else}}#790236{{/if}};--vn-logo-w:{{#if settings.vn_logo_width}}{{settings.vn_logo_width}}{{else}}280{{/if}}px;--vn-logo-wm:{{#if settings.vn_logo_width_mobile}}{{settings.vn_logo_width_mobile}}{{else}}180{{/if}}px;}</style>',
  },
  // ---- live fix 2: the countdown top bar without its own background takes the highlight (was the primary colour)
  {
    file: 'sections/header.hbs', done: '{{else}}var(--vn-hl,#790236){{/if}};--lt-fg:',
    find: '--lt-c:{{#if settings.topbar_bg}}{{settings.topbar_bg}}{{else}}var(--lu-primary,#124F9F){{/if}};--lt-fg:',
    replace: '--lt-c:{{#if settings.topbar_bg}}{{settings.topbar_bg}}{{else}}var(--vn-hl,#790236){{/if}};--lt-fg:',
  },
  // ---- "Show variant pickers" off also hides the main picker in the bodysuit look (sc-product.css forces it visible with
  //      .sc-skin.sc-skin [data-ms-pdp] .lu-variants{display:block!important}); user 2026-11-19
  {
    file: 'sections/product.hbs', done: '.sc-skin.sc-skin.sc-skin [data-ms-pdp] .lu-variants',
    find: '{{#if (eq section.settings.show_variants false)}}[data-section-id="{{section.id}}"] .lu-variants{display:none!important}{{/if}}',
    replace: '{{#if (eq section.settings.show_variants false)}}[data-section-id="{{section.id}}"] .lu-variants,.sc-skin.sc-skin.sc-skin [data-ms-pdp] .lu-variants{display:none!important}{{/if}}',
  },
  // ---- footer colour: Theme settings > Colors > Footer background (vn_footer_bg, empty = the highlight); user 2026-11-19
  {
    file: 'snippets/gs-head.hbs', done: '--vn-footer:',
    find: '{{else}}180{{/if}}px;}</style>',
    replace: '{{else}}180{{/if}}px;{{#if settings.vn_footer_bg}}--vn-footer:{{settings.vn_footer_bg}};{{/if}} }</style>',
  },
  // ---- main colour on buttons (user 2026-11-19): the highlight as an RGB triplet for Dawn's rgb(var(--color-button))
  {
    file: 'snippets/gs-head.hbs', done: 'data-vn-hl=',
    find: '{{#if settings.vn_footer_bg}}--vn-footer:{{settings.vn_footer_bg}};{{/if}} }</style>',
    replace: '{{#if settings.vn_footer_bg}}--vn-footer:{{settings.vn_footer_bg}};{{/if}} }</style>\n' + "<script data-vn-hl=\"{{settings.highlight}}\">(function(){try{var h=String(document.currentScript.getAttribute('data-vn-hl')||'').trim().replace('#','');if(h.length===3)h=h.replace(/./g,'$&$&');if(!/^[0-9a-f]{6}$/i.test(h))return;document.documentElement.style.setProperty('--vn-hl-rgb',[0,2,4].map(function(i){return parseInt(h.substr(i,2),16);}).join(', '));}catch(e){}})();</script>",
  },
  // ---- cart drawer Checkout without its own background: the highlight (was the primary colour)
  {
    file: 'sections/cart-drawer.hbs', done: '{{else}}var(--vn-hl, #790236){{/if}};color:{{settings.cart_checkout_color}}',
    find: '{{settings.cart_checkout_bg}}{{else}}var(--lu-primary, #124F9F){{/if}};color:{{settings.cart_checkout_color}};}',
    replace: '{{settings.cart_checkout_bg}}{{else}}var(--vn-hl, #790236){{/if}};color:{{settings.cart_checkout_color}};}',
  },
  // ---- checkout page: Complete order / Continue buttons in the highlight (colour only; fonts and logic untouched)
  {
    file: 'templates/checkout.hbs', done: '.co-btn-submit, .co-btn-continue { background: {{#if settings.highlight}}',
    find: '.co-btn-submit, .co-btn-continue { background: {{#if settings.primary}}{{settings.primary}}{{else}}#124F9F{{/if}} !important; border-color: {{#if settings.primary}}{{settings.primary}}{{else}}#124F9F{{/if}} !important;',
    replace: '.co-btn-submit, .co-btn-continue { background: {{#if settings.highlight}}{{settings.highlight}}{{else}}#790236{{/if}} !important; border-color: {{#if settings.highlight}}{{settings.highlight}}{{else}}#790236{{/if}} !important;',
  },
  // ---- the whole theme in the main colour (user 2026-11-19): Lunara's primary-driven colours take the highlight
  {
    file: 'snippets/gs-head.hbs', done: '<script data-lu-colors="{{#if settings.highlight}}',
    find: '<script data-lu-colors="{{settings.primary}}|',
    replace: '<script data-lu-colors="{{#if settings.highlight}}{{settings.highlight}}{{else}}#790236{{/if}}|',
  },
  {
    file: 'templates/page.hbs', done: '--pp-base-color: {{#if settings.highlight}}',
    find: '--pp-base-color: {{#if settings.primary}}{{settings.primary}}{{else}}#124F9F{{/if}};',
    replace: '--pp-base-color: {{#if settings.highlight}}{{settings.highlight}}{{else}}#790236{{/if}};',
  },
  {
    file: 'templates/checkout.hbs', done: '--ink: {{#if settings.highlight}}',
    find: '--ink: {{settings.primary}};',
    replace: '--ink: {{#if settings.highlight}}{{settings.highlight}}{{else}}#790236{{/if}};',
  },
  // ---- under the Add to cart of the bodysuit look: "Guaranteed safe checkout" + delivery estimate / guarantee
  //      (snippets/sc-trustbox.hbs; user 2026-11-19, as tammycharm.com)
  {
    file: 'sections/product.hbs', done: '{{> sc-trustbox ..}}',
    find: '{{#if (eq type "buy_buttons")}}{{> lu_p_buy_buttons ..}}{{/if}}',
    replace: '{{#if (eq type "buy_buttons")}}{{> lu_p_buy_buttons ..}}{{#if (eq ../section.settings.skin "shapecurve")}}{{> sc-trustbox ..}}{{/if}}{{/if}}',
  },
  // ---- the "SAVE xx%" of a pack subtitle sits right after the pack title, the rest of the subtitle stays on the line
  //      below (user 2026-11-19, screenshot: "Single [SAVE 70%]", in the main colour). theme.js still writes the
  //      subtitle; it now moves its .lu-k-save into the slot after the title and hides the line when nothing is left.
  {
    file: 'snippets/lu-kaching-bar.hbs', done: 'data-lu-save-slot',
    find: '<span class="kaching-bundles__bar-title">{{title}}</span>',
    replace: '<span class="kaching-bundles__bar-title">{{title}}</span><span class="lu-k-save-slot" data-lu-save-slot></span>',
  },
  {
    file: 'assets/js/theme.js', done: '[data-lu-save-slot]',
    find: 'F.innerHTML=Q;var mt=F.closest(".kaching-bundles__bar-second-line");mt&&(mt.hidden=!Q)',
    replace: 'F.innerHTML=Q;var sl=t("[data-lu-save-slot]",q);if(sl){sl.innerHTML="";var sv=t(".lu-k-save",F);sv&&(sl.appendChild(sv),Q=F.innerHTML.replace(/^(\\s|&nbsp;|[\\u00b7|+\\-\\u2013\\u2014,])+|(\\s|&nbsp;|[\\u00b7|+\\-\\u2013\\u2014,])+$/g,""),F.innerHTML=Q)}var mt=F.closest(".kaching-bundles__bar-second-line");mt&&(mt.hidden=!Q)',
  },
];

let applied = 0;
for (const e of EDITS) {
  const f = path.join(THEME, e.file);
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(e.done)) { console.log('already  ' + e.file + '  ' + e.done); continue; }
  const count = (a) => s.split(a).length - 1;
  if (e.optional && e.find && count(e.find) === 0) { console.log('skip     ' + e.file + '  ' + e.done); continue; }
  for (const a of e.start ? [e.start, e.end] : [e.find]) {
    const n = count(a);
    if (n !== 1) { console.error('ANCHOR ' + (n ? 'not unique (' + n + ')' : 'missing') + ' in ' + e.file + ': ' + a.slice(0, 80)); process.exit(1); }
  }
  if (e.start) {
    const i = s.indexOf(e.start), j = s.indexOf(e.end);
    if (j < i) { console.error('ANCHOR order in ' + e.file); process.exit(1); }
    s = s.slice(0, i) + e.replace + s.slice(j);
  } else s = s.replace(e.find, () => e.replace);
  fs.writeFileSync(f, s);
  applied++;
  console.log('applied  ' + e.file + '  ' + e.done);
}
console.log(applied + ' edit(s) applied');

// ---- last (after the anchored edits, some of which anchor on it): Lunara's blue wherever it is still written — defaults,
//      fallbacks and Dawn's base accent — becomes the main colour (user 2026-11-19: the platform's contact page links only
//      base.css + custom.css, so its "Next" button took custom.css's :root{--lu-primary:#124F9F}). Idempotent.
const BLUE = [[/#124f9f/gi, '#790236'], [/18, 79, 159/g, '121, 2, 54'], [/#0d3b78/gi, '#5c0129']];
let swaps = 0;
for (const rel of ['assets/css/custom.css', 'assets/css/base.css', 'layout/theme.hbs', 'templates/page.hbs', 'templates/checkout.hbs',
  'templates/index.hbs', 'sections/header.hbs', 'sections/footer.hbs', 'sections/cart-drawer.hbs', 'sections/product.hbs',
  'sections/related.hbs', 'sections/reviews.hbs', 'snippets/gs-head.hbs', 'snippets/hf-wave-marquee.hbs', 'snippets/lu-kaching.hbs',
  'snippets/lu-size-finder.hbs']) {
  const f = path.join(THEME, rel);
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8'), n = 0;
  for (const [re, to] of BLUE) s = s.replace(re, () => { n++; return to; });
  if (n) { fs.writeFileSync(f, s); swaps += n; console.log('blue → main colour  ' + rel + '  ' + n); }
}
console.log(swaps + ' blue value(s) replaced');
