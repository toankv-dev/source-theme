#!/usr/bin/env node
/*
 * Copy of the theme for comparing the Shapecurve template with shape-curve.com: same files (no _work), but
 * sample/product.json looks like the original product (bodysuit photos in the original's order, Black / Beige / Brown,
 * sizes "XS (95-110 lbs)" …, $35.99 / $59.98). The theme's own sample stays untouched. Run again after each edit.
 *
 *   node themes/lunara---hushflex/_src/compare-copy.js <dest-dir>
 *   node tools/preview-server.js <dest-dir> --port 8093      →  /product?template=shapecurve
 */
'use strict';
const fs = require('fs');
const path = require('path');
const THEME = path.resolve(__dirname, '..');
const DEST = path.resolve(process.argv[2] || '');
if (!process.argv[2]) { console.error('usage: node compare-copy.js <dest-dir>'); process.exit(1); }

const skip = new Set(['_work', '_src', '_map', 'dist', '.git']);
(function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copy(a, b);
    else if (!fs.existsSync(b) || fs.statSync(b).mtimeMs < fs.statSync(a).mtimeMs || fs.statSync(b).size !== fs.statSync(a).size) fs.copyFileSync(a, b);
  }
})(THEME, DEST);

const S = '/assets/images/sc-sections/';
const gallery = ['6_1bd24853-48c5-4f35-b2a5-080d7d937b81', '8_d6fd7e99-5016-4d79-a565-fb3d2b4ae22b', '2_986f5e45-ae0b-43e0-a6b5-3b7a139f9edb',
  '7_23a005e5-8f42-4a93-a211-d4d4a4d2ca97', '6_6d437547-4371-408a-91aa-f114a74c1067', '14_6500e0b5-c1f1-460c-8107-7017ff25c9ad',
  '1_e854fe6a-674b-4f9d-87e1-4255838e7013', '4_bf206e82-4753-4f16-8311-0bbc0f81ee40', '9_173442e1-338d-4444-a0f5-4cea68ab2434',
  '10_85819342-7731-4128-b4e4-85770e734e75', '11_4806c8a0-c9f3-4eab-8db4-166de753eee2', '12_f270e4a9-2c6d-4e8d-a441-7d52b06643f8',
  '3_83b48a48-0b8d-47a6-899d-0fac2def52e3', '16_e5d61e42-f66a-41ff-a94f-4d83c2642fe6', '17_71becca6-95dd-4f56-bb9e-7ad0f67c2057',
  '15_a49d2600-5290-46a5-88dc-bced33e933d5', '13_93c76508-d2d6-4944-8ebc-3f1e89e981a3'].map((n) => S + n + '.webp');
const colours = { Black: S + '2_986f5e45-ae0b-43e0-a6b5-3b7a139f9edb.webp', Beige: S + '3_83b48a48-0b8d-47a6-899d-0fac2def52e3.webp', Brown: S + '1_e854fe6a-674b-4f9d-87e1-4255838e7013.webp' };
const sizes = ['XS (95-110 lbs)', 'S (110-125 lbs)', 'M (125-140 lbs)', 'L (140-160 lbs)', 'XL (160-180 lbs)', '2XL (180-205 lbs)', '3XL (205-240 lbs)'];

const p = JSON.parse(fs.readFileSync(path.join(THEME, 'sample', 'product.json'), 'utf8'));
p.title = 'Triple-Zone Compression Drop-Seat Full Body Shaping Bodysuit';
p.price = '$35.99';
p.compare_at_price = '$59.98';
p.off_pct = 40;
p.media = { main_image: gallery[0], gallery: gallery.map((url) => ({ url, alt: '' })) };
p.variants = [
  { name: 'Color', displayType: 'pills', options: Object.keys(colours).map((c, i) => ({ label: c, active: i === 1 })) },
  { name: 'Size', displayType: 'pills', options: sizes.map((s, i) => ({ label: s, active: i === 0 })) },
];
p.variants_list = [];
for (const c of Object.keys(colours)) for (const s of sizes) {
  p.variants_list.push({ id: 'v-' + c.toLowerCase() + '-' + s.split(' ')[0].toLowerCase(), title: c + ' / ' + s, option_values: [c, s], price: '$35.99', compare_at_price: '$59.98', featured_image: colours[c], available: true });
}
// A test template (copy only): the same page, Find my size fed with getionix.com's leggings chart (Height column + a
// second table), so the height path and the second table can be checked.
const tpl = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.shapecurve.json'), 'utf8'));
const fit = tpl.sections.product.blocks.fit;
if (fit) {
  Object.assign(fit.settings, {
    subtitle: 'Two numbers you already know. No tape measure.', proof_strong: '400,000+ customers',
    chart: ['Size | Weight | Height | Leg length', 'XS | 88-110 | 5\'1-5\'5 | 30.7″', 'S | 110-132 | 5\'2-5\'6 | 31.5″', 'M | 132-154 | 5\'3-5\'7 | 32.3″',
      'L | 154-176 | 5\'4-5\'8 | 33.1″', 'XL | 176-198 | 5\'5-5\'9 | 33.9″', 'XXL | 198-220 | 5\'6-5\'11 | 34.6″'].join('\n'),
    chart2_label: 'Garment measurements (laid flat)', chart2_note: 'Measured flat, not on the body.',
    chart2: ['Size | Waist (in) | Hip (in) | Thigh (in) | Length (in)', 'XS | 10.6 | 12.4 | 11.8 | 30.7', 'S | 11.4 | 13.4 | 13.4 | 31.5', 'M | 12.2 | 14.4 | 14.2 | 32.3'].join('\n'),
  });
  tpl.name = 'Fit test (copy only)';
  fs.writeFileSync(path.join(DEST, 'templates', 'product.fittest.json'), JSON.stringify(tpl, null, 2) + '\n');
}
fs.mkdirSync(path.join(DEST, 'sample'), { recursive: true });
fs.writeFileSync(path.join(DEST, 'sample', 'product.json'), JSON.stringify(p, null, 2) + '\n');
console.log('copied → ' + DEST);
