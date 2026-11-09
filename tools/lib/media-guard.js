/*
 * For tools/pack.js. A theme built from a store link may ship the sample store's pictures and videos as the defaults of its
 * slots (docs/SPEC-theme-from-link-images.md), until the merchant replaces them; this says which are still there, it never blocks.
 *
 * originalsStillShipped(themeDir) reads _work/media-map.json (tools/media-library.js) and returns the shipped files whose sha1 has
 * not changed: { images, videos, bytes, items: [{ shipped, group, url, bytes, usedIn }] }, or null without a map (a theme built
 * from screenshots). writeReplaceList(themeDir, report) writes that list to _work/media-to-replace.md.
 * videoBytes(themeDir) → { files, bytes } of the shipped videos (pack.js prints it).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VIDEO = /\.(mp4|webm|mov|m4v|ogv)$/i;
const USES = /\.(hbs|json)$/i;

const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');

function shipped(dir, out, re) {
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.') || f.startsWith('_') || f === 'node_modules' || f.endsWith('.zip')) continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) shipped(full, out, re); else if (re.test(f)) out.push(full);
  }
  return out;
}

function videoBytes(themeDir) {
  const files = shipped(themeDir, [], VIDEO);
  return { files: files.length, bytes: files.reduce((n, f) => n + fs.statSync(f).size, 0) };
}

// Which files name this media file: templates, settings and markup. "images/tv-sections/a.webp" is how default_image holds it.
function usesOf(themeDir) {
  const sources = shipped(themeDir, [], USES).filter((f) => !/[\\/]sample[\\/]/.test(f)).map((f) => ({ file: path.relative(themeDir, f).replace(/\\/g, '/'), text: fs.readFileSync(f, 'utf8') }));
  return (rel) => {
    const inner = rel.replace(/^assets\//, '');
    return sources.filter((s) => s.text.includes(inner)).map((s) => s.file);
  };
}

function originalsStillShipped(themeDir) {
  const map = path.join(themeDir, '_work', 'media-map.json');
  if (!fs.existsSync(map)) return null;
  const used = usesOf(themeDir);
  const items = [];
  for (const e of JSON.parse(fs.readFileSync(map, 'utf8'))) {
    const f = path.join(themeDir, e.shipped);
    if (!fs.existsSync(f) || sha1(f) !== e.sha1) continue;
    items.push({ shipped: e.shipped, kind: e.kind, group: e.group, url: e.url, bytes: fs.statSync(f).size, usedIn: used(e.shipped) });
  }
  return {
    images: items.filter((i) => i.kind === 'image').length,
    videos: items.filter((i) => i.kind === 'video').length,
    bytes: items.reduce((n, i) => n + i.bytes, 0),
    items,
  };
}

function writeReplaceList(themeDir, report) {
  const rows = report.items.slice().sort((a, b) => (a.group + a.shipped < b.group + b.shipped ? -1 : 1))
    .map((i) => '| ' + i.shipped + ' | ' + i.group + ' | ' + Math.round(i.bytes / 1024) + ' KB | ' + (i.usedIn.join(', ') || 'not in a slot') + ' | ' + i.url + ' |');
  const out = path.join(themeDir, '_work', 'media-to-replace.md');
  fs.writeFileSync(out, [
    '# Media still from the sample store',
    '',
    report.images + ' images, ' + report.videos + ' videos. Overwrite a file with your own (same name) or upload another one in the theme editor; pack.js stops counting a file once it changes.',
    '',
    '| File | Group | Size | Used in | Original |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n'));
  return out;
}

module.exports = { originalsStillShipped, writeReplaceList, videoBytes };
