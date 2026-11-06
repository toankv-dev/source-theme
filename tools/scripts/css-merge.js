// node tools/scripts/css-merge.js <compact.css> : in a file written by css-compact.js (one rule per line), merges every later
// rule with the same selector in the same @media query into its first occurrence (later declarations win), and
// moves rules of a repeated @media query into the first block with that query. Prints the byte change.
'use strict';
const fs = require('fs');
const file = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').split('\n');

// Parse into items: { kind:'comment'|'rule'|'media', text, sel, decls(Map), query, rules[] }
const items = [];
let media = null;
const parseRule = (l) => {
  const m = l.trim().match(/^(.*?) \{ (.*) \}$/);
  if (!m) return null;
  const decls = new Map();
  m[2].replace(/;\s*$/, '').split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean).forEach((d) => {
    const i = d.indexOf(':');
    decls.delete(d.slice(0, i).trim());
    decls.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
  });
  return { kind: 'rule', sel: m[1], decls };
};
for (const l of lines) {
  if (!l.trim()) continue;
  if (media) {
    if (l === '}') { items.push(media); media = null; continue; }
    const r = parseRule(l);
    media.rules.push(r || { kind: 'raw', text: l.trim() });
    continue;
  }
  if (/^@(media|supports)/.test(l)) { media = { kind: 'media', query: l.replace(/\s*\{$/, ''), rules: [] }; continue; }
  const r = !l.startsWith('/*') && !l.startsWith('@') && parseRule(l);
  items.push(r || { kind: 'raw', text: l });
}

function mergeList(list) {
  const first = new Map();
  const out = [];
  for (const r of list) {
    if (r.kind !== 'rule') { out.push(r); continue; }
    const f = first.get(r.sel);
    if (f) { for (const [k, v] of r.decls) { f.decls.delete(k); f.decls.set(k, v); } continue; }
    first.set(r.sel, r);
    out.push(r);
  }
  return out;
}
// Top level: merge rules; media blocks with the same query join the first one.
const top = [];
const firstMedia = new Map();
for (const it of items) {
  if (it.kind === 'media') {
  }
  top.push(it);
}
const merged = mergeList(top);
merged.forEach((it) => { if (it.kind === 'media') it.rules = mergeList(it.rules); });

const fmt = (r, ind) => r.kind === 'rule' ? ind + r.sel + ' { ' + [...r.decls].map(([k, v]) => k + ': ' + v).join('; ') + '; }' : ind + r.text;
const res = merged.map((it) => it.kind === 'media' ? it.query + ' {\n' + it.rules.map((r) => fmt(r, '  ')).join('\n') + '\n}' : fmt(it, '')).join('\n') + '\n';
const before = fs.statSync(file).size;
fs.writeFileSync(file, res);
console.log(file, before, '→', res.length);
