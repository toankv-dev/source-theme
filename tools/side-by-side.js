#!/usr/bin/env node
/*
 * Puts a horizontal slice of two screenshots next to each other (reference | candidate) for eyeballing.
 *
 *   node tools/side-by-side.js <reference.png> <candidate.png> <out.png> [--y 0] [--h 1200] [--cy <y in candidate>] [--scale 0.5]
 *
 * --cy lets the candidate slice start elsewhere when a section above it has a different height.
 */
'use strict';
const fs = require('fs');
const { PNG } = require('pngjs');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes('--' + k) ? Number(args[args.indexOf('--' + k) + 1]) : d);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [refFile, candFile, out] = pos;
if (!out) { console.error('usage: node tools/side-by-side.js <reference.png> <candidate.png> <out.png> [--y 0] [--h 1200] [--cy y] [--scale 0.5]'); process.exit(1); }

const a = PNG.sync.read(fs.readFileSync(refFile));
const b = PNG.sync.read(fs.readFileSync(candFile));
const y = opt('y', 0), cy = opt('cy', y), scale = opt('scale', 1);
const h = Math.min(opt('h', 1200), a.height - y, b.height - cy);
const gap = 12, w = a.width + b.width + gap;
const W = Math.round(w * scale), H = Math.round(h * scale);
const img = new PNG({ width: W, height: H });
img.data.fill(255);
for (let oy = 0; oy < H; oy++) {
  for (let ox = 0; ox < W; ox++) {
    const sx = Math.floor(ox / scale), sy = Math.floor(oy / scale);
    let src = null, idx;
    if (sx < a.width) { src = a; idx = ((y + sy) * a.width + sx) * 4; }
    else if (sx >= a.width + gap) { src = b; idx = ((cy + sy) * b.width + (sx - a.width - gap)) * 4; }
    const o = (oy * W + ox) * 4;
    if (src) { img.data[o] = src.data[idx]; img.data[o + 1] = src.data[idx + 1]; img.data[o + 2] = src.data[idx + 2]; img.data[o + 3] = 255; }
    else { img.data[o] = 230; img.data[o + 1] = 0; img.data[o + 2] = 0; img.data[o + 3] = 255; }
  }
}
fs.writeFileSync(out, PNG.sync.write(img));
console.log('wrote ' + out + ' (' + W + 'x' + H + ')');
