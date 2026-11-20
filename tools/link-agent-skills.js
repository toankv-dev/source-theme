#!/usr/bin/env node
/*
 * Links an agent-skills checkout (github.com/addyosmani/agent-skills: engineering skills from spec to ship) into this
 * repo's .claude/ so Claude Code loads it here:
 *
 *   .claude/skills/<name>  → <agent-skills>/skills/<name>     every folder with a SKILL.md
 *   .claude/agents         → <agent-skills>/agents            code-reviewer, test-engineer, security-auditor, …
 *   .claude/commands       → <agent-skills>/.claude/commands  /spec /plan /build /test /review /code-simplify /ship …
 *   .claude/references     → <agent-skills>/references        the checklists the skills cite
 *
 *   node tools/link-agent-skills.js [<agent-skills folder>] [--dry]
 *
 * Folder: the argument, else $AGENT_SKILLS_DIR, else ../agent-skills next to this repo. Links are directory junctions
 * on Windows (no admin rights needed), symlinks elsewhere, so a `git pull` in agent-skills is live here at once. Run
 * it after a clone and whenever agent-skills adds or drops a skill: it creates the missing links, re-points links that
 * point at another place and removes its own links whose skill is gone. A real folder of this repo with the same name
 * (a project skill) is never touched: it wins and is reported as kept. Only links are ever removed, never folders.
 * The links are local to the machine; their paths live in a marked block of .gitignore that this script rewrites.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BEGIN = '# >>> agent-skills links';
const END = '# <<< agent-skills links';
const NOTE = '# Written by tools/link-agent-skills.js: junctions into the agent-skills checkout, local to each machine.';
// [name under .claude/, folder in agent-skills]
const DIR_LINKS = [['agents', 'agents'], ['commands', '.claude/commands'], ['references', 'references']];

const norm = (p) => {
  const r = path.resolve(p).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? r.toLowerCase() : r;
};
const isInside = (p, dir) => norm(p) === norm(dir) || norm(p).startsWith(norm(dir) + path.sep);
const lstat = (p) => { try { return fs.lstatSync(p); } catch { return null; } };
const linkTarget = (p) => path.resolve(path.dirname(p), fs.readlinkSync(p));

function pluginOf(source) {
  try { return JSON.parse(fs.readFileSync(path.join(source, '.claude-plugin', 'plugin.json'), 'utf8')); } catch { return null; }
}

function assertAgentSkills(source) {
  const name = pluginOf(source)?.name;
  if (name !== 'agent-skills' || !fs.existsSync(path.join(source, 'skills'))) {
    throw new Error(`${source} is not an agent-skills checkout (.claude-plugin/plugin.json name is ${name ? `"${name}"` : 'missing'}, expected "agent-skills")`);
  }
}

function defaultSource(env = process.env) {
  return env.AGENT_SKILLS_DIR ? path.resolve(env.AGENT_SKILLS_DIR) : path.join(ROOT, '..', 'agent-skills');
}

// Every link agent-skills offers: [path relative to the project, forward slashes; absolute target].
function wantedLinks(source) {
  const out = DIR_LINKS.filter(([, rel]) => fs.existsSync(path.join(source, rel)))
    .map(([name, rel]) => [`.claude/${name}`, path.join(source, rel)]);
  for (const name of fs.readdirSync(path.join(source, 'skills')).sort()) {
    if (fs.existsSync(path.join(source, 'skills', name, 'SKILL.md'))) {
      out.push([`.claude/skills/${name}`, path.join(source, 'skills', name)]);
    }
  }
  return out;
}

/** The paths listed in the managed .gitignore block (without the leading slash). */
function readBlock(text) {
  const lines = text.split(/\r?\n/);
  const b = lines.indexOf(BEGIN);
  const e = lines.indexOf(END);
  return b >= 0 && e > b ? lines.slice(b + 1, e).filter((l) => l.startsWith('/')).map((l) => l.slice(1)) : [];
}

