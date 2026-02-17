#!/usr/bin/env python3
"""
Minimal repo dump -> repo_dump.txt

- Walks the repo, includes only "text-ish" file types.
- Excludes common junk dirs, binaries, and user-specified files.
- Deterministic order.
- Excludes this script and the output file.
"""

from __future__ import annotations

import argparse
from pathlib import Path

# dirs to skip entirely (add/remove as you like)
EXCLUDE_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache",
    ".venv", "venv", "node_modules", ".idea", ".vscode",
}

# extensions to include (keep minimal on purpose)
INCLUDE_EXTS = {
    ".py", ".md", ".txt", ".json", ".yaml", ".yml",
    ".toml", ".ini", ".cfg", ".csv", ".tsv",
    ".sh", ".bat", ".ps1",
    ".html", ".css", ".js",
    ".utf"
}

# always skip these extensions (binary-ish)
EXCLUDE_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".pdf", ".zip", ".tar", ".gz", ".tgz", ".bz2", ".7z", ".rar",
    ".exe", ".dll", ".so", ".dylib",
    ".mp3", ".wav", ".mp4", ".mov", ".mkv",
    ".ttf", ".otf", ".woff", ".woff2",
}

# exact relative paths to skip (posix style)
EXCLUDE_FILES = {
    "repo_dump.txt",
    "dump_repo.py",
}


def should_skip(root: Path, p: Path, out_name: str) -> bool:
    if not p.is_file():
        return True

    # skip if any directory component is excluded
    if any(part in EXCLUDE_DIRS for part in p.parts):
        return True

    rp = p.relative_to(root).as_posix()

    # exclude output and this script by name/path
    if rp == out_name or rp in EXCLUDE_FILES:
        return True

    # skip extensions we never want
    ext = p.suffix.lower()
    if ext in EXCLUDE_EXTS:
        return True

    # include only allowlisted text-ish extensions (or no extension if you want)
    if ext and ext not in INCLUDE_EXTS:
        return True

    return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path("."), help="repo root (default: .)")
    ap.add_argument("--out", default="repo_dump.txt", help="output file name (default: repo_dump.txt)")
    ap.add_argument("--exclude", action="append", default=[], help="extra exact relpaths to exclude (repeatable)")
    args = ap.parse_args()

    root = args.root.resolve()
    out_name = args.out
    out_path = root / out_name

    # add user-provided excludes
    for rp in args.exclude:
        EXCLUDE_FILES.add(rp.replace("\\", "/"))

    # ensure we exclude ourselves (by relative path if inside root)
    try:
        self_rp = Path(__file__).resolve().relative_to(root).as_posix()
        EXCLUDE_FILES.add(self_rp)
    except Exception:
        # if __file__ isn't under root, ignore
        pass

    files = []
    for p in root.rglob("*"):
        if should_skip(root, p, out_name=out_name):
            continue
        files.append(p)

    # deterministic order
    files.sort(key=lambda p: p.relative_to(root).as_posix())

    with out_path.open("w", encoding="utf-8") as out:
        for p in files:
            rp = p.relative_to(root).as_posix()
            out.write(f"\n===== {rp} =====\n")
            try:
                out.write(p.read_text(encoding="utf-8", errors="replace"))
            except Exception as e:
                out.write(f"[[SKIPPED: {e}]]\n")

    print(f"Wrote {out_path} ({len(files)} files)")


if __name__ == "__main__":
    main()
