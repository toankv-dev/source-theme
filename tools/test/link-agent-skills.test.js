'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir } = require('./helpers');
const { link, readBlock, writeBlock, defaultSource } = require('../link-agent-skills');

const put = (file, body) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); };
const read = (file) => fs.readFileSync(file, 'utf8');
const isLink = (p) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };
const skillMd = (name) => `---\nname: ${name}\ndescription: demo\n---\n# ${name}\n`;

// A fake agent-skills checkout and a fake source-theme with its own skill and an unrelated .gitignore.
function fixture() {
  const source = tmpDir('agent-skills-');
  put(path.join(source, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'agent-skills', version: '0.6.15' }));
  put(path.join(source, 'skills', 'spec-driven-development', 'SKILL.md'), skillMd('spec-driven-development'));
  put(path.join(source, 'skills', 'test-driven-development', 'SKILL.md'), skillMd('test-driven-development'));
  put(path.join(source, 'skills', 'new-theme', 'SKILL.md'), skillMd('new-theme')); // collides with a project skill
  put(path.join(source, 'skills', 'drafts', 'notes.md'), 'no SKILL.md: not a skill');
  put(path.join(source, 'agents', 'code-reviewer.md'), '# reviewer');
  put(path.join(source, '.claude', 'commands', 'spec.md'), '# /spec');
  put(path.join(source, 'references', 'security-checklist.md'), '# checklist');
  const project = tmpDir('source-theme-');
  put(path.join(project, '.gitignore'), 'dist/\ntools/node_modules/\n');
  put(path.join(project, '.claude', 'skills', 'new-theme', 'SKILL.md'), '# the project skill');
  return { source, project, skills: path.join(project, '.claude', 'skills') };
}

test('link creates junctions for every skill and dir, keeps project folders, writes the .gitignore block', () => {
  const { source, project, skills } = fixture();
  const r = link({ source, project });
  assert.equal(r.version, '0.6.15');
  assert.deepEqual(r.created, ['.claude/agents', '.claude/commands', '.claude/references',
    '.claude/skills/spec-driven-development', '.claude/skills/test-driven-development']);
  assert.deepEqual(r.kept, ['.claude/skills/new-theme']);
  assert.ok(!isLink(path.join(skills, 'new-theme')), 'the project skill is never replaced');
  assert.equal(read(path.join(skills, 'new-theme', 'SKILL.md')), '# the project skill');
  assert.ok(!fs.existsSync(path.join(skills, 'drafts')), 'a folder without SKILL.md is not linked');
  assert.equal(read(path.join(skills, 'spec-driven-development', 'SKILL.md')), skillMd('spec-driven-development'));
  assert.equal(read(path.join(project, '.claude', 'commands', 'spec.md')), '# /spec');

  const gi = read(path.join(project, '.gitignore'));
  assert.ok(gi.startsWith('dist/\ntools/node_modules/\n\n# >>> agent-skills links\n'), 'other lines stay, block appended');
  assert.deepEqual(readBlock(gi), ['.claude/agents', '.claude/commands', '.claude/references',
    '.claude/skills/spec-driven-development', '.claude/skills/test-driven-development']);

  const again = link({ source, project });
  assert.equal(again.unchanged, 5);
  assert.equal(again.created.length + again.relinked.length + again.removed.length, 0);
  assert.equal(again.gitignore, false, 'a second run rewrites nothing');
});

test('a dropped skill loses its link (its files stay in agent-skills), a new one gets one', () => {
  const { source, project, skills } = fixture();
  link({ source, project });
  fs.rmSync(path.join(source, 'skills', 'test-driven-development'), { recursive: true });
  put(path.join(source, 'skills', 'idea-refine', 'SKILL.md'), skillMd('idea-refine'));
  put(path.join(source, 'skills', 'spec-driven-development', 'extra.md'), 'still there after a removal elsewhere');

  const r = link({ source, project });
  assert.deepEqual(r.created, ['.claude/skills/idea-refine']);
  assert.deepEqual(r.removed, ['.claude/skills/test-driven-development']);
  assert.ok(!fs.existsSync(path.join(skills, 'test-driven-development')) && !isLink(path.join(skills, 'test-driven-development')));
  assert.equal(read(path.join(source, 'skills', 'spec-driven-development', 'extra.md')), 'still there after a removal elsewhere');
  const block = readBlock(read(path.join(project, '.gitignore')));
  assert.ok(block.includes('.claude/skills/idea-refine') && !block.includes('.claude/skills/test-driven-development'));
});

test('removing a link never deletes what it points at', () => {
  const { source, project } = fixture();
  link({ source, project });
  fs.rmSync(path.join(source, '.claude', 'commands'), { recursive: true }); // agent-skills drops its commands
  const r = link({ source, project });
  assert.deepEqual(r.removed, ['.claude/commands']);
  assert.equal(read(path.join(source, 'agents', 'code-reviewer.md')), '# reviewer');
  assert.equal(read(path.join(source, 'references', 'security-checklist.md')), '# checklist');
});

test('a moved checkout: listed links are re-pointed, a link of the user\'s own is left alone', () => {
  const { source, project, skills } = fixture();
  link({ source, project });
  const moved = tmpDir('agent-skills-moved-');
  fs.cpSync(source, moved, { recursive: true });
  const mine = tmpDir('my-skill-');
  put(path.join(mine, 'SKILL.md'), skillMd('mine'));
  fs.symlinkSync(mine, path.join(skills, 'mine'), 'junction');

  const r = link({ source: moved, project });
  assert.equal(r.relinked.length, 5);
  assert.equal(path.resolve(fs.realpathSync(path.join(skills, 'spec-driven-development'))).toLowerCase(),
    path.resolve(fs.realpathSync(path.join(moved, 'skills', 'spec-driven-development'))).toLowerCase());
  assert.ok(isLink(path.join(skills, 'mine')), 'not in the block, not into agent-skills: not ours');
  assert.equal(r.removed.length, 0);
});

test('--dry reports the plan and writes nothing', () => {
  const { source, project, skills } = fixture();
  const r = link({ source, project, dry: true });
  assert.equal(r.created.length, 5);
  assert.equal(r.gitignore, true);
  assert.ok(!fs.existsSync(path.join(skills, 'spec-driven-development')));
  assert.equal(read(path.join(project, '.gitignore')), 'dist/\ntools/node_modules/\n');
});

test('refuses a folder that is not agent-skills', () => {
  const { project } = fixture();
  const other = tmpDir('not-agent-skills-');
  put(path.join(other, 'skills', 'x', 'SKILL.md'), skillMd('x'));
  assert.throws(() => link({ source: other, project }), /not an agent-skills checkout/);
});

test('writeBlock replaces the block in place and keeps CRLF files CRLF', () => {
  const text = 'a/\r\n# >>> agent-skills links\r\n/.claude/old\r\n# <<< agent-skills links\r\nb/\r\n';
  const out = writeBlock(text, ['.claude/new']);
  assert.ok(out.startsWith('a/\r\n# >>> agent-skills links\r\n'));
  assert.ok(out.endsWith('/.claude/new\r\n# <<< agent-skills links\r\nb/\r\n'));
  assert.deepEqual(readBlock(out), ['.claude/new']);
  assert.ok(!/[^\r]\n/.test(out));
});

test('defaultSource: $AGENT_SKILLS_DIR, else ../agent-skills next to this repo', () => {
  assert.equal(defaultSource({ AGENT_SKILLS_DIR: 'X:/skills' }), path.resolve('X:/skills'));
  assert.equal(defaultSource({}), path.resolve(__dirname, '..', '..', '..', 'agent-skills'));
});