/** text with the managed block set to `entries` (replaced in place, else appended). Keeps the file's line ends. */
function writeBlock(text, entries) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text ? text.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const block = [BEGIN, NOTE, ...entries.map((e) => `/${e}`), END];
  const b = lines.indexOf(BEGIN);
  const e = lines.indexOf(END);
  if (b >= 0 && e > b) lines.splice(b, e - b + 1, ...block);
  else {
    if (lines.length && lines[lines.length - 1] !== '') lines.push('');
    lines.push(...block);
  }
  return lines.join(eol) + eol;
}

/** Creates / refreshes the links; returns what changed. `project` = this repo (tests pass a fixture). */
function link({ source, project = ROOT, dry = false }) {
  source = path.resolve(source);
  assertAgentSkills(source);
  const gitignore = path.join(project, '.gitignore');
  const before = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, 'utf8') : '';
  const listed = new Set(readBlock(before));
  const wanted = wantedLinks(source);
  const wantedSet = new Set(wanted.map(([rel]) => rel));
  // A link is this script's when the .gitignore block lists it or it points into agent-skills; other links are the
  // user's own and are left alone like folders.
  const ours = (rel, p) => listed.has(rel) || isInside(linkTarget(p), source);
  const report = { version: pluginOf(source).version || null, source, created: [], relinked: [], removed: [], kept: [],
    unchanged: 0, gitignore: false };

  const skillsDir = path.join(project, '.claude', 'skills');
  const present = [...DIR_LINKS.map(([name]) => `.claude/${name}`),
    ...(fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).map((name) => `.claude/skills/${name}`) : []), ...listed];
  for (const rel of [...new Set(present)].sort()) {
    if (wantedSet.has(rel)) continue;
    const p = path.join(project, rel);
    const st = lstat(p);
    if (!st || !st.isSymbolicLink() || !ours(rel, p)) continue;
    report.removed.push(rel);
    if (!dry) fs.unlinkSync(p); // the link only: never a recursive delete, it would empty agent-skills
  }

  const linked = [];
  for (const [rel, target] of wanted) {
    const p = path.join(project, rel);
    const st = lstat(p);
    if (st && (!st.isSymbolicLink() || !ours(rel, p))) { report.kept.push(rel); continue; }
    if (st) {
      if (norm(linkTarget(p)) === norm(target)) { report.unchanged++; linked.push(rel); continue; }
      report.relinked.push(rel);
      if (!dry) fs.unlinkSync(p);
    } else report.created.push(rel);
    if (!dry) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.symlinkSync(target, p, 'junction');
    }
    linked.push(rel);
  }

  const after = writeBlock(before, linked.sort());
  report.gitignore = after !== before;
  if (report.gitignore && !dry) fs.writeFileSync(gitignore, after);
  return report;
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const positional = args.filter((a) => !a.startsWith('--'));
  const source = positional[0] ? path.resolve(positional[0]) : defaultSource();
  let r;
  try {
    r = link({ source, dry });
  } catch (err) {
    console.error(`link-agent-skills: ${err.message}`);
    console.error(`usage: node ${path.join('tools', 'link-agent-skills.js')} [<agent-skills folder>] [--dry]   (or set AGENT_SKILLS_DIR)`);
    process.exit(1);
  }
  const p = dry ? '[dry] ' : '';
  console.log(`${p}agent-skills v${r.version || '?'} (${r.source}) → ${path.join(ROOT, '.claude')}`);
  console.log(`  created ${r.created.length} · relinked ${r.relinked.length} · removed ${r.removed.length} · unchanged ${r.unchanged} · kept ${r.kept.length}`);
  for (const f of r.created) console.log(`  + ${f}`);
  for (const f of r.relinked) console.log(`  ~ ${f}`);
  for (const f of r.removed) console.log(`  - ${f}`);
  for (const f of r.kept) console.log(`  ! ${f}  (a folder of this repo, or a link of your own: left as it is, not linked)`);
  console.log(`  .gitignore block ${r.gitignore ? (dry ? 'would change' : 'updated') : 'unchanged'}`);
  if (dry) console.log('Nothing written (--dry).');
  else if (r.created.length || r.relinked.length || r.removed.length) console.log('Start a new Claude Code session to load the change.');
}

if (require.main === module) main();
module.exports = { link, readBlock, writeBlock, wantedLinks, defaultSource };
