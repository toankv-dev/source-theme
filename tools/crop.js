#!/usr/bin/env node
/*
 * Crop a screenshot — read a tall capture / preview shot in readable slices instead of a downscaled whole.
 *
 *   node tools/crop.js <in.png> <out.png> --y 0 --h 1600 [--x 0] [--w <width>]
 *   node tools/crop.js <in.png> <out-prefix> --slices 1600      → <out-prefix>-01.png, -02.png … every 1600 px
 */
'use strict';
const fs = require('fs');
const { PNG } = require('pngjs');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes('--' + k) ? Number(args[args.indexOf('--' + k) + 1]) : d);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [input, out] = pos;
if (!input || !out) { console.error('usage: node tools/crop.js <in.png> <out.png> --y 0 --h 1600 [--x 0] [--w W] | --slices 1600'); process.exit(1); }
const src = PNG.sync.read(fs.readFileSync(input));
const cut = (x, y, w, h, file) => {
  w = Math.min(w, src.width - x); h = Math.min(h, src.height - y);
  const dst = new PNG({ width: w, height: h });
  PNG.bitblt(src, dst, x, y, w, h, 0, 0);
  fs.writeFileSync(file, PNG.sync.write(dst));
  console.log(file + ' ' + w + 'x' + h + ' (y ' + y + ')');
};
const slices = opt('slices', 0);
if (slices) {
  for (let y = 0, n = 1; y < src.height; y += slices, n++) cut(0, y, src.width, slices, out.replace(/\.png$/, '') + '-' + String(n).padStart(2, '0') + '.png');
} else {
  cut(opt('x', 0), opt('y', 0), opt('w', src.width), opt('h', src.height), out);
}
console.log('source ' + src.width + 'x' + src.height);
