// node tools/scripts/css-split.js <src.css> <dest.css> "<regex>" ["<header comment>"]
// Moves every rule (also inside @media blocks) whose selector matches the regex from src (compact format) to the
// end of dest, keeping order and @media wrappers. Comments stay in src unless the whole block moved.
'use strict';
const fs = require('fs');
const [src, dest, reSrc, header] = process.argv.slice(2);
const re = new RegExp(reSrc);
const lines = fs.readFileSync(src, 'utf8').split('\n');
const keep = [], move = [];
let media = null, mk = [], mm = [];
for (const l of lines) {
  if (media !== null) {
    if (l === '}') {
      if (mk.length) keep.push(media, ...mk, '}');
      if (mm.length) move.push(media, ...mm, '}');
      media = null; mk = []; mm = [];
      continue;
    }
    (re.test(l.split('{')[0]) ? mm : mk).push(l);
    continue;
  }
  if (/^@media|^@supports/.test(l)) { media = l; continue; }
  if (l.startsWith('/*') || l.startsWith('@') || !l.includes('{')) { keep.push(l); continue; }
  (re.test(l.split('{')[0]) ? move : keep).push(l);
}
// Drop comments left with nothing under them (next non-empty line is another comment or EOF).
const cleaned = keep.filter((l, i) => !(l.startsWith('/*') && l.endsWith('*/') && (i === keep.length - 1 || (keep[i + 1] || '').startsWith('/*')) && i > 1));
fs.writeFileSync(src, cleaned.join('\n').replace(/\n+$/, '') + '\n');
const prev = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : (header ? header + '\n' : '');
fs.writeFileSync(dest, prev + move.join('\n') + '\n');
console.log(src, '→', fs.statSync(src).size, ' |', dest, '→', fs.statSync(dest).size, '(' + move.length + ' lines moved)');
