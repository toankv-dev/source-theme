#!/usr/bin/env node
/*
 * Removes CSS rules whose selectors use a class (with the given prefix) that no template or script of the
 * theme mentions any more. Selector lists are trimmed selector by selector; @media / @supports blocks are
 * pruned recursively; @keyframes, @font-face and rules without prefixed classes are always kept.
 *
 *   node tools/scripts/prune-css.js <theme-dir> [--prefix b-] [--dry]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const theme = path.resolve(args.find((a) => !a.startsWith('--')) || 'base-theme');
const prefix = args.includes('--prefix') ? args[args.indexOf('--prefix') + 1] : 'b-';
const dry = args.includes('--dry');

function walk(dir, exts, out) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.includes(path.extname(f))) out.push(full);
  }
  return out;
}

// Every token that could be a class name in markup or scripts.
const used = new Set();
const esc = prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const tokenRe = new RegExp(esc + '[a-zA-Z0-9_-]+', 'g');
for (const f of walk(theme, ['.hbs', '.js', '.json'], [])) {
  for (const m of fs.readFileSync(f, 'utf8').match(tokenRe) || []) used.add(m);
}

// A token ending in '-' is the fixed part of a class built from a setting (class="b-iwt--image-{{…}}"):
// every class starting with it counts as used.
const dynamic = [...used].filter((t) => t.endsWith('-'));

/** Splits CSS into top-level nodes: { type: 'rule'|'at'|'comment', prelude, body, raw }. */
function parse(css) {
  const nodes = [];
  let i = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) { i++; continue; }
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const stop = end < 0 ? css.length : end + 2;
      nodes.push({ type: 'comment', raw: css.slice(i, stop) });
      i = stop;
      continue;
    }
    // prelude up to { or ;
    let j = i, quote = null;
    while (j < css.length) {
      const c = css[j];
      if (quote) { if (c === '\\') j++; else if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === '{' || c === ';') break;
      j++;
    }
    const prelude = css.slice(i, j).trim();
    if (css[j] === ';') { nodes.push({ type: 'at', prelude, body: null, raw: prelude + ';' }); i = j + 1; continue; }
    // body with nested braces
    let depth = 1, k = j + 1;
    quote = null;
    while (k < css.length && depth > 0) {
      const c = css[k];
      if (quote) { if (c === '\\') k++; else if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (css.startsWith('/*', k)) { const e = css.indexOf('*/', k + 2); k = e < 0 ? css.length : e + 1; }
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      k++;
    }
    const body = css.slice(j + 1, k - 1);
    nodes.push({ type: prelude.startsWith('@') ? 'at' : 'rule', prelude, body, raw: css.slice(i, k) });
    i = k;
  }
  return nodes;
}

function splitSelectors(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const c of s) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

let removed = 0;
function keepSelector(sel) {
  const classes = sel.match(new RegExp('\\.' + esc + '[a-zA-Z0-9_-]+', 'g')) || [];
  return classes.every((c) => used.has(c.slice(1)) || dynamic.some((p) => c.slice(1).startsWith(p)));
}

function prune(css, indent) {
  const out = [];
  for (const n of parse(css)) {
    if (n.type === 'comment') { out.push(indent + n.raw); continue; }
    if (n.type === 'at') {
      if (n.body !== null && /^@(media|supports|layer|container)/.test(n.prelude)) {
        const inner = prune(n.body, indent + '  ');
        if (inner.trim()) out.push(indent + n.prelude + ' {\n' + inner + '\n' + indent + '}');
        continue;
      }
      out.push(indent + n.raw.trim());
      continue;
    }
    const sels = splitSelectors(n.prelude);
    const kept = sels.filter(keepSelector);
    removed += sels.length - kept.length;
    if (!kept.length) continue;
    const decls = n.body.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => indent + '  ' + l).join('\n');
    out.push(indent + kept.join(',\n' + indent) + ' {\n' + decls + '\n' + indent + '}');
  }
  return out.join('\n');
}

for (const f of walk(path.join(theme, 'assets', 'css'), ['.css'], [])) {
  const before = fs.readFileSync(f, 'utf8');
  removed = 0;
  const after = prune(before, '') + '\n';
  console.log(path.relative(theme, f) + ': ' + removed + ' selectors removed, ' + before.length + ' → ' + after.length + ' bytes');
  if (!dry) fs.writeFileSync(f, after);
}
