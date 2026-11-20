/*
 * Runs IN the page (page.evaluate(collectRefs)), after tools/lib/mirror.js was injected as window.__mirror
 * (tools/lib/page.js injectMirror): every image / video / stylesheet / icon the page refers to, with where it is
 * (header / main / footer, its section, hidden, product gallery) and its shown size. Shared by download-page.js and
 * media-grab.js. It must not use anything outside its own body: it is sent to the browser as text.
 */
'use strict';

/** Every image / video / stylesheet / icon the page refers to, with where (header / main / footer) and how big. */
function collectRefs() {
  const Mi = window.__mirror;
  const base = location.href;
  // via: where a video was found (page / template / json / script / link); posters: video or stream → its poster.
  const out = { urls: [], media: {}, streams: [], via: {}, posters: {} };
  const seen = new Set();
  const headerSel = 'header, [role="banner"], [id*="header" i], [id*="announcement" i]';
  const footerSel = 'footer, [role="contentinfo"], [id*="footer" i]';
  // Roots: the document, every open shadow root (widgets) and every <template>'s content (deferred media: a video
  // that only exists once someone presses play).
  const roots = [document];
  const tplHost = new Map();
  for (let i = 0; i < roots.length; i++) {
    roots[i].querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) roots.push(el.shadowRoot);
      if (el.tagName === 'TEMPLATE' && el.content) { roots.push(el.content); tplHost.set(el.content, el); }
    });
  }
  const all = (sel) => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));
  // closest() that climbs out of shadow roots (to their host) and template contents (to their <template>).
  const up = (e) => { if (e.parentElement) return e.parentElement; const r = e.getRootNode && e.getRootNode(); return (r && (r.host || tplHost.get(r))) || null; };
  const closestDeep = (el, sel) => { for (let e = el; e; e = up(e)) if (e.matches && e.matches(sel)) return e; return null; };
  const areaOf = (el) => (closestDeep(el, headerSel) ? 'header' : closestDeep(el, footerSel) ? 'footer' : 'main');
  const sectionSel = '.shopify-section, [id^="shopify-section-"]';
  const gallerySel = 'media-gallery, .thumbnail-list, [class*="product__media"], [class*="product-media"], [class*="product-gallery"], [class*="product__gallery"], [class*="product-single__media"], [data-product-gallery], [data-media-gallery]';
  // "shopify-section-template--1__image_with_text_xn" → "image_with_text_xn"; no id → its first class, else its tag.
  const sectionName = (s) => (s.id ? s.id.replace(/^shopify-section-/, '').replace(/^.*__/, '') : (String(s.getAttribute('class') || '').trim().split(/\s+/)[0] || s.tagName.toLowerCase()));
  const inTemplate = (el) => { for (let e = el; e; e = up(e)) { const r = e.getRootNode && e.getRootNode(); if (r && tplHost.has(r)) return true; } return false; };
  const VIDEO = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
  const add = (u, el, via) => {
    if (!u || /^blob:/i.test(String(u))) return; // media-source players: their playlist is caught on the network
    const a = Mi.absUrl(u, base);
    if (!a) return;
    const how = via || (el && inTemplate(el) ? 'template' : 'page');
    if (Mi.isStream(a) || VIDEO.test(a)) { if (!out.via[a] || how === 'page') out.via[a] = how; }
    if (Mi.isStream(a)) { if (out.streams.indexOf(a) < 0) out.streams.push(a); } else if (!seen.has(a)) { seen.add(a); out.urls.push(a); }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const area = areaOf(el);
    const m = out.media[a] || (out.media[a] = { area, w: 0, h: 0, hidden: true });
    if (area === 'main') m.area = 'main';
    m.w = Math.max(m.w, Math.round(r.width));
    m.h = Math.max(m.h, Math.round(r.height));
    // Where it is (tools/media-library.js groups by this): its section, whether that section shows, the product gallery.
    const sec = closestDeep(el, sectionSel) || closestDeep(el, 'main > *, body > *');
    if (sec && !m.section) m.section = sectionName(sec);
    const box = sec && sec.getBoundingClientRect();
    if (!box || (box.width >= 1 && box.height >= 1)) m.hidden = false;
    if (closestDeep(el, gallerySel)) m.gallery = true;
  };
  all('img, picture source, video source, audio source, video, input[type="image" i]').forEach((el) => {
    const host = el.tagName === 'SOURCE' ? (el.parentElement || el) : el;
    add(el.currentSrc, host);
    for (const at of ['src', 'data-src', 'data-original', 'data-lazy', 'data-lazy-src']) add(el.getAttribute(at), host);
    for (const at of ['srcset', 'data-srcset']) { const s = el.getAttribute(at); if (s) add(Mi.largestCandidate(s, base), host); }
    if (el.tagName === 'VIDEO') add(el.getAttribute('poster'), el);
    const video = el.tagName === 'VIDEO' ? el : el.parentElement && el.parentElement.tagName === 'VIDEO' ? el.parentElement : null;
    const poster = video && Mi.absUrl(video.getAttribute('poster'), base);
    const src = Mi.absUrl(el.getAttribute('src'), base);
    if (poster && src) out.posters[src] = poster;
  });
  // Video URLs written in the page's data and scripts, and links to video files (lightboxes).
  all('script').forEach((s) => {
    if (s.src) return;
    const via = /json/i.test(s.getAttribute('type') || '') ? 'json' : 'script';
    Mi.videoUrlsIn(s.textContent, base).forEach((u) => add(u, null, via));
  });
  all('a[href]').forEach((a) => { const h = a.getAttribute('href'); if (VIDEO.test(h) || Mi.isStream(h)) add(h, a, 'link'); });
  all('*').filter((el) => el.closest('head') === null).forEach((el) => {
    for (const at of Array.from(el.attributes)) {
      if (!/^data-/.test(at.name) || at.value.length > 2000) continue;
      if (Mi.looksLikeMedia(at.value)) add(at.value, el);
      else if (/(srcset|bgset)$/.test(at.name)) add(Mi.largestCandidate(at.value, base), el);
    }
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) add(m[1], el);
    const st = el.getAttribute('style');
    if (st && /url\(/i.test(st)) Mi.rewriteCss(st, base).urls.forEach((u) => add(u, el));
  });
  all('image, use').forEach((el) => {
    const h = el.getAttribute('href') || el.getAttribute('xlink:href');
    if (h && !h.startsWith('#')) add(h.split('#')[0], el);
  });
  all('link[href]').forEach((l) => {
    const rel = (l.getAttribute('rel') || '').toLowerCase();
    if (/(^|\s)(stylesheet|icon|apple-touch-icon|mask-icon)(\s|$)/.test(rel) || (/preload/.test(rel) && /^(style|font|image)$/i.test(l.getAttribute('as') || ''))) add(l.href);
  });
  return out;
}

module.exports = { collectRefs };
