"""Calibre Connector."""

import asyncio
import logging
import subprocess
from typing import Any

from .base import BaseConnector

logger = logging.getLogger(__name__)


class CalibreConnector(BaseConnector):
    """Connector for Calibre library via calibredb CLI subprocess.

    No extra Python deps — uses calibredb which ships with Calibre.

    config:
      calibredb_path  — path to calibredb (default: calibredb)
      library_path    — path to Calibre library folder
    """

    connector_type = "calibre"

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)
        self._calibredb = config.get("calibredb_path", "calibredb")
        self._library = config.get("library_path", "")

    def _cmd(self, *args: str) -> list[str]:
        cmd = [self._calibredb, *list(args)]
        if self._library:
            cmd += ["--library-path", self._library]
        return cmd

    async def connect(self) -> bool:
        loop = asyncio.get_running_loop()

        def _check():
            r = subprocess.run(
                [self._calibredb, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            return r.returncode == 0

        try:
            ok = await loop.run_in_executor(None, _check)
            self.active = ok
            if ok:
                self.logger.info("Calibre calibredb reachable.")
            else:
                self.logger.error("calibredb not found or returned error.")
            return ok
        except Exception as e:
            self.logger.error(f"Calibre connect failed: {e}")
            return False

    async def disconnect(self) -> bool:
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Add a book to Calibre or set metadata.

        target  — "add" | "set_metadata"
        content — file path (add) or book_id (set_metadata)
        kwargs  — for set_metadata: field, value
        """
        loop = asyncio.get_running_loop()

        def _run():
            if target == "add":
                r = subprocess.run(
                    self._cmd("add", content),
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                return r.returncode == 0
            elif target == "set_metadata":
                field = kwargs.get("field", "")
                value = kwargs.get("value", "")
                r = subprocess.run(
                    self._cmd("set_metadata", "--field", f"{field}:{value}", content),
                    capture_output=True,
                    text=True,
                    timeout=15,
                )
                return r.returncode == 0
            return False

        try:
            return await loop.run_in_executor(None, _run)
        except Exception as e:
            self.logger.error(f"Calibre send_message error: {e}")
            return False

    async def get_messages(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return recently added books from the Calibre library."""
        loop = asyncio.get_running_loop()
        import json as _json

        def _list():
            r = subprocess.run(
                self._cmd(
                    "list",
                    "--fields",
                    "id,title,authors,tags,formats",
                    "--limit",
                    str(limit),
                    "--sort-by",
                    "timestamp",
                    "--ascending",
                    "false",
                    "--for-machine",
                ),
                capture_output=True,
                text=True,
                timeout=30,
            )
            if r.returncode != 0:
                return []
            try:
                return _json.loads(r.stdout)
            except Exception:
                return []

        try:
            return await loop.run_in_executor(None, _list)
        except Exception as e:
            self.logger.error(f"Calibre get_messages error: {e}")
            return []
