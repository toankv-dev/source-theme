'use strict';
/**
 * The Handlebars helpers of the platform's theme engine: the only helpers a theme may call.
 *
 * Copied from shopdy-promax apps/api/src/features/storefront/application/theme-engine.ts → registerHelpers (origin/main,
 * checked 2026-11-20; that file last changed in d9c5613e2, 2026-11-12). A helper the engine lacks fails the whole page
 * with a 500 on the store, while a preview that has it shows nothing wrong (2026-11-20: `contains`, listed here before
 * but never in the engine, took lunara---vesnacharm 2026.11.20.5 down).
 *
 * pack.js and inspect-theme.js check templates against NAMES; preview-server.js renders with register(), which must
 * register exactly ENGINE (tools/test/engine-helpers.test.js). When the engine adds or drops a helper, change both here.
 */
const BUILTIN = ['if', 'unless', 'each', 'with', 'lookup', 'log'];
const ENGINE = ['eq', 'gt', 'stars', 'isColorGroup', 'money', 'usdAmount', 'json', 'number', 'limit', 'applyTokens',
  'faqItems', 'swatchStyle', 'stars5', 'truncate', 'exceeds', 'editable', 'editableSetting'];
const NAMES = new Set([...BUILTIN, ...ENGINE]);

const FAQ_SETTING_SLOTS = 12; // theme-engine.ts FAQ_SETTING_SLOTS

/**
 * The engine's helpers for the local preview: same results as the engine for what themes use. Differences on purpose:
 * money is always USD (the engine converts only on never-cached pages), applyTokens fills the preview's sample tokens,
 * swatchStyle uses the preview's colour table, editable / editableSetting print nothing (a visitor's page).
 */
function register(hb, { tokens = {}, swatchColor = () => '#d8c4a8' } = {}) {
  hb.registerHelper('eq', (a, b) => a === b);
  hb.registerHelper('gt', (a, b) => Number(a) > Number(b));
  hb.registerHelper('stars', (rating) => {
    const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return '★★★★★☆☆☆☆☆'.slice(5 - r, 10 - r);
  });
  hb.registerHelper('isColorGroup', (name) => /colou?r/i.test(String(name)));
  hb.registerHelper('money', (n) => '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2));
  hb.registerHelper('usdAmount', (value, div) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
    const by = typeof div === 'number' && div > 0 ? div : 1;
    return Number.isFinite(n) ? String(Math.round((n / by) * 1e6) / 1e6) : '0';
  });
  hb.registerHelper('json', (v) => new hb.SafeString(JSON.stringify(v === undefined ? null : v)));
  hb.registerHelper('number', (n) => new Intl.NumberFormat('en-US').format(Math.round(Number(n) || 0)));
  hb.registerHelper('limit', (arr, n) => (Array.isArray(arr) ? arr.slice(0, Math.max(0, Number(n) || 0)) : []));
  hb.registerHelper('applyTokens', (text) => new hb.SafeString(String(text == null ? '' : text)
    .replace(/%7B%7B([A-Za-z0-9_]+)%7D%7D/gi, '{{$1}}')
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in tokens ? tokens[k] : m))));
  hb.registerHelper('faqItems', (s) => {
    const out = [];
    for (let i = 1; i <= FAQ_SETTING_SLOTS; i++) {
      const q = String((s && s['faq_' + i + '_q']) || '').trim();
      const a = String((s && s['faq_' + i + '_a']) || '');
      if (q && a.replace(/<[^>]*>/g, '').trim()) out.push({ q, a: a.trim() });
    }
    return out;
  });
  hb.registerHelper('swatchStyle', (label) => new hb.SafeString('background:' + swatchColor(label) + ';'));
  hb.registerHelper('stars5', (rating) => {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const rounded = Math.round(r * 2) / 2, full = Math.floor(rounded), half = rounded - full === 0.5;
    const out = [];
    for (let i = 1; i <= 5; i++) out.push(i <= full ? 'full' : i === full + 1 && half ? 'half' : 'empty');
    return out;
  });
  hb.registerHelper('truncate', (str, n) => {
    const s = String(str == null ? '' : str), len = Math.max(0, Number(n) || 0);
    return s.length <= len ? s : s.slice(0, len).replace(/\s+\S*$/, '') + '... ';
  });
  hb.registerHelper('exceeds', (str, n) => String(str == null ? '' : str).length > (Number(n) || 0));
  hb.registerHelper('editable', () => '');
  hb.registerHelper('editableSetting', () => '');
}

module.exports = { BUILTIN, ENGINE, NAMES, register };
