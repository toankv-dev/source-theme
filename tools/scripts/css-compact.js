// node tools/scripts/css-compact.js <file.css> : rewrites each rule on one line ("sel { a: b; c: d; }"), keeps comments and
// @media / @font-face blocks (inner rules indented two spaces). Same rules, same order — only whitespace changes.
'use strict';
const fs = require('fs');
const file = process.argv[2];
const css = fs.readFileSync(file, 'utf8');

function parse(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }
    if (s.startsWith('/*', i)) { const e = s.indexOf('*/', i + 2) + 2; out.push({ c: s.slice(i, e) }); i = e; continue; }
    let j = i, q = null;
    while (j < s.length) { const ch = s[j]; if (q) { if (ch === '\\') j++; else if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '{' || ch === ';') break; j++; }
    const pre = s.slice(i, j).trim().replace(/\s*\n\s*/g, ' ');
    if (s[j] === ';') { out.push({ at: pre + ';' }); i = j + 1; continue; }
    let d = 1, k = j + 1; q = null;
    while (k < s.length && d > 0) { const ch = s[k]; if (q) { if (ch === '\\') k++; else if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (s.startsWith('/*', k)) { k = s.indexOf('*/', k + 2) + 1; } else if (ch === '{') d++; else if (ch === '}') d--; k++; }
    out.push({ pre, body: s.slice(j + 1, k - 1) });
    i = k;
  }
  return out;
}
const decls = (b) => b.split(/;(?![^(]*\))/).map((x) => x.trim().replace(/\s*\n\s*/g, ' ')).filter(Boolean);
function emit(nodes, ind) {
  return nodes.map((n) => {
    if (n.c) return ind + n.c;
    if (n.at) return ind + n.at;
    if (/^@(media|supports)/.test(n.pre)) return ind + n.pre + ' {\n' + emit(parse(n.body), ind + '  ') + '\n' + ind + '}';
    return ind + n.pre.replace(/,\s*/g, ', ') + ' { ' + decls(n.body).join('; ') + '; }';
  }).join('\n');
}
const before = css.length;
const res = emit(parse(css), '') + '\n';
fs.writeFileSync(file, res);
console.log(file, before, '→', res.length);
