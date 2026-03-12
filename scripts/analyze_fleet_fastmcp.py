"""
Batch analysis of fleet repos (local clones): FastMCP version and mcpb presence.
Writes fleet_analysis.json next to fleet_manifest.yaml for use by the bridge catalog.
Run from repo root: python scripts/analyze_fleet_fastmcp.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _hands_base_dir(root: Path) -> Path:
    return root / "hands"


def _detect_fastmcp_version(repo_path: Path) -> str:
    """Scan pyproject.toml, requirements*.txt, uv.lock for fastmcp; return '3.1', '2.x', 'unknown', or 'not_found'."""
    version: str | None = None
    # pyproject.toml
    pyproject = repo_path / "pyproject.toml"
    if pyproject.exists():
        try:
            content = pyproject.read_text(encoding="utf-8")
            # Dependencies can be in [project] dependencies = ["fastmcp>=3.1", ...] or dynamic
            for match in re.finditer(r"fastmcp\s*([^\s,\"]+)", content):
                spec = match.group(1).strip()
                if _spec_is_31(spec):
                    return "3.1"
                if _spec_major(spec) == 2:
                    version = "2.x" if version != "3.1" else version
                elif _spec_major(spec) == 3:
                    version = "3.1" if version is None else version
        except Exception:
            pass
    # requirements*.txt
    for req in repo_path.glob("requirements*.txt"):
        try:
            for line in req.read_text(encoding="utf-8").splitlines():
                line = line.split("#")[0].strip()
                if "fastmcp" in line.lower():
                    if _spec_is_31(line):
                        return "3.1"
                    if _spec_major(line) == 2:
                        version = "2.x" if version != "3.1" else version
                    elif _spec_major(line) == 3:
                        version = "3.1" if version is None else version
        except Exception:
            pass
    # uv.lock
    uv_lock = repo_path / "uv.lock"
    if uv_lock.exists():
        try:
            content = uv_lock.read_text(encoding="utf-8")
            # [[package]] name = "fastmcp" version = "3.1.0"
            in_fastmcp = False
            for line in content.splitlines():
                if re.match(r'name\s*=\s*"fastmcp"', line):
                    in_fastmcp = True
                    continue
                if in_fastmcp and line.strip().startswith("version"):
                    m = re.search(r'version\s*=\s*"([^"]+)"', line)
                    if m:
                        v = m.group(1)
                        if v.startswith("3.") and int(v.split(".")[1]) >= 1:
                            return "3.1"
                        if v.startswith("2."):
                            version = "2.x" if version != "3.1" else version
                        elif v.startswith("3."):
                            version = "3.1" if version is None else version
                    break
        except Exception:
            pass
    return version or "not_found"


def _spec_is_31(spec: str) -> bool:
    """True if spec implies FastMCP 3.1+ (e.g. >=3.1, ~=3.1, ==3.1.0)."""
    spec = spec.strip().lower()
    if spec.startswith(">="):
        return _parse_ver_ge(spec[2:].strip(), (3, 1))
    if spec.startswith("~="):
        return _parse_ver_ge(spec[2:].strip(), (3, 1))
    if spec.startswith("=="):
        v = _parse_version(spec[2:].strip())
        return v is not None and v >= (3, 1)
    return False


def _spec_major(spec: str) -> int | None:
    """Extract major version from a dependency spec (e.g. >=3.1 -> 3)."""
    spec = spec.strip().lower()
    for prefix in (">=", "~=", "==", ">"):
        if spec.startswith(prefix):
            v = _parse_version(spec[len(prefix) :].strip())
            return v[0] if v else None
    return None


def _parse_version(s: str) -> tuple[int, int] | None:
    """Parse '3.1' or '3.1.0' -> (3, 1)."""
    s = s.split(",")[0].strip()
    m = re.match(r"(\d+)\.(\d+)", s)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    return None


def _parse_ver_ge(s: str, target: tuple[int, int]) -> bool:
    v = _parse_version(s)
    if v is None:
        return False
    return v >= target


def _detect_mcpb(repo_path: Path) -> bool:
    """True if mcpb package/config is present (mcpb.json, mcpb/, .mcpb, or [tool.mcpb] in pyproject)."""
    if (repo_path / "mcpb.json").exists():
        return True
    if (repo_path / "mcpb").is_dir():
        return True
    if (repo_path / ".mcpb").exists():
        return True
    pyproject = repo_path / "pyproject.toml"
    if pyproject.exists():
        try:
            if "[tool.mcpb]" in pyproject.read_text(encoding="utf-8"):
                return True
        except Exception:
            pass
    return False


def _load_manifest(root: Path) -> list[dict]:
    try:
        import yaml
    except ImportError:
        return []
    manifest = root / "fleet_manifest.yaml"
    if not manifest.exists():
        return []
    try:
        with open(manifest, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("hands", [])
    except Exception:
        return []


def run_analysis() -> dict:
    root = _repo_root()
    hands_dir = _hands_base_dir(root)
    hands = _load_manifest(root)
    results: dict[str, dict] = {}
    for h in hands:
        hand_id = h.get("id") or h.get("name", "")
        if not hand_id:
            continue
        path = hands_dir / hand_id
        if not path.exists() or not path.is_dir():
            results[hand_id] = {
                "fastmcp_version": "not_scanned",
                "mcpb_present": False,
                "path": str(path),
                "installed": False,
            }
            continue
        fastmcp = _detect_fastmcp_version(path)
        mcpb = _detect_mcpb(path)
        results[hand_id] = {
            "fastmcp_version": fastmcp,
            "mcpb_present": mcpb,
            "path": str(path),
            "installed": True,
        }
    return {"hands": results}


def main() -> None:
    root = _repo_root()
    out_path = root / "fleet_analysis.json"
    result = run_analysis()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"Wrote {out_path}")
    for hand_id, data in result["hands"].items():
        fm = data.get("fastmcp_version", "?")
        mcpb = "yes" if data.get("mcpb_present") else "no"
        inst = "installed" if data.get("installed") else "not_installed"
        print(f"  {hand_id}: fastmcp={fm} mcpb={mcpb} ({inst})")


if __name__ == "__main__":
    main()
