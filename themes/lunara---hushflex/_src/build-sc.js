#!/usr/bin/env node
/*
 * Template "Shapecurve – Drop-seat bodysuit" (templates/product.shapecurve.json), from
 * https://shape-curve.com/products/triple-zone-compression-drop-seat-full-body-shaping-bodysuit (downloaded 2026-11-19).
 * Writes every JSON of the template; run again after editing, it replaces only what it owns:
 *   sections/product.schema.json   + settings skin / skin_highlight / buy_now_label, + blocks sc_price, sc_highlights,
 *                                   sc_ship, sc_tabs (other settings / blocks untouched)
 *   sections/reviews.schema.json   + show_write (default on = old templates unchanged)
 *   sections/sc-*.schema.json      the 4 content sections
 *   templates/product.shapecurve.json
 * Fonts: the theme's Poppins (user's choice). Highlight: #790236 (user's choice) and tints of it.
 *
 *   node themes/lunara---hushflex/_src/build-sc.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(THEME, f), 'utf8'));
const write = (f, o) => { fs.writeFileSync(path.join(THEME, f), JSON.stringify(o, null, 2) + '\n'); console.log('wrote', f); };

const HL = '#790236';          // highlight (user)
const BAND = '#F6EDF1';        // 7 % of HL on white — the original's #eaeaf5 band
const IMG = 'images/sc-sections/';

// ---------------------------------------------------------------------------------------------------------------
// product.schema.json
const product = read('sections/product.schema.json');
const OWN_SETTINGS = ['sc_header', 'skin', 'skin_highlight', 'buy_now_label'];
product.settings = product.settings.filter((s) => !OWN_SETTINGS.includes(s.id) && s.content !== 'Template look');
product.settings.push(
  { type: 'header', content: 'Template look' },
  {
    type: 'select', id: 'skin', label: 'Look of this product section', default: 'lunara',
    options: [{ value: 'lunara', label: 'Lunara (default)' }, { value: 'shapecurve', label: 'Shapecurve (picture colour tiles, size pills, soft cards)' }],
    info: 'Shapecurve loads assets/css/sc-product.css and assets/js/sc-product.js for this section only.'
  },
  { type: 'color', id: 'skin_highlight', label: 'Shapecurve: highlight colour', default: HL, info: 'Radio, selected pack frame, badges, Find My Size, tinted backgrounds.' },
  { type: 'text', id: 'buy_now_label', label: 'Second button (straight to checkout)', default: '', info: 'e.g. Express checkout now. Empty = no second button. Adds the same items as Add to cart, then opens the checkout.' }
);

const OWN_BLOCKS = ['sc_price', 'sc_highlights', 'sc_ship', 'sc_tabs', 'sc_fit'];
product.blocks = product.blocks.filter((b) => !OWN_BLOCKS.includes(b.type));
const tab = (n) => [
  { type: 'header', content: 'Row ' + n },
  { type: 'text', id: 'tab_' + n + '_title', label: 'Title', default: '' },
  { type: 'richtext', id: 'tab_' + n + '_body', label: 'Text', default: '' },
];
product.blocks.push(
  {
    type: 'sc_price', name: 'Price + badge',
    settings: [
      { type: 'text', id: 'badge', label: 'Badge next to the price', default: 'Buy More Save More', info: 'Empty = no badge.' },
      { type: 'checkbox', id: 'show_compare', label: 'Show the compare-at price', default: true },
    ],
  },
  {
    type: 'sc_highlights', name: 'Highlights box',
    settings: [
      { type: 'paragraph', content: 'Up to 5 short lines in a grey box. Start a line with an emoji to use it as the icon.' },
      ...[1, 2, 3, 4, 5].map((n) => ({ type: 'text', id: 'line_' + n, label: 'Line ' + n, default: '' })),
    ],
  },
  {
    type: 'sc_ship', name: 'Shipping box',
    settings: [
      { type: 'text', id: 'title', label: 'Title (truck icon)', default: 'Free Shipping Over $79' },
      { type: 'text', id: 'note', label: 'Small line', default: '*Same-Day Shipping— for Orders Before 12pm PST' },
      { type: 'text', id: 'item_1', label: 'Right line 1 (lock icon)', default: 'Secure Checkout' },
      { type: 'text', id: 'item_2', label: 'Right line 2 (returns icon)', default: 'Easy Returns' },
    ],
  },
  {
    type: 'sc_tabs', name: 'Info rows (accordion)',
    settings: [
      { type: 'paragraph', content: 'Grey rows that open on tap. A row without a title is hidden.' },
      ...tab(1), ...tab(2), ...tab(3),
      { type: 'header', content: 'Size chart row' },
      { type: 'text', id: 'chart_title', label: 'Title', default: 'Size Chart' },
      { type: 'textarea', id: 'chart', label: 'Size chart table', default: '', info: 'One row per line, cells split by |. The first line is the header. Empty = no size chart row.' },
      { type: 'text', id: 'chart_note', label: 'Line under the table', default: '' },
    ],
  },
  {
    type: 'sc_fit', name: 'Find my size (weight)',
    settings: [
      { type: 'paragraph', content: 'A button that opens a size finder (as getionix.com): weight, plus height when the chart has a Height column, in US or metric units; it shows one size, or both when the weight sits between two, and "Select M" sets the size in the main picker and every pack row. Works in any product template.' },
      { type: 'text', id: 'button_label', label: 'Button', default: 'Find my size' },
      { type: 'text', id: 'option_name', label: 'Size option name', default: 'Size', info: 'The option the result picks. A value like "M (125-140 lbs)" matches the chart size "M"; XXL = 2XL.' },
      { type: 'select', id: 'units', label: 'Units shown first', default: 'us', options: [{ value: 'us', label: 'US (lbs · ft)' }, { value: 'metric', label: 'Metric (kg · cm)' }] },
      { type: 'header', content: 'Pop-up texts' },
      { type: 'text', id: 'eyebrow', label: 'Small line on top', default: '', info: 'Empty = the product title.' },
      { type: 'text', id: 'title', label: 'Title', default: 'Find your size' },
      { type: 'text', id: 'subtitle', label: 'Line under the title', default: 'Two numbers you already know. No tape measure.' },
      { type: 'text', id: 'weight_label', label: 'Weight label', default: 'Weight' },
      { type: 'text', id: 'height_label', label: 'Height label', default: 'Height' },
      { type: 'text', id: 'optional_label', label: '"(optional)"', default: '(optional)' },
      { type: 'text', id: 'hint', label: 'Before typing', default: 'Enter your weight and we’ll match you to the chart.' },
      { type: 'text', id: 'kicker', label: 'Result: one size, small title', default: 'Your size' },
      { type: 'text', id: 'kicker_two', label: 'Result: two sizes, small title', default: 'Between two sizes' },
      { type: 'text', id: 'basis', label: 'Result: from the weight', default: 'Based on your weight' },
      { type: 'text', id: 'basis_height', label: 'Result: from weight and height', default: 'Based on your weight and height' },
      { type: 'text', id: 'line_one', label: 'Result line: one size', default: '{weight} sits in the {size} range of our chart.', info: '{weight} = what was typed, {size} = the size.' },
      { type: 'text', id: 'line_two', label: 'Result line: two sizes', default: 'You land between {a} and {b}: {a} fits snug, {b} gives more room.', info: '{a} = the smaller size, {b} = the larger one.' },
      { type: 'text', id: 'line_edge', label: 'Result line: outside the chart', default: '{weight} is outside our chart; {size} is the closest size.' },
      { type: 'text', id: 'select_label', label: 'Pick button', default: 'Select {size}' },
      { type: 'header', content: 'Size chart' },
      { type: 'text', id: 'chart_label', label: 'Chart title', default: 'See the full size chart' },
      { type: 'checkbox', id: 'chart_open', label: 'Chart open at first', default: true },
      { type: 'textarea', id: 'chart', label: 'Chart', default: '', info: 'First line = column names, then one size per line; cells split by |. Weight column in lbs (95-110). A Height column in inches (61-65) or feet (5\'1-5\'5) adds the Height field. Columns named with (in) are inches; Metric shows kg / cm.' },
      { type: 'text', id: 'note', label: 'Line under the chart', default: 'Every body is different. If you land between two sizes, we’ll show you both.' },
      { type: 'text', id: 'chart2_label', label: 'Second table title', default: 'Garment measurements (laid flat)' },
      { type: 'text', id: 'chart2_note', label: 'Second table note', default: '' },
      { type: 'textarea', id: 'chart2', label: 'Second table', default: '', info: 'Same format. Empty = no second table.' },
      { type: 'header', content: 'Bottom line' },
      { type: 'text', id: 'proof_strong', label: 'Bold part', default: '', info: 'e.g. 400,000+ customers. Empty = no line.' },
      { type: 'text', id: 'proof_text', label: 'Rest', default: 'have found their fit' },
    ],
  }
);
write('sections/product.schema.json', product);

// ---------------------------------------------------------------------------------------------------------------
// reviews.schema.json — the "Write a review" button can be turned off (no review form on new templates)
const reviews = read('sections/reviews.schema.json');
reviews.settings = reviews.settings.filter((s) => s.id !== 'show_write');
reviews.settings.push({ type: 'checkbox', id: 'show_write', label: 'Show "Write a review"', default: true, info: 'Off = reviews are shown only (they are added in the admin).' });
write('sections/reviews.schema.json', reviews);

// ---------------------------------------------------------------------------------------------------------------
// Content sections
const band = [
  { type: 'color', id: 'bg', label: 'Background', default: BAND },
  { type: 'color', id: 'highlight', label: 'Highlight colour', default: HL, info: 'Tag / icon gradients are tints of it.' },
  { type: 'range', id: 'pad_top', label: 'Space above', min: 0, max: 100, step: 5, unit: 'px', default: 20 },
  { type: 'range', id: 'pad_bottom', label: 'Space below', min: 0, max: 100, step: 5, unit: 'px', default: 20 },
];
const pic = (id, label, info) => [
  { type: 'image_picker', id, label, info },
  { type: 'text', id: 'default_' + id, label: 'Theme file while empty', info: 'Path inside assets/, e.g. ' + IMG + 'photo.webp. Shown until a file is picked above.' },
];

write('sections/sc-features.schema.json', {
  name: 'Feature cards (picture + text)',
  tag: 'section',
  max_blocks: 8,
  settings: band.map((s) => (s.id === 'pad_top' ? { ...s, default: 50 } : s.id === 'pad_bottom' ? { ...s, default: 10 } : s)),
  blocks: [{
    type: 'card', name: 'Card',
    settings: [
      ...pic('image', 'Picture or GIF', 'Square, 1110 x 1110 recommended. Animated GIF / WebP plays. Cards alternate sides on desktop.'),
      { type: 'text', id: 'tag', label: 'Tag', default: 'Feature' },
      { type: 'text', id: 'heading', label: 'Heading', default: 'Feature heading' },
      { type: 'richtext', id: 'body', label: 'Text', default: '<p>Describe the benefit in one or two sentences.</p>' },
    ],
  }],
  presets: [{ name: 'Feature cards', category: 'Content', description: 'White cards on a tinted band: picture one side, tag + heading + text the other.' }],
});

write('sections/sc-details.schema.json', {
  name: 'Details (picture + round cards)',
  tag: 'section',
  max_blocks: 6,
  settings: [
    { type: 'text', id: 'heading', label: 'Heading', default: 'Crafted In Every Detail' },
    ...pic('image', 'Large picture (desktop only)', '4:5, 1050 x 1312 recommended. Hidden on phones, as on the original.'),
    ...band,
  ],
  blocks: [{
    type: 'item', name: 'Detail',
    settings: [
      ...pic('image', 'Round picture', 'Square, 304 x 304 recommended (shown as a circle).'),
      { type: 'text', id: 'title', label: 'Title', default: 'Detail' },
      { type: 'textarea', id: 'text', label: 'Text', default: 'One sentence about this detail.' },
    ],
  }],
  presets: [{ name: 'Details', category: 'Content', description: 'Heading, a large picture and cards with a round picture, alternating sides.' }],
});

write('sections/sc-testimonials.schema.json', {
  name: 'Photo testimonials',
  tag: 'section',
  max_blocks: 12,
  settings: [
    { type: 'text', id: 'heading', label: 'Heading', default: 'Loved By 12,000+ Ladies Worldwide' },
    { type: 'text', id: 'button_label', label: 'Button', default: 'View All', info: 'Empty = no button.' },
    { type: 'text', id: 'button_link', label: 'Button link', default: '#lu-reviews', info: '#lu-reviews = the reviews of this page.' },
    { type: 'color', id: 'star', label: 'Star colour', default: '#F5A623' },
    ...band,
  ],
  blocks: [{
    type: 'quote', name: 'Testimonial',
    settings: [
      ...pic('image', 'Photo', '3:4, 546 x 728 recommended.'),
      { type: 'text', id: 'name', label: 'Name', default: 'Customer name' },
      { type: 'checkbox', id: 'verified', label: 'Verified tick', default: true },
      { type: 'range', id: 'rating', label: 'Stars', min: 1, max: 5, step: 1, default: 5 },
      { type: 'textarea', id: 'text', label: 'Text', default: 'What the customer said.' },
    ],
  }],
  presets: [{ name: 'Photo testimonials', category: 'Reviews', description: 'Swipeable cards: photo, name, stars, short quote, and a button to the reviews.' }],
});

const ICONS = [
  { value: 'truck', label: 'Truck' }, { value: 'money', label: 'Money back' }, { value: 'card', label: 'Card' },
  { value: 'support', label: 'Support (phone)' }, { value: 'lock', label: 'Lock' }, { value: 'returns', label: 'Returns' },
  { value: 'heart', label: 'Heart' }, { value: 'star', label: 'Star' },
];
write('sections/sc-trust.schema.json', {
  name: 'Trust badges card',
  tag: 'section',
  max_blocks: 6,
  settings: band,
  blocks: [{
    type: 'item', name: 'Badge',
    settings: [
      { type: 'select', id: 'icon', label: 'Icon', default: 'truck', options: ICONS },
      { type: 'image_picker', id: 'image', label: 'Own icon (optional)', info: 'Replaces the icon above. Square PNG / SVG, 96 x 96.' },
      { type: 'text', id: 'title', label: 'Title', default: 'Free Shipping' },
      { type: 'richtext', id: 'text', label: 'Text', default: '<p>Short line about it.</p>' },
    ],
  }],
  presets: [{ name: 'Trust badges', category: 'Content', description: 'A white card with 4 round icons, titles and short lines.' }],
});

// ---------------------------------------------------------------------------------------------------------------
// The template
const blocks = {};
const order = [];
const add = (id, type, settings = {}) => { blocks[id] = { type, settings }; order.push(id); };
add('title', 'title');
add('rating', 'rating');
add('price', 'sc_price', { badge: 'Buy More Save More', show_compare: true });
add('highlights', 'sc_highlights', { line_1: '✨ Smooth All Over, Instantly', line_2: '💦 Bathroom Breaks Made Easy', line_3: '🤍 Held In, Never Squeezed' });
add('variant_picker', 'variant_picker');
// Find my size as getionix.com, with the bodysuit's own chart (shape-curve.com: weight, US, bust / waist / hip). That chart
// has no heights, so the Height field stays hidden until a Height column is added (no invented numbers).
add('fit', 'sc_fit', {
  button_label: 'Find my size', option_name: 'Size', units: 'us', eyebrow: '', title: 'Find your size',
  subtitle: 'One number you already know. No tape measure.',
  chart_label: 'See the full size chart', chart_open: true,
  chart: ['Size | Weight | US size', 'XS | 95-110 | 0', 'S | 110-125 | 2-4', 'M | 125-140 | 6-8', 'L | 140-160 | 10-12', 'XL | 160-180 | 14-16', '2XL | 180-205 | 18-20', '3XL | 205-240 | 22-24'].join('\n'),
  note: 'Every body is different. If you land between two sizes, we’ll show you both.',
  chart2_label: 'Body measurements', chart2_note: 'Measured on the body, not the garment. Handy when you land between two sizes.',
  chart2: ['Size | Bust (in) | Waist (in) | Hip (in)', 'XS | 32-34 | 25-27 | 35-37', 'S | 35-37 | 28-30 | 38-40', 'M | 38-40 | 31-33 | 41-43', 'L | 41-43 | 34-36 | 44-46', 'XL | 44-46 | 37-39 | 47-49', '2XL | 47-49 | 40-42 | 50-52', '3XL | 50-52 | 43-45 | 53-55'].join('\n'),
  proof_strong: '12,000+ customers', proof_text: 'have found their fit',
});
add('kaching', 'kaching', {
  heading: 'BUY MORE - SAVE MORE', selected: 2, save_style: 'percent',
  accent: HL, price_color: '#000000', bar_bg: '#F8F2F5', selected_bg: '#FFFFFF', title_color: '#000000', badge_text_color: '#FFFFFF',
  pack1_qty: 1, pack1_title: 'Buy 1', pack1_subtitle: 'Standard price', pack1_badge: '',
  pack2_qty: 2, pack2_title: 'Buy 2-Better Deal Unlocked', pack2_subtitle: '{each} Each', pack2_badge: 'Flash Sale⚡',
  pack3_qty: 3, pack3_title: 'Buy 3-Maximum Savings', pack3_subtitle: '{each} Each', pack3_badge: 'Free Shipping🚚',
  pack4_qty: 0, pack4_title: '', pack4_subtitle: '', pack4_badge: '',
});
add('buy_buttons', 'buy_buttons');
add('ship', 'sc_ship', {
  title: 'Free Shipping Over $79', note: '*Same-Day Shipping— for Orders Before 12pm PST', item_1: 'Secure Checkout', item_2: 'Easy Returns',
});
add('tabs', 'sc_tabs', {
  tab_1_title: 'Shipping & Return',
  tab_1_body: '<p><strong>Shipping Policy</strong></p><p>We offer <strong>FREE</strong> worldwide shipping for <strong>orders over $79 USD.</strong> For in-stock items, your order will be processed and <strong>shipped within 3-5 business days</strong> after order verification, depending on the shipping method you select. Depending on your location, delivery typically takes approximately <strong>7-14 business days.</strong> You can track your order directly from the "<strong>Track My Order</strong>" menu.</p><p><strong>Return/Exchange Policy</strong></p><p>If you\'re not satisfied with your purchase, you may return them for a <strong>refund within 30 days of delivery.</strong></p>',
  tab_2_title: 'Care Guide',
  tab_2_body: '<p><strong>Hand Wash or Use a Delicate Cycle:</strong> To keep our products looking great, handle them with care. Hand washing is the gentlest method, but if you use a washing machine, be sure to use the delicate cycle.</p><p><strong>Use Mild Detergent:</strong> Gentle detergents are best for our delicate fabrics. Avoid using fabric softeners and bleach, as they can damage the material.</p><p><strong>Air Dry:</strong> After washing, avoid the dryer. Instead, lay your product flat or hang it to air dry. Keep it out of direct sunlight to prevent fading.</p><p><strong>Store Carefully:</strong> To avoid stretching, fold your product neatly and store it in a drawer or hang it up. Keep it out of direct sunlight and humid places.</p><p><strong>Replace When Necessary:</strong> Our products are designed to support and contour your body, but over time, they might lose some elasticity. Replace your item when it doesn\'t provide the same support or shows signs of wear.</p>',
  tab_3_title: '', tab_3_body: '',
  chart_title: 'Size Chart',
  chart: ['Size | US | Bust (in) | Waist (in) | Hip (in) | Weight (lbs)', 'XS | 0 | 32–34 | 25–27 | 35–37 | 95–110', 'S | 2–4 | 35–37 | 28–30 | 38–40 | 110–125',
    'M | 6–8 | 38–40 | 31–33 | 41–43 | 125–140', 'L | 10–12 | 41–43 | 34–36 | 44–46 | 140–160', 'XL | 14–16 | 44–46 | 37–39 | 47–49 | 160–180',
    '2XL | 18–20 | 47–49 | 40–42 | 50–52 | 180–205', '3XL | 22–24 | 50–52 | 43–45 | 53–55 | 205–240'].join('\n'),
  chart_note: '',
});

const card = (img, tag, heading, body) => ({ type: 'card', settings: { image: '', default_image: IMG + img, tag, heading, body } });
const item = (img, title, text) => ({ type: 'item', settings: { image: '', default_image: IMG + img, title, text } });
const quote = (img, name, text) => ({ type: 'quote', settings: { image: '', default_image: IMG + img, name, verified: true, rating: 5, text } });
const trust = (icon, title, text) => ({ type: 'item', settings: { icon, image: '', title, text } });
const withBlocks = (type, settings, list) => {
  const b = {}; const o = [];
  list.forEach((x, i) => { const id = x.type + '_' + (i + 1); b[id] = x; o.push(id); });
  return { type, settings, blocks: b, blockOrder: o };
};

const sections = {
  product: {
    type: 'product',
    settings: {
      skin: 'shapecurve', skin_highlight: HL, buy_now_label: 'Express checkout now',
      show_rating: true, show_variants: true, show_description: false, show_trust: false,
      show_size_finder: false,
    },
    blocks,
    blockOrder: order,
  },
  features: withBlocks('sc-features', { bg: BAND, highlight: HL, pad_top: 50, pad_bottom: 10 }, [
    card('0806.webp', 'Easy-Slide Drop Seat', 'Bathroom Breaks, Made Easy', '<p>No more struggling with your shapewear. The easy-slide drop seat design makes <strong>bathroom breaks quicker and more convenient</strong>, so you can stay shaped, supported, and comfortable throughout the day.</p>'),
    card('0806-2.webp', 'Full-Body Sculpting Fit', 'Sleek From Every Angle', '<p>Designed to <strong>shape the waist, tummy, hips, and thighs</strong>, this bodysuit creates a smoother line under clothes. It helps your favorite dresses, pants, and fitted outfits look cleaner and more flattering.</p>'),
    card('3_zone_compression.webp', 'Zoned Smart Compression', 'Smooth Where It Matters', '<p>Different compression levels target different areas, <strong>giving your body the right support where it needs it most.</strong> It helps smooth bumps, refine your shape, and create a more confident, sculpted look.</p>'),
    card('fabric_b9f16534-5521-4906-91b3-33c7b30bb3a7.webp', 'Seamless Stretch Fabric', 'Held In, Not Held Back', '<p>Made with flexible, skin-friendly fabric, this shapewear moves with your body while maintaining a smooth fit. Enjoy <strong>breathable comfort and confident support</strong> whether you’re dressing up or wearing it daily.</p>'),
  ]),
  details: withBlocks('sc-details', {
    heading: 'Crafted In Every Detail', image: '', default_image: IMG + 'model_a2dd1128-20e3-4f0b-a45f-2be6713e6296.webp',
    bg: BAND, highlight: HL, pad_top: 20, pad_bottom: 20,
  }, [
    item('bust.webp', 'Wavy Bust Lifting Band', 'Gently lifts and supports the bust for a naturally fuller, more flattering shape.'),
    item('easy_off.webp', 'Drop-Seat Design', 'Makes bathroom breaks easier without having to fully remove your shapewear.'),
    item('butt.webp', 'Wavy Hip-Shaping Band', 'Helps lift and contour the hips for a smoother, more sculpted curve.'),
    item('fabric1.webp', 'Stretchy Skin-Friendly Fabric', 'Feels soft, breathable, and flexible for comfortable all-day wear.'),
  ]),
  testimonials: withBlocks('sc-testimonials', {
    heading: 'Loved By 12,000+ Ladies Worldwide', button_label: 'View All', button_link: '#lu-reviews', star: '#F5A623',
    bg: BAND, highlight: HL, pad_top: 20, pad_bottom: 20,
  }, [
    quote('sha58_buyer_2.webp', 'Samantha R.', 'Wow, this bodysuit really surprised me. It smooths my tummy and thighs nicely, but still feels breathable enough to wear for hours.'),
    quote('sha58_buyer_4.webp', 'Kayla M.', 'Honestly, I love this shapewear. The drop-seat design is such a relief, and I didn’t have to fight with it in the restroom.'),
    quote('sha58_buyer_3.webp', 'Brianna Hayes', 'Oh my gosh, this body shaper gives such a clean look under dresses. It holds me in without feeling stiff or painful.'),
    quote('sha58_buyer_1.webp', 'Danielle P.', 'So happy with this bodysuit. The compression feels smart, not harsh, and my waist, hips, and thighs look smoother right away.'),
  ]),
  trust: withBlocks('sc-trust', { bg: BAND, highlight: HL, pad_top: 20, pad_bottom: 35 }, [
    trust('truck', 'Free Shipping', '<p>Enjoy free shipping on all orders over $79 USD</p>'),
    trust('money', '100% Money Back', '<p>Free returns within the first 30 days after purchasing</p>'),
    trust('card', 'Secure Checkout', '<p>Payment from the most popular &amp; secure payment methods</p>'),
    trust('support', '24/7 Live Support', '<p>Reach out to our support team via email: <strong>{{CompanyEmail}}</strong></p>'),
  ]),
  reviews: { type: 'reviews', settings: { show_write: false, star_color: '#F9C40F' } },
  related: { type: 'related', settings: { heading: 'You Will Also Love' } },
};
write('templates/product.shapecurve.json', {
  name: 'Shapecurve – Drop-seat bodysuit',
  description: 'Shapecurve bodysuit page in Lunara: picture colour tiles + size pills, Find My Size, Buy 1 / 2 / 3 packs, Express checkout, shipping box, info rows, feature cards, details, photo testimonials, trust badges, reviews, related products. Highlight #790236, Poppins.',
  sections,
  order: ['product', 'features', 'details', 'testimonials', 'trust', 'reviews', 'related'],
});
