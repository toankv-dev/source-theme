#!/usr/bin/env node
// node tools/contact-sheet.js <dir> <out.png> : one picture of every image in <dir> (png / jpg / webp / svg / gif)
// with its file name — pick the logo, icons and banners from a capture's images/ folder in one look.
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const [dir, out] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(f));
const fileUrl = (p) => 'file:///' + path.resolve(p).split(path.sep).join('/');
const html = '<body style="margin:0;font:11px sans-serif;display:flex;flex-wrap:wrap;gap:6px;width:1200px;background:#ccc">' +
  files.map((f) => '<div style="width:190px;text-align:center"><img src="' + fileUrl(path.join(dir, f)) + '" style="width:190px;height:150px;object-fit:contain;background:#fff"><div>' + f.slice(0, 26) + '</div></div>').join('') + '</body>';
const tmp = path.join(dir, '_sheet.html');
fs.writeFileSync(tmp, html);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto(fileUrl(tmp));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
  fs.unlinkSync(tmp);
})();
