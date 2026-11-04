#!/usr/bin/env node
// Writes base-theme/config/settings_schema.json and settings_data.json (current = every default).
// Run again after editing the groups below: node tools/scripts/build-base-settings.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'base-theme', 'config');

const C = (id, label, def, info) => ({ type: 'color', id, label, default: def, ...(info ? { info } : {}) });
const T = (id, label, def, info) => ({ type: 'text', id, label, default: def, ...(info ? { info } : {}) });
const B = (id, label, def, info) => ({ type: 'checkbox', id, label, default: def, ...(info ? { info } : {}) });
const S = (id, label, def, opts) => ({ type: 'select', id, label, default: def, options: opts.map((o) => ({ value: o[0], label: o[1] })) });
const N = (id, label, def, info) => ({ type: 'number', id, label, default: def, ...(info ? { info } : {}) });
const R = (id, label, min, max, step, def, unit) => ({ type: 'range', id, label, min, max, step, default: def, ...(unit ? { unit } : {}) });
const I = (id, label) => ({ type: 'image_picker', id, label });
const U = (id, label) => ({ type: 'url', id, label });
const TA = (id, label, def, info) => ({ type: 'textarea', id, label, default: def, ...(info ? { info } : {}) });
const RT = (id, label, def) => ({ type: 'richtext', id, label, default: def });
const H = (content) => ({ type: 'header', content });
const P = (content) => ({ type: 'paragraph', content });

const FAQ = [
  ['How long does shipping take?', '<p>Orders are processed within 1–3 business days, then delivered in 5–10 business days. See our <a href="{{ShippingLink}}">Shipping Policy</a>.</p>'],
  ['How can I track my order?', '<p>As soon as your package ships we email you a tracking number. You can also check any time on the <a href="{{TrackOrderLink}}">Track your order</a> page.</p>'],
  ['Can I change or cancel my order?', '<p>Yes, within 12 hours of purchase. Email {{CompanyEmail}} with your order number.</p>'],
  ['What is your return and refund policy?', '<p>You have 30 days from delivery to return an item. See our <a href="{{RefundLink}}">Refund Policy</a>.</p>'],
  ["My item arrived damaged or isn't what I ordered", '<p>We are sorry! <a href="{{ContactLink}}">Contact us</a> with a photo and we will make it right.</p>'],
  ['How can I reach customer support?', '<p>Email {{CompanyEmail}} — we reply within one business day.</p>'],
];

