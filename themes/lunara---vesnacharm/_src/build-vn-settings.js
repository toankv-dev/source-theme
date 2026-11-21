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

// Schema-only changes of existing Lunara settings (label / info / limits); saved values stay as they are.
const TWEAK = {
  countdown_title: { info: 'In the accent colour, in capitals, e.g. ⚡ Black Friday Is Live. A long title wraps on phones.' },
  countdown_subtitle: { info: 'After the title, e.g. Ends Mon, Nov 30. Empty = none.' },
  countdown_hours: { min: 0, info: 'Added to the days. The timer restarts for each visitor when it reaches zero.' },
  home_banner_height_mobile: { info: 'Only when "Banner on phone" = Fixed height (the sides of a wide picture are cut).' },
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
    // countdown bar (user 2026-11-20, screenshot "BLACK FRIDAY IS LIVE • ENDS MON, NOV 30 • 11 DAYS : 03 HRS … • Shop Now →")
    { type: 'text', id: 'vn_cd_link_text', label: 'Link text', default: '',
      info: 'At the end of the bar, underlined, with an arrow, e.g. Shop Now and Get Up To 60% Off. Empty = none.' },
    { type: 'url', id: 'vn_cd_link', label: 'Link (a click anywhere on the bar opens it)',
      info: 'e.g. the sale page or a product. Empty: with a link text = all products; without = the bar is not a link.' },
    { type: 'number', id: 'vn_cd_days', label: 'Timer length (days)', min: 0, max: 60, default: 0,
      info: 'Days + the hours below. A DAYS box shows while at least a whole day is left.' },
    { type: 'text', id: 'vn_cd_end', label: 'Or a fixed end (date and time)', default: '',
      info: 'e.g. 2026-11-30 23:59 (each visitor\'s own time; a date alone = the end of that day). Every visitor counts down to it; once it has passed, the days + hours above take over. Empty = days + hours.' },
    { type: 'color', id: 'vn_cd_bg', label: 'Countdown background', default: '#050100',
      info: 'Empty = the Background above (or the main colour).' },
    { type: 'color', id: 'vn_cd_accent', label: 'Countdown title, numbers and bottom line', default: '#f58634' },
  ],
  'Home page': [
    // phones show the whole banner picture (user 2026-11-20: the text on the right of the picture was cut off);
    // templates/index.hbs (patch-vn.js) treats anything but "crop" as "full"
    { type: 'select', id: 'vn_hb_mobile_fit', label: 'Banner on phone', default: 'full',
      options: [
        { value: 'full', label: 'Whole picture (height follows the picture)' },
        { value: 'crop', label: 'Fixed height (cuts the sides)' },
      ],
      info: 'Whole picture: nothing of the picture is cut on phones. For a taller banner on phones, pick a Mobile banner image (e.g. 1200 x 1000 px).' },
    { type: 'url', id: 'home_banner_image_link', label: 'Banner image link',
      info: 'A click on the picture opens this page, e.g. a product link. Empty = the picture is not a link (the button keeps its own link).' },
    // one picture box for every card of a list (user 2026-11-20: "cards must be the same height"); theme.js ht() reads
    // it from :root --vn-card-r (snippets/gs-head.hbs); the whole photo always shows (object-fit: contain)
    { type: 'select', id: 'vn_card_ratio', label: 'Product cards: picture shape', default: 'auto',
      options: [
        { value: 'auto', label: 'Same as most photos of the list' },
        { value: '100', label: 'Square (1:1)' },
        { value: '125', label: 'Portrait (4:5)' },
        { value: '133.33', label: 'Portrait (3:4)' },
        { value: '150', label: 'Portrait (2:3)' },
      ],
      info: 'Every card of a list gets the same picture box, so all cards are the same height. The whole photo always shows (never cut); a photo of another shape gets blank space around it.' },
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
  for (const s of list) if (s.type !== 'image_picker' && s.default !== undefined) set(s.id, s.default);
}

for (const [id, props] of Object.entries(TWEAK)) {
  const s = byId.get(id);
  if (!s) throw new Error('setting not in schema: ' + id);
  Object.assign(s, props);
}

// Settings shown together, in this order, where the first of them sits (new ones are appended to their group above).
const ORDER = [
  ['Top bar', ['countdown_title', 'countdown_subtitle', 'vn_cd_link_text', 'vn_cd_link', 'vn_cd_days', 'countdown_hours', 'vn_cd_end', 'vn_cd_bg', 'vn_cd_accent']],
  ['Home page', ['home_banner_image', 'home_banner_image_mobile', 'vn_hb_mobile_fit', 'home_banner_height_mobile', 'home_banner_image_link']],
  ['Home page', ['show_home_products', 'home_products_heading', 'home_products_limit', 'vn_card_ratio']],
];
for (const [group, ids] of ORDER) {
  const g = schema.find((x) => (x.name && x.name.en) === group || x.name === group);
  if (!g) throw new Error('group not in schema: ' + group);
  const items = ids.map((id) => { const s = g.settings.find((x) => x.id === id); if (!s) throw new Error(group + ': no ' + id); return s; });
  const at = g.settings.slice(0, g.settings.indexOf(items[0])).filter((s) => !items.includes(s)).length;
  const rest = g.settings.filter((s) => !items.includes(s));
  rest.splice(at, 0, ...items);
  g.settings = rest;
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
