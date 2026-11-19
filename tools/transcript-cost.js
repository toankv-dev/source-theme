#!/usr/bin/env node
/*
 * What one Claude Code session cost: API calls, tokens, cost units, and where they went (per tool and per step of
 * the store-page-from-link skill). Made to measure the skill (docs/SPEC-store-page-token-cost.md).
 *
 *   node tools/transcript-cost.js <session.jsonl> [--json] [--since <iso time>]
 *   node tools/transcript-cost.js --project D:\shopdy-promax --latest [--json] [--since <iso time>]
 *
 * Cost units = input + cache write × 1.25 + cache read × 0.1 + output × 5 (the price ratios of the API), so runs can
 * be compared whatever the model. Every API call re-reads the whole context, so cost ≈ calls × context size.
 * Prints numbers and command names only, never what was said or read.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const WEIGHTS = { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 };
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
// The shopdy-promax source, outside the installed skill (`.claude/`).
const SHOPDY_CODE = /(^|[\s"'\\/=])(apps|packages)[\\/]/;

const norm = (p) => String(p || '').replace(/\\/g, '/');

/** The step a tool call belongs to: a command of the skill, or the kind of read / write. */
function classify(name, input = {}) {
  if (name === 'Bash' || name === 'PowerShell') {
    const cmd = String(input.command || '');
    let m = /fetch_competitor\.py/.exec(cmd);
    if (m) return 'fetch';
    m = /\b(shopdy|plan|catalog)\.py"?\s+([a-z][a-z-]*)/.exec(cmd);
    if (m) return `${m[1]} ${m[2]}`;
    if (/\bstatus\.py\b/.test(cmd)) return 'status';
    if (SHOPDY_CODE.test(cmd) && !/\.claude[\\/]skills/.test(cmd)) return 'read shopdy code';
    return 'shell';
  }
  if (name === 'Read') {
    const p = norm(input.file_path);
    if (IMAGE_EXT.test(p)) return 'read image';
    if (/\/skills\/[^/]+\/scripts\/[^/]+\.py$/.test(p)) return 'read skill script';
    if (/\/skills\/[^/]+\/(references\/|SKILL\.md$)/.test(p)) return 'read skill reference';
    if (/\/_work\//.test(p)) return 'read job file';
    if (!/\/\.claude\//.test(p) && /\/(apps|packages)\//.test(p)) return 'read shopdy code';
    return 'read other';
  }
  if (name === 'Grep' || name === 'Glob') {
    const p = norm(input.path);
    return /\/\.claude\//.test(p) || /_work/.test(p) ? 'search skill' : 'read shopdy code';
  }
  if (name === 'Write' || name === 'Edit') return 'write';
  if (name === 'AskUserQuestion') return 'ask';
  return name;
}

function parseLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* a cut-off last line */ }
  }
  return out;
}

