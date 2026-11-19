"""Where this skill stands on this machine, in at most 15 lines. SKILL.md runs it when the skill starts
(`!` command), so Claude knows the state without spending a single call on it.

    python -I status.py [--skill-dir <dir>]

Standard library only, and it always exits 0: a failing `!` command would stop the whole skill.
Prints the names of the .env keys (and the host of SHOPDY_URL), never a value.
"""

from __future__ import annotations

import importlib.util
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

MAX_JOBS = 4


def _version(skill_md: Path) -> str | None:
    try:
        head = skill_md.read_text(encoding="utf-8").split("---")[1]
    except (OSError, IndexError):
        return None
    m = re.search(r"^\s+version:\s*\"?([^\"\n]+)\"?", head, re.M)
    return m.group(1).strip() if m else None


def _as_tuple(v: str | None) -> tuple[int, ...]:
    return tuple(int(x) for x in re.findall(r"\d+", v or ""))


def _env_line(skill: Path) -> str:
    f = skill / ".env"
    if not f.exists():
        return ".env: none (copy .env.example to .env and let the user fill it, or sign in by hand at `login`)"
    keys = []
    for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)$", line)
        if not m or not m.group(2).strip():
            continue
        key, value = m.group(1), m.group(2).strip().strip("\"'")
        keys.append(f"{key}={urlparse(value).hostname or '?'}" if key == "SHOPDY_URL" else key)
    return ".env: " + (", ".join(keys) if keys else "no key set")


def _catalog_line(skill: Path) -> str:
    f = skill / "catalog" / "block-catalog.json"
    if not f.exists():
        return "catalog: none yet (`create` scans the editor once, 1–3 min, then keeps it up to date)"
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return "catalog: unreadable (`shopdy.py catalog --refresh` rebuilds it)"
    log = skill / "catalog" / "changes.log"
    fixes = len([x for x in log.read_text(encoding="utf-8").splitlines() if x.strip()]) if log.exists() else 0
    updated = str(data.get("updated") or "?")[:10]
    return f"catalog: {len(data.get('blocks') or {})} blocks · updated {updated} · {fixes} self-fixes"


def _job_stage(job: Path, state: dict) -> str:
    if (job / "report.md").exists():
        return "reported"
    if (job / "verify.json").exists():
        return "verified"
    if (state.get("build") or {}).get("finished"):
        return "built"
    if state.get("build"):
        return "building"
    if state.get("pageId"):
        return "page created"
    if state.get("competitorUrl"):
        return "fetched"
    return "started"


def _tickets_waiting(state: dict) -> int:
    tickets = state.get("tickets") or []
    if isinstance(tickets, dict):
        tickets = list(tickets.values())
    done = {"done", "on-production"}
    return sum(1 for t in tickets if isinstance(t, dict) and t.get("status") not in done)


def _job_lines(skill: Path) -> list[str]:
    work = skill / "_work"
    jobs = [d for d in work.iterdir() if d.is_dir() and not d.name.startswith(".") and d.name != "catalog"] \
        if work.exists() else []
    if not jobs:
        return ["jobs: none"]
    jobs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
    lines = [f"jobs ({len(jobs)}, newest first):"]
    for job in jobs[:MAX_JOBS]:
        f = job / "state.json"
        try:
            state = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
        except (OSError, ValueError):
            lines.append(f"  {job.name}: unreadable state.json")
            continue
        parts = [_job_stage(job, state)]
        if state.get("pageId"):
            parts.append(f"page {state['pageId']}")
        waiting = _tickets_waiting(state)
        if waiting:
            parts.append(f"tickets waiting {waiting}")
        lines.append(f"  {job.name}: " + " · ".join(parts))
    if len(jobs) > MAX_JOBS:
        lines.append(f"  … {len(jobs) - MAX_JOBS} older")
    return lines


def _update_line(skill: Path, installed: str | None, env: dict) -> str | None:
    shopdy_root = skill.parents[2] if len(skill.parents) > 2 else skill
    candidates = [Path(env["SOURCE_THEME_DIR"])] if env.get("SOURCE_THEME_DIR") else []
    candidates.append(shopdy_root.parent / "source-theme")
    for root in candidates:
        src = root / "shopdy-skills" / skill.name / "SKILL.md"
        if src.exists() and src.resolve() != (skill / "SKILL.md").resolve():
            newer = _version(src)
            if _as_tuple(newer) > _as_tuple(installed):
                return (f"update: source-theme has v{newer} → node \"{root / 'tools' / 'install-shopdy-skill.js'}\" "
                        f"\"{shopdy_root}\"")
    return None


def status_lines(skill: Path, env: dict | None = None, has_playwright: bool | None = None) -> list[str]:
    env = os.environ if env is None else env
    if has_playwright is None:
        has_playwright = importlib.util.find_spec("playwright") is not None
    version = _version(skill / "SKILL.md")
    profile = Path(env.get("SHOPDY_PROFILE_DIR") or skill / "_work" / ".profile")
    lines = [
        f"store-page-from-link v{version or '?'} · skill folder {skill}",
        "playwright: ok" if has_playwright
        else "playwright: MISSING → pip install playwright && python -m playwright install chromium",
        _env_line(skill),
        "login profile: present (the session may still have expired)"
        if profile.exists() and any(profile.iterdir()) else "login profile: none → `shopdy.py login` first",
        _catalog_line(skill),
    ]
    update = _update_line(skill, version, env)
    if update:
        lines.append(update)
    lines += _job_lines(skill)
    return lines[:15]


def main() -> None:
    try:
        args = sys.argv[1:]
        skill = Path(args[args.index("--skill-dir") + 1]) if "--skill-dir" in args else Path(__file__).resolve().parent.parent
        if not (skill / "SKILL.md").exists():
            print(f"status: no SKILL.md in {skill}")
            return
        print("\n".join(status_lines(skill)))
    except BaseException as err:  # noqa: BLE001 - never stop the skill from loading
        print(f"status: could not read the state ({type(err).__name__}: {err})")


if __name__ == "__main__":
    main()
