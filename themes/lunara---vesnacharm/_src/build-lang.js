#!/usr/bin/env node
/**
 * build-lang.js — one copy of this theme per language (user 2026-11-26: NO / NL / FI / SE / DE / FR, one zip per
 * subdomain, same layout and colours). The English theme stays the master: every other _src script keeps writing it;
 * this one runs LAST and only writes copies in _work/lang/<code>/.
 *
 *   node _src/build-lang.js --extract          → _src/i18n/strings.json: every text a shopper can see, by kind
 *   node _src/build-lang.js <code> [--pack]    → _work/lang/<code>/ translated with _src/i18n/<code>.json (+ zip)
 *   node _src/build-lang.js all [--pack]       → every _src/i18n/<code>.json
 *
 * What is a text (same walk for extract and build, so a key always matches):
 *   .hbs   text between tags (split at {{#…}} {{else}} {{/…}} {{> …}}; {{value}} stays inside the text), the attributes
 *          placeholder / aria-label / title / alt / data-*text|label|title, inline <script> string literals
 *   .js    string literals: plain phrases + HTML inside literals (as .hbs). Logic strings (option names, keys, values
 *          compared with product data) are listed in _src/i18n/keep.json and never translated.
 *   .json  values of text / textarea / richtext / inline_richtext / html settings: templates/*.json (by the section /
 *          block schema), schema defaults + presets, config/settings_schema.json defaults, config/settings_data.json.
 *          A whole value is one key (HTML inside it kept).
 * A dictionary is { "_meta": { "code", "name", "html" }, "<English>": "<translation>" }. {{…}} tokens and HTML tags of
 * a key must be in its translation (checked). Missing keys stay English and are listed in _work/lang/<code>-missing.json.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');
const I18N = path.join(__dirname, 'i18n');
const OUT = path.join(THEME, '_work', 'lang');
const TEXT_TYPES = new Set(['text', 'textarea', 'richtext', 'inline_richtext', 'html']);
const ATTR_RE = /(\s)(placeholder|aria-label|title|alt|data-[\w-]*(?:text|label|title))(\s*=\s*)(\\?["'])([\s\S]*?)\4/gi;
const HB_ARG_RE = /\b(label|text|title|heading|placeholder|alt|button|cta|aria_label)=(["'])((?:(?!\2).)*)\2/g;

const keep = new Set(fs.existsSync(path.join(I18N, 'keep.json')) ? require(path.join(I18N, 'keep.json')) : []);
// short JS fragments joined to numbers / lists in code that the phrase rule would skip. Only with a space around them
// (" off", " of ", " and ", " from "): the bare 'off' is logic (m==="off", MODE==='off' of the size finder). 'today' =
// the review date (sc-reviews.hbs), never compared.
const also = new Set(['and', 'off', 'of', 'from', 'reviews']);
const alsoBare = new Set(['today']);

// ---- helpers -----------------------------------------------------------------------------------------------------
const hasWords = (s) => /[A-Za-zÀ-ɏ]{2,}/.test(s.replace(/\u0001\d+\u0002/g, ' '));
function mask(src) {
  const toks = [];
  const m = src.replace(/\{\{!--[\s\S]*?--\}\}|\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\}/g, (t) => {
    toks.push(t);
    return '\u0001' + (toks.length - 1) + '\u0002';
  });
  return { m, toks, un: (s) => s.replace(/\u0001(\d+)\u0002/g, (_, i) => toks[+i]) };
}
const isBlockTok = (t) => /^\{\{~?\s*(#|\/|\^|>|!|else\b)/.test(t);
/** CSS written by a snippet outside <style> (sc-type.hbs), Material icon names, entities, paths: never a text. */
const isCode = (s) => /^[\[@:{]|!important|\{[a-z-]+:|^[a-z]+(_[a-z]+)+$|^(&[a-z]+;|&#\d+;|\s)+$|^<!doctype|^"?\s*[\w-]+="?$/i.test(s.trim());
const isAsset = (s) => /^images\/|\.(webp|png|jpe?g|gif|svg|mp4|webm)$|^#[\w-]+$/i.test(s.trim());

/** Walk a masked HTML string; fn(text, kind) returns the new text (or the same). Returns the new masked string. */
function walkHtml(m, mk, fn, kind) {
  let out = '';
  let i = 0;
  // a text node is cut at block tokens ({{#if}}, {{else}}, {{/if}}, {{> x}}); {{value}} stays inside its segment
  const textNode2 = (t) => {
    const parts = t.split(/(\u0001\d+\u0002)/);
    let res = '';
    let cur = '';
    for (const p of parts) {
      if (/^\u0001\d+\u0002$/.test(p) && isBlockTok(mk.toks[+p.slice(1, -1)])) {
        res += seg(cur) + p;
        cur = '';
      } else cur += p;
    }
    return res + seg(cur);
  };
  const seg = (s) => {
    if (!hasWords(s) || isCode(mk.un(s))) return s;
    const lead = s.match(/^\s*/)[0];
    const trail = s.slice(lead.length).match(/\s*$/)[0];
    const core = s.slice(lead.length, s.length - trail.length);
    const raw = mk.un(core);
    const next = fn(raw, kind + '-text');
    return lead + (next === raw ? core : next) + trail;
  };
  while (i < m.length) {
    const lt = m.indexOf('<', i);
    if (lt < 0) { out += textNode2(m.slice(i)); break; }
    out += textNode2(m.slice(i, lt));
    if (m.startsWith('<!--', lt)) {
      const e = m.indexOf('-->', lt);
      const end = e < 0 ? m.length : e + 3;
      out += m.slice(lt, end); i = end; continue;
    }
    const gt = m.indexOf('>', lt);
    if (gt < 0) { out += m.slice(lt); break; }
    let tag = m.slice(lt, gt + 1);
    if (tag[1] === '!') { out += tag; i = gt + 1; continue; } // <!doctype>
    const name = (tag.match(/^<\/?\s*([a-zA-Z][\w-]*)/) || [])[1];
    if (!name) { out += textNode2(tag); i = gt + 1; continue; } // a lone "<"
    tag = tag.replace(ATTR_RE, (all, sp, an, eq, q, v) => {
      if (!hasWords(v) || /^https?:|^\/|\.(webp|png|jpe?g|svg|gif)$/i.test(mk.un(v))) return all;
      const raw = mk.un(v);
      const next = fn(raw, kind + '-attr');
      return next === raw ? all : sp + an + eq + q + (q.includes('"') ? next.replace(/"/g, '&quot;') : next.replace(/'/g, '&#39;')) + q;
    });
    out += tag;
    i = gt + 1;
    const low = name.toLowerCase();
    if ((low === 'script' || low === 'style') && tag[1] !== '/') {
      const close = m.toLowerCase().indexOf('</' + low, i);
      const end = close < 0 ? m.length : close;
      const body = m.slice(i, end);
      const isJson = /type=["']?application\/(ld\+)?json/i.test(tag);
      out += low === 'script' && !isJson ? walkJs(body, mk, fn, 'inline-js') : body;
      i = end;
    }
  }
  return out;
}

/** String literals of a JS source (masked or not). Plain phrases → fn(…, kind-str); HTML inside → walkHtml.
 *  A small tokenizer (strings, `templates ${…}`, comments, regex literals) so a quote inside one never pairs wrongly. */
function walkJs(src, mk, fn, kind) {
  // keys are the source text (escapes as written): a translation escapes only a bare quote of its literal
  const esc = (r, q) => (q === '`' ? r.replace(/(^|[^\\])`/g, '$1\\`').replace(/(^|[^\\])\$\{/g, '$1\\${') : r.replace(new RegExp('(^|[^\\\\])' + q, 'g'), '$1\\' + q));
  const lit = (q, body) => {
    if (!hasWords(body)) return body;
    if (/<[a-zA-Z\/][^>]*>/.test(body) || /\s(aria-label|alt|title|placeholder)=\\?["']/.test(body)) {
      // '" alt="Review photo">' = the end of a tag: read it as one
      const pre = body.indexOf('>') > -1 && (body.indexOf('<') < 0 || body.indexOf('>') < body.indexOf('<')) ? '<x ' : '';
      return walkHtml(pre + body, mk, (t, k) => { const r = fn(t, k); return r === t ? t : esc(r, q); }, kind + '-html').slice(pre.length);
    }
    const raw = mk.un(body);
    // " Free gifts" / "Buy " (joined to numbers in code): the words are the key, the spaces stay
    const lead = raw.match(/^\s*(?:\.\.\.|…)?/)[0]; // "...Show full review": the dots stay, the words are the key
    const trail = raw.slice(lead.length).match(/\s*$/)[0];
    const core = raw.slice(lead.length, raw.length - trail.length);
    if (keep.has(core) || keep.has(walkJs.rel + '|' + core)) return body;
    const frag = also.has(core) ? !!(lead || trail) : alsoBare.has(core) || isPhrase(core) || (/^[,·(]\s?[A-Za-z]/.test(core) && !!(lead || trail));
    if (!frag) return body;
    const next = fn(core, kind + '-str');
    return next === core ? body : esc(lead + next + trail, q);
  };
  const KW = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'instanceof', 'yield', 'await']);
  let out = '';
  let i = 0;
  const n = src.length;
  let prev = '';
  const code = (inBrace) => {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '"' || c === "'") {
        const s = ++i;
        while (i < n && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
        out += c + lit(c, src.slice(s, i)) + c; i++; prev = 'x'; continue;
      }
      if (c === '`') { out += '`'; i++; tmpl(); prev = 'x'; continue; }
      if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
        const e = src[i + 1] === '/' ? src.indexOf('\n', i) : src.indexOf('*/', i + 2);
        const end = e < 0 ? n : src[i + 1] === '/' ? e : e + 2;
        out += src.slice(i, end); i = end; continue;
      }
      if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || KW.has(prev))) {
        const s = i++;
        let cls = false;
        while (i < n && src[i] !== '\n') {
          const d = src[i];
          if (d === '\\') { i += 2; continue; }
          if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break;
          i++;
        }
        i++;
        while (i < n && /[a-z]/i.test(src[i])) i++;
        out += src.slice(s, i); prev = 'x'; continue;
      }
      if (/[\w$\u0001\u0002]/.test(c)) {
        const s = i;
        while (i < n && /[\w$\u0001\u0002]/.test(src[i])) i++;
        const w = src.slice(s, i);
        out += w; prev = KW.has(w) ? w : 'x'; continue;
      }
      if (inBrace) {
        if (c === '{') depth++;
        else if (c === '}') { if (!depth) return; depth--; }
      }
      out += c; i++;
      if (!/\s/.test(c)) prev = c;
    }
  };
  const tmpl = () => {
    let chunk = '';
    while (i < n) {
      const c = src[i];
      if (c === '\\') { chunk += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { out += lit('`', chunk) + '`'; i++; return; }
      if (c === '$' && src[i + 1] === '{') {
        out += lit('`', chunk) + '${'; chunk = ''; i += 2; prev = '';
        code(true);
        out += '}'; i++; continue;
      }
      chunk += c; i++;
    }
    out += chunk;
  };
  code(false);
  return out;
}
function isPhrase(s) {
  if (also.has(s)) return false; // only as a spaced fragment (lit)
  s = s.replace(/\{[a-z_]+\}/g, 'N'); // "{n} days ago"
  if (/[{}<>=;\\]|^\s|\s$|^[.#\[]|https?:|\/\/|\.(js|css|webp|png|jpe?g|svg|json)\b/.test(s)) return false;
  if (/^[a-z][\w-]*$/.test(s)) return false; // event names, classes, keys
  if (/^[a-z-]+:\s?\S/.test(s)) return false; // css
  if (/^[A-Z][a-zA-Z]+$/.test(s)) return true; // "Close", "Size"
  if (/^[A-Z0-9$%(+]/.test(s) && /[A-Za-z]{2,}/.test(s) && /\s/.test(s)) return true;
  if (/^[a-z]+(?: [a-z]+)+[.!?]?$/.test(s) && s.length > 6) return true; // lower-case phrase
  return false;
}

// ---- files -------------------------------------------------------------------------------------------------------
function walkDir(d, o = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('_') || f.name.startsWith('.') || f.name === 'node_modules') continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walkDir(p, o); else o.push(p);
  }
  return o;
}
const schemaOf = {};
function loadSchemas(root) {
  for (const f of fs.readdirSync(path.join(root, 'sections'))) {
    if (f.endsWith('.schema.json')) schemaOf[f.replace('.schema.json', '')] = JSON.parse(fs.readFileSync(path.join(root, 'sections', f), 'utf8'));
  }
}
const textIds = (settings) => new Set((settings || []).filter((s) => TEXT_TYPES.has(s.type)).map((s) => s.id));

/** fn(value, kind) on every text value of a JSON file; returns the new object. */
function walkJson(rel, obj, fn) {
  const tr = (v, kind) => (typeof v === 'string' && hasWords(v) && !isAsset(v) && !/^https?:|^\/|^#[0-9a-f]{3,8}$/i.test(v) ? fn(v, kind) : v);
  const each = (settingsObj, ids, kind) => {
    if (!settingsObj) return;
    for (const k of Object.keys(settingsObj)) if (ids.has(k)) settingsObj[k] = tr(settingsObj[k], kind);
  };
  if (/^templates[\\/].*\.json$/.test(rel)) {
    for (const sec of Object.values(obj.sections || {})) {
      const sch = schemaOf[sec.type] || {};
      each(sec.settings, textIds(sch.settings), 'tpl');
      for (const b of Object.values(sec.blocks || {})) {
        const bs = (sch.blocks || []).find((x) => x.type === b.type) || {};
        each(b.settings, textIds(bs.settings), 'tpl');
      }
    }
  } else if (/^sections[\\/].*\.schema\.json$/.test(rel)) {
    const def = (list) => (list || []).forEach((s) => { if (TEXT_TYPES.has(s.type) && 'default' in s) s.default = tr(s.default, 'schema'); });
    def(obj.settings);
    (obj.blocks || []).forEach((b) => def(b.settings));
    const ids = textIds(obj.settings);
    for (const p of obj.presets || []) {
      each(p.settings, ids, 'schema');
      for (const b of p.blocks || []) each(b.settings, textIds(((obj.blocks || []).find((x) => x.type === b.type) || {}).settings), 'schema');
    }
  } else if (/settings_schema\.json$/.test(rel)) {
    for (const g of obj) for (const s of g.settings || []) if (TEXT_TYPES.has(s.type) && 'default' in s) s.default = tr(s.default, 'settings');
  } else if (/settings_data\.json$/.test(rel)) {
    const ids = new Set();
    for (const g of JSON.parse(fs.readFileSync(path.join(path.dirname(walkJson.root), 'config', 'settings_schema.json'), 'utf8'))) for (const s of g.settings || []) if (TEXT_TYPES.has(s.type)) ids.add(s.id);
    const cur = obj.current && typeof obj.current === 'object' ? obj.current : obj;
    each(cur, ids, 'settings');
  }
  return obj;
}

/** Run fn over every text of the theme at root; write = true writes the files back. */
function run(root, fn, write) {
  loadSchemas(root);
  walkJson.root = path.join(root, 'x');
  for (const f of walkDir(root)) {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    // templates/checkout.hbs: vesnacharm sells through shopdy's checkout; this one is US-only (states, +1, USD)
    if (/^(locales|sample)\//.test(rel) || /check_syntax|^templates\/checkout\.hbs$/.test(rel)) continue;
    const at = (t, k) => fn(t, k, rel);
    walkJs.rel = rel; // keep.json entries "path|literal" keep a literal in one file only
    let src;
    let next;
    if (rel.endsWith('.hbs')) {
      src = fs.readFileSync(f, 'utf8');
      const mk = mask(src);
      let m = walkHtml(mk.m, mk, at, 'hbs');
      // display hash arguments of {{> snippet label="…"}} — inside the tokens
      mk.toks = mk.toks.map((t) => (/^\{\{!/.test(t) ? t : t.replace(HB_ARG_RE, (all, k, q, v) => {
        if (!hasWords(v)) return all;
        const r = at(v, 'hbs-arg');
        return r === v ? all : k + '=' + q + r.replace(new RegExp(q, 'g'), q === '"' ? '&quot;' : '&#39;') + q;
      })));
      next = mk.un(m);
      if (write) next = next.replace(/(<html\b[^>]*\blang=")en(")/g, '$1' + run.html + '$2');
    } else if (rel.endsWith('.js')) {
      src = fs.readFileSync(f, 'utf8');
      const mk = mask('');
      next = walkJs(src, mk, at, 'js');
      // theme.js finds "SAVE {save}" in a pack subtitle with a regex (highlight + hide when nothing is saved): a
      // regex is code, never walked → let it match the translated word too ("SPAR {save}"), English kept
      if (write && next.includes('/SAVE\\s*\\{save\\}/gi')) {
        const w = at('SAVE {save}', 'js-regex').replace(/\s*\{save\}\s*$/, '').trim();
        if (w && w !== 'SAVE') next = next.split('/SAVE\\s*\\{save\\}/gi').join('/(?:SAVE|' + w.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + ')\\s*\\{save\\}/gi');
      }
      // review dates (theme.js toLocaleDateString("en-US", …)) are code → the page's language ("October 4" → "4. okt.")
      if (write && run.html && run.html !== 'en') next = next.split('toLocaleDateString("en-US"').join('toLocaleDateString("' + run.html + '"');
    } else if (rel.endsWith('.json') && /^(templates|sections|config)\//.test(rel)) {
      src = fs.readFileSync(f, 'utf8');
      const obj = walkJson(rel, JSON.parse(src), at);
      next = JSON.stringify(obj, null, 2) + (src.endsWith('\n') ? '\n' : '');
      if (next.replace(/\s+/g, '') === src.replace(/\s+/g, '')) next = src; // untouched: keep the file byte for byte
    } else continue;
    if (write && next !== src) fs.writeFileSync(f, next);
  }
}

// ---- commands ----------------------------------------------------------------------------------------------------
function extract() {
  const found = {};
  run(THEME, (t, kind, rel) => {
    const e = (found[t] = found[t] || { kinds: new Set(), files: new Set() });
    e.kinds.add(kind.replace(/-(text|attr|str)$/, '-$1'));
    e.files.add(rel);
    return t;
  }, false);
  const out = {};
  for (const [t, e] of Object.entries(found).sort((a, b) => [...a[1].files][0].localeCompare([...b[1].files][0]))) {
    out[t] = [...e.kinds].join(',') + ' · ' + [...e.files].join(', ');
  }
  fs.mkdirSync(I18N, { recursive: true });
  fs.writeFileSync(path.join(I18N, 'strings.json'), JSON.stringify(out, null, 1) + '\n');
  const n = Object.keys(out).length;
  const chars = Object.keys(out).join('').length;
  console.log(`strings.json: ${n} texts, ${chars} characters`);
}

function copyTheme(dst) {
  fs.rmSync(dst, { recursive: true, force: true });
  for (const f of walkDir(THEME)) {
    const to = path.join(dst, path.relative(THEME, f));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(f, to);
  }
}

const toks = (s) => (s.match(/\{\{[\s\S]*?\}\}|\{[a-z_]+\}|<\/?[a-zA-Z][^>]*>|\|/g) || []).map((t) => t.replace(/\s+/g, ' ')).sort().join(' ');
const same = new Set(fs.existsSync(path.join(I18N, 'same.json')) ? require(path.join(I18N, 'same.json')) : []);

function build(code, pack) {
  const dict = JSON.parse(fs.readFileSync(path.join(I18N, code + '.json'), 'utf8'));
  const meta = dict._meta || {};
  const strings = JSON.parse(fs.readFileSync(path.join(I18N, 'strings.json'), 'utf8'));
  const bad = [];
  for (const [k, v] of Object.entries(dict)) if (k !== '_meta' && toks(k) !== toks(v)) bad.push(k);
  if (bad.length) { console.error(code + ': {{…}} / tags differ in ' + bad.length + ' translations:\n  ' + bad.slice(0, 20).join('\n  ')); process.exit(1); }
  const dst = path.join(OUT, code);
  copyTheme(dst);
  const missing = {};
  const used = new Set();
  run.html = meta.html || code;
  run(dst, (t, kind, rel) => {
    if (typeof dict[t] === 'string' && dict[t] !== '') { used.add(t); return dict[t]; }
    if (same.has(t)) { used.add(t); return t; }
    if (t in strings) missing[t] = kind + ' · ' + rel;
    return t;
  }, true);
  const th = JSON.parse(fs.readFileSync(path.join(dst, 'theme.json'), 'utf8'));
  th.name = th.name + ' ' + code.toUpperCase();
  th.description = '[' + (meta.name || code) + '] ' + th.description;
  // shopdy local currency (SHOPDY-12): the code is in every build (_src/patch-cur.js), the switch opens only where the
  // dictionary asks for it (_meta.localCurrency: true)
  if (meta.localCurrency === true) th.supportsLocalCurrency = true;
  fs.writeFileSync(path.join(dst, 'theme.json'), JSON.stringify(th, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, code + '-missing.json'), JSON.stringify(missing, null, 1) + '\n');
  const total = Object.keys(strings).length;
  console.log(`${code}: ${used.size} / ${total} texts translated, ${Object.keys(missing).length} left in English → _work/lang/${code}-missing.json · ${path.relative(process.cwd(), dst)}`);
  if (pack) {
    const r = require('child_process').spawnSync(process.execPath, [path.join(THEME, '..', '..', 'tools', 'pack.js'), dst], { stdio: 'inherit' });
    if (r.status) process.exit(r.status);
  }
}

const args = process.argv.slice(2);
if (args.includes('--extract')) extract();
else if (args[0] === 'all') {
  for (const f of fs.readdirSync(I18N)) if (/^[a-z]{2}\.json$/.test(f)) build(f.slice(0, 2), args.includes('--pack'));
} else if (args[0]) build(args[0], args.includes('--pack'));
else console.log('usage: node _src/build-lang.js --extract | <code> [--pack] | all [--pack]');
