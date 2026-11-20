#!/usr/bin/env node
/*
 * What one Claude Code session cost: API calls, tokens, cost units, and where they went (per tool, per step of the
 * store-page-from-link skill or of theme work, per request of the user). Made to measure the skills
 * (docs/SPEC-store-page-token-cost.md, docs/SPEC-cost-meter.md).
 *
 *   node tools/transcript-cost.js <session.jsonl> [--by-request] [--fresh] [--prompts] [--json] [--since <iso time>]
 *   node tools/transcript-cost.js --project D:\shopdy-promax --latest …
 *   node tools/transcript-cost.js --project D:\shopdy-promax --title "<part of the session name>" …
 *
 *   --by-request  one row per request of the user: calls, cost, context first → last call, images, reads of theme /
 *                 shopdy code, interrupted, compacted
 *   --fresh       the cost if every request had been a new session (same calls; each request starts again from the
 *                 context of the session's first call): what /clear between requests would have saved
 *   --prompts     the first 60 characters of each request (otherwise no word of the user is printed)
 *
 * Cost units = input + cache write × 1.25 + cache read × 0.1 + output × 5 (the price ratios of the API), so runs can
 * be compared whatever the model. Every API call re-reads the whole context, so cost ≈ calls × context size.
 * Prints numbers and command names only, never what was said or read (except --prompts).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const WEIGHTS = { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 };
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
// The shopdy-promax source, outside the installed skill (`.claude/`).
const SHOPDY_CODE = /(^|[\s"'\\/=])(apps|packages)[\\/]/;
// Theme work in d:\source-theme (tested on text with "/" separators).
const THEME_PATH = /(^|[\s"'=/:])(themes\/[^/\s"']+|base-theme)(\/|[\s"']|$)/;
const DESIGN_MAP = /(^|[\s"'/])_map\//;
const TOOL = /(?:^|[\s"'/\\])tools[\\/]([a-z][a-z0-9-]*)\.js\b/;
const THEME_SCRIPT = /\bnode\s+["']?(?:[^\s"']*[\\/])?_(?:work|src)[\\/][^\s"']+\.js\b/;
const TEMP_DIR = /scratchpad|[\\/]Temp[\\/]|\/tmp\//i;
const RUN_JS = /\bnode\s+["']?[^\s"']+\.js\b/;
const WEB = /\b(curl|wget|Invoke-WebRequest|iwr|Invoke-RestMethod)\b[^|;&]*?https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/i;
const READER = /(^|[\s;&|(])(grep|rg|sed|cat|head|tail|awk|wc|Select-String|Get-Content|node\s+-[ep]?)(\s|$)/;
const WRITER = /\bcat\s*>>?|\btee\s|\bsed\s+-i|writeFileSync|Set-Content|Add-Content|Out-File/;

const norm = (p) => String(p || '').replace(/\\/g, '/');

/**
 * The step a tool call belongs to: a command of a skill or tool, or the kind of read / write. `cwd` (the transcript
 * line's) places a search that names no path.
 */
