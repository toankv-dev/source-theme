#!/usr/bin/env node
/*
 * Template "Triple-Zone Drop-Seat Bodysuit" (templates/product.triple-zone-bodysuit.json), from
 * https://shape-curve.com/products/triple-zone-compression-drop-seat-full-body-shaping-bodysuit (downloaded 2026-11-19).
 * Writes every JSON of the template; run again after editing, it replaces only what it owns:
 *   sections/product.schema.json   + settings skin / skin_highlight / buy_now_label, + blocks sc_price, sc_highlights,
 *                                   sc_ship, sc_tabs (other settings / blocks untouched)
 *   sections/reviews.schema.json   + show_write (default on = old templates unchanged)
 *   sections/sc-*.schema.json      the 4 content sections + sc-reviews (Okendo-style reviews, user 2026-11-19)
 *   templates/product.triple-zone-bodysuit.json
 * Fonts: the theme's Poppins (user's choice). Highlight: #790236 (user's choice) and tints of it.
 *
 *   node themes/lunara---vesnacharm/_src/build-sc.js
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
const OWN_SETTINGS = ['sc_header', 'skin', 'skin_highlight', 'buy_now_label', 'vn_safe_show', 'vn_safe_before', 'vn_safe_em', 'vn_safe_after', 'vn_eta_show', 'vn_eta_min', 'vn_eta_max', 'vn_eta_text', 'vn_guarantee_show', 'vn_guarantee_text', 'vn_guarantee_link_label', 'vn_guarantee_link'];
product.settings = product.settings.filter((s) => !OWN_SETTINGS.includes(s.id) && s.content !== 'Template look' && s.content !== 'Under the buttons (bodysuit look)');
product.settings.push(
  { type: 'header', content: 'Template look' },
  {
    type: 'select', id: 'skin', label: 'Look of this product section', default: 'lunara',
    options: [{ value: 'lunara', label: 'Lunara (default)' }, { value: 'shapecurve', label: 'Bodysuit (picture colour tiles, size pills, soft cards)' }],
    info: 'Bodysuit loads assets/css/sc-product.css and assets/js/sc-product.js for this section only.'
  },
  { type: 'color', id: 'skin_highlight', label: 'Bodysuit look: highlight colour', default: HL, info: 'Radio, selected pack frame, badges, Find My Size, tinted backgrounds.' },
  { type: 'text', id: 'buy_now_label', label: 'Second button (straight to checkout)', default: '', info: 'e.g. Express checkout now. Empty = no second button. Adds the same items as Add to cart, then opens the checkout.' },
  // Under the Add to cart of the bodysuit look (snippets/sc-trustbox.hbs; user 2026-11-19, as tammycharm.com)
  { type: 'header', content: 'Under the buttons (bodysuit look)' },
  { type: 'checkbox', id: 'vn_safe_show', label: 'Show the "Guaranteed safe checkout" box', default: true, info: 'The payment icons under a heading; the middle word in the main colour.' },
  { type: 'text', id: 'vn_safe_before', label: 'Heading: first words', default: 'Guaranteed' },
  { type: 'text', id: 'vn_safe_em', label: 'Heading: highlighted word', default: 'safe' },
  { type: 'text', id: 'vn_safe_after', label: 'Heading: last words', default: 'checkout' },
  { type: 'checkbox', id: 'vn_eta_show', label: 'Show the delivery estimate', default: true },
  { type: 'number', id: 'vn_eta_min', label: 'Delivery: from (days after today)', default: 7 },
  { type: 'number', id: 'vn_eta_max', label: 'Delivery: to (days after today)', default: 15 },
  { type: 'text', id: 'vn_eta_text', label: 'Delivery line', default: 'Order today, get it between {from} and {to}', info: '{from} / {to} = today + the days above, in bold (e.g. Thu, Nov 26), in the shopper\'s own date.' },
  { type: 'checkbox', id: 'vn_guarantee_show', label: 'Show the guarantee line', default: true },
  { type: 'text', id: 'vn_guarantee_text', label: 'Guarantee line', default: '45-day money-back guarantee.' },
  { type: 'text', id: 'vn_guarantee_link_label', label: 'Guarantee link text', default: 'Read the policy' },
  { type: 'text', id: 'vn_guarantee_link', label: 'Guarantee link', default: '', info: 'Empty = the store\'s refund policy.' }
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
      { type: 'select', id: 'style', label: 'Look', default: 'check', options: [{ value: 'check', label: 'Check list (round check icon, highlight colour)' }, { value: 'box', label: 'Grey box (an emoji at the start of a line is its icon)' }] },
      { type: 'paragraph', content: 'Up to 5 short lines. In the check list an emoji at the start of a line is left out.' },
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
    type: 'sc_fit', name: 'Find my size',
    settings: [
      { type: 'paragraph', content: 'A button that opens a size recommender (as shape-curve.com): Weight (required) and Bust / Waist / Hips (optional) in in / lbs or cm / kg; "Find My Size" shows the size (with measurements: the one that fits the largest), "Select M" sets it in the main picker and every pack row; the complete size chart below. Works in any product template.' },
      { type: 'text', id: 'button_label', label: 'Button', default: 'Find my size' },
      { type: 'text', id: 'option_name', label: 'Size option name', default: 'Size', info: 'The option the result picks; when no option has this name, the one whose values match the chart sizes. A value like "M (125-140 lbs)" matches the chart size "M"; XXL = 2XL.' },
      { type: 'select', id: 'units', label: 'Units shown first', default: 'us', options: [{ value: 'us', label: 'in / lbs' }, { value: 'metric', label: 'cm / kg' }] },
      { type: 'header', content: 'Pop-up' },
      { type: 'text', id: 'rec_eyebrow', label: 'Small line on top', default: 'Size recommender' },
      { type: 'text', id: 'rec_title', label: 'Title', default: 'Find Your Best Size' },
      { type: 'text', id: 'rec_required', label: 'Line under the title: bold part', default: 'Weight is required.' },
      { type: 'text', id: 'rec_optional', label: 'Line under the title: rest', default: 'Other measurements are optional.' },
      { type: 'text', id: 'rec_weight', label: 'Weight label', default: 'Weight' },
      { type: 'text', id: 'rec_bust', label: 'Bust label', default: 'Bust', info: 'Shown when the chart has a Bust column; Waist and Hips the same.' },
      { type: 'text', id: 'rec_waist', label: 'Waist label', default: 'Waist' },
      { type: 'text', id: 'rec_hips', label: 'Hips label', default: 'Hips' },
      { type: 'text', id: 'rec_badge_req', label: '"Required"', default: 'Required' },
      { type: 'text', id: 'rec_badge_opt', label: '"Optional"', default: 'Optional' },
      { type: 'text', id: 'rec_button', label: 'Button in the pop-up', default: 'Find My Size' },
      { type: 'text', id: 'rec_error', label: 'No weight typed', default: 'Enter your weight to find your size.' },
      { type: 'header', content: 'Result' },
      { type: 'text', id: 'rec_kicker', label: 'Small title', default: 'Your recommended size' },
      { type: 'text', id: 'rec_l_one', label: 'Line: one size', default: '{size} fits your {measures}.', info: '{size} = the size, {measures} = what was typed (weight, bust …).' },
      { type: 'text', id: 'rec_l_two', label: 'Line: between two sizes', default: 'You land between {a} and {b}: {a} fits snug, {b} gives more room.', info: 'Weight only, on the line between two sizes. {a} = the smaller, {b} = the larger.' },
      { type: 'text', id: 'rec_l_edge', label: 'Line: outside the chart', default: 'Your {measure} is outside our chart, so {size} is the closest size.' },
      { type: 'text', id: 'rec_select', label: 'Pick button', default: 'Select {size}' },
      { type: 'header', content: 'Size chart' },
      { type: 'text', id: 'rec_chart_eyebrow', label: 'Small line', default: 'Body measurements' },
      { type: 'text', id: 'rec_chart_title', label: 'Title', default: 'Complete Size Chart' },
      { type: 'text', id: 'rec_swipe', label: 'Hint on the right', default: 'Swipe to view' },
      { type: 'textarea', id: 'rec_chart', label: 'Chart', default: ['Size | US | Bust (in) | Waist (in) | Hip (in) | Weight (lbs)', 'XS | 0 | 32-34 | 25-27 | 35-37 | 95-110', 'S | 2-4 | 35-37 | 28-30 | 38-40 | 110-125', 'M | 6-8 | 38-40 | 31-33 | 41-43 | 125-140', 'L | 10-12 | 41-43 | 34-36 | 44-46 | 140-160', 'XL | 14-16 | 44-46 | 37-39 | 47-49 | 160-180', '2XL | 18-20 | 47-49 | 40-42 | 50-52 | 180-205', '3XL | 22-24 | 50-52 | 43-45 | 53-55 | 205-240'].join('\n'), info: 'First line = column names, then one size per line; cells split by |. Columns named Weight (lbs), Bust / Waist / Hip (in) drive the finder; any other column (e.g. US) is shown as typed. cm / kg converts them.' },
    ],
  }
);
// Lunara's show_variants: say what it does in the bodysuit look (the setting itself is Lunara's)
const sv = product.settings.find((s) => s.id === 'show_variants');
if (sv) sv.info = 'With a Kaching bundle block every item gets its own Color / Size pickers inside the selected pack. Bodysuit look: unchecked also hides the Color / Size picker above the packs.';
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

// Customer videos (user 2026-11-19: "many videos, as 'Don't just take our word for it. See them in motion.' on
// tammycharm.com"); replaces the photo testimonials on the bodysuit page. Clips without a video are left out of the store.
write('sections/sc-reels.schema.json', {
  name: 'Customer videos',
  tag: 'section',
  max_blocks: 12,
  settings: [
    { type: 'paragraph', content: 'Portrait 9:16 videos side by side (swipe on phones). Each one plays muted and looped while on screen; "Sound" turns its sound on; a tap pauses it. Videos without a file are not shown on the store; with none, the whole band is hidden.' },
    { type: 'text', id: 'eyebrow', label: 'Small line above', default: 'Caught on camera', info: 'Empty = none.' },
    { type: 'text', id: 'heading', label: 'Heading', default: 'Don\'t just take our word for it.' },
    { type: 'text', id: 'heading_em', label: 'Heading, second line (italic, accent colour)', default: 'See them in motion.' },
    { type: 'text', id: 'subheading', label: 'Line under the heading', default: 'Short videos from our customers, in their own words.' },
    { type: 'text', id: 'sound_label', label: 'Sound button', default: 'Sound' },
    { type: 'select', id: 'mobile_layout', label: 'On phones', default: 'peek', options: [
      { value: 'peek', label: 'Next video peeks in (as tammycharm.com)' },
      { value: 'one', label: 'One video per screen' },
    ] },
    { type: 'color', id: 'bg', label: 'Background', default: '', info: 'Empty = the main colour, darkened.' },
    { type: 'color', id: 'accent', label: 'Accent (second line, dots, Sound on)', default: '#F1C6D6' },
    { type: 'range', id: 'pad_top', label: 'Space above', min: 0, max: 100, step: 4, unit: 'px', default: 56 },
    { type: 'range', id: 'pad_bottom', label: 'Space below', min: 0, max: 100, step: 4, unit: 'px', default: 64 },
  ],
  blocks: [{
    type: 'clip', name: 'Video',
    settings: [
      { type: 'image_picker', id: 'video', label: 'Video (MP4 / WebM)', info: 'Upload the file in the media picker. Portrait 9:16 (e.g. 720 x 1280) looks best; short clips (under 20 s, a few MB) load fast. YouTube / Vimeo links are not supported.' },
      { type: 'image_picker', id: 'poster', label: 'Cover picture (optional)', info: 'Shown until the video starts.' },
      { type: 'text', id: 'name', label: 'Name (optional)', default: '', info: 'Shown at the bottom of the video.' },
      { type: 'text', id: 'caption', label: 'Line under the name (optional)', default: '' },
      { type: 'text', id: 'alt', label: 'Description for screen readers', default: '' },
      { type: 'text', id: 'default_video', label: 'Theme file while empty', default: '', info: 'Path inside assets/, e.g. videos/clip.mp4. Played until a file is picked above.' },
    ],
  }],
  // 6 empty Video slots on "Add section", so the editor shows where to upload (a band with no slot would be empty)
  presets: [{ name: 'Customer videos', category: 'Reviews', description: 'A dark band with portrait videos side by side: play muted on screen, Sound button, swipe on phones (as tammycharm.com).', blocks: [1, 2, 3, 4, 5, 6].map(() => ({ type: 'clip' })) }],
});

write('sections/sc-reviews.schema.json', {
  name: 'Reviews (Okendo style)',
  tag: 'section',
  limit: 1,
  settings: [
    { type: 'paragraph', content: 'The product\'s published reviews: average, star bars (tap one to filter), customer photos, Filters, Sort, the list with Read More and numbered pages. "Write a review" opens a form; what shoppers send waits in the product\'s Reviews tab (admin) until you publish it.' },
    { type: 'text', id: 'heading', label: 'Heading', default: '', info: 'Empty = no heading (as the original).' },
    { type: 'text', id: 'based_label', label: '"Based on"', default: 'Based on' },
    { type: 'text', id: 'reviews_label', label: '"reviews"', default: 'reviews' },
    { type: 'checkbox', id: 'show_recommend', label: 'Show the "would recommend" share', default: true, info: 'The share of 4- and 5-star reviews (the platform has no separate "would recommend" answer).' },
    { type: 'text', id: 'recommend_label', label: 'Text after the share', default: 'would recommend these products' },
    { type: 'checkbox', id: 'show_photos', label: 'Show the customer photo strip', default: true },
    { type: 'text', id: 'filters_label', label: 'Filters button', default: 'Filters' },
    { type: 'text', id: 'sort_label', label: '"Sort"', default: 'Sort' },
    { type: 'text', id: 'verified_label', label: 'Verified line', default: 'Verified Buyer' },
    { type: 'text', id: 'read_more_label', label: '"Read More"', default: 'Read More' },
    { type: 'text', id: 'read_less_label', label: '"Read Less"', default: 'Read Less' },
    { type: 'range', id: 'page_size', label: 'Reviews per page', min: 3, max: 10, step: 1, default: 5 },
    // Write a review (user 2026-11-19, as tammycharm.com): a form in a pop-up, sent to the platform as a pending review.
    // New ids, on by default: the button also shows on a template saved before.
    { type: 'header', content: 'Write a review' },
    { type: 'checkbox', id: 'write_show', label: 'Show the "Write a review" button', default: true, info: 'Sent reviews are not shown until you publish them in the product\'s Reviews tab. One photo, up to 5 MB; at most 5 reviews an hour from one visitor.' },
    { type: 'text', id: 'write_label', label: 'Button', default: 'Write a review' },
    { type: 'text', id: 'write_title', label: 'Form heading', default: 'Write a review' },
    { type: 'checkbox', id: 'write_email', label: 'Ask for the email', default: true, info: 'Optional field, as on tammycharm.com. The platform does not store it yet.' },
    { type: 'checkbox', id: 'write_photo', label: 'Let shoppers add a photo', default: true },
    { type: 'checkbox', id: 'write_recommend', label: 'Show "I recommend this product"', default: true, info: 'The platform does not store the answer yet.' },
    { type: 'text', id: 'write_submit', label: 'Send button', default: 'Submit review' },
    { type: 'textarea', id: 'write_thanks', label: 'Thank-you message', default: 'Your review will appear here once it has been checked.' },
    { type: 'color', id: 'star_color', label: 'Star colour', default: '#ffcf2a' },
    { type: 'range', id: 'pad_top', label: 'Space above', min: 0, max: 100, step: 5, unit: 'px', default: 40 },
    { type: 'range', id: 'pad_bottom', label: 'Space below', min: 0, max: 100, step: 5, unit: 'px', default: 50 },
  ],
  presets: [{ name: 'Reviews (Okendo style)', category: 'Reviews', description: 'Average, star bars, customer photos, filters, sort and the review list, as shape-curve.com.' }],
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
// Find my size as shape-curve.com's size recommender, with the bodysuit's chart (weight, US, bust / waist / hip)
add('fit', 'sc_fit', {
  button_label: 'Find my size', option_name: 'Size', units: 'us',
  rec_eyebrow: 'Size recommender', rec_title: 'Find Your Best Size', rec_required: 'Weight is required.', rec_optional: 'Other measurements are optional.',
  rec_button: 'Find My Size', rec_kicker: 'Your recommended size', rec_chart_eyebrow: 'Body measurements', rec_chart_title: 'Complete Size Chart',
  rec_chart: ['Size | US | Bust (in) | Waist (in) | Hip (in) | Weight (lbs)', 'XS | 0 | 32-34 | 25-27 | 35-37 | 95-110', 'S | 2-4 | 35-37 | 28-30 | 38-40 | 110-125', 'M | 6-8 | 38-40 | 31-33 | 41-43 | 125-140', 'L | 10-12 | 41-43 | 34-36 | 44-46 | 140-160', 'XL | 14-16 | 44-46 | 37-39 | 47-49 | 160-180', '2XL | 18-20 | 47-49 | 40-42 | 50-52 | 180-205', '3XL | 22-24 | 50-52 | 43-45 | 53-55 | 205-240'].join('\n'),
});
add('kaching', 'kaching', {
  heading: 'BUY MORE - SAVE MORE', selected: 2, save_style: 'compare_pct', // "SAVE xx%" vs the compare-at price, after the title (user 2026-11-19)
  accent: HL, price_color: '#000000', bar_bg: '#F8F2F5', selected_bg: '#FFFFFF', title_color: '#000000', badge_text_color: '#FFFFFF',
  pack1_qty: 1, pack1_title: 'Buy 1', pack1_subtitle: 'SAVE {save}', pack1_badge: '',
  pack2_qty: 2, pack2_title: 'Buy 2-Better Deal Unlocked', pack2_subtitle: 'SAVE {save} {each} Each', pack2_badge: 'Flash Sale⚡',
  pack3_qty: 3, pack3_title: 'Buy 3-Maximum Savings', pack3_subtitle: 'SAVE {save} {each} Each', pack3_badge: 'Free Shipping🚚',
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
      skin: 'shapecurve', skin_highlight: HL, buy_now_label: '', // no second button (user 2026-11-19)
      show_rating: true, show_variants: false, show_description: false, show_trust: false, // no main picker: each pack row has its own (user 2026-11-19)
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
  testimonials: { disabled: true, ...withBlocks('sc-testimonials', {
    heading: 'Loved By 12,000+ Ladies Worldwide', button_label: 'View All', button_link: '#lu-reviews', star: '#F5A623',
    bg: BAND, highlight: HL, pad_top: 20, pad_bottom: 20,
  }, [
    quote('sha58_buyer_2.webp', 'Samantha R.', 'Wow, this bodysuit really surprised me. It smooths my tummy and thighs nicely, but still feels breathable enough to wear for hours.'),
    quote('sha58_buyer_4.webp', 'Kayla M.', 'Honestly, I love this shapewear. The drop-seat design is such a relief, and I didn’t have to fight with it in the restroom.'),
    quote('sha58_buyer_3.webp', 'Brianna Hayes', 'Oh my gosh, this body shaper gives such a clean look under dresses. It holds me in without feeling stiff or painful.'),
    quote('sha58_buyer_1.webp', 'Danielle P.', 'So happy with this bodysuit. The compression feels smart, not harsh, and my waist, hips, and thighs look smoother right away.'),
  ]) },
  // Customer videos in place of the photo testimonials (user 2026-11-19); 6 empty slots to fill in the editor.
  reels: withBlocks('sc-reels', {
    eyebrow: 'Caught on camera', heading: 'Don\'t just take our word for it.', heading_em: 'See them in motion.',
    subheading: 'Short videos from our customers, in their own words.', sound_label: 'Sound', mobile_layout: 'peek',
    bg: '', accent: '#F1C6D6', pad_top: 56, pad_bottom: 64,
  }, [1, 2, 3, 4, 5, 6].map(() => ({ type: 'clip', settings: { video: '', poster: '', name: '', caption: '', alt: '', default_video: '' } }))),
  trust: withBlocks('sc-trust', { bg: BAND, highlight: HL, pad_top: 20, pad_bottom: 35 }, [
    trust('truck', 'Free Shipping', '<p>Enjoy free shipping on all orders over $79 USD</p>'),
    trust('money', '100% Money Back', '<p>Free returns within the first 30 days after purchasing</p>'),
    trust('card', 'Secure Checkout', '<p>Payment from the most popular &amp; secure payment methods</p>'),
    trust('support', '24/7 Live Support', '<p>Reach out to our support team via email: <strong>{{CompanyEmail}}</strong></p>'),
  ]),
  // Okendo-style reviews of the original (user 2026-11-19); no review form (reviews are added in the admin)
  reviews: { type: 'sc-reviews', settings: { heading: '', show_recommend: true, show_photos: true, page_size: 5, star_color: '#ffcf2a', pad_top: 40, pad_bottom: 50 } },
  related: { type: 'related', settings: { heading: 'You Will Also Love', show_quick_add: false } }, // the original's cards have no button
};
write('templates/product.triple-zone-bodysuit.json', {
  name: 'Triple-Zone Drop-Seat Bodysuit',
  description: 'Triple-Zone Compression Drop-Seat bodysuit page: picture colour tiles + size pills, Find My Size, Buy 1 / 2 / 3 packs, shipping box, info rows, feature cards, details, customer videos, trust badges, reviews, related products. Highlight #790236, Poppins.',
  sections,
  // the photo testimonials stay, hidden (disabled), right after the videos: the editor's eye icon brings them back
  order: ['product', 'features', 'details', 'reels', 'testimonials', 'trust', 'reviews', 'related'],
});
