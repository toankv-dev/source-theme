/*
 * The design map of a theme (docs/SPEC-theme-map.md): what the theme is made of, read from its files, so Claude reads the
 * map instead of the code. Read only, no side effects:
 *   scan(dir)              → model (templates, sections, snippets, CSS / JS, design settings, source scripts, hooks, sha1 per file)
 *   renderIndex(model)     → the generated part of _map/design-map.md
 *   build(model, oldMd, oldStore, { today, ack }) → { md, store, flagged, removed }: the generated part + the notes Claude
 *                            wrote (kept by id, flagged for review when a file of their part changed); throws on broken markers
 *   part(model, id)        → the detail of one part (null if there is none), partIds(model)
 *   stableJson(store)      → the text of _map/design-map.json
 * tools/theme-map.js reads and writes the files. Never reads _work/ (downloaded data) except its top-level scripts.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { HOOKS } = require('./platform-hooks');

const TEXT_DIRS = ['layout', 'templates', 'sections', 'snippets', 'config', 'locales', 'assets/css', 'assets/js'];
const TEXT_EXT = /\.(hbs|json|css|js|md|txt|html|py)$/i;
// A path a script works on starts a string ('sections/x.hbs', `${T}/assets/y.css`, '/assets/…'); one inside a
// sentence ('Look loads assets/css/x.css for …', an info text) is prose, not a file the script writes.
const TARGET = /(?<=['"`]|['"`}]\/)(?:layout|templates|sections|snippets|config|locales|assets)\/[\w./-]+\.\w+/g;
const TARGET_PARTS = /['"`](layout|templates|sections|snippets|config|locales|assets)['"`]\s*,\s*((?:['"`][\w.-]+['"`]\s*,\s*)*['"`][\w.-]+\.\w+['"`])/g;
const LINK = /assets_url\}\}\/((?:css|js)\/[\w.-]+)/g;
// `(eq block.type "x")`, or `(eq type "x")` / `(eq this.type "x")` inside {{#each section.blocks}} (Lunara).
const BLOCK_MARK = /\(eq\s+(?:block\.|this\.)?type\s+["']([\w-]+)["']\)/g;
// Class names that say nothing about where a part is styled.
const GENERIC = new Set(['page-width', 'container', 'wrapper', 'inner', 'button', 'btn', 'hidden', 'visually-hidden', 'icon', 'link',
  'list', 'grid', 'row', 'col', 'field', 'title', 'text', 'small', 'caption', 'rte', 'media', 'image', 'img', 'h0', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'full-unstyled-link', 'focus-inset', 'section', 'gradient', 'js', 'no-js', 'active', 'is-active', 'center']);
const NOTE_BLOCK = /<!-- notes:([\w./-]+) -->\n([\s\S]*?)<!-- \/notes -->/g;

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const posix = (p) => p.replace(/\\/g, '/');
const base = (f) => f.split('/').pop();
const uniq = (a) => [...new Set(a)];
const kb = (b) => (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB';
const cap = (a, max) => (a.length > max ? a.slice(0, max).join(', ') + ` +${a.length - max}` : a.join(', '));
const lineAt = (src, i) => { let n = 1; for (let j = src.indexOf('\n'); j !== -1 && j < i; j = src.indexOf('\n', j + 1)) n++; return n; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function walk(root, rel, out) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.startsWith('.') || name.startsWith('_') || name === 'node_modules') continue;
    const r = rel ? rel + '/' + name : name;
    if (fs.statSync(path.join(root, r)).isDirectory()) walk(root, r, out);
    else if (TEXT_EXT.test(name)) out.push(r);
  }
  return out;
}

function partialsIn(src) {
  const inline = new Set([...src.matchAll(/\{\{#\*inline\s+["']([\w./-]+)["']/g)].map((m) => m[1]));
  return uniq([...src.matchAll(/\{\{#?>\s*["']?([\w./-]+)/g)].map((m) => m[1]).filter((n) => !inline.has(n)));
}

function linksIn(src) {
  return uniq([...src.matchAll(LINK)].map((m) => 'assets/' + m[1]));
}

/** Every `(eq block.type "x")`: the block's markup runs to the next one, the last one to the next {{/each}}. */
function blockMarks(src) {
  const lines = src.split('\n');
  const marks = [...src.matchAll(BLOCK_MARK)].map((m) => { const ln = lineAt(src, m.index); return { type: m[1], from: ln, to: ln, at: m.index, text: m[0] }; });
  marks.forEach((m, i) => {
    if (i + 1 < marks.length) { m.to = Math.max(m.from, marks[i + 1].from - 1); return; }
    let end = lines.length;
    for (let j = m.from; j < lines.length; j++) if (/\{\{\/each\}\}/.test(lines[j])) { end = j; break; }
    m.to = Math.max(m.from, end);
  });
  return marks;
}