function classify(name, input = {}, cwd = '') {
  if (name === 'Bash' || name === 'PowerShell') {
    const cmd = String(input.command || '');
    const n = norm(cmd);
    let m = /fetch_competitor\.py/.exec(cmd);
    if (m) return 'fetch';
    m = /\b(shopdy|plan|catalog)\.py"?\s+([a-z][a-z-]*)/.exec(cmd);
    if (m) return `${m[1]} ${m[2]}`;
    if (/\bstatus\.py\b/.test(cmd)) return 'status';
    m = TOOL.exec(cmd);
    if (m) return m[1] === 'theme-map' && /--part\b/.test(cmd) ? 'read design map' : `tool ${m[1]}`;
    if (THEME_SCRIPT.test(cmd)) return 'theme script';
    if (RUN_JS.test(cmd) && TEMP_DIR.test(cmd)) return 'temp script';
    if (WEB.test(cmd)) return 'fetch web';
    if (SHOPDY_CODE.test(cmd) && !/\.claude[\\/]skills/.test(cmd)) return 'read shopdy code';
    if (THEME_PATH.test(n) || THEME_PATH.test(norm(cwd) + '/')) { // the command names a theme, or runs inside one
      if (WRITER.test(cmd)) return 'write';
      if (DESIGN_MAP.test(n)) return 'read design map';
      if (READER.test(cmd)) return 'read theme code';
    }
    return 'shell';
  }
  if (name === 'Read') {
    const p = norm(input.file_path);
    if (IMAGE_EXT.test(p)) return 'read image';
    if (/\/skills\/[^/]+\/scripts\/[^/]+\.py$/.test(p)) return 'read skill script';
    if (/\/skills\/[^/]+\/(references\/|SKILL\.md$)/.test(p)) return 'read skill reference';
    if (DESIGN_MAP.test(p)) return 'read design map';
    // A theme's files, its source scripts included; what _work/ holds besides them is downloaded or generated data.
    if (THEME_PATH.test(p) && !/\/_work\/.+\//.test(p)) return 'read theme code';
    if (/\/_work\//.test(p)) return 'read job file';
    if (!/\/\.claude\//.test(p) && /\/(apps|packages)\//.test(p)) return 'read shopdy code';
    return 'read other';
  }
  if (name === 'Grep' || name === 'Glob') {
    const p = norm(input.path || cwd);
    if (DESIGN_MAP.test(p)) return 'read design map';
    if (THEME_PATH.test(p)) return 'read theme code';
    if (/\/\.claude\//.test(p) || /_work/.test(p)) return 'search skill';
    return !p || /shopdy-promax/i.test(p) ? 'read shopdy code' : 'search other';
  }
  if (name === 'WebFetch' || name === 'WebSearch') return 'fetch web';
  if (name === 'Write' || name === 'Edit') return 'write';
  if (name === 'AskUserQuestion') return 'ask';
  return name;
}

const NOT_A_REQUEST = /^<(task-notification|system-reminder|local-command-caveat|bash-)/;
const LOCAL_OUTPUT = /^<local-command-(stdout|stderr)/;
const INTERRUPTED = /^\[Request interrupted by user/;

/**
 * What a user line is: { kind: 'request', text, cmd, images } · { kind: 'interrupted' } · { kind: 'local' } (the output
 * of a local command such as /model) · null (tool results, skill bodies, notifications, compact summaries).
 */
function userLine(o) {
  if (o.type !== 'user' || !o.message || o.isMeta || o.isCompactSummary) return null;
  const c = o.message.content;
  let text = '';
  let images = 0;
  if (typeof c === 'string') text = c;
  else if (Array.isArray(c)) {
    if (c.some((b) => b.type === 'tool_result')) return null;
    text = c.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
    images = c.filter((b) => b.type === 'image').length;
  }
  text = text.trim();
  if (!text && !images) return null;
  if (INTERRUPTED.test(text)) return { kind: 'interrupted' };
  if (LOCAL_OUTPUT.test(text)) return { kind: 'local' };
  if (NOT_A_REQUEST.test(text)) return null;
  let cmd = null;
  const named = /<command-name>\s*(\/[^<\s]+)\s*<\/command-name>/.exec(text);
  if (named) {
    cmd = named[1];
    const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text);
    text = (cmd + ' ' + (args ? args[1] : '')).trim();
  } else if (/^\/[a-z][\w:-]*/i.test(text)) cmd = text.split(/\s/)[0];
  return { kind: 'request', text: text.replace(/\s+/g, ' '), cmd, images };
}

function parseLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* a cut-off last line */ }
  }
  return out;
}

/**
 * Summary of one transcript (the text of a .jsonl file). `prompts: true` keeps the first 60 characters of each request
 * (`requests[].prompt`); otherwise no word of the user is kept.
 */
function summarize(text, { since = null, prompts = false } = {}) {
  const entries = parseLines(text).filter((o) => !since || !o.timestamp || o.timestamp >= since);
  const calls = new Map(); // requestId|message.id → { usage, tools: [{name, input, step}], req }
  const toolSteps = new Map(); // tool_use id → step
  const models = new Set();
  const requests = [];
  let req = null;
  let first = null;
  let last = null;
  let images = 0;
  const newRequest = (at, line) => {
    req = { n: 0, at, cmd: line ? line.cmd : null, calls: 0, cost: 0, context: { start: null, end: 0 }, images: 0,
      themeReads: 0, shopdyReads: 0, interrupted: false, compacted: false };
    if (prompts) req.prompt = line ? line.text.slice(0, 60).trimEnd() : '';
    requests.push(req);
  };

  for (const o of entries) {
    if (o.timestamp) { first = first || o.timestamp; last = o.timestamp; }
    if (o.type === 'system' && o.subtype === 'compact_boundary' && req) req.compacted = true;
    const msg = o.message;
    if (!msg) continue;
    const line = userLine(o);
    if (line && line.kind === 'request') newRequest(o.timestamp, line);
    else if (line && line.kind === 'interrupted' && req) req.interrupted = true;
    else if (line && line.kind === 'local' && req && req.cmd && !req.calls) {
      // a local command (/model, /cost …): no API call, not a request
      requests.pop();
      req = requests[requests.length - 1] || null;
    }
    if (o.type === 'assistant' && msg.usage) {
      const key = `${o.requestId || ''}|${msg.id || o.uuid}`;
      if (!calls.has(key)) {
        if (!req) newRequest(o.timestamp, null);
        calls.set(key, { usage: msg.usage, tools: [], req });
      }
      const c = calls.get(key);
      c.usage = msg.usage; // the last line of a call carries its final usage
      if (msg.model) models.add(msg.model);
      for (const b of msg.content || []) {
        if (b.type !== 'tool_use') continue;
        const step = classify(b.name, b.input, o.cwd);
        c.tools.push({ name: b.name, step });
        toolSteps.set(b.id, step);
        if (step === 'read theme code') c.req.themeReads++;
        if (step === 'read shopdy code') c.req.shopdyReads++;
      }
    }
    if (o.type === 'user' && Array.isArray(msg.content)) {
      let n = 0;
      for (const b of msg.content) {
        if (b.type === 'image') n++;
        if (b.type === 'tool_result' && Array.isArray(b.content)) n += b.content.filter((p) => p.type === 'image').length;
      }
      images += n;
      if (req) req.images += n;
    }
  }

  const list = [...calls.values()];
  const tokens = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  const callCost = (u) => (u.input_tokens || 0) * WEIGHTS.input + (u.cache_creation_input_tokens || 0) * WEIGHTS.cacheWrite
    + (u.cache_read_input_tokens || 0) * WEIGHTS.cacheRead + (u.output_tokens || 0) * WEIGHTS.output;
  const contextOf = (u) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  let costUnits = 0;
  let maxContext = 0;
  let sumContext = 0;
  const steps = new Map();
  const tools = new Map();
  // A new session per request: the same calls, but each request starts again from the session's first context.
  const baseContext = list.length ? contextOf(list[0].usage) : 0;
  const low = new Map(); // request → smallest context so far (a compaction inside a request starts it again)
  let freshUnits = 0;
  for (const c of list) {
    const u = c.usage;
    tokens.input += u.input_tokens || 0;
    tokens.cacheWrite += u.cache_creation_input_tokens || 0;
    tokens.cacheRead += u.cache_read_input_tokens || 0;
    tokens.output += u.output_tokens || 0;
    const cost = callCost(u);
    const ctx = contextOf(u);
    costUnits += cost;
    maxContext = Math.max(maxContext, ctx);
    sumContext += ctx;
    const r = c.req;
    r.calls++;
    r.cost += cost;
    if (ctx) { // a synthetic message (API error, "no response requested") has no tokens and no context
      if (r.context.start === null) r.context.start = ctx;
      r.context.end = ctx;
      low.set(r, Math.min(low.has(r) ? low.get(r) : ctx, ctx));
      const freshCtx = baseContext + ctx - low.get(r);
      const written = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      freshUnits += callCost({ ...u, cache_read_input_tokens: Math.max(0, freshCtx - written) });
    }
    // A call is put under the step of its first tool call; a call without tools is the answer to the user.
    const step = c.tools.length ? c.tools[0].step : 'answer';
    const s = steps.get(step) || { step, calls: 0, cost: 0 };
    s.calls++;
    s.cost += cost;
    steps.set(step, s);
    for (const t of c.tools) {
      const e = tools.get(t.step) || { step: t.step, uses: 0 };
      e.uses++;
      tools.set(t.step, e);
    }
  }
  const uses = (step) => (tools.get(step) || { uses: 0 }).uses;
  const pct = (v) => (costUnits ? Math.round((1000 * v) / costUnits) / 10 : 0);
  return {
    calls: list.length,
    from: first,
    to: last,
    minutes: first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 60000) : 0,
    models: [...models],
    tokens,
    costUnits: Math.round(costUnits),
    context: { max: maxContext, avg: list.length ? Math.round(sumContext / list.length) : 0 },
    reads: { shopdyCode: uses('read shopdy code'), skillScripts: uses('read skill script'), images },
    bySteps: [...steps.values()].sort((a, b) => b.cost - a.cost)
      .map((s) => ({ step: s.step, calls: s.calls, costPct: pct(s.cost) })),
    byTools: [...tools.values()].sort((a, b) => b.uses - a.uses),
    requests: requests.map((r, i) => {
      const { cost, ...rest } = r;
      return { ...rest, n: i + 1, costUnits: Math.round(cost), costPct: pct(cost) };
    }),
    fresh: { costUnits: Math.round(freshUnits), baseContext, pct: costUnits ? Math.round((100 * freshUnits) / costUnits) : 0 },
  };
}

