"""One-off: bump fastmcp pins in pyproject.toml to >=3.1.0,<4. Run from repo root."""

from __future__ import annotations

import os
import pathlib

# Longest matches first
REPLACEMENTS: list[tuple[str, str]] = [
    ('"fastmcp[server]>=2.14.5"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp[all]>=2.14.3,<3.0.0"', '"fastmcp[all]>=3.1.0,<4"'),
    ('"fastmcp[all]>=2.14.0,<3.0.0"', '"fastmcp[all]>=3.1.0,<4"'),
    ('"fastmcp[all]>=2.14.5"', '"fastmcp[all]>=3.1.0,<4"'),
    ('"fastmcp[all]>=2.13.1"', '"fastmcp[all]>=3.1.0,<4"'),
    ('"fastmcp[test]>=2.14.3"', '"fastmcp[test]>=3.1.0"'),
    ('"fastmcp[test]>=2.13.0"', '"fastmcp[test]>=3.1.0"'),
    ('"fastmcp>=2.14.5,<2.15.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.14.4,<3.0.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.14.4,<2.15.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.14.3,<3.0.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.14.1,<2.15.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.12.2,<3.0.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.12.0,<3.0.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.12.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.14.5"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp==2.14.5"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.10.1"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp==2.10.1"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.13.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.14"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.14.4"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=2.11.3"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=0.9.0"', '"fastmcp>=3.1.0,<4"'),
    ('"fastmcp>=0.4.1"', '"fastmcp>=3.1.0,<4"'),
]

SKIP_DIR_NAMES = frozenset(
    {
        ".git",
        "__pycache__",
        "node_modules",
        ".venv",
        "venv",
        "dist",
        "build",
    }
)


def should_skip_dir(p: pathlib.Path) -> bool:
    return p.name in SKIP_DIR_NAMES


def process_file(path: pathlib.Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != orig:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def walk_pyprojects(root: pathlib.Path) -> list[pathlib.Path]:
    """Pruned walk: skip node_modules, .git, venv, etc."""
    out: list[pathlib.Path] = []
    if not root.is_dir():
        return out
    for dirpath, dirnames, filenames in os.walk(root, topdown=True, followlinks=False):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIR_NAMES]
        if "pyproject.toml" in filenames:
            out.append(pathlib.Path(dirpath) / "pyproject.toml")
    return out


def main() -> None:
    repos_root = pathlib.Path(r"D:\Dev\repos")
    changed: list[pathlib.Path] = []
    if repos_root.is_dir():
        for child in sorted(repos_root.iterdir()):
            if not child.is_dir() or child.name in SKIP_DIR_NAMES:
                continue
            if child.name == "junk":
                continue
            for p in walk_pyprojects(child):
                try:
                    if process_file(p):
                        changed.append(p)
                except OSError as e:
                    print(f"skip {p}: {e}")
    projects = repos_root / "mcp-central-docs" / "projects"
    if projects.is_dir():
        for p in walk_pyprojects(projects):
            try:
                if process_file(p):
                    changed.append(p)
            except OSError as e:
                print(f"skip {p}: {e}")
    for c in sorted(changed):
        print(c)


if __name__ == "__main__":
    main()
