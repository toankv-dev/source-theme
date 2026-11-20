'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode, ROOT } = require('./helpers');
const { summarize, classify, projectFolderName, findLatest } = require('../transcript-cost');

const SCRIPT = path.join(ROOT, 'tools', 'transcript-cost.js');
const SKILL = 'D:\\shopdy-promax\\.claude\\skills\\store-page-from-link';

const usage = (input, write, read, output) => ({
  input_tokens: input, cache_creation_input_tokens: write, cache_read_input_tokens: read, output_tokens: output,
});
const assistant = (requestId, id, ts, content, u) => ({
  type: 'assistant', requestId, timestamp: ts, message: { id, role: 'assistant', model: 'claude-opus-5-5', content, usage: u },
});
const result = (ts, toolUseId, content) => ({
  type: 'user', timestamp: ts, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content }] },
});
const toolUse = (id, name, input) => ({ type: 'tool_use', id, name, input });

// Three API calls. The first is written as two lines with the same message id (text, then a tool call): the usage of
// the last line counts, once.
function transcript() {
  return [
    { type: 'user', timestamp: '2026-11-12T07:00:00.000Z', message: { role: 'user', content: '/store-page-from-link https://x.test/p' } },
    assistant('r1', 'm1', '2026-11-12T07:00:01.000Z', [{ type: 'text', text: 'secret page words' }], usage(10, 100, 1000, 5)),
    assistant('r1', 'm1', '2026-11-12T07:00:02.000Z',
      [toolUse('t1', 'Read', { file_path: 'D:\\shopdy-promax\\apps\\api\\src\\features\\store-pages\\x.ts' })],
      usage(10, 100, 1000, 20)),
    result('2026-11-12T07:00:03.000Z', 't1', 'export const x = 1;'),
    assistant('r2', 'm2', '2026-11-12T07:00:04.000Z',
      [toolUse('t2', 'Read', { file_path: `${SKILL}\\_work\\job\\source\\screens\\desktop-01.png` }),
        toolUse('t3', 'Bash', { command: 'grep -n "scopeBlockCss" packages/shared-types/src/domain/free-html.ts' })],
      usage(1, 50, 2000, 10)),
    result('2026-11-12T07:00:05.000Z', 't2', [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA==' } }]),
    result('2026-11-12T07:00:06.000Z', 't3', '12: export function scopeBlockCss'),
    assistant('r3', 'm3', '2026-11-12T07:10:00.000Z',
      [toolUse('t4', 'Bash', { command: 'python -I .claude/skills/store-page-from-link/scripts/shopdy.py build --job j --plan p.json' }),
        toolUse('t5', 'Read', { file_path: `${SKILL}\\scripts\\shopdy.py` })],
      usage(2, 30, 3000, 100)),
    result('2026-11-12T07:10:01.000Z', 't4', '{"ran": 3}'),
    result('2026-11-12T07:10:02.000Z', 't5', 'def main(): ...'),
  ].map((o) => JSON.stringify(o)).join('\n') + '\n{not json\n';
}

test('summarize counts each API call once and adds up its final usage', () => {
  const s = summarize(transcript());
  assert.equal(s.calls, 3);
  assert.deepEqual(s.tokens, { input: 13, cacheWrite: 180, cacheRead: 6000, output: 130 });
  // 13 + 180×1.25 + 6000×0.1 + 130×5
  assert.equal(s.costUnits, 13 + 225 + 600 + 650);
  assert.equal(s.context.max, 3032);
  assert.equal(s.models.join(), 'claude-opus-5-5');
  assert.equal(s.minutes, 10);
});

test('summarize counts reads of shopdy code, of the skill scripts and pictures', () => {
  const s = summarize(transcript());
  assert.equal(s.reads.shopdyCode, 2, 'one Read of apps/, one grep in packages/');
  assert.equal(s.reads.skillScripts, 1);
  assert.equal(s.reads.images, 1);
  const steps = Object.fromEntries(s.bySteps.map((r) => [r.step, r.calls]));
  assert.equal(steps['read shopdy code'], 1, 'a call counts under its first tool');
  assert.equal(steps['read image'], 1);
  assert.equal(steps['shopdy build'], 1);
});

test('summarize --since leaves out what came before', () => {
  const s = summarize(transcript(), { since: '2026-11-12T07:05:00.000Z' });
  assert.equal(s.calls, 1);
  assert.equal(s.reads.shopdyCode, 0);
});

test('classify maps the skill commands and reads to steps', () => {
  assert.equal(classify('Bash', { command: 'python -I scripts/fetch_competitor.py "https://a.b" --job j' }), 'fetch');
  assert.equal(classify('PowerShell', { command: 'python -I $S/shopdy.py upload-media --job j' }), 'shopdy upload-media');
  assert.equal(classify('Bash', { command: 'python -I "$S/plan.py" draft --job j' }), 'plan draft');
  assert.equal(classify('Bash', { command: 'sed -n 1,40p apps/web/src/features/media/x.tsx' }), 'read shopdy code');
  assert.equal(classify('Bash', { command: 'ls -la _work' }), 'shell');
  assert.equal(classify('Read', { file_path: `${SKILL}\\references\\editor-ui.md` }), 'read skill reference');
  assert.equal(classify('Read', { file_path: `${SKILL}\\_work\\j\\shots\\verify-pc-01.png` }), 'read image');
  assert.equal(classify('Grep', { pattern: 'trustItems', path: 'd:\\shopdy-promax\\apps' }), 'read shopdy code');
  assert.equal(classify('Write', { file_path: `${SKILL}\\_work\\j\\analysis.md` }), 'write');
});

test('the output never contains what was said, only numbers and command names', async () => {
  const dir = tmpDir('transcript-cost-');
  const file = path.join(dir, 's.jsonl');
  fs.writeFileSync(file, transcript());
  const res = await runNode([SCRIPT, file]);
  assert.equal(res.code, 0, res.stderr);
  assert.match(res.stdout, /calls\s+3/);
  assert.doesNotMatch(res.stdout, /secret page words|export const|scopeBlockCss/);
  const json = await runNode([SCRIPT, file, '--json']);
  assert.equal(JSON.parse(json.stdout).calls, 3);
});

test('--project --latest finds the newest transcript of that project', () => {
  assert.equal(projectFolderName('D:\\shopdy-promax'), 'D--shopdy-promax');
  const root = tmpDir('projects-');
  const folder = path.join(root, 'd--shopdy-promax');
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(folder, 'old.jsonl'), '');
  fs.writeFileSync(path.join(folder, 'new.jsonl'), '');
  const past = new Date(Date.now() - 60_000);
  fs.utimesSync(path.join(folder, 'old.jsonl'), past, past);
  assert.equal(findLatest('D:\\shopdy-promax', root), path.join(folder, 'new.jsonl'), 'the folder name is matched without case');
  assert.throws(() => findLatest('D:\\nothing-here', root), /no transcript folder/);
});

// ---- by request (docs/SPEC-cost-meter.md) ----------------------------------------------------------------------
const { findByTitle } = require('../transcript-cost');

const prompt = (ts, content, extra = {}) => ({ type: 'user', timestamp: ts, message: { role: 'user', content }, ...extra });
const ctxUsage = (write, read, output) => usage(0, write, read, output);
const png = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA==' } };

// Three requests (the second one interrupted, the third one compacted) and messages that are not requests: a skill
// body (isMeta), a task notification, a local command with its output, the interruption itself.
function requestsTranscript() {
  return [
    prompt('2026-11-19T04:38:00.000Z', '<command-message>theme-edit</command-message>\n<command-name>/theme-edit</command-name>\n<command-args>secret words of the user</command-args>'),
    prompt('2026-11-19T04:38:00.500Z', [{ type: 'text', text: 'Base directory for this skill: …' }], { isMeta: true }),
    assistant('a', 'A', '2026-11-19T04:38:01.000Z', [toolUse('u1', 'Read', { file_path: 'd:\\source-theme\\themes\\x\\sections\\footer.hbs' })], ctxUsage(100, 900, 10)),
    result('2026-11-19T04:38:02.000Z', 'u1', 'footer code'),
    assistant('b', 'B', '2026-11-19T04:38:03.000Z', [toolUse('u2', 'Read', { file_path: 'C:\\tmp\\shot.png' })], ctxUsage(200, 1300, 10)),
    result('2026-11-19T04:38:04.000Z', 'u2', [png]),
    prompt('2026-11-19T04:39:00.000Z', '<task-notification><task-id>x</task-id></task-notification>'),
    prompt('2026-11-19T04:40:00.000Z', '<command-name>/model</command-name>\n<command-message>model</command-message>\n<command-args></command-args>'),
    prompt('2026-11-19T04:40:00.100Z', '<local-command-stdout>Set model to opus</local-command-stdout>'),
    prompt('2026-11-19T05:00:00.000Z', [{ type: 'text', text: 'make the footer the main colour of the theme please, all of it' }, png]),
    assistant('c', 'C', '2026-11-19T05:00:01.000Z', [toolUse('u3', 'Bash', { command: 'grep -n "Contact" D:/shopdy-promax/apps/api/src/x.ts' })], ctxUsage(100, 4900, 10)),
    result('2026-11-19T05:00:02.000Z', 'u3', 'x'),
    prompt('2026-11-19T05:00:03.000Z', [{ type: 'text', text: '[Request interrupted by user for tool use]' }]),
    prompt('2026-11-19T06:00:00.000Z', 'reorder the sections'),
    assistant('d', 'D', '2026-11-19T06:00:01.000Z', [{ type: 'text', text: 'ok' }], ctxUsage(300, 5300, 20)),
    { type: 'system', subtype: 'compact_boundary', timestamp: '2026-11-19T06:00:02.000Z' },
  ].map((o) => JSON.stringify(o)).join('\n');
}

test('summarize splits the session into the requests of the user', () => {
  const s = summarize(requestsTranscript());
  assert.equal(s.requests.length, 3, 'skill body, notification, local command and the interruption are not requests');
  const [r1, r2, r3] = s.requests;
  assert.deepEqual([r1.n, r1.cmd, r1.calls, r1.images, r1.themeReads, r1.at], [1, '/theme-edit', 2, 1, 1, '2026-11-19T04:38:00.000Z']);
  assert.deepEqual(r1.context, { start: 1000, end: 1500 });
  assert.deepEqual([r2.cmd, r2.calls, r2.images, r2.shopdyReads, r2.interrupted], [null, 1, 1, 1, true]);
  assert.deepEqual([r3.calls, r3.interrupted, r3.compacted], [1, false, true]);
  assert.equal(Math.round(r1.costPct + r2.costPct + r3.costPct), 100);
  assert.ok(!('prompt' in r1), 'no words of the user unless asked');
  const p = summarize(requestsTranscript(), { prompts: true }).requests;
  assert.equal(p[1].prompt, 'make the footer the main colour of the theme please, all of', 'first 60 characters, trimmed');
  assert.equal(p[0].prompt, '/theme-edit secret words of the user');
});

test('summarize estimates the cost if every request were a new session', () => {
  const s = summarize(requestsTranscript());
  // real: A 265 · B 430 (request 1) · C 665 (request 2) · D 1005 (request 3). A new session per request starts again
  // from the first call's context (1000): B at 1000 + (1500 − 1000) → 430, C at 1000 → 265, D at 1000 → 375 + 70 + 100.
  assert.equal(s.costUnits, 2365);
  assert.equal(s.fresh.costUnits, 265 + 430 + 265 + 545);
  assert.equal(s.fresh.baseContext, 1000);
});

test('a synthetic message (no tokens) changes neither the context of its request nor the fresh estimate', () => {
  const lines = requestsTranscript().split('\n');
  const synthetic = JSON.stringify(assistant('', 'S', '2026-11-19T05:00:01.500Z', [{ type: 'text', text: 'No response requested.' }], usage(0, 0, 0, 0)));
  const s = summarize([...lines.slice(0, 11), synthetic, ...lines.slice(11)].join('\n'));
  assert.deepEqual(s.requests[1].context, { start: 5000, end: 5000 });
  assert.equal(s.fresh.costUnits, 265 + 430 + 265 + 545);
});

test('classify knows the steps of theme work', () => {
  const T = 'cd /d/source-theme/themes/lunara---vesnacharm && ';
  const heredoc = T + 'cat >> assets/css/vn-chrome.css <<' + "'EOF'\n.x{}\nEOF";
  assert.equal(classify('Bash', { command: 'cd "D:/source-theme" && node tools/shot.js http://localhost:8091 - --width 360' }), 'tool shot');
  assert.equal(classify('PowerShell', { command: 'node tools\\visual-diff.js a.png http://x' }), 'tool visual-diff');
  assert.equal(classify('Bash', { command: 'node tools/theme-map.js themes/x --part product' }), 'read design map');
  assert.equal(classify('Bash', { command: 'node themes/lunara---vesnacharm/_work/patch-vn.js | tail -1' }), 'theme script');
  assert.equal(classify('Bash', { command: 'node themes/x/_src/build-sc.js' }), 'theme script');
  assert.equal(classify('Bash', { command: 'S="C:/Users/A/AppData/Local/Temp/claude/1/2/scratchpad" && node "$S/scripts/hover-atc.js" out' }), 'temp script');
  assert.equal(classify('Bash', { command: 'curl -sL -A "Mozilla" "https://vesnacharm.com/p?variant=1" -o page.html' }), 'fetch web');
  assert.equal(classify('Bash', { command: 'curl -s http://localhost:8097/product | head -c 100' }), 'shell');
  assert.equal(classify('WebFetch', { url: 'https://x.test' }), 'fetch web');
  assert.equal(classify('Bash', { command: T + 'grep -n "review" sections/reviews.hbs | head -40' }), 'read theme code');
  assert.equal(classify('Bash', { command: T + 'node -e "const s=require(\'fs\').readFileSync(\'sections/sc-reviews.hbs\',\'utf8\')"' }), 'read theme code');
  assert.equal(classify('Bash', { command: heredoc }), 'write');
  assert.equal(classify('Bash', { command: 'cat themes/x/_map/design-map.md' }), 'read design map');
  assert.equal(classify('Read', { file_path: 'D:\\source-theme\\themes\\x\\_map\\design-map.md' }), 'read design map');
  assert.equal(classify('Read', { file_path: 'D:\\source-theme\\themes\\x\\sections\\product.hbs' }), 'read theme code');
  assert.equal(classify('Read', { file_path: 'D:\\source-theme\\base-theme\\README.md' }), 'read theme code');
  assert.equal(classify('Read', { file_path: 'D:\\source-theme\\themes\\x\\_work\\site\\pages\\p\\text.txt' }), 'read job file');
  assert.equal(classify('Grep', { pattern: 'x', path: 'D:\\source-theme\\themes\\x\\sections' }), 'read theme code');
  assert.equal(classify('Grep', { pattern: 'x' }, 'D:\\source-theme\\themes\\x'), 'read theme code', 'no path: the cwd of the call');
  assert.equal(classify('Grep', { pattern: 'x', path: 'D:\\source-theme\\tools' }), 'search other');
  // the steps of store-page-from-link keep their names
  assert.equal(classify('Grep', { pattern: 'trustItems', path: 'd:\\shopdy-promax\\apps' }), 'read shopdy code');
  assert.equal(classify('Grep', { pattern: 'trustItems' }), 'read shopdy code');
  assert.equal(classify('Bash', { command: 'ls -la _work' }), 'shell');
});

test('--by-request prints one row per request, the words of the user only with --prompts', async () => {
  const dir = tmpDir('transcript-cost-');
  const file = path.join(dir, 's.jsonl');
  fs.writeFileSync(file, requestsTranscript());
  const plain = await runNode([SCRIPT, file]);
  assert.doesNotMatch(plain.stdout, /requests|fresh/, 'no new flag → the old report');
  const res = await runNode([SCRIPT, file, '--by-request', '--fresh']);
  assert.equal(res.code, 0, res.stderr);
  assert.match(res.stdout, /requests\s+3 \(1 interrupted\)/);
  assert.match(res.stdout, /fresh\s+1,505 cost units if each request were a new session \(64% of 2,365\)/);
  assert.match(res.stdout, /^\s+1\s+11-19 04:38\s+\/theme-edit\s+2\s/m);
  assert.doesNotMatch(res.stdout, /secret words|footer the main/);
  const withPrompts = await runNode([SCRIPT, file, '--by-request', '--prompts']);
  assert.match(withPrompts.stdout, /> make the footer the main colour/);
});

test('--title finds a session by its name', () => {
  const root = tmpDir('projects-');
  const folder = path.join(root, 'D--shopdy-promax');
  fs.mkdirSync(folder);
  const line = (k, v) => JSON.stringify({ type: 'ai-title', [k]: v }) + '\n';
  fs.writeFileSync(path.join(folder, 'a.jsonl'), line('aiTitle', 'Old name') + line('aiTitle', 'Theme lunara---vesnacharm cho bodysuit'));
  fs.writeFileSync(path.join(folder, 'b.jsonl'), line('customTitle', 'Banner brixpant'));
  fs.writeFileSync(path.join(folder, 'c.jsonl'), line('aiTitle', 'Theme lunara---hushflex'));
  const one = findByTitle('D:\\shopdy-promax', 'VESNACHARM', root);
  assert.deepEqual(one.map((m) => [path.basename(m.file), m.title]), [['a.jsonl', 'Theme lunara---vesnacharm cho bodysuit']]);
  assert.equal(findByTitle('D:\\shopdy-promax', 'lunara', root).length, 2);
  assert.deepEqual(findByTitle('D:\\shopdy-promax', 'old name', root), [], 'the last title counts');
});