/**
 * The sessions of a project whose name contains `text` (no case): its last custom title, else its last AI title.
 * → [{ file, title }], newest first.
 */
function findByTitle(projectDir, text, projectsRoot = path.join(os.homedir(), '.claude', 'projects')) {
  const folder = projectFolder(projectDir, projectsRoot);
  const want = String(text).toLowerCase();
  const out = [];
  for (const file of transcripts(folder)) {
    const src = fs.readFileSync(file, 'utf8');
    const last = (key) => {
      let t = null;
      for (const m of src.matchAll(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`, 'g'))) t = m[1];
      return t === null ? null : JSON.parse(`"${t}"`);
    };
    const title = last('customTitle') || last('aiTitle');
    if (title && title.toLowerCase().includes(want)) out.push({ file, title });
  }
  return out;
}

/** Claude Code keeps a project's transcripts in ~/.claude/projects/<the path with every non-alphanumeric as "-">. */
function projectFolderName(dir) {
  return path.resolve(dir).replace(/[^a-zA-Z0-9]/g, '-');
}

/** The transcript folder of a project (its name is matched without case). */
function projectFolder(projectDir, projectsRoot) {
  const want = projectFolderName(projectDir).toLowerCase();
  const folder = fs.existsSync(projectsRoot)
    ? fs.readdirSync(projectsRoot).find((n) => n.toLowerCase() === want) : null;
  if (!folder) throw new Error(`no transcript folder for ${projectDir} in ${projectsRoot}`);
  return path.join(projectsRoot, folder);
}

/** The .jsonl files of a folder, newest first. */
function transcripts(folder) {
  return fs.readdirSync(folder)
    .filter((n) => n.endsWith('.jsonl'))
    .map((n) => path.join(folder, n))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function findLatest(projectDir, projectsRoot = path.join(os.homedir(), '.claude', 'projects')) {
  const folder = projectFolder(projectDir, projectsRoot);
  const files = transcripts(folder);
  if (!files.length) throw new Error(`no transcript in ${folder}`);
  return files[0];
}

const n = (v) => v.toLocaleString('en-US');
const k = (v) => Math.round(v / 1000) + 'k';
const span = (c) => (c.start === null ? '-' : `${k(c.start)}→${k(c.end)}`);

function report(file, s, { byRequest = false, fresh = false } = {}) {
  const lines = [
    `transcript  ${file}`,
    `time        ${s.from || '?'} → ${s.to || '?'} (${s.minutes} min) · model ${s.models.join(', ') || '?'}`,
    `calls       ${s.calls} · context max ${n(s.context.max)} · avg ${n(s.context.avg)}`,
    `tokens      input ${n(s.tokens.input)} · cache write ${n(s.tokens.cacheWrite)} · cache read ${n(s.tokens.cacheRead)} · output ${n(s.tokens.output)}`,
    `cost units  ${n(s.costUnits)}  (input + cache write×1.25 + cache read×0.1 + output×5)`,
    ...(fresh ? [`fresh       ${n(s.fresh.costUnits)} cost units if each request were a new session (${s.fresh.pct}% of ${n(s.costUnits)})`] : []),
    `reads       shopdy code ${s.reads.shopdyCode} · skill scripts ${s.reads.skillScripts} · images ${s.reads.images}`,
    '',
    'by step (a call counts under its first tool)   calls   cost',
    ...s.bySteps.map((r) => `  ${r.step.padEnd(44)} ${String(r.calls).padStart(5)} ${String(r.costPct.toFixed(1)).padStart(6)}%`),
    '',
    'tool uses',
    ...s.byTools.map((r) => `  ${r.step.padEnd(44)} ${String(r.uses).padStart(5)}`),
  ];
  if (byRequest) {
    const cut = (t, w) => (t.length > w ? t.slice(0, w - 1) + '…' : t);
    lines.push('', `requests    ${s.requests.length} (${s.requests.filter((r) => r.interrupted).length} interrupted)`,
      '    #  time         cmd                   calls    cost  context      img  theme  shopdy');
    for (const r of s.requests) {
      const notes = [r.interrupted && 'interrupted', r.compacted && 'compacted'].filter(Boolean).join(', ');
      lines.push(`  ${String(r.n).padStart(3)}  ${(r.at || '').slice(5, 16).replace('T', ' ').padEnd(11)}  ${cut(r.cmd || '—', 20).padEnd(20)}`
        + ` ${String(r.calls).padStart(6)} ${(r.costPct.toFixed(1) + '%').padStart(7)}  ${span(r.context).padEnd(11)}`
        + ` ${String(r.images).padStart(4)} ${String(r.themeReads).padStart(6)} ${String(r.shopdyReads).padStart(7)}${notes ? '  ' + notes : ''}`);
      if ('prompt' in r) lines.push(`       > ${r.prompt}`);
    }
  }
  return lines.join('\n');
}

const USAGE = 'usage: node tools/transcript-cost.js <session.jsonl> | --project <dir> (--latest | --title <text>)'
  + '  [--by-request] [--fresh] [--prompts] [--json] [--since <iso>]';

function main() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const json = args.includes('--json');
  const since = opt('--since');
  const project = opt('--project');
  const title = opt('--title');
  const valued = new Set([since, project, title].filter(Boolean));
  const positional = args.filter((a) => !a.startsWith('--') && !valued.has(a));
  let file;
  try {
    if (project && title) {
      const found = findByTitle(project, title);
      if (!found.length) throw new Error(`no session of ${project} has "${title}" in its name`);
      if (found.length > 1) {
        console.log(found.map((m) => `${m.file}  ${m.title}`).join('\n'));
        throw new Error(`${found.length} sessions match "${title}": give one of the files above`);
      }
      file = found[0].file;
    } else if (project && args.includes('--latest')) file = findLatest(project);
    else if (positional[0]) file = path.resolve(positional[0]);
    else throw new Error('give a transcript file, or --project <dir> --latest | --title <text>');
    const s = summarize(fs.readFileSync(file, 'utf8'), { since, prompts: args.includes('--prompts') });
    console.log(json ? JSON.stringify({ file, ...s }, null, 2)
      : report(file, s, { byRequest: args.includes('--by-request'), fresh: args.includes('--fresh') }));
  } catch (err) {
    console.error(`transcript-cost: ${err.message}`);
    console.error(USAGE);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { summarize, classify, projectFolderName, findLatest, findByTitle };
