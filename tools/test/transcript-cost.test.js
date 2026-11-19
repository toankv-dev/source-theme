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
