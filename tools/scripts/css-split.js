// node tools/scripts/css-split.js <src.css> <dest.css> "<regex>" ["<header comment>"]
// Moves every rule (also inside @media blocks) whose selector matches the regex from src (compact format) to the
// end of dest, keeping order and @media wrappers. Comments stay in src unless the whole block moved.
// A rule whose selector list mixes matching and other selectors ("a, .b-logo") is split: only the matching
// selectors move, the others keep the declarations in src.
'use strict';
const fs = require('fs');
const [src, dest, reSrc, header] = process.argv.slice(2);
const re = new RegExp(reSrc);
const lines = fs.readFileSync(src, 'utf8').split('\n');
const keep = [], move = [];
let media = null, mk = [], mm = [];

// "a, b:is(c, d) { … }" → ["a", "b:is(c, d)"] (commas inside () / [] do not split).
function selectors(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function route(l, keepTo, moveTo) {
  const i = l.indexOf('{');
  const lead = l.match(/^\s*/)[0];
  const parts = selectors(l.slice(0, i));
  const m = parts.filter((p) => re.test(p));
  const k = parts.filter((p) => !re.test(p));
  if (!m.length) return keepTo.push(l);
  if (!k.length) return moveTo.push(l);
  keepTo.push(lead + k.join(', ') + ' ' + l.slice(i));
  moveTo.push(lead + m.join(', ') + ' ' + l.slice(i));
}

for (const l of lines) {
  if (media !== null) {
    if (l === '}') {
      if (mk.length) keep.push(media, ...mk, '}');
      if (mm.length) move.push(media, ...mm, '}');
      media = null; mk = []; mm = [];
      continue;
    }
    if (l.includes('{')) route(l, mk, mm); else mk.push(l);
    continue;
  }
  if (/^@media|^@supports/.test(l)) { media = l; continue; }
  if (l.startsWith('/*') || l.startsWith('@') || !l.includes('{')) { keep.push(l); continue; }
  route(l, keep, move);
}
// Drop comments left with nothing under them (next non-empty line is another comment or EOF).
const cleaned = keep.filter((l, i) => !(l.startsWith('/*') && l.endsWith('*/') && (i === keep.length - 1 || (keep[i + 1] || '').startsWith('/*')) && i > 1));
fs.writeFileSync(src, cleaned.join('\n').replace(/\n+$/, '') + '\n');
const prev = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : (header ? header + '\n' : '');
fs.writeFileSync(dest, prev + move.join('\n') + '\n');
console.log(src, '→', fs.statSync(src).size, ' |', dest, '→', fs.statSync(dest).size, '(' + move.length + ' lines moved)');