/** Summary of one transcript (the text of a .jsonl file). */
function summarize(text, { since = null } = {}) {
  const entries = parseLines(text).filter((o) => !since || !o.timestamp || o.timestamp >= since);
  const calls = new Map(); // requestId|message.id → { usage, tools: [{name, input, step}] }
  const toolSteps = new Map(); // tool_use id → step
  const models = new Set();
  let first = null;
  let last = null;
  let images = 0;

  for (const o of entries) {
    if (o.timestamp) { first = first || o.timestamp; last = o.timestamp; }
    const msg = o.message;
    if (!msg) continue;
    if (o.type === 'assistant' && msg.usage) {
      const key = `${o.requestId || ''}|${msg.id || o.uuid}`;
      if (!calls.has(key)) calls.set(key, { usage: msg.usage, tools: [] });
      const c = calls.get(key);
      c.usage = msg.usage; // the last line of a call carries its final usage
      if (msg.model) models.add(msg.model);
      for (const b of msg.content || []) {
        if (b.type !== 'tool_use') continue;
        const step = classify(b.name, b.input);
        c.tools.push({ name: b.name, step });
        toolSteps.set(b.id, step);
      }
    }
    if (o.type === 'user' && Array.isArray(msg.content)) {
      for (const b of msg.content) {
        if (b.type === 'image') images++;
        if (b.type === 'tool_result' && Array.isArray(b.content)) images += b.content.filter((p) => p.type === 'image').length;
      }
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
  for (const c of list) {
    const u = c.usage;
    tokens.input += u.input_tokens || 0;
    tokens.cacheWrite += u.cache_creation_input_tokens || 0;
    tokens.cacheRead += u.cache_read_input_tokens || 0;
    tokens.output += u.output_tokens || 0;
    const cost = callCost(u);
    costUnits += cost;
    maxContext = Math.max(maxContext, contextOf(u));
    sumContext += contextOf(u);
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
  };
}

/** Claude Code keeps a project's transcripts in ~/.claude/projects/<the path with every non-alphanumeric as "-">. */
function projectFolderName(dir) {
  return path.resolve(dir).replace(/[^a-zA-Z0-9]/g, '-');
}

function findLatest(projectDir, projectsRoot = path.join(os.homedir(), '.claude', 'projects')) {
  const want = projectFolderName(projectDir).toLowerCase();
  const folder = fs.existsSync(projectsRoot)
    ? fs.readdirSync(projectsRoot).find((n) => n.toLowerCase() === want) : null;
  if (!folder) throw new Error(`no transcript folder for ${projectDir} in ${projectsRoot}`);
  const files = fs.readdirSync(path.join(projectsRoot, folder))
    .filter((n) => n.endsWith('.jsonl'))
    .map((n) => path.join(projectsRoot, folder, n))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!files.length) throw new Error(`no transcript in ${path.join(projectsRoot, folder)}`);
  return files[0];
}

function report(file, s) {
  const n = (v) => v.toLocaleString('en-US');
  const lines = [
    `transcript  ${file}`,
    `time        ${s.from || '?'} → ${s.to || '?'} (${s.minutes} min) · model ${s.models.join(', ') || '?'}`,
    `calls       ${s.calls} · context max ${n(s.context.max)} · avg ${n(s.context.avg)}`,
    `tokens      input ${n(s.tokens.input)} · cache write ${n(s.tokens.cacheWrite)} · cache read ${n(s.tokens.cacheRead)} · output ${n(s.tokens.output)}`,
    `cost units  ${n(s.costUnits)}  (input + cache write×1.25 + cache read×0.1 + output×5)`,
    `reads       shopdy code ${s.reads.shopdyCode} · skill scripts ${s.reads.skillScripts} · images ${s.reads.images}`,
    '',
    'by step (a call counts under its first tool)   calls   cost',
    ...s.bySteps.map((r) => `  ${r.step.padEnd(44)} ${String(r.calls).padStart(5)} ${String(r.costPct.toFixed(1)).padStart(6)}%`),
    '',
    'tool uses',
    ...s.byTools.map((r) => `  ${r.step.padEnd(44)} ${String(r.uses).padStart(5)}`),
  ];
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const json = args.includes('--json');
  const since = opt('--since');
  const project = opt('--project');
  const valued = new Set([opt('--since'), opt('--project')].filter(Boolean));
  const positional = args.filter((a) => !a.startsWith('--') && !valued.has(a));
  let file;
  try {
    if (project && args.includes('--latest')) file = findLatest(project);
    else if (positional[0]) file = path.resolve(positional[0]);
    else throw new Error('give a transcript file, or --project <dir> --latest');
    const s = summarize(fs.readFileSync(file, 'utf8'), { since });
    console.log(json ? JSON.stringify({ file, ...s }, null, 2) : report(file, s));
  } catch (err) {
    console.error(`transcript-cost: ${err.message}`);
    console.error('usage: node tools/transcript-cost.js <session.jsonl> | --project <dir> --latest  [--json] [--since <iso>]');
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { summarize, classify, projectFolderName, findLatest };
