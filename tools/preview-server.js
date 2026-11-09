#!/usr/bin/env node
/*
 * Local preview for Adlux Handlebars themes (schema v1 and v2).
 *
 *   node tools/preview-server.js <theme-dir> [--port 8090]
 *
 * Mimics what the platform engine gives a theme: the same helpers, the same root context
 * (brand, product, products, collections, config/configJson, settings, policyLinks, …), and for
 * schema v2 it renders templates/product*.json section by section into content_for_layout.
 * Mock storefront APIs (reviews, cart price, cart gifts, cart totals, contact, order lookup) answer locally.
 * Sample images live in tools/fixtures/sample and are served under /assets/sample/.
 *
 * Routes: /  /product[?template=bundle]  /collections/<handle>  /search?q=  /pages/<slug>
 *         /policies/<slug>  /checkout  /pages/tracking/result?order=&email=
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const args = process.argv.slice(2);
const themeArg = args.find((a) => !a.startsWith('--')) || 'base-theme';
const portIdx = args.indexOf('--port');
const PORT = Number(portIdx > -1 ? args[portIdx + 1] : process.env.PORT || 8090);
const THEME = path.resolve(process.cwd(), themeArg);
const FIX = path.join(__dirname, 'fixtures');

if (!fs.existsSync(path.join(THEME, 'theme.json'))) {
  console.error('No theme.json in ' + THEME);
  process.exit(1);
}

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
};
const exists = (file) => fs.existsSync(file);

// ---------------------------------------------------------------------------------------------
// Helpers: only the ones the platform engine provides, so a theme that previews here also renders
// on the store. Do not add helpers the engine lacks (and / or / lt / concat …).
// ---------------------------------------------------------------------------------------------
const TOKENS = {
  CompanyEmail: '<a href="mailto:support@example.com">support@example.com</a>',
  CompanyEmailPlain: 'support@example.com',
  CompanyPhone: '+1 (555) 010-2030',
  CompanyAddress: '412 N Main St, Suite 100, Buffalo, WY 82834',
  ContactLink: '/pages/contact-us',
  RefundLink: '/policies/refund-policy',
  ShippingLink: '/policies/shipping-policy',
  PrivacyLink: '/policies/privacy-policy',
  TermsLink: '/policies/terms-of-service',
  TrackOrderLink: '/pages/track-your-order',
  ShippingInfo: 'Orders ship within 1–3 business days.',
};

function registerHelpers(hb) {
  hb.registerHelper('eq', (a, b) => a === b);
  hb.registerHelper('gt', (a, b) => Number(a) > Number(b));
  hb.registerHelper('contains', (hay, needle) =>
    hay != null && String(Array.isArray(hay) ? hay.join('\n') : hay).indexOf(needle) > -1);
  hb.registerHelper('limit', (arr, n) => (Array.isArray(arr) ? arr.slice(0, Math.max(0, Number(n) || 0)) : []));
  hb.registerHelper('json', (v) => new hb.SafeString(JSON.stringify(v === undefined ? null : v)));
  hb.registerHelper('money', (v) => '$' + (Math.round((Number(v) || 0) * 100) / 100).toFixed(2));
  hb.registerHelper('applyTokens', (text) =>
    new hb.SafeString(String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in TOKENS ? TOKENS[k] : m))));
  hb.registerHelper('faqItems', (s) =>
    [1, 2, 3, 4, 5, 6].map((n) => ({ q: s && s['faq_' + n + '_q'], a: s && s['faq_' + n + '_a'] })).filter((x) => x.q && x.a));
  hb.registerHelper('stars5', (r) => {
    const v = Math.round(Math.max(0, Math.min(5, Number(r) || 0)) * 2) / 2;
    const out = [];
    for (let i = 1; i <= 5; i++) out.push(i <= Math.floor(v) ? 'full' : i === Math.floor(v) + 1 && v % 1 ? 'half' : 'empty');
    return out;
  });
  hb.registerHelper('swatchStyle', (label) => new hb.SafeString('background:' + swatchColor(label) + ';'));
  // Used by the TwinklingTree reference theme only (so its preview renders); the base does not use them.
  hb.registerHelper('isColorGroup', (name) => /colou?r/i.test(String(name)));
  hb.registerHelper('stars', (r) => { const n = Math.max(0, Math.min(5, Math.round(Number(r) || 0))); return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n); });
  // Theme editor hooks: the editor injects data attributes; on the store they print nothing.
  hb.registerHelper('editable', () => '');
  hb.registerHelper('editableSetting', () => '');
}

const SWATCHES = { white: '#f4f4f2', black: '#1b1b1b', grey: '#9a9a9a', gray: '#9a9a9a', rose: '#e6a8b5', rosewood: '#8c4a52',
  'wine red': '#7b1e2f', red: '#c0392b', blue: '#2f5fa8', navy: '#1d2b4f', green: '#3c8d5a', beige: '#e7d3b3', pink: '#f3c6cf' };
function swatchColor(label) {
  const l = String(label || '').toLowerCase();
  const keys = Object.keys(SWATCHES).sort((a, b) => b.length - a.length);
  for (const k of keys) if (l.includes(k)) return SWATCHES[k];
  return '#d8c4a8';
}

function registerPartials(hb) {
  for (const dir of ['sections', 'snippets']) {
    const full = path.join(THEME, dir);
    if (!exists(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (!f.endsWith('.hbs')) continue;
      const name = f.slice(0, -4);
      const src = fs.readFileSync(path.join(full, f), 'utf8');
      hb.registerPartial(name, src);
      if (name.includes('-')) hb.registerPartial(name.replace(/-/g, '_'), src);
    }
  }
}

function engine() {
  const hb = Handlebars.create();
  registerHelpers(hb);
  registerPartials(hb);
  return hb;
}

// ---------------------------------------------------------------------------------------------
// Root context
// ---------------------------------------------------------------------------------------------
function loadProduct() {
  const own = path.join(THEME, 'sample', 'product.json');
  const p = readJson(exists(own) ? own : path.join(FIX, 'product.json'), {});
  const fix = readJson(path.join(FIX, 'product.json'), {});
  // Theme samples often omit media / home products; borrow them from the fixture so pages are full.
  if (!p.media || !p.media.main_image) p.media = fix.media;
  if (!Array.isArray(p.home_products) || !p.home_products.length) p.home_products = fix.home_products;
  if (!p.reviews || !p.reviews.items) p.reviews = fix.reviews;
  // Free-gift tiers (product.gift_offers) like the platform sends: 3+ units unlock a gift.
  if (!p.gift_offers) p.gift_offers = { condition: 'quantity', tiers: [{ minQty: 3, gifts: [MOCK_GIFT] }] };
  return p;
}

const MOCK_GIFT = { productId: 'gift-product', variantId: 'gift-variant', title: 'Travel pouch', imageUrl: '', compareAtPrice: 19.99, qty: 1 };

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

function buildContext(req, extra) {
  const product = loadProduct();
  const settings = (readJson(path.join(THEME, 'config', 'settings_data.json'), {}) || {}).current || {};
  const host = 'http://localhost:' + PORT;
  const products = product.home_products.map((c, i) => Object.assign({ id: 'p' + (i + 1), handle: 'product-' + (i + 1), url: '/product' }, c));
  const collections = [
    { handle: 'best-sellers', title: 'Best Sellers', products: products.slice(0, 4) },
    { handle: 'new-arrivals', title: 'New Arrivals', products: products.slice(2, 8) },
  ];
  const variants = (product.variants_list || []).map((v) => ({ id: v.id, options: v.option_values, price: num(v.price), display_name: v.title }));
  const config = {
    productId: 'sample-product-id',
    handle: 'sample-product',
    domain: 'localhost',
    currency: 'USD',
    title: product.title || '',
    price: product.price || '',
    priceNum: num(product.price),
    compareNum: num(product.compare_at_price),
    image: (product.media && product.media.main_image) || '',
    homeUrl: '/',
    productUrl: '/product',
    allProductsUrl: '/collections/all',
    searchUrl: '/search',
    trackUrl: '/pages/track-your-order',
    checkoutUrl: host + '/api/storefront/checkout',
    checkoutPageUrl: '/checkout',
    validateUrl: '#',
    reviewsUrl: '/api/storefront/reviews',
    cartGiftsUrl: '/api/storefront/cart/gifts',
    reviewsPageSize: 6,
    placeUrl: '/cart/place',
    thankYouUrl: '/thank-you',
    paypalClientId: '',
    variants,
  };
  const policyLinks = {
    home: '/', about: '/pages/about-us', contact: '/pages/contact-us', privacy: '/policies/privacy-policy',
    refund: '/policies/refund-policy', shipping: '/policies/shipping-policy', terms: '/policies/terms-of-service',
    track: '/pages/track-your-order',
  };
  const ctx = {
    brand: { name: 'Base Store', logo: '', favicon: '', email: 'support@example.com', phone: '+1 (555) 010-2030',
      address: '412 N Main St, Suite 100, Buffalo, WY 82834', domain: 'localhost' },
    product,
    products,
    collections,
    relatedProducts: products.slice(1, 5),
    settings,
    page: { title: '', bodyHtml: '', faqFromListing: true, faq: [
      { q: 'How long does shipping take?', a: '<p>Orders ship within 1–3 business days.</p>' },
      { q: 'Can I return it?', a: '<p>Yes, within 30 days of delivery.</p>' },
    ] },
    policies: { about: true, privacy: true, refund: true, shipping: true, terms: true, contact: true },
    policyLinks,
    nextItemTiers: '2:10, 3:15',
    bxgyOffers: [],
    amountOffOffers: [],
    config,
    configJson: new Handlebars.SafeString(JSON.stringify(config)),
    assets_url: '/assets',
    canonical: host + req.url,
    metaDesc: product.meta_description || product.title || '',
    productJsonLd: '',
    // Records the events a theme fires, like the platform's pixel runtime, so tests can read them.
    trackingHead: new Handlebars.SafeString('<script>window.__events=[];window.__adluxTrack=function(e,p,u){window.__events.push({event:e,payload:p,user:u||null});console.log("[track]",e,JSON.stringify(p));};</script>'),
    trackingBody: '',
    __designMode: false,
  };
  return Object.assign(ctx, extra || {});
}

// ---------------------------------------------------------------------------------------------
// Schema v2 rendering
// ---------------------------------------------------------------------------------------------
function defaultsOf(settingsDefs) {
  const out = {};
  for (const s of settingsDefs || []) if (s.id && s.default !== undefined) out[s.id] = s.default;
  return out;
}

function renderSections(hb, templateJson, root) {
  let html = '';
  for (const id of templateJson.order || Object.keys(templateJson.sections || {})) {
    const sec = (templateJson.sections || {})[id];
    if (!sec || sec.disabled) continue;
    const schema = readJson(path.join(THEME, 'sections', sec.type + '.schema.json'), {});
    const blockDefs = {};
    for (const b of schema.blocks || []) blockDefs[b.type] = b;
    const order = sec.blockOrder || Object.keys(sec.blocks || {});
    const blocks = order
      .map((bid) => {
        const b = (sec.blocks || {})[bid];
        if (!b || b.disabled) return null;
        return {
          id: bid,
          type: b.type,
          settings: Object.assign(defaultsOf((blockDefs[b.type] || {}).settings), b.settings || {}),
          attributes: new Handlebars.SafeString('data-block-id="' + bid + '" data-block-type="' + b.type + '"'),
        };
      })
      .filter(Boolean);
    const section = { id, type: sec.type, settings: Object.assign(defaultsOf(schema.settings), sec.settings || {}), blocks };
    const partial = hb.partials[sec.type];
    if (!partial) { html += '<!-- missing section ' + sec.type + ' -->'; continue; }
    const tpl = typeof partial === 'function' ? partial : hb.compile(partial);
    const tag = schema.tag || 'section';
    html += '<' + tag + ' id="adlux-section-' + id + '" class="adlux-section" data-section-id="' + id + '" data-section-type="' + sec.type + '">' +
      tpl(Object.assign({}, root, { section })) + '</' + tag + '>';
  }
  return html;
}

function renderProduct(req, res, url) {
  const hb = engine();
  const theme = readJson(path.join(THEME, 'theme.json'), {});
  const ctx = buildContext(req);
  const tplName = url.searchParams.get('template');
  const jsonFile = path.join(THEME, 'templates', tplName ? 'product.' + tplName + '.json' : 'product.json');
  if (theme.schemaVersion >= 2 && theme.layout && exists(jsonFile) && url.searchParams.get('legacy') !== '1') {
    const content = renderSections(hb, readJson(jsonFile, {}), ctx);
    ctx.content_for_layout = new Handlebars.SafeString(content);
    return send(res, hb, theme.layout, ctx);
  }
  return send(res, hb, 'templates/product.hbs', ctx);
}

// ---------------------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------------------
const RELOAD = '<script>(function(){var es=new EventSource("/events");es.onmessage=function(e){if(e.data==="reload")location.reload();};})();</script>';

function send(res, hb, file, ctx) {
  const full = path.join(THEME, file);
  if (!exists(full)) return text(res, 404, 'Missing template: ' + file);
  try {
    let html = hb.compile(fs.readFileSync(full, 'utf8'))(ctx);
    html = html.includes('</body>') ? html.replace('</body>', RELOAD + '</body>') : html + RELOAD;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  } catch (e) {
    console.error('[render] ' + file + ': ' + e.message);
    text(res, 500, 'Template error in ' + file + ':\n' + e.stack);
  }
}

function text(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function jsonRes(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const MIME = { '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.webm': 'video/webm' };

function serveAsset(res, rel) {
  const candidates = [path.join(THEME, 'assets', rel)];
  if (rel.startsWith('sample/')) candidates.push(path.join(THEME, '_work', rel), path.join(FIX, rel)); // a theme's own sample files, never packed
  for (const f of candidates) {
    if (f.startsWith(THEME) || f.startsWith(FIX)) {
      if (exists(f) && fs.statSync(f).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        return res.end(fs.readFileSync(f));
      }
    }
  }
  text(res, 404, 'Asset not found: ' + rel);
}

// ---------------------------------------------------------------------------------------------
// Mock storefront APIs
// ---------------------------------------------------------------------------------------------
const sessionReviews = [];

function reviewsGet(res, url) {
  const all = sessionReviews.concat(loadProduct().reviews.items || []);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset'), 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 6));
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = all.filter((r) => Math.round(r.rating) === star).length;
    return { star, count, percent: all.length ? Math.round((count / all.length) * 100) : 0 };
  });
  jsonRes(res, 200, { success: true, count: all.length, distribution: dist, reviews: all.slice(offset, offset + limit), has_more: offset + limit < all.length });
}

function parseMultipart(buf, contentType) {
  const m = /boundary=(.+)$/.exec(contentType || '');
  const out = {};
  if (!m) return out;
  for (const part of buf.toString('binary').split('--' + m[1])) {
    const name = /name="([^"]+)"/.exec(part);
    const split = part.indexOf('\r\n\r\n');
    if (!name || split < 0) continue;
    let value = part.slice(split + 4).replace(/\r\n$/, '');
    if (/filename="([^"]*)"/.test(part)) out[name[1]] = { filename: RegExp.$1, size: value.length };
    else out[name[1]] = Buffer.from(value, 'binary').toString('utf8');
  }
  return out;
}

async function reviewsPost(req, res) {
  const f = parseMultipart(await readBody(req), req.headers['content-type']);
  const errors = {};
  if (!(Number(f.rating) >= 1 && Number(f.rating) <= 5)) errors.rating = ['Please select a rating.'];
  if (!f.name || !f.name.trim()) errors.name = ['Name is required.'];
  if (!f.body || f.body.trim().length < 10) errors.body = ['Review must be at least 10 characters.'];
  if (Object.keys(errors).length) return jsonRes(res, 422, { success: false, errors });
  const r = { name: f.name.trim(), rating: Number(f.rating), title: (f.title || '').trim(), content: f.body.trim(), verified: false, date: 'Just now' };
  sessionReviews.unshift(r);
  console.log('[reviews] POST', JSON.stringify(Object.assign({}, f, { photo: f.photo && f.photo.filename })));
  jsonRes(res, 200, { success: true, review: r });
}

// Same formula as the checkout (tiered next item on the sample tiers), so drawer totals can be checked.
function cartQuote(items) {
  const units = [];
  const lines = items.map((it) => {
    const v = (loadProduct().variants_list || []).find((x) => x.id === it.variantId);
    const unit = v ? num(v.price) : num(it.price);
    for (let i = 0; i < (it.qty || it.quantity || 1); i++) units.push(unit);
    return { variantId: it.variantId, unitPrice: unit, qty: it.qty || it.quantity || 1, lineTotal: +(unit * (it.qty || it.quantity || 1)).toFixed(2) };
  });
  units.sort((a, b) => b - a);
  let discount = 0;
  units.forEach((p, i) => { const pc = i + 1 >= 3 ? 15 : i + 1 >= 2 ? 10 : 0; discount += +(p * pc / 100).toFixed(2); });
  const subtotal = +lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
  return { subtotal, discount: +discount.toFixed(2), appliedDiscount: discount ? { title: 'Buy more, save more' } : null, lines };
}

async function cartTotals(req, res, isCheckout) {
  let body = {};
  try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); } catch (e) { return jsonRes(res, 400, { success: false, error: 'Invalid JSON' }); }
  const subtotal = (body.items || []).reduce((s, l) => s + num(l.price) * (parseInt(l.quantity, 10) || 1), 0);
  const shipping = subtotal > 0 ? 4.99 : 0;
  const data = { subtotal: +subtotal.toFixed(2), discount: 0, shipping, total: +(subtotal + shipping).toFixed(2), appliedDiscount: null };
  if (isCheckout) Object.assign(data, { orderId: 'MOCK-' + Date.now(), orderName: '#SF' + String(Date.now()).slice(-6) });
  jsonRes(res, 200, { success: true, data });
}

async function contactPost(req, res) {
  let body = {};
  try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); } catch (e) { /* empty */ }
  console.log('[contact] POST', JSON.stringify(body));
  if (!body.email || !body.message) return jsonRes(res, 422, { success: false, error: { message: 'Email and message are required.' } });
  jsonRes(res, 200, { success: true });
}

