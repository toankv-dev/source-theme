#!/usr/bin/env node
/*
 * Lunara Vesnacharm — theme-wide colours and texts in the look of shape-curve.com (docs/SPEC-lunara-vesnacharm.md).
 * One source: writes each value into config/settings_data.json (current) AND as the default in
 * config/settings_schema.json (a live store shows schema defaults for keys it never saved). Adds the theme's own
 * settings (highlight, footer texts / logo). Idempotent: run again after editing.
 *
 * Measured on the download of 2026-11-19 (themes/lunara---vesnacharm/_src/):
 *   capture  = _work/capture/product-shapecurve/{tokens.json,desktop.png}
 *   live     = _work/site/pages/product-shapecurve/desktop.png
 *
 *   node themes/lunara---vesnacharm/_src/build-vn-settings.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');
const DATA = path.join(THEME, 'config', 'settings_data.json');
const SCHEMA = path.join(THEME, 'config', 'settings_schema.json');
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));

// Existing Lunara settings: new value (data + schema default) and, where the meaning changed, a new info line.
const VALUES = {
  primary_text: '#FFFFFF',     // ADD TO CART text, tokens.json buttons[0].color
  footer_text: '#FFFFFF',      // same band, second colour (links, headings)
  sale: '#e13f3f',             // "40% OFF" card badge, pixel.js capture desktop.png 640,9240 (checkout sale / error too)
  show_footer_wave: false,     // the original footer is a flat black band
  show_topbar: true,
  topbar_style: 'rotate',      // the original rotates two messages with ‹ › arrows (live desktop.png, y 0-35)
  topbar_text: "FREE SHIPPING OVER $79|Don't Wait, Black Friday Starts Now!", // capture text.txt / tokens.json topbar.text
  topbar_bg: '',               // empty = the main colour, solid (user 2026-11-20, as tammycharm.com; was a pale gradient)
  topbar_color: '#FFFFFF',     // white on the main colour (was #232323 on the pale gradient)
};
const INFO = {
  topbar_bg: 'Empty = the main colour (Colors > Main colour), solid. Pick a colour here only to use another one.',
};

// The theme's own settings, appended to a group (created when missing).
const OWN = {
  Colors: [
    { type: 'color', id: 'vn_footer_bg', label: 'Footer background', default: '',
      info: 'Empty = the highlight colour (the theme\'s main colour). The bar under the footer is a darker shade of it.' },
    { type: 'color', id: 'highlight', label: 'Main colour (highlight)', default: '#790236',
      info: 'The theme\'s one colour: buttons and their borders, Add to cart, checkout buttons, size / colour choices, footer, top bar, badges, links. Product sections keep their own highlight setting.' },
  ],
  'Top bar': [
    { type: 'range', id: 'vn_topbar_size', label: 'Text size (rotating messages)', min: 12, max: 20, step: 1, unit: 'px', default: 14,
      info: '14 px = tammycharm.com. Separate several messages with | (they rotate, with ‹ › arrows).' },
  ],
  Header: [
    { type: 'range', id: 'vn_logo_width', label: 'Logo width (desktop)', min: 100, max: 400, step: 10, unit: 'px', default: 280,
      info: 'Use a logo file without empty space around it (trimmed), so the width sets the size of the letters. 280 px ≈ the logo of the original store.' },
    { type: 'range', id: 'vn_logo_width_mobile', label: 'Logo width (phone)', min: 80, max: 300, step: 10, unit: 'px', default: 180 },
  ],
  Footer: [
    { type: 'image_picker', id: 'vn_footer_logo', label: 'Footer logo', info: 'A light logo for the black footer, about 460 x 120. Empty = the store name in white.' },
    { type: 'text', id: 'vn_ft_tagline', label: 'Line under the logo', default: 'Feel good in every curve.', info: 'Empty = no line.' },
    { type: 'text', id: 'vn_ft_shop', label: 'Column 1 title (collections)', default: 'Shop By' },
    { type: 'text', id: 'vn_ft_info', label: 'Column 2 title (About, Terms, Privacy)', default: 'Information' },
    { type: 'text', id: 'vn_ft_service', label: 'Column 3 title (Contact, Shipping, Returns, Track)', default: 'Customer Service' },
    { type: 'text', id: 'vn_ft_news_title', label: 'Newsletter title', default: 'Stay In The Know' },
    { type: 'text', id: 'vn_ft_news_text', label: 'Newsletter text', default: 'Be the first one to receive new releases, special offers, and more' },
    { type: 'text', id: 'vn_ft_news_placeholder', label: 'Email field placeholder', default: 'Enter your email' },
    { type: 'text', id: 'vn_ft_news_button', label: 'Newsletter button', default: 'SUBMIT' },
  ],
};

// Lunara's footer_bg is replaced by vn_footer_bg (a saved footer_bg on a store would win over any new default).
// Lunara's primary is replaced by the highlight everywhere (user 2026-11-19: the whole theme in #790236).
for (const g of schema) g.settings = (g.settings || []).filter((s) => s.id !== 'footer_bg' && s.id !== 'primary');
delete data.current.footer_bg;
delete data.current.primary;
const cur = data.current;
const changes = [];
const set = (id, v) => { if (cur[id] !== v) changes.push(id + ': ' + JSON.stringify(cur[id]) + ' -> ' + JSON.stringify(v)); cur[id] = v; };

const byId = new Map();
for (const g of schema) for (const s of g.settings || []) if (s.id) byId.set(s.id, s);

{ const pt = byId.get('primary_text'); if (pt) pt.label = 'Text on the main colour'; }
for (const [id, v] of Object.entries(VALUES)) {
  const s = byId.get(id);
  if (!s) throw new Error('setting not in schema: ' + id);
  s.default = v;
  if (INFO[id]) s.info = INFO[id];
  set(id, v);
}

for (const [group, list] of Object.entries(OWN)) {
  let g = schema.find((x) => (x.name && x.name.en) === group || x.name === group);
  if (!g) {
    g = { name: group, settings: [] };
    const after = schema.findIndex((x) => x.name === 'Top bar');
    schema.splice(after + 1, 0, g);
  }
  const ids = new Set(list.map((s) => s.id));
  g.settings = g.settings.filter((s) => !ids.has(s.id)).concat(list);
  for (const s of list) if (s.type !== 'image_picker') set(s.id, s.default);
}

// the top bar's text size sits with the rotating-message settings (after "Text"), not under "Countdown timer"
{
  const g = schema.find((x) => x.name === 'Top bar');
  const i = g ? g.settings.findIndex((x) => x.id === 'vn_topbar_size') : -1;
  if (i >= 0) { const it = g.settings.splice(i, 1)[0]; g.settings.splice(g.settings.findIndex((x) => x.id === 'topbar_color') + 1, 0, it); }
}

fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(SCHEMA, JSON.stringify(schema, null, 2) + '\n');
console.log(changes.length ? changes.join('\n') : 'no changes');