const schema = [
  { name: 'Colors', settings: [
    C('primary', 'Primary (buttons, accents)', '#14203b'), C('primary_text', 'Text on primary', '#ffffff'), C('accent', 'Accent', '#14203b'),
    C('text_color', 'Body text', '#15171c'), C('page_bg', 'Page background', '#ffffff'),
    C('check', 'Check marks / success', '#1fa463'), C('badge', 'Badges', '#3b9dea'), C('sale', 'Sale price / discount', '#e0392b'),
    C('alert', 'Alerts', '#e0392b'), C('star', 'Stars', '#17b26a'),
    H('Header & footer'), C('header_bg', 'Header background', '#ffffff'), C('header_text', 'Header text', '#15171c'),
    C('footer_bg', 'Footer background', '#14203b'), C('footer_text', 'Footer text', '#ffffff'),
    H('Checkout'), C('checkout_bg', 'Checkout background', '#f7f7f7'),
  ] },
  { name: 'Typography & shape', settings: [
    T('font', 'Body font (Google Fonts name)', 'Manrope', 'Exact family name, e.g. Poppins, Inter, Montserrat, DM Sans.'),
    T('font_heading', 'Heading font (optional)', '', 'Empty = same as the body font.'),
    T('font_weights', 'Google Fonts weights', '400;500;600;700;800', 'Only weights the font really has (e.g. Crimson Text: 400;600;700), else Google returns nothing.'),
    B('load_google_fonts', 'Load the fonts from Google Fonts', true, 'Off when the theme ships its own font files (@font-face in skin.css).'),
    R('radius', 'Corner radius (cards, images)', 0, 24, 1, 12, 'px'), R('btn_radius', 'Button corner radius', 0, 40, 1, 8, 'px'),
    S('btn_case', 'Button text', 'uppercase', [['uppercase', 'UPPERCASE'], ['none', 'As typed'], ['capitalize', 'Capitalize']]),
    R('page_width', 'Page width', 960, 1600, 20, 1200, 'px'),
  ] },
  { name: 'Top bar', settings: [
    B('show_topbar', 'Show the top bar', true),
    S('topbar_style', 'Style', 'rotate', [['rotate', 'Rotating messages'], ['countdown', 'Sale countdown']]),
    T('topbar_text', 'Messages (separate with ||)', 'Free shipping on every order || 30-day money-back guarantee'),
    B('topbar_autoplay', 'Rotate automatically', true),
    C('topbar_bg', 'Background', '#14203b'), C('topbar_color', 'Text', '#ffffff'),
    H('Countdown'), T('countdown_title', 'Title', 'FLASH SALE'), T('countdown_subtitle', 'Subtitle', 'Up to 50% off – today only'),
    N('countdown_hours', 'Restart every (hours)', 2, 'The timer counts down and restarts for each visitor.'),
  ] },
  { name: 'Header', settings: [
    B('sticky_header', 'Sticky header', true),
    S('logo_position', 'Logo position (desktop)', 'left', [['left', 'Left'], ['center', 'Center']]),
    R('logo_height', 'Logo height', 20, 90, 2, 40, 'px'),
    B('show_search', 'Show search', true), B('show_account', 'Show orders link', true),
    B('show_track_link', 'Show Track order in the menu', true), B('nav_collections', 'Show collections in the menu', false), B('nav_show_shop', 'Show the Shop link in the menu', true),
    T('nav_home_label', 'Menu: Home label', 'Home'), T('nav_shop_label', 'Menu: Shop label', 'Shop'),
    T('nav_contact_label', 'Menu: Contact label', 'Contact'), T('nav_track_label', 'Menu: Track label', 'Track order'),
  ] },
  { name: 'Footer', settings: [
    TA('footer_about', 'About text', ''), T('footer_links_title', 'Links column title', 'Customer care'),
    B('footer_collections', 'Show a collections column', false), B('footer_payment', 'Show payment icons', true),
    T('support_hours', 'Support hours', 'Monday – Friday, 9 AM – 5 PM'),
    H('Newsletter'), B('footer_newsletter', 'Show newsletter in the footer', true),
    T('newsletter_heading', 'Heading', 'Join our newsletter'), TA('newsletter_text', 'Text', 'Offers, new arrivals and tips. No spam.'),
    T('newsletter_placeholder', 'Placeholder', 'Your email'), T('newsletter_button', 'Button', 'Subscribe'),
    H('Social links'), U('social_facebook', 'Facebook'), U('social_instagram', 'Instagram'), U('social_tiktok', 'TikTok'), U('social_youtube', 'YouTube'),
  ] },
  { name: 'Payment icons', settings: [
    P('Methods the platform checkout processes; switch off the ones you do not offer.'),
    B('pay_visa', 'Visa', true), B('pay_mastercard', 'Mastercard', true), B('pay_amex', 'American Express', true), B('pay_discover', 'Discover', true),
    B('pay_applepay', 'Apple Pay', true), B('pay_googlepay', 'Google Pay', true), B('pay_paypal', 'PayPal', true),
  ] },
  { name: 'Product & cards', settings: [
    T('atc_label', 'Add to cart label', 'Add to cart'), T('card_badge_label', 'Card badge text before %', 'Save'),
    B('card_show_rating', 'Show stars on product cards', true),
  ] },
  { name: 'Cart', settings: [
    B('open_cart_on_add', 'Open the cart after Add to cart', true), T('cart_title', 'Title', 'Your cart'),
    B('cart_show_logo', 'Show the logo instead of the title', false), T('cart_notice', 'Notice strip (empty = hidden)', ''),
    T('empty_cart_text', 'Empty cart text', 'Your cart is empty.'), T('empty_cart_button', 'Empty cart button', 'Continue shopping'),
    T('cart_subtotal_label', 'Subtotal label', 'Subtotal'), T('cart_footer_note', 'Note under the subtotal', 'Shipping is calculated at checkout.'),
    T('cart_checkout_label', 'Checkout button', 'Checkout'),
    T('cart_trust_1', 'Trust line 1', '30-day money-back guarantee'), T('cart_trust_2', 'Trust line 2', 'Secure, encrypted checkout'), T('cart_trust_3', 'Trust line 3', ''),
    B('cart_show_payment', 'Show payment icons', true),
    H('Shipping protection / add-ons'),
    { type: 'store_products', id: 'cart_upsells', label: 'Products offered in the cart', info: 'Added to the cart switched on; the buyer can switch them off.' },
    B('cart_upsell_as_line', 'Also list them as cart lines', false), T('cart_upsell_heading', 'Heading', ''),
    C('cart_upsell_bg', 'Background', '#f4f5f7'), C('cart_upsell_color', 'Text', '#15171c'), C('cart_upsell_accent', 'Switch colour', ''),
  ] },
  { name: 'Discounts', settings: [
    P("Pack cards and the cart are priced with the store's live automatic discounts, using the checkout's formula. Switch off a kind the checkout does not apply to this store."),
    B('allow_tiered_discount', 'Tiered (buy more, save more)', true), B('allow_bxgy_discount', 'Buy X get Y', true),
    B('allow_amount_off_discount', 'Amount off products', true),
  ] },
  { name: 'Pages', settings: [
    T('track_heading', 'Order tracking heading', 'Track your order'), T('contact_form_heading', 'Contact form heading', 'Send us a message'),
    T('search_heading', 'Search heading', 'Search results'),
  ] },
  { name: 'FAQ', settings: [
    P('Default questions shown by every FAQ that has no questions of its own.'),
    ...FAQ.flatMap((qa, i) => [T('faq_' + (i + 1) + '_q', 'Question ' + (i + 1), qa[0]), RT('faq_' + (i + 1) + '_a', 'Answer ' + (i + 1), qa[1])]),
  ] },
  { name: 'Home – hero', settings: [
    B('home_hero_show', 'Show the hero', true), I('home_hero_image', 'Image'), I('home_hero_mobile_image', 'Phone image (optional)'),
    T('home_hero_eyebrow', 'Small text above', ''), T('home_hero_title', 'Heading', 'Everyday essentials, made better'),
    TA('home_hero_text', 'Text', 'Free shipping and 30-day returns on every order.'), T('home_hero_button', 'Button', 'Shop now'), U('home_hero_link', 'Button link'),
    S('home_hero_align', 'Text position', 'left', [['left', 'Left'], ['center', 'Center']]), R('home_hero_overlay', 'Dark overlay', 0, 0.8, 0.1, 0.2),
    TA('home_promises', 'Promises strip (separate with ||, empty = hidden)', 'Free shipping || 30-day returns || Secure checkout || 24/7 support'),
  ] },
  { name: 'Home – products', settings: [
    B('home_featured_show', 'Show the featured product (first product)', false), T('home_featured_heading', 'Featured heading', 'Our product'),
    B('home_products_show', 'Show the product grid', true),
    S('home_products_source', 'Grid shows', 'all', [['all', 'All products'], ['collections', 'One grid per collection']]),
    T('home_products_heading', 'Grid heading', 'Best sellers'), N('home_products_limit', 'Products per grid', 8),
  ] },
  { name: 'Home – banner & comparison', settings: [
    B('home_banner_show', 'Show the image banner', false), I('home_banner_image', 'Image'),
    S('home_banner_side', 'Image side', 'left', [['left', 'Left'], ['right', 'Right']]),
    T('home_banner_title', 'Heading', 'Our most popular pack'), TA('home_banner_text', 'Text', 'Save more when you buy more.'),
    T('home_banner_button', 'Button', 'Shop now'), U('home_banner_link', 'Button link'),
    H('Comparison'), B('home_compare_show', 'Show the comparison table', false), T('home_compare_heading', 'Heading', 'How we compare'),
    T('home_compare_ours', 'Our column (empty = store name)', ''), T('home_compare_theirs', 'Other column', 'Others'),
    TA('home_compare_rows', 'Rows (one per line: Feature|yes|no)', 'Free shipping|yes|no\nMoney-back guarantee|yes|no\nPremium materials|yes|no'),
  ] },
  { name: 'Home – reviews, FAQ, newsletter, contact', settings: [
    B('home_reviews_show', 'Show customer reviews', true), T('home_reviews_heading', 'Reviews heading', 'What our customers are saying'),
    T('home_reviews_sub', 'Reviews subheading', 'Real reviews from verified buyers.'),
    B('home_faq_show', 'Show the FAQ (Theme settings → FAQ)', false), B('home_newsletter_show', 'Show the newsletter band', false),
    B('home_contact_show', 'Show the contact form', false), T('home_contact_heading', 'Contact heading', 'Contact us'),
  ] },
];

fs.writeFileSync(path.join(OUT, 'settings_schema.json'), JSON.stringify(schema, null, 2) + '\n');
const current = {};
for (const g of schema) for (const s of g.settings) if (s.id && s.default !== undefined) current[s.id] = s.default;
fs.writeFileSync(path.join(OUT, 'settings_data.json'), JSON.stringify({ current }, null, 2) + '\n');
console.log(Object.keys(current).length + ' settings written to ' + OUT);