function orderGet(res, url) {
  const ok = url.searchParams.get('trackingNumber') || (url.searchParams.get('order') && url.searchParams.get('email'));
  if (!ok) return jsonRes(res, 404, { success: false, error: { message: 'Not found' } });
  jsonRes(res, 200, { success: true, data: readJson(path.join(FIX, 'tracking-order-response.json'), {}) });
}

// ---------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------
const PAGES = {
  'about-us': ['About Us', '<p>Welcome to <strong>Base Store</strong>. We make a few things and make them well.</p>'],
  'contact-us': ['Contact Us', '<p>Questions? Write to us and we will reply within one business day.</p>'],
  'track-your-order': ['Order Tracking', '<p>Enter your order number and email to see where your order is.</p>'],
  'shipping-policy': ['Shipping Policy', '<p>Orders ship within 1–3 business days. Delivery takes 5–10 business days.</p>'],
  'refund-policy': ['Refund Policy', '<p>Return any item within 30 days of delivery for a full refund.</p>'],
  'privacy-policy': ['Privacy Policy', '<p>We only use your data to process your order.</p>'],
  'terms-of-service': ['Terms of Service', '<p>By using this store you agree to these terms.</p>'],
};

function renderPage(req, res, slug) {
  const p = PAGES[slug] || [slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), '<p>Sample page.</p>'];
  const ctx = buildContext(req);
  ctx.page = Object.assign({}, ctx.page, { title: p[0], bodyHtml: p[1] });
  send(res, engine(), 'templates/page.hbs', ctx);
}

