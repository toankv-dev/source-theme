#!/usr/bin/env node
/*
 * Copy of the theme for comparing the Triple-Zone bodysuit template with shape-curve.com: same files (no _work), but
 * sample/product.json looks like the original product (bodysuit photos in the original's order, Black / Beige / Brown,
 * sizes "XS (95-110 lbs)" …, $35.99 / $59.98). The theme's own sample stays untouched. Run again after each edit.
 *
 *   node themes/lunara---vesnacharm/_src/compare-copy.js <dest-dir>
 *   node tools/preview-server.js <dest-dir> --port 8093      →  /product?template=triple-zone-bodysuit
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
// Sample reviews like the original's (Okendo list, capture text.txt) with its customer photos, plus three without a
// photo (4 / 4 / 3 stars) so filters, sort and Show More can be checked. Comparison copy only.
const R = '/assets/images/sc-reviews/';
p.reviews = {
  summary: { average_rating: 4.8, total_count: 8 },
  items: [
    { name: 'Sydney', rating: 5, title: 'The Easiest Faja I’ve Ever Worn', content: 'I love this FAJA I have several and they all are a struggle to put on takeoff. Please let alone to use the bathroom. I am so happy and satisfied with this. I need to order three more. I would like to know if there’s any discounts I’m gonna put this on my showcase. I will be speaking to all my ladies with and without Surgery they have to purchase this. I’m going to speak to my girlfriend that owns a Spa in Philadelphia and she sells FAJA. I’m gonna have her check this out. I love you guys. Thank you so much for making my FAJA life easy I am a 60-year-old woman that loves herself and this is part of my love journey. Thank you.', image: R + '018c5048-4012-412c-bd4f-df3259b81ef1.webp', verified: true, date: '2026-10-12' },
    { name: 'Julia', rating: 5, title: 'Back in My Skinny Jeans', content: 'I Size down and I love that I did it. It Compress but doesnt hurt! I can wear my Skinny jeans again!! I am wearing underwear', image: R + '357f782a-bcc2-48cb-be8d-ef71a9b57dd0.webp', verified: true, date: '2026-10-09' },
    { name: 'Kayla', rating: 5, title: 'Better Than I Expected', content: 'It’s honestly better than I expected. When I ordered it, I didn’t have high hopes, but once I put it on, I loved it so much that I’m planning to order two more. It’s perfect for everyday wear, and I’m really happy and satisfied. 😁 One of my best purchases here', image: R + '38f03c6c-3fae-4f55-b2d7-b3078bb0efac.webp', verified: true, date: '2026-10-05' },
    { name: 'Emma C.', rating: 5, title: '5 Stars', content: 'I love it! I’m 5’6 240lbs and I have lost a lot of weight so loose skin is big issue for me. But when I put this on… it’s perfect!!!', image: R + '3ef5abf0-5546-412f-8b2f-1b097864c46e.webp', verified: true, date: '2026-09-30' },
    { name: 'Charlotte H.', rating: 5, title: 'Very comfortable', content: 'It fits so well and very comfortable just trying it on. I will see how well it works under my clothes.', image: R + '6b87da14-4eaa-4023-872c-89ab6f03c6c6.webp', verified: true, date: '2026-09-21' },
    { name: 'Sample A.', rating: 4, title: 'Sample review (copy only)', content: 'A four-star sample without a photo, to check the filters and the sort.', verified: true, date: '2026-11-12' },
    { name: 'Sample B.', rating: 4, title: 'Sample review (copy only)', content: 'Another four-star sample without a photo.', verified: false, date: '2026-08-02' },
    { name: 'Sample C.', rating: 3, title: 'Sample review (copy only)', content: 'A three-star sample without a photo.', verified: true, date: '2026-07-18' },
  ],
};
// A review with 2 photos (user 2026-11-19: "reviews with several photos show only one"): images[] as the platform is
// to send it (image = the first one, kept for older readers). Comparison copy only.
p.reviews.items[0].images = [R + '018c5048-4012-412c-bd4f-df3259b81ef1.webp', R + '357f782a-bcc2-48cb-be8d-ef71a9b57dd0.webp'];
p.variants_list = [];
for (const c of Object.keys(colours)) for (const s of sizes) {
  p.variants_list.push({ id: 'v-' + c.toLowerCase() + '-' + s.split(' ')[0].toLowerCase(), title: c + ' / ' + s, option_values: [c, s], price: '$35.99', compare_at_price: '$59.98', featured_image: colours[c], available: true });
}
// Copy-only template "fitopt": the finder's "Size option name" set to "Side" (no such option here, as on a product whose
// size option is named otherwise), so the finder must find the size option by its values.
const fo = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.triple-zone-bodysuit.json'), 'utf8'));
if (fo.sections.product.blocks.fit) {
  fo.sections.product.blocks.fit.settings.option_name = 'Side';
  fo.name = 'Fit option test (copy only)';
  fs.writeFileSync(path.join(DEST, 'templates', 'product.fitopt.json'), JSON.stringify(fo, null, 2) + '\n');
}
// Copy-only template "buynow": the same page with the second button, so its flow stays checked.
const bn = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.triple-zone-bodysuit.json'), 'utf8'));
bn.sections.product.settings.buy_now_label = 'Express checkout now';
bn.name = 'Buy-now test (copy only)';
fs.writeFileSync(path.join(DEST, 'templates', 'product.buynow.json'), JSON.stringify(bn, null, 2) + '\n');
// Copy-only template "picker": the page with the main Color / Size picker (show_variants on), for the picker flows.
const pk = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.triple-zone-bodysuit.json'), 'utf8'));
pk.sections.product.settings.show_variants = true;
pk.name = 'Main picker test (copy only)';
fs.writeFileSync(path.join(DEST, 'templates', 'product.picker.json'), JSON.stringify(pk, null, 2) + '\n');
// Copy-only template "reviewpages": one review per page, so 8 sample reviews give 8 pages and the "…" shows.
const rp = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.triple-zone-bodysuit.json'), 'utf8'));
rp.sections.reviews.settings.page_size = 1;
rp.name = 'Review pages test (copy only)';
fs.writeFileSync(path.join(DEST, 'templates', 'product.reviewpages.json'), JSON.stringify(rp, null, 2) + '\n');
// Copy-only templates "reels" / "reelsone": the customer videos with 4 sample clips (club-ritual's portrait MP4s, copied
// into the copy only) + 2 empty slots, which must stay off the page; "reelsone" = one video per screen on phones.
const CR = path.resolve(THEME, '..', 'club-ritual', 'assets', 'videos');
fs.mkdirSync(path.join(DEST, 'assets', 'videos'), { recursive: true });
for (let i = 1; i <= 4; i++) fs.copyFileSync(path.join(CR, 'session-' + i + '.mp4'), path.join(DEST, 'assets', 'videos', 'sample-' + i + '.mp4'));
for (const [name, layout] of [['reels', 'peek'], ['reelsone', 'one']]) {
  const rl = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.triple-zone-bodysuit.json'), 'utf8'));
  rl.sections.reels.settings.mobile_layout = layout;
  rl.sections.reels.blockOrder.forEach((id, i) => {
    if (i < 4) Object.assign(rl.sections.reels.blocks[id].settings, { default_video: 'videos/sample-' + (i + 1) + '.mp4', name: i === 0 ? 'Samantha R.' : '', caption: i === 0 ? 'Wears size M' : '' });
  });
  rl.name = 'Customer videos test (copy only)';
  fs.writeFileSync(path.join(DEST, 'templates', 'product.' + name + '.json'), JSON.stringify(rl, null, 2) + '\n');
}
// Copy-only template "bundlepct": the plain bundle page with "SAVE {save}" vs the compare-at price and a pack whose
// subtitle has more text after it, so the badge-after-the-title layout is checked outside the bodysuit look.
const bp = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.bundle.json'), 'utf8'));
Object.assign(bp.sections.product.blocks.kaching.settings, { save_style: 'compare_pct', pack2_subtitle: 'SAVE {save} · {each} each' });
bp.name = 'Bundle SAVE test (copy only)';
fs.writeFileSync(path.join(DEST, 'templates', 'product.bundlepct.json'), JSON.stringify(bp, null, 2) + '\n');
fs.mkdirSync(path.join(DEST, 'sample'), { recursive: true });
fs.writeFileSync(path.join(DEST, 'sample', 'product.json'), JSON.stringify(p, null, 2) + '\n');
console.log('copied → ' + DEST);
