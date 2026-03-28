import asyncio
import hashlib
import logging
import os
import subprocess
from typing import Any, Dict

logger = logging.getLogger("robofang.heartbeat")


class HeartbeatService:
    """
    Background service that periodically audits the local fleet's integrity.
    Inspired by the 'Skills Scanner' and 'MCP Scanner' patterns in Cisco DefenseClaw.
    """

    def __init__(self, interval_seconds: int = 3600):
        self.interval = interval_seconds
        self.is_running = False
        self.repos_root = os.getenv("ROBOFANG_REPOS_ROOT", "D:\\Dev\\repos")

    async def start(self):
        """Starts the periodic heartbeat loop."""
        if self.is_running:
            return
        self.is_running = True
        logger.info("Heartbeat Service started (interval: %d seconds).", self.interval)

        while self.is_running:
            try:
                await self.perform_audit()
            except Exception as e:
                logger.error("Heartbeat Audit Error: %s", e)

            await asyncio.sleep(self.interval)

    async def stop(self):
        """Stops the heartbeat loop."""
        self.is_running = False
        logger.info("Heartbeat Service stopping...")

    async def perform_audit(self):
        """Performs a security audit of the local fleet repositories."""
        logger.info("Starting Sovereign Integrity Audit...")

        findings = []
        # Audit critical repos
        for repo_name in ["robofang", "resonite-mcp", "vroidstudio-mcp", "games-app", "myai"]:
            repo_path = os.path.join(self.repos_root, repo_name)
            if not os.path.exists(repo_path):
                logger.warning("Repo path missing: %s", repo_path)
                continue

            # Verify Git Remote (Anti-Poisoning)
            remote_audit = self._verify_git_remote(repo_path)
            if not remote_audit["success"]:
                findings.append(
                    f"POISON_ALERT ({repo_name}): Unknown remote found: {remote_audit['remote']}"
                )
                logger.critical(
                    "SECURITY ALERT: Unknown remote detected in %s: %s",
                    repo_name,
                    remote_audit["remote"],
                )

            # Phase 7.2: Hash verification for critical modules
            if repo_name == "robofang":
                hash_audit = self._verify_file_hashes(repo_path)
                if not hash_audit["success"]:
                    findings.extend(
                        [f"HASH_MISMATCH ({repo_name}): {m}" for m in hash_audit["mismatches"]]
                    )
                    for mismatch in hash_audit["mismatches"]:
                        logger.critical(
                            "SECURITY ALERT: Hash mismatch in %s: %s", repo_name, mismatch
                        )

        if not findings:
            logger.info(
                "Integrity Audit PASSED: No unauthorized remotes or hash mismatches detected."
            )
        else:
            logger.warning(
                "Integrity Audit COMPLETED with %d findings.", len(findings) + len(findings)
            )

    def _verify_file_hashes(self, repo_path: str) -> Dict[str, Any]:
        # Baseline: SHA-256 hashes for v12.3 stable (Modular Deconstruction)
        baseline = {
            "src/robofang/main.py": "8EF63037E6159616F1A0EE6C090C75A9A11011E47A3A3C020F59C89F2C4DA615",
            "src/robofang/app/lifecycle.py": "710AC9724CB3854B5DA8E48C88FD6AE8912E56A78C2BCBC3CB30DC1669DF2646",
            "src/robofang/core/orchestrator.py": "3587B4E3DEAD57674A268C673B9A04F705FB1FB20FF733963A5CD246E0882EEA",
            "src/robofang/core/state.py": "FC918C789DA9BA8A2D1CC130F8600387F295F569DBB84A904160F4BFB66B3EFB",
            "src/robofang/core/reasoning.py": "74D70672B9A12BB6AAA4CF5C9C80A3AD9E7EEF5515ABFB4E6D7300ED5DB79879",
        }

        mismatches = []
        for rel_path, expected_hash in baseline.items():
            full_path = os.path.join(repo_path, rel_path)
            if not os.path.exists(full_path):
                mismatches.append(f"MISSING: {rel_path}")
                continue

            try:
                hasher = hashlib.sha256()
                with open(full_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        hasher.update(chunk)

                actual_hash = hasher.hexdigest().upper()
                if actual_hash != expected_hash.upper():
                    mismatches.append(f"MODIFIED: {rel_path} (Actual: {actual_hash[:8]}...)")
            except Exception as e:
                mismatches.append(f"ERROR: {rel_path} ({e})")

        return {"success": len(mismatches) == 0, "mismatches": mismatches}

    def _verify_git_remote(self, path: str) -> Dict[str, Any]:
        """Checks if the 'origin' remote matches the authorized baseline."""
        try:
            # We use subprocess here for pure git interaction
            cmd = ["git", "-C", path, "remote", "get-url", "origin"]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            url = result.stdout.strip()

            # Baseline check: (Simple example: must be 'github.com/sandraschi' or local source)
            # In a production environment, this would use a signed manifest.
            authorized = ["github.com/sandraschi", self.repos_root]
            is_authorized = any(pattern in url for pattern in authorized)

            return {"success": is_authorized, "remote": url}
        except Exception:
            return {"success": False, "remote": "ERROR_CHECK_FAILED"}


if __name__ == "__main__":
    # Standalone verification mode
    logging.basicConfig(level=logging.INFO)
    service = HeartbeatService(interval_seconds=10)
    asyncio.run(service.start())
