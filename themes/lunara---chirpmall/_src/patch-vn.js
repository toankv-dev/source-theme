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
  // ---- T4: chirpmall (user 2026-11-28, "like tammycharm, tidy"): ONE row = menu left, logo centred, search + cart right
  //      = Lunara's own header--middle-center. Vesnacharm had the two-row header--top-center (logo, menu below); this
  //      entry turns a copy patched by it back (done = middle-center: a fresh Lunara file is skipped).
  {
    file: 'sections/header.hbs', done: 'class="header header--middle-center',
    find: 'class="header header--top-center header--mobile-center',
    replace: 'class="header header--middle-center header--mobile-center',
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
  // ---- T5b: the same block rewritten from _src/vn-footer.hbs on EVERY run (T5 only ran once: its done marker is the
  //      block's first line), so a change of the .hbs reaches the theme (2026-11-26: phone accordion)
  {
    file: 'sections/footer.hbs', done: 'class="ft-shell vn-ft"', always: true,
    start: '<div class="ft-shell vn-ft">',
    end: '</footer>',
    replace: fs.readFileSync(path.join(__dirname, 'vn-footer.hbs'), 'utf8').trim()
      // without the file's leading {{!-- --}}: it sits above the start anchor, so every run added one more copy (2026-11-27)
      .replace(/^\{\{!--[\s\S]*?--\}\}\s*/, ''),
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
    replace: '{{else}}#790236{{/if}};--vn-logo-w:{{#if settings.vn_logo_width}}{{settings.vn_logo_width}}{{else}}220{{/if}}px;--vn-logo-wm:{{#if settings.vn_logo_width_mobile}}{{settings.vn_logo_width_mobile}}{{else}}180{{/if}}px;}</style>',
  },
  // ---- live fix 2: the countdown top bar without its own background takes the highlight (was the primary colour).
  //      Superseded by the countdown bar below (vn-countdown.hbs); kept so a fresh copy patches the same way.
  {
    file: 'sections/header.hbs', done: '{{else}}var(--vn-hl,#790236){{/if}};--lt-fg:', optional: true,
    find: '--lt-c:{{#if settings.topbar_bg}}{{settings.topbar_bg}}{{else}}var(--lu-primary,#124F9F){{/if}};--lt-fg:',
    replace: '--lt-c:{{#if settings.topbar_bg}}{{settings.topbar_bg}}{{else}}var(--vn-hl,#790236){{/if}};--lt-fg:',
  },
  // ---- countdown top bar (Theme settings > Top bar > Style = Countdown timer; user 2026-11-20, screenshot of a
  //      "BLACK FRIDAY IS LIVE • ENDS MON, NOV 30 • 11 DAYS : 03 HRS … • Shop Now →" bar): one row on a computer,
  //      title · subtitle on top of timer · link on phones (a long title wraps instead of running off the screen),
  //      a DAYS box, a fixed end date, link text + link (the whole bar is the link). Source: _src/vn-countdown.hbs.
  //      always: the block is rewritten on every run (its first line is the start anchor again), so edit the .hbs.
  {
    file: 'sections/header.hbs', done: 'lt-cd vn-cd', always: true,
    start: '{{#if (eq settings.topbar_style "countdown")}}',
    end: '{{else}}<div id="lunara-topbar" class="shopify-section-group-header-group" role="region"',
    replace: fs.readFileSync(path.join(__dirname, 'vn-countdown.hbs'), 'utf8').trim(),
  },
  // ---- home banner picture as a link (Theme settings > Home page > Banner image link; user 2026-11-20: "click the
  //      banner, open the product"). Empty = not a link, as before. The text box button keeps its own link.
  {
    file: 'templates/index.hbs', done: 'class="lu-hb-link"',
    find: '<div class="slideshow__media banner__media media"><picture style="display:contents">',
    replace: '<div class="slideshow__media banner__media media">{{#if settings.home_banner_image_link}}<a class="lu-hb-link" href="{{settings.home_banner_image_link}}" aria-label="{{#if settings.home_banner_heading}}{{settings.home_banner_heading}}{{else}}{{brand.name}}{{/if}}">{{/if}}<picture style="display:contents">',
  },
  {
    file: 'templates/index.hbs', done: '</picture>{{#if settings.home_banner_image_link}}</a>{{/if}}',
    find: 'sizes="100vw" class=""></picture></div>',
    replace: 'sizes="100vw" class=""></picture>{{#if settings.home_banner_image_link}}</a>{{/if}}</div>',
  },
  {
    file: 'templates/index.hbs', done: '.lu-hb .lu-hb-link{',
    find: '.lu-hb .slideshow__media img{width:100%;height:100%;object-fit:cover}',
    replace: '.lu-hb .slideshow__media img{width:100%;height:100%;object-fit:cover}.lu-hb .lu-hb-link{display:block;width:100%;height:100%}',
  },
  //      Dawn's overlays (.banner::after, .banner__media::after; transparent here, z-index 0) lie over the picture on a
  //      computer and took the click: they let it through, and still paint (overlay opacity keeps working).
  {
    file: 'templates/index.hbs', done: '.lu-hb .banner::after,.lu-hb .banner__media::after{pointer-events:none}',
    find: '.lu-hb .lu-hb-link{display:block;width:100%;height:100%}',
    replace: '.lu-hb .lu-hb-link{display:block;width:100%;height:100%}.lu-hb .banner::after,.lu-hb .banner__media::after{pointer-events:none}',
  },
  // ---- home banner on phones shows the WHOLE picture (user 2026-11-20, screenshot: "BLACK FRIDAY UP TO 70%" and the
  //      SHOP button cut off). Was a fixed 340 px box + object-fit: cover: a 1916 x 821 banner kept only its middle
  //      49 %. Now (Banner on phone = Whole picture, the default; anything but "crop") the box takes the picture's
  //      own shape: --hb-ar = width / height, set by the script below from the loaded picture and kept per picture in
  //      localStorage (lu_hb_ar:<src>), so a repeat visit reserves the exact box before the picture arrives (no
  //      layout shift). First visit: a guess (mobile picture 6/5, banner 8/3, sample 1/1) + contain, never a crop.
  //      "crop" = the old fixed height (Banner height on phone). Spaces around the {{#if}} in the CSS: "{{{" / "}}}"
  //      would be read as a triple-stash.
  {
    file: 'templates/index.hbs', done: 'settings.vn_hb_mobile_fit',
    find: '@media screen and (max-width:749px){.lu-hb .slideshow__media{height:{{#if settings.home_banner_height_mobile}}{{settings.home_banner_height_mobile}}{{else}}340{{/if}}px!important}}',
    replace: '@media screen and (max-width:749px){ {{#if (eq settings.vn_hb_mobile_fit "crop")}}'
      + '.lu-hb .slideshow__media{height:{{#if settings.home_banner_height_mobile}}{{settings.home_banner_height_mobile}}{{else}}340{{/if}}px!important}'
      + '{{else}}.lu-hb .slideshow,.lu-hb .slideshow__slide{height:auto!important;min-height:0!important}'
      + '.lu-hb .slideshow__media{height:auto!important;min-height:0!important;aspect-ratio:var(--hb-ar,{{#if settings.home_banner_image_mobile}}6/5{{else}}{{#if settings.home_banner_image}}8/3{{else}}1/1{{/if}}{{/if}})}'
      + '.lu-hb .slideshow__media.banner__media img{object-fit:contain}{{/if}} }',
  },
  {
    file: 'templates/index.hbs', done: 'lu_hb_ar:',
    find: 'setTimeout(f,1500)})();</script>{{/unless}}{{> hf-wave-marquee}}',
    replace: 'setTimeout(f,1500)})();</script>'
      + '<script>(function(){var h=document.querySelector(".lu-hb"),i=h&&h.querySelector(".slideshow__media img");if(!i)return;'
      + 'function k(){var so=h.querySelector(".slideshow__media source");return "lu_hb_ar:"+(so&&matchMedia(so.media).matches?so.srcset:i.getAttribute("src"))}'
      + 'function put(r){h.style.setProperty("--hb-ar",r)}try{var c=localStorage.getItem(k());if(c)put(c)}catch(e){}'
      + 'function f(){if(!i.naturalWidth)return;var r=i.naturalWidth+"/"+i.naturalHeight;put(r);try{localStorage.setItem(k(),r)}catch(e){}}'
      + 'i.addEventListener("load",f);if(i.complete)f()})();</script>'
      + '{{/unless}}{{> hf-wave-marquee}}',
  },
  // ---- product cards (home grid, catalog, upsell: theme.js ht()) show the whole picture, all of one list the same
  //      height (user 2026-11-20: "the photo is cut", then "cards must be the same height"). ht() marks each card
  //      .lu-card--fit + data-lu-r (its photo's height / width in %, 100 without sizes) and queues vnEq() as a
  //      microtask (after the caller has put the cards in their list, before the first paint): every card of one list
  //      (the card's grandparent: li > ul) gets one box, --ratio-percent = Theme settings > Home page > "Product cards:
  //      picture shape" (:root --vn-card-r, gs-head) or, on "auto", the shape most photos of that list have (whole %,
  //      ties: the taller; 50-150 %). The list gets .lu-eqlist: its rows stretch, so a card with a taller text part
  //      (a price not on sale is 16 px, a sale price 13 px) does not stick out of its row. vn-chrome.css .lu-card--fit
  //      draws the photo with object-fit: contain. Related products keep their 4:5 crop.
  {
    file: 'assets/js/theme.js', done: 'function vnEq(',
    find: 'window.MSCart=dt;function ht(e,n){',
    replace: 'window.MSCart=dt;var vnEqQ=0;function vnEqSoon(){vnEqQ||(vnEqQ=1,Promise.resolve().then(vnEq))}'
      + 'function vnEq(){vnEqQ=0;var fx=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vn-card-r"))||0,g=[];'
      + 'u(".lu-card--fit[data-lu-r]").forEach(function(c){var l=c.parentElement&&c.parentElement.parentElement,x=null,v=Math.round(+c.getAttribute("data-lu-r")||100);'
      + 'for(var k=0;k<g.length;k++)if(g[k].l===l){x=g[k];break}x||g.push(x={l:l,c:[],n:{}}),x.c.push(c),x.n[v]=(x.n[v]||0)+1});'
      + 'g.forEach(function(x){var m=100,b=0;for(var v in x.n)(x.n[v]>b||x.n[v]===b&&+v>m)&&(b=x.n[v],m=+v);'
      + 'var r=(fx>0?fx:Math.min(Math.max(m,50),150))+"%";x.l&&x.l.classList&&x.l.classList.add("lu-eqlist");'
      + 'x.c.forEach(function(c){[c].concat(u(".card,.card__inner",c)).forEach(function(v){v.style.setProperty("--ratio-percent",r)})})})}'
      + 'function ht(e,n){',
  },
  {
    file: 'assets/js/theme.js', done: 'data-lu-r",',
    find: 'e.imageWidth&&o.setAttribute("width",e.imageWidth),e.imageHeight&&o.setAttribute("height",e.imageHeight),',
    replace: 'e.imageWidth&&o.setAttribute("width",e.imageWidth),e.imageHeight&&o.setAttribute("height",e.imageHeight),'
      + 'i.classList.add("lu-card--fit"),i.setAttribute("data-lu-r",+e.imageWidth>0&&+e.imageHeight>0?Math.round(e.imageHeight/e.imageWidth*1e4)/100:100),vnEqSoon(),',
  },
  {
    file: 'snippets/gs-head.hbs', done: '--vn-card-r:',
    find: '{{else}}180{{/if}}px;{{#if settings.vn_footer_bg}}',
    replace: '{{else}}180{{/if}}px;--vn-card-r:{{#if settings.vn_card_ratio}}{{settings.vn_card_ratio}}{{else}}auto{{/if}};{{#if settings.vn_footer_bg}}',
  },
  // ---- "Show variant pickers" off also hides the main picker in the bodysuit look (sc-product.css forces it visible with
  //      .sc-skin.sc-skin [data-ms-pdp] .lu-variants{display:block!important}); user 2026-11-19
  {
    file: 'sections/product.hbs', done: '.sc-skin.sc-skin.sc-skin [data-ms-pdp] .lu-variants',
    find: '{{#if (eq section.settings.show_variants false)}}[data-section-id="{{section.id}}"] .lu-variants{display:none!important}{{/if}}',
    replace: '{{#if (eq section.settings.show_variants false)}}[data-section-id="{{section.id}}"] .lu-variants,.sc-skin.sc-skin.sc-skin [data-ms-pdp] .lu-variants{display:none!important}{{/if}}',
  },
  // ---- text sizes and colours (user 2026-11-26, "every part with text"): every product block's rules (snippets/pb-type.hbs)
  //      before the section's markup; FAQ is hand-written (its own call); settings from _src/build-sc.js typeSet()
  {
    file: 'sections/product.hbs', done: '{{> pb-type this}}',
    find: '<section id="shopify-section-template--28236351668559__main" class="shopify-section section sc-any',
    replace: '{{#each section.blocks}}{{> pb-type this}}{{/each}}<section id="shopify-section-template--28236351668559__main" class="shopify-section section sc-any',
  },
  {
    file: 'sections/related.hbs', done: '{{> sc-type',
    find: '<div class="lu-related" data-lu-related',
    replace: '{{> sc-type h=".lu-related__h,.lu-related__h span" s=".card__heading,.card__heading a" p=".price-item" b=".lu-related__more"}}<div class="lu-related" data-lu-related',
  },
  {
    file: 'sections/reviews.hbs', done: '{{> sc-type',
    find: '<section class="shopify-section section lu-reviews-section">',
    replace: '{{> sc-type h=".ttAllT" s=".ttdName,.ttdTitle" t=".ttdText"}}<section class="shopify-section section lu-reviews-section">',
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
  //      ... and in the Lunara look too when "Show them in the Lunara look too" (vn_trust_any) is on (user 2026-11-20:
  //      "every feature in every template")
  {
    file: 'sections/product.hbs', done: 'vn_trust_any',
    find: '{{#if (eq ../section.settings.skin "shapecurve")}}{{> sc-trustbox ..}}{{/if}}',
    replace: '{{#if (eq ../section.settings.skin "shapecurve")}}{{> sc-trustbox ..}}{{else if ../section.settings.vn_trust_any}}{{> sc-trustbox ..}}{{/if}}',
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
  // ---- the bodysuit blocks in every look (user 2026-11-20: "every feature in every template"). The product section
  //      always carries .sc-any: sc-product.css styles the blocks (Price + badge, Highlights, Shipping box, Info rows,
  //      second button) under .sc-any and only the look itself under .sc-skin. Outside the bodysuit look each of them
  //      links sc-product.css itself (snippets/sc-pb-*.hbs; the second button here).
  {
    file: 'sections/product.hbs', done: 'section sc-any{{#if',
    find: 'class="shopify-section section{{#if (eq section.settings.skin "shapecurve")}} sc-skin{{/if}}"',
    replace: 'class="shopify-section section sc-any{{#if (eq section.settings.skin "shapecurve")}} sc-skin{{/if}}"',
  },
  {
    file: 'sections/product.hbs', done: '{{/unless}}<button type="button" class="button button--full-width sc-buynow"',
    find: '{{#if section.settings.buy_now_label}}<button type="button" class="button button--full-width sc-buynow"',
    replace: '{{#if section.settings.buy_now_label}}{{#unless (eq section.settings.skin "shapecurve")}}<link rel="stylesheet" href="{{@root.assets_url}}/css/sc-product.css">{{/unless}}<button type="button" class="button button--full-width sc-buynow"',
  },
  // ---- pack rows: the colour option first, the size after it (user 2026-11-20). The selects only change their visual
  //      order (vn-chrome.css, order: -1: scripts find them by DOM index / data-name); the names line above them is
  //      printed colour first here with the engine's own isColorGroup helper (/colou?r/i). Never "contains": the
  //      platform has no such helper and the whole page fails with a 500 (2026.11.20.5, user 2026-11-20).
  {
    file: 'snippets/lu-kaching.hbs', done: '{{#if (isColorGroup name)}}',
    find: '<template data-lu-names-tpl><div class="kaching-bundles__bar-variant-names">{{#each @root.product.variants}}<span>{{name}}</span>{{/each}}</div></template>',
    replace: '<template data-lu-names-tpl><div class="kaching-bundles__bar-variant-names">{{#each @root.product.variants}}{{#if (isColorGroup name)}}<span>{{name}}</span>{{/if}}{{/each}}{{#each @root.product.variants}}{{#unless (isColorGroup name)}}<span>{{name}}</span>{{/unless}}{{/each}}</div></template>',
  },
  // Card "Add to cart" (home grid + related products, #ms-card-tpl) no longer opens the quick-add modal (user
  // 2026-11-25: "looks ugly"): it opens the product page at #lu-buy, and the product section's inline script
  // (sections/product.hbs, after the sticky bar) scrolls to the pack picker. The modal code stays, unreachable.
  {
    file: 'assets/js/theme.js', done: 'location.href=c.split("#")[0]+"#lu-buy";return}',
    find: 'document.addEventListener("click",function(i){var o=i.target.closest("[data-ms-quick-add]");if(o){i.preventDefault();var c=o.getAttribute("data-product-url");',
    replace: 'document.addEventListener("click",function(i){var o=i.target.closest("[data-ms-quick-add]");if(o){i.preventDefault();var c=o.getAttribute("data-product-url");if(c){location.href=c.split("#")[0]+"#lu-buy";return}',
  },
  {
    file: 'sections/footer.hbs', done: 'button--primary" data-product-url="" data-ms-quick-add>',
    find: 'button--primary" aria-haspopup="dialog" data-product-url="" data-ms-quick-add>',
    replace: 'button--primary" data-product-url="" data-ms-quick-add>',
  },
  // Star rating line "Compact" (user 2026-11-27, as Shopee "4.6 ★★★★★ | 1,7k Đánh Giá | Đã Bán 10k+"): avg ★★★★★ | N Reviews |
  // 10k+ Sold, the default (setting rating_look; "classic" keeps the old <a>). Real average + count; the sold number is
  // typed in (rating_sold). Stars = the lu-stars5 masks of the old line (same .trustpilot-stars span, smaller; --rating on the div).
  {
    file: 'sections/product.hbs', done: "class=\"lu-rate2\"",
    find: "<a href=\"#lu-reviews\"><span class=\"trustpilot-stars\" role=\"img\"",
    replace: "{{#unless (eq section.settings.rating_look \"classic\")}}<a href=\"#lu-reviews\" class=\"lu-rate2\" aria-label=\"{{product.reviews.summary.average_rating}} out of 5 stars, {{product.reviews.summary.total_count}} reviews{{#if section.settings.rating_sold}}, {{section.settings.rating_sold}} {{#if section.settings.rating_sold_label}}{{section.settings.rating_sold_label}}{{else}}Sold{{/if}}{{/if}}\"><style>.trustpilot-rating a.lu-rate2{flex-wrap:wrap;gap:4px 0;font-size:1.4rem;line-height:2rem;color:rgb(var(--color-foreground))}.lu-rate2__avg,.lu-rate2__n{font-weight:600;text-decoration:underline;text-underline-offset:3px}.lu-rate2__avg{margin-right:6px;font-size:1.6rem;color:var(--sc-hl,var(--vn-hl,#790236))}.trustpilot-rating a.lu-rate2 .trustpilot-stars{width:85px!important;height:17px!important}.lu-rate2__sep{flex:none;width:1px;height:16px;margin:0 12px;background:rgba(var(--color-foreground),.2)}.lu-rate2__l{margin-left:5px;color:rgba(var(--color-foreground),.65)}@media (max-width:749px){.trustpilot-rating a.lu-rate2{font-size:1.3rem;padding:12px 0;margin:-12px 0}.lu-rate2__sep{margin:0 9px}.trustpilot-rating a.lu-rate2 .trustpilot-stars{width:75px!important;height:15px!important}}</style><span class=\"lu-rate2__avg\">{{product.reviews.summary.average_rating}}</span><span class=\"trustpilot-stars\" aria-hidden=\"true\"></span><span class=\"lu-rate2__sep\" aria-hidden=\"true\"></span><span class=\"lu-rate2__n\">{{product.reviews.summary.total_count}}</span><span class=\"lu-rate2__l\">Reviews</span>{{#if section.settings.rating_sold}}<span class=\"lu-rate2__sep\" aria-hidden=\"true\"></span><span class=\"lu-rate2__n\">{{section.settings.rating_sold}}</span><span class=\"lu-rate2__l\">{{#if section.settings.rating_sold_label}}{{section.settings.rating_sold_label}}{{else}}Sold{{/if}}</span>{{/if}}</a>{{else}}<a href=\"#lu-reviews\"><span class=\"trustpilot-stars\" role=\"img\"",
  },
  {
    file: 'sections/product.hbs', done: "</a>{{/unless}}</div>{{/if}}{{/unless}}{{/inline}}{{#*inline \"lu_p_title\"}}",
    find: "</a></div>{{/if}}{{/unless}}{{/inline}}{{#*inline \"lu_p_title\"}}",
    replace: "</a>{{/unless}}</div>{{/if}}{{/unless}}{{/inline}}{{#*inline \"lu_p_title\"}}",
  },
  // Main product (user 2026-11-28): Theme settings › Home page › "Main product" (`home_main_product`, store_products =
  // [{productId, …}] for the current store, shopdy store-product-settings.ts). 1) index.hbs moves the picks to the front
  // of #ms-products before theme.js (deferred) reads it: home grid Ue(), the hidden "all products" list, the pill.
  // 2) reviews.hbs prints their ids as data-main on the home <lu-reviews>; theme.js Oe() fetches only those products'
  // reviews (50 each = the API max; none at all = the old store-wide fallback f("",0,30)); the pill averages them.
  // A pick that is not in the home list (`products`) only steers the reviews.
  {
    file: 'templates/index.hbs', done: 'data-lu-main=',
    find: '<script type="application/json" id="ms-products">{{{json products}}}</script>',
    replace: '<script type="application/json" id="ms-products">{{{json products}}}</script>'
      + '{{#if settings.home_main_product.length}}<script data-lu-main="{{#each settings.home_main_product}}{{productId}} {{/each}}">(function(){try{'
      + 'var m=(document.currentScript.getAttribute("data-lu-main")||"").trim().split(/\\s+/),el=document.getElementById("ms-products"),ps=JSON.parse(el.textContent||"[]"),top=[];'
      + 'if(!Array.isArray(ps))return;m.forEach(function(id){for(var i=0;i<ps.length;i++)if(ps[i]&&ps[i].id===id){top.push(ps.splice(i,1)[0]);break}});'
      + 'if(top.length)el.textContent=JSON.stringify(top.concat(ps))}catch(e){}})();</script>{{/if}}',
  },
  {
    file: 'sections/reviews.hbs', done: 'data-main="{{#each settings.home_main_product}}',
    find: '{{#if is_home}} data-home="true"{{/if}}',
    replace: '{{#if is_home}} data-home="true"{{#if settings.home_main_product.length}} data-main="{{#each settings.home_main_product}}{{productId}} {{/each}}"{{/if}}{{/if}}',
  },
  {
    file: 'sections/reviews.hbs', done: "var mi=(h.getAttribute('data-main')",
    find: "var n=0,s=0;ps.forEach(function(p){var c=+p.reviewCount||0,v=+p.rating||0;",
    replace: "var mi=(h.getAttribute('data-main')||'').trim();if(mi){mi=mi.split(/\\s+/);var pm=ps.filter(function(p){return p&&mi.indexOf(p.id)>=0});"
      + "if(pm.some(function(p){return +p.reviewCount>0}))ps=pm;}"
      + "var n=0,s=0;ps.forEach(function(p){var c=+p.reviewCount||0,v=+p.rating||0;",
  },
  {
    file: 'assets/js/theme.js', done: 'luMain=(e.getAttribute("data-main")',
    find: 'var it=Dt("#ms-products",[]),Et=it.filter(function(l){return l&&l.id}).map(function(l){return l.id}).slice(0,10),x=Et.length?Et.map(function(l){return f(l,0,20)',
    replace: 'var it=Dt("#ms-products",[]),luMain=(e.getAttribute("data-main")||"").trim(),Et=luMain?luMain.split(/\\s+/).slice(0,10):it.filter(function(l){return l&&l.id}).map(function(l){return l.id}).slice(0,10),x=Et.length?Et.map(function(l){return f(l,0,luMain?50:20)',
  },
];

let applied = 0;
for (const e of EDITS) {
  const f = path.join(THEME, e.file);
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  if (s.includes(e.done) && !e.always) { console.log('already  ' + e.file + '  ' + e.done); continue; }
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
  if (s === before) { console.log('same     ' + e.file + '  ' + e.done); continue; }
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
