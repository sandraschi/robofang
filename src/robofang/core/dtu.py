"""
RoboFang/core/dtu.py
====================
Dark Twin Universe (DTU) - Filesystem Shadow Proxy.
Provides a pre-flight environment for agentic file modifications.

Patterns:
- Staging: Agents write to the shadow first.
- Audit: Foreman/Satisficer verifies the shadow.
- Commit: Atomic move from shadow to production.

Roadmap (Phase 7):
- Transition to Git-backed shadow (worktrees) for branch-based rollbacks.
"""

import logging
import os
import shutil
from pathlib import Path

logger = logging.getLogger("robofang.core.dtu")


class DarkTwinUniverse:
    """Simple DTU implementation for RoboFang v1.8.0."""

    def __init__(self, shadow_root: str | None = None):
        if not shadow_root:
            shadow_root = os.path.join(os.getcwd(), "temp", "dtu_shadow")
        self.shadow_root = Path(shadow_root)
        self._ensure_shadow()

    def _ensure_shadow(self):
        """Creates the shadow root if it doesn't exist."""
        if not self.shadow_root.exists():
            self.shadow_root.mkdir(parents=True, exist_ok=True)
            logger.info(f"DTU Shadow initialized at {self.shadow_root}")

    def stage_change(self, target_base: str, rel_path: str, content: str) -> bool:
        """
        Stages a file modification in the shadow.

        Args:
            target_base: The real root directory (e.g. repo path)
            rel_path: Path relative to target_base
            content: New file content
        """
        shadow_path = self.shadow_root / rel_path
        shadow_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            shadow_path.write_text(content, encoding="utf-8")
            logger.info(f"DTU: Staged {rel_path}")
            return True
        except Exception as e:
            logger.error(f"DTU: Staging failed for {rel_path}: {e}")
            return False

    def commit_all(self, target_base: str) -> dict:
        """
        Moves all staged files from shadow to the real target_base.
        """
        target_root = Path(target_base)
        if not target_root.exists():
            return {"ok": False, "reason": "Target base does not exist"}

        results = {"ok": True, "files": []}
        try:
            for item in self.shadow_root.rglob("*"):
                if item.is_file():
                    rel_path = item.relative_to(self.shadow_root)
                    dest = target_root / rel_path
                    dest.parent.mkdir(parents=True, exist_ok=True)

                    # Atomic replacement (roughly)
                    shutil.move(str(item), str(dest))
                    results["files"].append(str(rel_path))

            logger.info(f"DTU: Committed {len(results['files'])} files to {target_base}")
            return results
        except Exception as e:
            logger.exception("DTU: Commit failure")
            return {"ok": False, "reason": str(e)}

    def clear(self):
        """Wipes the shadow staging area."""
        if self.shadow_root.exists():
            shutil.rmtree(self.shadow_root)
        self._ensure_shadow()


# Singleton
dtu = DarkTwinUniverse()
