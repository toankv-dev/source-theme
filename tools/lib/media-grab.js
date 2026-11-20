/*
 * The pure parts of tools/media-grab.js (docs/SPEC-media-grab.md), no I/O:
 *   target(url)                 → { origin, host, handle, productJs, outName }: where the product data of that one page is
 *   shopifyOriginal(url)        → the same picture at its original size (Shopify CDN: no _800x suffix, no width=)
 *   productJsMedia(json, base)  → pictures and videos of Shopify's /products/<handle>.js
 *   jsonMedia(text, kind, base) → pictures in the page's own JSON: 'ld' (JSON-LD Product), 'variants' (#sf-variants-data),
 *                                 'product' (a Shopify product JSON script)
 *   fileName(rank, name, ext), summary(result)
 */
'use strict';
const M = require('./mirror');

const MEDIA_URL = /\.(jpe?g|png|webp|gif|avif|svg|mp4|webm|mov|m4v)(\?|#|$)/i;
const safe = (s) => String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'page';

/** The page's handle and, for a Shopify product path (/products/<handle>, any prefix), its product data URL. */
function target(url) {
  const u = new URL(url);
  const segs = u.pathname.split('/').filter(Boolean);
  const pi = segs.indexOf('products');
  let handle = pi >= 0 && segs[pi + 1] ? segs[pi + 1] : segs[segs.length - 1] || 'home';
  try { handle = decodeURIComponent(handle); } catch (e) { /* keep it */ }
  handle = handle.replace(/\.(js|json|html?)$/i, '');
  const productJs = pi >= 0 && segs[pi + 1]
    ? `${u.origin}/${segs.slice(0, pi).map((s) => s + '/').join('')}products/${encodeURIComponent(handle)}.js` : null;
  return { origin: u.origin, host: u.host, handle, productJs, outName: safe(`${u.hostname}-${handle}`) };
}

/** Shopify serves one picture at many sizes: ask for the original (keeps ?v=, drops width / height / crop). */
function shopifyOriginal(url) {
  let u;
  try { u = new URL(url); } catch (e) { return url; }
  const shopify = /(^|\.)cdn\.shopify\.com$/i.test(u.hostname) || /\/cdn\/shop\/|\/s\/files\//.test(u.pathname);
  if (!shopify) return url;
  for (const k of ['width', 'height', 'crop']) u.searchParams.delete(k);
  u.pathname = u.pathname.replace(/_(?:\d+x\d*|\d*x\d+|pico|icon|thumb|small|compact|medium|large|grande|master)(?:_crop_[a-z]+)?(?:@\dx)?(\.[a-z0-9]+)$/i, '$1');
  return u.toString();
}

const abs = (src, base) => (src ? M.absUrl(String(src), base) : null);

/** Shopify's /products/<handle>.js: gallery pictures, each variant's picture, videos (an MP4 source, else the stream). */
function productJsMedia(json, base) {
  const out = { images: [], variantImages: [], videos: [], external: [] };
  if (!json || typeof json !== 'object') return out;
  const seen = new Set();
  const image = (src, extra) => { const url = abs(src, base); if (url && !seen.has(url)) { seen.add(url); out.images.push({ url, ...extra }); } };
  for (const m of json.media || []) {
    if (m.media_type === 'image') image(m.src || (m.preview_image && m.preview_image.src), { alt: m.alt || '', width: m.width, height: m.height });
    else if (m.media_type === 'video') {
      const sources = (m.sources || []).filter((s) => s && s.url);
      const mp4 = sources.filter((s) => /mp4/i.test(s.format || s.mime_type || '')).sort((a, b) => (b.height || 0) - (a.height || 0))[0];
      const hls = sources.find((s) => /m3u8|mpegurl/i.test(s.format || s.mime_type || '') || /\.m3u8/i.test(s.url));
      const pick = mp4 || hls;
      if (pick) out.videos.push({ url: abs(pick.url, base), stream: !mp4, poster: abs(m.preview_image && m.preview_image.src, base) });
    } else if (m.media_type === 'external_video') out.external.push(m.host || 'external');
  }
  for (const src of json.images || []) image(typeof src === 'string' ? src : src && src.src, {});
  for (const v of json.variants || []) {
    const fi = v.featured_image && (v.featured_image.src || v.featured_image);
    const url = typeof fi === 'string' ? abs(fi, base) : null;
    if (url) out.variantImages.push({ url, variant: v.title || String(v.id || '') });
  }
  return out;
}

function strings(v, path, out, depth = 0) {
  if (depth > 12 || out.length > 2000) return out;
  if (typeof v === 'string') { if (MEDIA_URL.test(v) || M.looksLikeMedia(v)) out.push({ value: v, path }); return out; }
  if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out, depth + 1));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, path ? `${path}.${k}` : k, out, depth + 1);
  return out;
}

/** Pictures in the page's own JSON → [{ url, gallery, variant }]. */
function jsonMedia(text, kind, base) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return []; }
  if (kind === 'product') {
    const p = productJsMedia(data.product || data, base);
    return [...p.images.map((i) => ({ url: i.url, gallery: true, variant: false })),
      ...p.variantImages.map((i) => ({ url: i.url, gallery: false, variant: true }))];
  }
  if (kind === 'ld') {
    const nodes = [];
    const visit = (n) => { if (Array.isArray(n)) n.forEach(visit); else if (n && typeof n === 'object') { if (/Product/i.test(String(n['@type']))) nodes.push(n); if (n['@graph']) visit(n['@graph']); } };
    visit(data);
    return nodes.flatMap((n) => strings(n.image, 'image', [])).map((s) => ({ url: abs(s.value, base), gallery: true, variant: false })).filter((x) => x.url);
  }
  // 'variants': every picture in the variant list is a variant's picture
  return strings(data, '', []).map((s) => ({ url: abs(s.value, base), gallery: false, variant: true })).filter((x) => x.url && !/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(x.url));
}

const fileName = (rank, name, ext) => `${String(rank).padStart(3, '0')}-${name}.${ext}`;
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
const counts = (items) => {
  const c = new Map();
  for (const i of items) c.set(i.group, (c.get(i.group) || 0) + 1);
  return [...c].map(([g, n]) => `${g} ${n}`).join(' · ');
};

/** The lines media-grab prints (≤ 30). */
function summary(r) {
  const L = [`media-grab  ${r.url}  →  ${r.out}`];
  const data = r.productData ? `product data: ${r.productData.images} images, ${r.productData.videos} videos` : 'product data: none';
  L.push(`store       ${r.store} · ${data}${r.blocked.length ? ` · blocked: ${r.blocked.join(', ')}` : ''}`);
  const bytes = (list) => list.reduce((n, i) => n + (i.bytes || 0), 0);
  L.push(`images      ${r.images.length} files ${mb(bytes(r.images))}${r.images.length ? ' · ' + counts(r.images) : ''}`);
  const streams = r.videos.filter((v) => v.via === 'stream').length;
  L.push(`videos      ${r.videos.length} files ${mb(bytes(r.videos))}${r.videos.length ? ' · ' + counts(r.videos) : ''}${streams ? ` (${streams} ← m3u8)` : ''}`);
  const s = r.skipped;
  const parts = Object.entries(s).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`);
  L.push(`skipped     ${parts.join(' · ') || 'nothing'}`);
  for (const x of r.notes.slice(0, 20)) L.push(`  ${x}`);
  L.push(`list        ${r.list}`);
  return L.slice(0, 30);
}

module.exports = { target, shopifyOriginal, productJsMedia, jsonMedia, fileName, summary, MEDIA_URL };