function styleIn(src) {
  let bytes = 0;
  let line = null;
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    bytes += m[1].length;
    if (line === null) line = lineAt(src, m.index);
  }
  return bytes ? { bytes, line } : null;
}

/** The BEM blocks of the class names a file writes, most telling first (with elements, then most used). */
function classesIn(src) {
  const counts = new Map();
  for (const m of src.matchAll(/class="([^"]*)"/g)) {
    for (const tok of m[1].replace(/\{\{[\s\S]*?\}\}/g, ' ').split(/\s+/)) {
      if (!/^[a-zA-Z][\w-]*$/.test(tok)) continue;
      const name = tok.split(/__|--/)[0];
      if (name.length < 2 || GENERIC.has(name)) continue;
      const c = counts.get(name) || { name, n: 0, bem: 0 };
      c.n++;
      if (tok !== name) c.bem++;
      counts.set(name, c);
    }
  }
  return [...counts.values()].sort((a, b) => b.bem - a.bem || b.n - a.n || (a.name < b.name ? -1 : 1)).slice(0, 4)
    .map(({ name, n }) => ({ name, n }));
}

function cssInfo(file, src) {
  const lines = src.split('\n').length;
  const minified = src.length > 1000 && src.length / lines > 300;
  const vars = [];
  for (const m of src.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) vars.push(`${d[1]}: ${d[2].trim()}`);
  }
  const fonts = [];
  for (const m of src.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const fam = /font-family\s*:\s*["']?([^;"']+)/.exec(m[1]);
    const w = /font-weight\s*:\s*(\d+)/.exec(m[1]);
    if (fam) fonts.push({ family: fam[1].trim(), weight: w ? Number(w[1]) : 400 });
  }
  const breakpoints = [...src.matchAll(/@media[^{]*?\b(?:max|min)-width\s*:\s*(\d+)px/g)].map((m) => Number(m[1]));
  return { id: base(file), file, bytes: Buffer.byteLength(src), lines, minified, linkedBy: [], vars, fonts, breakpoints, src };
}

function styledIn(classes, css) {
  const out = new Map();
  for (const c of classes.filter((x) => x.n >= 2).slice(0, 2)) {
    const re = new RegExp('\\.' + esc(c.name) + '(?:__|--|(?![\\w-]))', 'g');
    for (const f of css) {
      for (const m of f.src.matchAll(re)) {
        const e = out.get(f.id) || { id: f.id, hits: 0, from: null, to: null, minified: f.minified, file: f.file };
        e.hits++;
        if (!f.minified) {
          const ln = lineAt(f.src, m.index);
          e.from = e.from === null ? ln : Math.min(e.from, ln);
          e.to = Math.max(e.to || 0, ln);
        }
        out.set(f.id, e);
      }
    }
  }
  return [...out.values()].sort((a, b) => b.hits - a.hits || (a.id < b.id ? -1 : 1));
}

function defaultsOf(settings) {
  return Object.entries(settings || {}).filter(([k, v]) => /^default_/.test(k) && typeof v === 'string' && v).map(([k, v]) => `${k} ${v}`);
}

/** JS source without its comments: block comments, and line comments not inside a URL (https://). */
function stripComments(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\'"`\w])\/\/.*$/gm, '$1');
}

/** The model of a theme folder. */
function scan(dir) {
  const T = path.resolve(dir);
  const has = (r) => fs.existsSync(path.join(T, r));
  const text = new Map();
  const read = (r) => { if (!text.has(r)) text.set(r, fs.readFileSync(path.join(T, r), 'utf8')); return text.get(r); };
  const json = (r) => { try { return has(r) ? JSON.parse(read(r)) : null; } catch (e) { return null; } };

  const files = TEXT_DIRS.flatMap((d) => walk(T, d, []));
  for (const extra of ['theme.json', 'README.md']) if (has(extra)) files.unshift(extra);
  const scripts = [];
  for (const d of ['_src', '_work']) {
    if (!has(d)) continue;
    for (const name of fs.readdirSync(path.join(T, d)).sort()) {
      if (/\.(js|py)$/.test(name) && fs.statSync(path.join(T, d, name)).isFile()) scripts.push(`${d}/${name}`);
    }
  }
  // A _src/*.js that is not build-* / patch-* but that such a script reads by name is data (e.g. a JS module a patch
  // pastes into a theme file): a source file, not a helper.
  const runs = (f) => /^(build|patch)[-_]/i.test(base(f));
  const dataJs = scripts.filter((s) => s.startsWith('_src/') && s.endsWith('.js') && !runs(s)
    && scripts.some((o) => o !== s && runs(o) && read(o).includes(base(s))));
  for (const s of dataJs) scripts.splice(scripts.indexOf(s), 1);
  const srcFolders = has('_src') ? fs.readdirSync(path.join(T, '_src')).sort()
    .filter((n) => fs.statSync(path.join(T, '_src', n)).isDirectory()).map((n) => ({ dir: `_src/${n}`, files: walk(T, `_src/${n}`, []).length })) : [];
  // Loose source files next to the scripts (e.g. a markup block a patch script pastes in): listed with their readers.
  const srcFiles = has('_src') ? fs.readdirSync(path.join(T, '_src')).sort()
    .filter((n) => (!/\.(js|py)$/.test(n) || dataJs.includes(`_src/${n}`)) && fs.statSync(path.join(T, '_src', n)).isFile())
    .map((n) => ({ file: `_src/${n}`, readBy: scripts.filter((s) => read(s).includes(n)) })) : [];
  const shas = {};
  for (const f of [...files, ...scripts, ...srcFiles.map((s) => s.file), ...srcFolders.flatMap((s) => walk(T, s.dir, []))].sort()) shas[f] = sha1(read(f));

  const theme = json('theme.json') || {};
  const hbs = files.filter((f) => /^(layout|templates|sections|snippets)\/.+\.hbs$/.test(f));

  // Source scripts: which theme files each one writes (build-* generates, patch-* patches) or only reads (a check).
  const roles = {};
  const sources = scripts.map((file) => {
    // A path named only in a comment ("see sections/x.hbs") is not written by the script: match code, not comments.
    const src = file.endsWith('.js') ? stripComments(read(file)) : read(file);
    const found = new Set([...src.matchAll(TARGET)].map((m) => m[0]));
    for (const m of src.matchAll(TARGET_PARTS)) found.add(m[1] + '/' + m[2].split(/\s*,\s*/).map((x) => x.slice(1, -1)).join('/'));
    // the theme files a source file it reads names (e.g. a JSON list of anchored edits) are written by this script too
    for (const sf of srcFiles) if (sf.readBy.includes(file)) for (const m of read(sf.file).matchAll(TARGET)) found.add(m[0]);
    const targets = [...found].filter((t) => has(t)).sort();
    const name = base(file).toLowerCase();
    // Only build-* and patch-* scripts edit the theme; the others are helpers and checks (a copy, a test, a scan).
    const kind = /^build[-_]/.test(name) ? 'generates' : /^patch[-_]/.test(name) ? 'patches' : 'reads';
    // where in the script each target is written: open those lines instead of the whole script
    const rawLines = read(file).split('\n');
    const lines = {};
    for (const t of targets) {
      const hits = [];
      rawLines.forEach((l, i) => { if (l.includes(base(t))) hits.push(i + 1); });
      if (hits.length) lines[t] = [hits[0], hits[hits.length - 1]];
    }
    if (kind !== 'reads') for (const t of targets) (roles[t] = roles[t] || []).push({ script: file, kind, lines: lines[t] || null });
    return { file, kind, targets, lines, committed: file.startsWith('_src/') };
  });
  const editedBy = (list) => {
    const out = new Map();
    for (const f of list) {
      for (const r of roles[f] || []) {
        const e = out.get(r.script) || { script: r.script, kind: r.kind, files: [], at: {} };
        e.files.push(f);
        if (r.lines) e.at[f] = r.lines;
        out.set(r.script, e);
      }
    }
    return [...out.values()];
  };

  const css = files.filter((f) => /^assets\/css\/.+\.css$/.test(f)).map((f) => cssInfo(f, read(f)));
  const js = files.filter((f) => /^assets\/js\/.+\.js$/.test(f)).map((f) => {
    const src = read(f);
    const lines = src.split('\n').length;
    return { id: base(f), file: f, bytes: Buffer.byteLength(src), minified: src.length > 1000 && src.length / lines > 300, linkedBy: [],
      core: f === 'assets/js/core.js', hooks: uniq([...src.matchAll(/\[(data-[\w-]+)/g)].map((m) => m[1])).sort().slice(0, 12) };
  });
  const assetsById = new Map([...css, ...js].map((a) => [a.file, a]));
  for (const a of theme.assets || []) if (assetsById.has(a)) assetsById.get(a).linkedBy.push('theme.json');

  const idOf = (f) => (/^(sections|snippets)\//.test(f) ? base(f).replace(/\.hbs$/, '') : base(f));
  const includes = {}; // part id → partials it renders
  for (const f of hbs) {
    const src = read(f);
    includes[idOf(f)] = partialsIn(src);
    for (const l of linksIn(src)) if (assetsById.has(l)) assetsById.get(l).linkedBy.push(idOf(f));
  }

  for (const a of [...css, ...js]) a.linkedBy = uniq(a.linkedBy).sort();

  const templates = [];
  for (const f of files.filter((x) => /^templates\/[^/]+\.json$/.test(x))) {
    const doc = json(f) || {};
    const secs = doc.sections || {};
    const order = (doc.order || Object.keys(secs)).filter((id) => secs[id]);
    const sections = order.map((id) => {
      const s = secs[id];
      const blockIds = s.blockOrder || Object.keys(s.blocks || {});
      return { id, type: s.type, skin: (s.settings && s.settings.skin) || null, settings: Object.keys(s.settings || {}),
        defaults: defaultsOf(s.settings),
        blocks: blockIds.filter((b) => (s.blocks || {})[b]).map((b) => ({ id: b, type: s.blocks[b].type, defaults: defaultsOf(s.blocks[b].settings) })) };
    });
    const media = sections.reduce((n, s) => n + s.defaults.length + s.blocks.reduce((k, b) => k + b.defaults.length, 0), 0);
    templates.push({ id: base(f), file: f, kind: 'json', name: doc.name || '', sections, media, editedBy: editedBy([f]) });
  }
  for (const f of hbs.filter((x) => /^(templates|layout)\//.test(x))) {
    templates.push({ id: base(f), file: f, kind: f.startsWith('layout/') ? 'layout' : 'hbs', partials: includes[base(f)],
      links: linksIn(read(f)), lines: read(f).split('\n').length, editedBy: editedBy([f]) });
  }
  templates.sort((a, b) => (a.id < b.id ? -1 : 1));

  const usedBy = (id) => {
    const out = templates.filter((t) => t.kind === 'json' && t.sections.some((s) => s.type === id)).map((t) => t.id);
    for (const [part, list] of Object.entries(includes)) if (list.includes(id) && part !== id) out.push(part);
    return uniq(out).sort();
  };
  const hbsPart = (f) => {
    const src = read(f);
    const id = idOf(f);
    const classes = classesIn(src);
    const lines = src.split('\n').length;
    return { id, file: f, lines, minified: src.length > 3000 && src.length / lines > 300, marks: blockMarks(src), partials: includes[id], links: linksIn(src),
      style: styleIn(src), classes, styledIn: styledIn(classes, css), usedBy: usedBy(id) };
  };
  const sections = files.filter((f) => /^sections\/[^/]+\.hbs$/.test(f)).map((f) => {
    const p = hbsPart(f);
    const schemaFile = `sections/${p.id}.schema.json`;
    const schema = json(schemaFile);
    return Object.assign(p, {
      schemaFile: schema ? schemaFile : null,
      name: (schema && schema.name) || '',
      settings: ((schema && schema.settings) || []).filter((s) => s.id).map((s) => ({ id: s.id, label: s.label || '', type: s.type,
        options: (s.options || []).map((o) => (o && typeof o === 'object' ? o.value : o)) })),
      blockTypes: ((schema && schema.blocks) || []).map((b) => ({ type: b.type, name: b.name || '' })),
      editedBy: editedBy([f, schemaFile]),
    });
  });
  const snippets = files.filter((f) => /^snippets\/[^/]+\.hbs$/.test(f)).map((f) => Object.assign(hbsPart(f), { editedBy: editedBy([f]) }));

  const groups = json('config/settings_schema.json') || [];
  const data = ((json('config/settings_data.json') || {}).current) || {};
  const tokens = [];
  for (const g of Array.isArray(groups) ? groups : []) {
    for (const s of g.settings || []) {
      if (!s.id || !(s.type === 'color' || /font|radius/.test(s.id))) continue;
      const re = new RegExp('settings\\.' + esc(s.id) + '(?![\\w])');
      tokens.push({ id: s.id, label: s.label || '', where: `${g.name} › ${s.label || s.id}`, type: s.type,
        value: data[s.id] !== undefined ? data[s.id] : s.default, default: s.default,
        readBy: hbs.filter((f) => re.test(read(f))).map(base).sort() });
    }
  }
  const fonts = new Map();
  for (const c of css) for (const f of c.fonts) fonts.set(f.family, uniq([...(fonts.get(f.family) || []), f.weight]).sort((a, b) => a - b));
  const bp = new Map();
  for (const c of css) for (const px of c.breakpoints) bp.set(px, (bp.get(px) || 0) + 1);
  const design = {
    tokens,
    vars: uniq(css.flatMap((c) => c.vars)).slice(0, 12),
    fonts: [...fonts].map(([f, w]) => `${f} ${w.join(' ')}`),
    breakpoints: [...bp].map(([px, n]) => ({ px, n })).sort((a, b) => b.n - a.n || a.px - b.px).slice(0, 8),
    everyPage: (theme.assets || []).slice(),
    groups: (Array.isArray(groups) ? groups : []).filter((g) => (g.settings || []).length).map((g) => `${g.name} (${g.settings.length})`),
  };

  const hooks = HOOKS.map(([name, re]) => {
    for (const f of hbs) {
      const m = re.exec(read(f));
      if (m) return { name, file: f, line: lineAt(read(f), m.index) };
    }
    return { name, file: null, line: null };
  });
  const readme = has('README.md') ? read('README.md').split('\n').map((l, i) => [l, i + 1]).filter(([l]) => /^#{2,3}\s+\S/.test(l))
    .map(([l, line]) => ({ title: l.replace(/^#+\s+/, '').trim(), line })).slice(0, 14) : [];

  const parts = {};
  for (const s of sections) parts[s.id] = [s.file, ...(s.schemaFile ? [s.schemaFile] : [])];
  for (const s of snippets) parts[s.id] = parts[s.id] || [s.file];
  for (const t of templates) parts[t.id] = [t.file];
  for (const a of [...css, ...js]) parts[a.id] = parts[a.id] || [a.file];
  parts.design = ['config/settings_schema.json', 'config/settings_data.json'].filter(has);
  parts.sources = [...scripts];
  for (const c of css) delete c.src;

  return { dir: T, slug: path.basename(T), theme, files: shas, templates, sections, snippets, css, js, design, sources, srcFolders, srcFiles,
    hooks, readme, parts };
}

// ---- the map ------------------------------------------------------------------------------------------------------

function where(dir) {
  const root = path.resolve(__dirname, '..', '..');
  const rel = posix(path.relative(root, dir));
  return rel && !rel.startsWith('..') ? rel : path.basename(dir);
}

function templateRow(t) {
  if (t.kind !== 'json') return `| ${t.id}${t.kind === 'layout' ? ' (layout)' : ''} | ${cap(t.partials, 12).replace(/, /g, ' · ') || '—'} |`;
  const secs = t.sections.map((s) => `${s.id === s.type ? s.type : s.id + ':' + s.type}${s.skin ? `[skin=${s.skin}]` : ''}`
    + (s.blocks.length ? ` (${s.blocks.length} blocks)` : ''));
  return `| ${t.id} "${t.name}" | ${secs.join(' · ')}${t.media ? ` · ${t.media} default media` : ''} |`;
}

function sectionRow(s) {
  const types = uniq(s.marks.length ? s.marks.map((m) => m.type) : s.blockTypes.map((b) => b.type));
  const uses = [...s.partials, ...s.links.map(base)];
  const styled = s.styledIn.slice(0, 3).map((c) => c.id);
  if (s.style) styled.push(`<style> ${kb(s.style.bytes)}`);
  const edited = s.editedBy.map((e) => base(e.script) + (e.files.every((f) => f.endsWith('.schema.json')) ? ' (schema)' : ''));
  return `| ${s.id} | ${s.lines}${s.minified ? ' (minified)' : ''} | ${cap(types, 6) || '—'} | ${cap(uses, 5) || '—'} | ${styled.join(', ') || '—'} | ${edited.join(', ') || '—'} |`;
}

function sourcesLines(m) {
  if (!m.sources.length) return ['No build or patch scripts: the theme files are the source.'];
  const out = m.sources.map((s) => {
    const t = s.targets.length ? ' ' + cap(s.targets, 6) : '';
    if (s.kind === 'reads') return `- ${s.file}: a helper or check, does not edit the theme`;
    return `- ${s.file} ${s.kind}${t}${s.kind === 'patches' ? ' (anchored edits)' : ''} → edit the script, then run it`;
  });
  for (const f of m.srcFiles || []) {
    out.push(`- ${f.file}: ${f.readBy.length ? `source read by ${f.readBy.join(', ')} → edit it, then run that script` : 'not read by any script'}`);
  }
  for (const f of m.srcFolders) out.push(`- ${f.dir}/: ${f.files} source files of the scripts`);
  if (m.sources.some((s) => !s.committed)) {
    out.push('- WARNING: _work/ is not committed: the scripts there exist only on this machine. Move them to _src/.');
  }
  return out;
}

/** The generated part of design-map.md (everything before "## Notes"). */
function renderIndex(m) {
  const t = m.theme;
  const L = [];
  L.push(`# Design map: ${m.slug}`);
  L.push('<!-- Written by tools/theme-map.js from the theme\'s files. Edit only inside the notes blocks at the end; run the tool after every change. -->');
  L.push(`${t.name || m.slug} ${t.version || ''} · schema v${t.schemaVersion || '?'} · ${m.templates.length} templates · ${m.sections.length} sections · `
    + `${m.snippets.length} snippets · ${m.css.length} CSS · ${m.js.length} JS`);
  L.push(`One part in detail: \`node tools/theme-map.js ${where(m.dir)} --part <id>\` (a section, snippet, template or asset file name, \`design\`, \`sources\`).`);
  if (m.readme.length) L.push('README.md: ' + m.readme.map((r) => `${r.title} L${r.line}`).join(' · '));

  L.push('', '## Design');
  if (m.design.tokens.length) {
    L.push('| setting | value | Theme settings | read by |', '|---|---|---|---|');
    for (const k of m.design.tokens) L.push(`| ${k.id} | ${k.value === undefined || k.value === '' ? '—' : k.value} | ${k.where} | ${cap(k.readBy, 3) || '—'} |`);
  }
  if (m.design.vars.length) L.push('CSS variables: ' + m.design.vars.join(' · '));
  if (m.design.fonts.length) L.push('Fonts: ' + m.design.fonts.join(' · '));
  if (m.design.breakpoints.length) L.push('Breakpoints: ' + m.design.breakpoints.map((b) => `${b.px}px ×${b.n}`).join(' · '));
  if (m.design.everyPage.length) L.push('Every page (theme.json): ' + m.design.everyPage.map(base).join(', '));

  L.push('', '## Templates', '| template | sections in order |', '|---|---|', ...m.templates.map(templateRow));
  L.push('', '## Sections', '| section | lines | blocks | uses | styled in | edited by |', '|---|---|---|---|---|---|', ...m.sections.map(sectionRow));
  if (m.snippets.length) {
    L.push('', '## Snippets');
    for (const s of m.snippets) L.push(`- ${s.id} · ${s.lines} lines · used by ${cap(s.usedBy, 5) || '—'}${s.editedBy.length ? ' · edited by ' + s.editedBy.map((e) => base(e.script)).join(', ') : ''}`);
  }
  L.push('', '## Assets');
  for (const c of m.css) L.push(`- ${c.id} ${kb(c.bytes)}${c.minified ? ' minified' : ''} · linked by ${cap(uniq(c.linkedBy), 4) || '—'}`);
  for (const j of m.js) {
    L.push(j.core ? `- ${j.id}: platform core, never edit` : `- ${j.id} ${kb(j.bytes)}${j.minified ? ' minified' : ''} · linked by ${cap(uniq(j.linkedBy), 4) || '—'}`);
  }
  L.push('', '## Sources', ...sourcesLines(m));
  const found = m.hooks.filter((h) => h.file);
  const missing = m.hooks.filter((h) => !h.file);
  L.push('', '## Platform hooks', found.map((h) => `${h.name} ${base(h.file)}:${h.line}`).join(' · ')
    + (missing.length ? ` · missing: ${missing.map((h) => h.name).join(', ')}` : ''));
  return L.join('\n') + '\n';
}

function parseNotes(md) {
  const open = (md.match(/<!-- notes:/g) || []).length;
  const close = (md.match(/<!-- \/notes -->/g) || []).length;
  const blocks = [...md.matchAll(NOTE_BLOCK)].map((m) => ({ id: m[1], text: m[2] }));
  const ids = blocks.map((b) => b.id);
  if (open !== close || blocks.length !== open || new Set(ids).size !== ids.length) {
    throw new Error(`design map notes markers are broken (${open} "<!-- notes:<id> -->", ${close} "<!-- /notes -->", ids ${ids.join(', ')}): fix them by hand`);
  }
  return blocks;
}

/**
 * The whole map: generated part + notes. Notes stay by id; the notes of a part whose files changed since they were
 * last checked are flagged (unless their text changed too: then they count as checked). `ack`: ids (or 'all') checked now.
 */
function build(m, oldMd, oldStore, { today = new Date().toISOString().slice(0, 10), ack = [] } = {}) {
  const blocks = oldMd ? parseNotes(oldMd) : [];
  if (!blocks.some((b) => b.id === 'theme')) blocks.unshift({ id: 'theme', text: '' });
  const ordered = [blocks.find((b) => b.id === 'theme'), ...blocks.filter((b) => b.id !== 'theme' && m.parts[b.id]),
    ...blocks.filter((b) => b.id !== 'theme' && !m.parts[b.id])];
  const prevNotes = (oldStore && oldStore.notes) || {};
  const store = { version: 1, files: m.files, notes: {} };
  const flagged = [];
  const removed = [];
  const notes = ['## Notes', '<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->'];
  for (const b of ordered) {
    const files = b.id === 'theme' ? [] : m.parts[b.id];
    const live = b.id === 'theme' || !!files;
    const cur = Object.fromEntries((files || []).map((f) => [f, m.files[f] || null]));
    const text = sha1(b.text);
    const prev = prevNotes[b.id];
    let e;
    if (!prev || prev.text !== text || ack === 'all' || ack.includes(b.id)) e = { text, checked: cur, flagged: null };
    else {
      e = { text, checked: prev.checked || {}, flagged: prev.flagged || null };
      const changed = Object.keys(cur).filter((f) => e.checked[f] !== cur[f]);
      if (changed.length) e.flagged = { date: e.flagged ? e.flagged.date : today, files: uniq([...(e.flagged ? e.flagged.files : []), ...changed]).sort() };
    }
    if (!live || b.id === 'theme') e.flagged = null;
    store.notes[b.id] = e;
    let head = `### ${live ? '' : '(removed) '}${b.id}`;
    if (e.flagged) {
      flagged.push({ id: b.id, files: e.flagged.files });
      head += ` · REVIEW: ${cap(e.flagged.files, 3)} changed ${e.flagged.date} (check the notes, then --ack ${b.id})`;
    }
    if (!live) removed.push(b.id);
    notes.push(head, `<!-- notes:${b.id} -->`, b.text + '<!-- /notes -->');
  }
  return { md: renderIndex(m) + '\n' + notes.join('\n') + '\n', store, flagged, removed };
}

function stableJson(v) {
  const sort = (x) => (Array.isArray(x) ? x.map(sort) : x && typeof x === 'object'
    ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sort(x[k])])) : x);
  return JSON.stringify(sort(v), null, 1) + '\n';
}

// ---- one part -----------------------------------------------------------------------------------------------------

function styledLines(list) {
  return list.map((c) => (c.minified ? `${c.id} (minified: grep -o '\\.<class>[^}]*}' ${c.file})` : `${c.id} ${c.from}-${c.to} (${c.hits} hits)`)).join(' · ');
}

function hbsDetail(m, p, kind) {
  const L = [`${kind} ${p.id} · ${p.file} (${p.lines} lines)${p.schemaFile ? ' · schema ' + p.schemaFile : ''}`];
  L.push(`used by: ${p.usedBy.join(', ') || '—'}`);
  if (p.editedBy.length) L.push('edited by: ' + p.editedBy.map((e) => `${e.script} ${e.kind} ${e.files.map((x) => x + (e.at && e.at[x] ? ` (script lines ${e.at[x][0]}-${e.at[x][1]})` : '')).join(', ')}`).join(' · ') + ' → edit the script, then run it');
  if (p.settings && p.settings.length) {
    const s = p.settings.map((x) => `${x.id}${x.label ? ` "${x.label}"` : ''}${x.options.length ? ` [${x.options.map((o) => (o === '' ? '""' : o)).join('|')}]` : ''}`);
    L.push(`settings (${p.settings.length}): ${cap(s, 30)}`);
  }
  if (p.blockTypes && p.blockTypes.length) L.push(`block types (${p.blockTypes.length}): ${cap(p.blockTypes.map((b) => `${b.type}${b.name ? ` "${b.name}"` : ''}`), 30)}`);
  if (p.marks.length && !p.minified) L.push('blocks in the markup: ' + p.marks.map((b) => `${b.type} ${b.from}-${b.to}`).join(' · '));
  if (p.marks.length && p.minified) {
    L.push(`blocks in the markup (${p.lines}-line file, at character): ` + p.marks.map((b) => `${b.type} @${b.at}`).join(' · '));
    L.push(`open one: grep -o '${p.marks[0].text}.\\{0,1500\\}' ${p.file}`);
  }
  if (p.partials.length || p.links.length) L.push('uses: ' + [...p.partials, ...p.links].join(', '));
  if (p.style) L.push(`own <style>: ${kb(p.style.bytes)} from line ${p.style.line}`);
  if (p.classes.length) L.push('classes: ' + p.classes.map((c) => `.${c.name} ×${c.n}`).join(' '));
  if (p.styledIn.length) L.push('styled in: ' + styledLines(p.styledIn).replace(/<class>/g, p.classes[0] ? esc(p.classes[0].name) : '<class>'));
  const hooks = m.hooks.filter((h) => h.file === p.file);
  if (hooks.length) L.push('platform hooks: ' + hooks.map((h) => `${h.name} ${h.line}`).join(' · '));
  return L.join('\n');
}

function templateDetail(t) {
  const L = [`template ${t.id}${t.name ? ` "${t.name}"` : ''} · ${t.file}${t.kind === 'layout' ? ' (layout)' : ''}`];
  if (t.editedBy.length) L.push('edited by: ' + t.editedBy.map((e) => `${e.script} ${e.kind} ${e.files.map((x) => x + (e.at && e.at[x] ? ` (script lines ${e.at[x][0]}-${e.at[x][1]})` : '')).join(', ')}`).join(' · ') + ' → edit the script, then run it');
  if (t.kind !== 'json') {
    L.push('partials: ' + (t.partials.join(', ') || '—'));
    if (t.links.length) L.push('links: ' + t.links.join(', '));
    return L.join('\n');
  }
  for (const s of t.sections) {
    L.push(`${s.id}: ${s.type}${s.skin ? ` [skin=${s.skin}]` : ''}${s.settings.length ? ` · settings ${cap(s.settings, 12)}` : ''}`
      + (s.defaults.length ? ' · ' + s.defaults.join(' · ') : ''));
    if (s.blocks.length) L.push('  ' + s.blocks.map((b) => `${b.id}: ${b.type}${b.defaults.length ? ' · ' + b.defaults.join(' · ') : ''}`).join(' · '));
  }
  return L.join('\n');
}

function partIds(m) {
  return uniq([...m.sections, ...m.snippets, ...m.templates, ...m.css, ...m.js].map((p) => p.id).concat(['design', 'sources']));
}

/** The detail of one part, or null. */
function part(m, id) {
  const sec = m.sections.find((s) => s.id === id);
  if (sec) return hbsDetail(m, sec, 'section');
  const sn = m.snippets.find((s) => s.id === id);
  if (sn) return hbsDetail(m, sn, 'snippet');
  const t = m.templates.find((x) => x.id === id);
  if (t) return templateDetail(t);
  const c = m.css.find((x) => x.id === id);
  if (c) {
    return [`css ${c.id} · ${c.file} ${kb(c.bytes)}${c.minified ? ' minified' : `, ${c.lines} lines`} · linked by ${uniq(c.linkedBy).join(', ') || '—'}`,
      c.vars.length ? 'variables: ' + c.vars.join(' · ') : '', c.fonts.length ? 'fonts: ' + c.fonts.map((f) => `${f.family} ${f.weight}`).join(' · ') : '',
      c.breakpoints.length ? 'breakpoints: ' + uniq(c.breakpoints).sort((a, b) => a - b).join(', ') : ''].filter(Boolean).join('\n');
  }
  const j = m.js.find((x) => x.id === id);
  if (j) {
    return [`js ${j.id} · ${j.file} ${kb(j.bytes)}${j.minified ? ' minified' : ''} · linked by ${uniq(j.linkedBy).join(', ') || '—'}`,
      j.core ? 'platform core: never edit' : '', j.hooks.length ? 'hooks: ' + j.hooks.map((h) => `[${h}]`).join(' ') : ''].filter(Boolean).join('\n');
  }
  if (id === 'design') {
    const L = ['design · config/settings_schema.json, config/settings_data.json'];
    for (const k of m.design.tokens) {
      L.push(`${k.id.padEnd(22)} ${String(k.value === undefined ? '—' : k.value).padEnd(10)} ${k.where}${k.default !== undefined && k.default !== k.value ? ` (default ${k.default})` : ''}`
        + (k.readBy.length ? ` · read by ${cap(k.readBy, 6)}` : ''));
    }
    if (m.design.vars.length) L.push('CSS variables: ' + m.design.vars.join(' · '));
    if (m.design.fonts.length) L.push('fonts: ' + m.design.fonts.join(' · '));
    if (m.design.groups.length) L.push('Theme settings groups: ' + m.design.groups.join(', '));
    return L.join('\n');
  }
  if (id === 'sources') {
    return ['sources', ...m.sources.map((s) => `${s.file} ${s.kind}: ${s.targets.map((x) => x + (s.lines && s.lines[x] ? ` ${s.lines[x][0]}-${s.lines[x][1]}` : '')).join(', ') || '—'}`), ...sourcesLines(m).filter((l) => /WARNING|_src\/[^ ]+\/:/.test(l))].join('\n');
  }
  return null;
}

module.exports = { scan, renderIndex, build, parseNotes, part, partIds, stableJson };