// ---------------------------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------------------------
let clients = [];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('\n');
      clients.push(res);
      req.on('close', () => { clients = clients.filter((c) => c !== res); });
      return;
    }
    if (p.startsWith('/assets/')) return serveAsset(res, p.slice('/assets/'.length));
    if (p === '/api/storefront/reviews' || p === '/reviews') return req.method === 'POST' ? reviewsPost(req, res) : reviewsGet(res, url);
    if (p === '/api/storefront/cart/price' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      return jsonRes(res, 200, { success: true, data: cartQuote(body.items || []) });
    }
    if (p === '/api/storefront/cart/gifts' && req.method === 'POST') {
      // Gifts the cart earns: 3+ units in the cart unlock MOCK_GIFT (mirrors the sample gift_offers tier).
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const units = (body.items || []).reduce((n, it) => n + (parseInt(it.qty, 10) || 0), 0);
      return jsonRes(res, 200, { success: true, data: { gifts: units >= 3 ? [MOCK_GIFT] : [] } });
    }
    if (p === '/api/storefront/cart-totals' && req.method === 'POST') return cartTotals(req, res, false);
    if ((p === '/api/storefront/checkout' || p === '/checkout') && req.method === 'POST') return cartTotals(req, res, true);
    if (p === '/api/storefront/contact' && req.method === 'POST') return contactPost(req, res);
    if (p === '/api/storefront/order') return orderGet(res, url);

    if (p === '/' || p === '/home') return send(res, engine(), 'templates/index.hbs', buildContext(req));
    if (p === '/product' || p.startsWith('/products/') || p.startsWith('/p/')) return renderProduct(req, res, url);
    if (p === '/checkout') return send(res, engine(), 'templates/checkout.hbs', buildContext(req));
    if (p === '/pages/tracking/result') return send(res, engine(), 'templates/tracking-result.hbs', buildContext(req));
    if (p.startsWith('/collections/')) {
      const handle = p.split('/')[2] || 'all';
      const ctx = buildContext(req);
      const col = ctx.collections.find((c) => c.handle === handle);
      ctx.collection = col ? { title: col.title, description: '', products: col.products } : { title: 'All products', products: ctx.products };
      return send(res, engine(), exists(path.join(THEME, 'templates/collection.hbs')) ? 'templates/collection.hbs' : 'templates/index.hbs', ctx);
    }
    if (p === '/search') return send(res, engine(), 'templates/search.hbs', buildContext(req));
    if (p.startsWith('/pages/') || p.startsWith('/policies/')) return renderPage(req, res, p.split('/').pop());
    text(res, 404, 'Not found');
  } catch (e) {
    console.error(e);
    text(res, 500, e.stack);
  }
});

let timer = null;
for (const dir of ['sections', 'snippets', 'templates', 'layout', 'assets', 'config', 'sample']) {
  const full = path.join(THEME, dir);
  if (!exists(full)) continue;
  fs.watch(full, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => clients.forEach((c) => c.write('data: reload\n\n')), 120);
  });
}

server.listen(PORT, () => {
  console.log('Previewing ' + THEME);
  console.log('  http://localhost:' + PORT + '/            home');
  console.log('  http://localhost:' + PORT + '/product     product (?template=bundle, ?legacy=1)');
  console.log('  http://localhost:' + PORT + '/collections/all   /search?q=   /pages/track-your-order   /checkout');
});
