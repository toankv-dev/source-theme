import json
import subprocess
import sys
import unittest
from pathlib import Path

from _helpers import SCRIPTS, tmp_dir

import status

SKILL_MD = '---\nname: store-page-from-link\nmetadata:\n  version: "{v}"\n---\n# x\n'


def fake_install(version: str = "1.1.0") -> Path:
    """<root>/shopdy-promax/.claude/skills/store-page-from-link with a SKILL.md."""
    root = tmp_dir("status-")
    skill = root / "shopdy-promax" / ".claude" / "skills" / "store-page-from-link"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text(SKILL_MD.format(v=version), encoding="utf-8")
    return skill


def text(skill: Path, **kw) -> str:
    return "\n".join(status.status_lines(skill, env={}, has_playwright=kw.get("pw", True)))


class StatusTest(unittest.TestCase):
    def test_a_fresh_install_says_what_to_do_first(self):
        out = text(fake_install(), pw=False)
        self.assertIn("v1.1.0", out)
        self.assertIn("playwright: MISSING", out)
        self.assertIn(".env: none", out)
        self.assertIn("catalog: none yet", out)
        self.assertIn("jobs: none", out)

    def test_env_shows_key_names_and_the_host_never_a_secret(self):
        skill = fake_install()
        (skill / ".env").write_text(
            "SHOPDY_URL=https://app.example.test/x\nSHOPDY_EMAIL=me@example.test\nSHOPDY_PASSWORD=hunter2-secret\n"
            "SHOPDY_HEADLESS=\n", encoding="utf-8")
        out = text(skill)
        self.assertIn("SHOPDY_URL=app.example.test", out)
        self.assertIn("SHOPDY_EMAIL", out)
        self.assertIn("SHOPDY_PASSWORD", out)
        self.assertNotIn("hunter2", out)
        self.assertNotIn("me@example.test", out)
        self.assertNotIn("SHOPDY_HEADLESS", out, "an empty key is not set")

    def test_catalog_and_jobs(self):
        skill = fake_install()
        cat = skill / "catalog"
        cat.mkdir()
        (cat / "block-catalog.json").write_text(json.dumps(
            {"updated": "2026-11-12T08:00:00Z", "sha": "4122adb", "blocks": {"cta": {}, "html": {}, "text": {}}}),
            encoding="utf-8")
        (cat / "changes.log").write_text("a\nb\n", encoding="utf-8")
        job = skill / "_work" / "20261112-a-com"
        job.mkdir(parents=True)
        (job / "state.json").write_text(json.dumps({
            "competitorUrl": "https://a.com/p", "pageId": "pg_1", "build": {"finished": True},
            "tickets": [{"id": "T1", "status": "awaiting-key"}, {"id": "T2", "status": "done"}]}), encoding="utf-8")
        (skill / "_work" / ".profile").mkdir()
        (skill / "_work" / ".profile" / "Local State").write_text("{}", encoding="utf-8")
        out = text(skill)
        self.assertIn("catalog: 3 blocks · updated 2026-11-12 · 2 self-fixes", out)
        self.assertIn("20261112-a-com: built · page pg_1 · tickets waiting 1", out)
        self.assertIn("login profile: present", out)

    def test_newer_skill_in_source_theme_prints_the_install_command(self):
        skill = fake_install("1.1.0")
        src = skill.parents[3] / "source-theme" / "shopdy-skills" / "store-page-from-link"
        src.mkdir(parents=True)
        (src / "SKILL.md").write_text(SKILL_MD.format(v="1.2.0"), encoding="utf-8")
        out = text(skill)
        self.assertIn("update: source-theme has v1.2.0", out)
        self.assertIn("install-shopdy-skill.js", out)

    def test_at_most_15_lines_with_many_jobs(self):
        skill = fake_install()
        for i in range(12):
            d = skill / "_work" / f"2026111{i % 10}-site{i}-com"
            d.mkdir(parents=True)
            (d / "state.json").write_text("{}", encoding="utf-8")
        lines = status.status_lines(skill, env={}, has_playwright=True)
        self.assertLessEqual(len(lines), 15)

    def test_the_script_always_exits_0(self):
        skill = fake_install()
        (skill / "_work").mkdir()
        (skill / "_work" / "broken").mkdir()
        (skill / "_work" / "broken" / "state.json").write_text("{not json", encoding="utf-8")
        res = subprocess.run([sys.executable, "-I", str(SCRIPTS / "status.py"), "--skill-dir", str(skill)],
                             capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertIn("broken: unreadable state.json", res.stdout)
        res = subprocess.run([sys.executable, "-I", str(SCRIPTS / "status.py"), "--skill-dir", str(skill / "nope")],
                             capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, res.stderr)


if __name__ == "__main__":
    unittest.main()
