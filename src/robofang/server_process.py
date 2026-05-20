"""
RoboFang/server_process.py
==========================
Managed N MCP server HTTP instances. Each server runs via `python -m <pkg> --serve`
on its assigned 16xxx port. The supervisor polls health endpoints and auto-restarts
on crash with exponential backoff.

Architecture:
    supervisor :10866  →  ServerProcess  →  N subprocesses (one per fleet MCP server)
                              │
                     spawns python -m <server> --serve
                     polls  GET /api/health (or /health)
                     auto-restarts with backoff on crash
"""

from __future__ import annotations

import collections
import json
import logging
import os
import subprocess
import sys
import threading
import time

logger = logging.getLogger("ROBOFANG_server_process")

LOG_BUFFER_SIZE = 200

REPOS_ROOT = os.environ.get(
    "ROBOFANG_REPOS_ROOT",
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
)
FLEET_REGISTRY_PATH = os.path.join(REPOS_ROOT, "mcp-central-docs", "operations", "fleet-registry.json")

MCP_PORT_OFFSET = 16000 - 10700  # shift webapp port to MCP transport port
HEALTH_CHECK_TIMEOUT = 3.0
HEALTH_POLL_INTERVAL = 30.0

BACKOFF_INITIAL = 1.0
BACKOFF_MULTIPLIER = 1.5
BACKOFF_MAX = 60.0
MAX_RESTARTS = 10


def _read_registry() -> list[dict]:
    try:
        with open(FLEET_REGISTRY_PATH) as f:
            data = json.load(f)
        return data.get("fleet", [])
    except Exception as exc:
        logger.error("Failed to load fleet registry: %s", exc)
        return []


def _mcp_port(entry: dict) -> int | None:
    """Return the MCP HTTP port for a registry entry, or None if not applicable."""
    raw = entry.get("mcp_port") or entry.get("port")
    if raw is None:
        return None
    if entry.get("mcp_port"):
        return int(entry["mcp_port"])
    base_port = int(entry["port"])
    return base_port + MCP_PORT_OFFSET


def _start_command(entry: dict) -> list[str] | None:
    """Build the command to start a server in HTTP mode. Returns None if not supported."""
    repo_path = entry.get("repo_path", "")
    pyproject = os.path.join(repo_path, "pyproject.toml")
    package_json = os.path.join(repo_path, "package.json")

    if os.path.isfile(pyproject):
        return [sys.executable, "-m", entry["id"]]
    if os.path.isfile(package_json):
        return ["node", os.path.join(repo_path, "index.js")]
    return None


class ServerInstance:
    """One managed MCP server subprocess."""

    def __init__(self, entry: dict) -> None:
        self.entry = entry
        self.server_id: str = entry["id"]
        self.port: int | None = _mcp_port(entry)
        self.cmd: list[str] | None = _start_command(entry)
        self.cwd: str = entry.get("repo_path", "")

        self._proc: subprocess.Popen | None = None
        self._lock = threading.Lock()
        self._logs: collections.deque[str] = collections.deque(maxlen=LOG_BUFFER_SIZE)
        self._started_at: float | None = None
        self._stopped_at: float | None = None
        self._exit_code: int | None = None
        self._crash_count: int = 0
        self._backoff: float = BACKOFF_INITIAL
        self._reader_thread: threading.Thread | None = None

    @property
    def viable(self) -> bool:
        return self.port is not None and self.cmd is not None

    def start(self) -> dict:
        if not self.viable:
            return {"ok": False, "reason": "No port or start command"}
        with self._lock:
            if self._proc and self._proc.poll() is None:
                return {"ok": False, "reason": "Already running", "pid": self._proc.pid}

            self._logs.clear()
            self._exit_code = None
            env = {**os.environ, "PYTHONUNBUFFERED": "1"}
            src = os.path.join(self.cwd, "src")
            existing = env.get("PYTHONPATH", "")
            env["PYTHONPATH"] = f"{src};{existing}" if existing else src

            try:
                self._proc = subprocess.Popen(  # — cmd from local trusted fleet-registry.json
                    self.cmd,
                    cwd=self.cwd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    encoding="utf-8",
                    errors="replace",
                    env=env,
                )
                self._started_at = time.time()
                self._stopped_at = None
                self._start_reader()
                logger.info("[%s] Started PID %s on port %s", self.server_id, self._proc.pid, self.port)
                return {"ok": True, "pid": self._proc.pid}
            except Exception as exc:
                logger.exception("[%s] Start failed: %s", self.server_id, exc)
                return {"ok": False, "reason": str(exc)}

    def stop(self, timeout: float = 8.0) -> dict:
        with self._lock:
            if not self._proc or self._proc.poll() is not None:
                return {"ok": False, "reason": "Not running"}
            try:
                self._proc.terminate()
                try:
                    self._proc.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    self._proc.kill()
                    self._proc.wait()
                self._exit_code = self._proc.returncode
                self._stopped_at = time.time()
                logger.info("[%s] Stopped, exit code %s", self.server_id, self._exit_code)
                return {"ok": True, "exit_code": self._exit_code}
            except Exception as exc:
                return {"ok": False, "reason": str(exc)}

    def restart(self) -> dict:
        self.stop()
        self._backoff = BACKOFF_INITIAL
        return self.start()

    @property
    def status(self) -> dict:
        with self._lock:
            running = bool(self._proc and self._proc.poll() is None)
            poll = self._proc.poll() if self._proc else None
            if running:
                state = "running"
            elif self._proc is None:
                state = "never_started"
            elif poll == 0:
                state = "stopped"
            else:
                state = "crashed"
            uptime = round(time.time() - self._started_at) if running and self._started_at else None
            return {
                "id": self.server_id,
                "state": state,
                "running": running,
                "port": self.port,
                "pid": self._proc.pid if self._proc else None,
                "exit_code": self._exit_code,
                "uptime_seconds": uptime,
                "started_at": self._started_at,
                "stopped_at": self._stopped_at,
                "crash_count": self._crash_count,
                "backoff_seconds": round(self._backoff, 1),
                "log_lines": len(self._logs),
                "cmd": " ".join(self.cmd) if self.cmd else None,
            }

    def logs(self, n: int = 100) -> list[str]:
        with self._lock:
            return list(self._logs)[-n:]

    # ── Internal ──

    def _start_reader(self) -> None:
        t = threading.Thread(target=self._read_loop, daemon=True, name=f"reader-{self.server_id}")
        t.start()
        self._reader_thread = t

    def _read_loop(self) -> None:
        proc = self._proc
        if not proc or not proc.stdout:
            return
        try:
            for line in proc.stdout:
                stripped = line.rstrip("\n")
                with self._lock:
                    self._logs.append(stripped)
            proc.wait()
            exit_code = proc.returncode
            with self._lock:
                self._exit_code = exit_code
                self._stopped_at = time.time()
                if exit_code not in (0, -15, None):
                    self._crash_count += 1
                    logger.error(
                        "[%s] Crashed exit_code=%s (crash #%s)",
                        self.server_id,
                        exit_code,
                        self._crash_count,
                    )
            if exit_code not in (0, -15) and self._crash_count <= MAX_RESTARTS:
                logger.warning("[%s] Auto-restarting in %ss...", self.server_id, round(self._backoff, 1))
                time.sleep(self._backoff)
                self._backoff = min(self._backoff * BACKOFF_MULTIPLIER, BACKOFF_MAX)
                self.start()
        except Exception as exc:
            logger.exception("[%s] Reader error: %s", self.server_id, exc)


class HealthPoller:
    """Background thread that polls HTTP health endpoints for all managed servers."""

    def __init__(self, instances: list[ServerInstance], interval: float = HEALTH_POLL_INTERVAL):
        self._instances = instances
        self._interval = interval
        self._running = False
        self.statuses: dict[str, dict] = {}

    def start(self):
        self._running = True
        threading.Thread(target=self._run, daemon=True, name="health-poller").start()

    def stop(self):
        self._running = False

    def _run(self):
        while self._running:
            self._poll_all()
            time.sleep(self._interval)

    def _poll_all(self):
        import socket

        for inst in self._instances:
            if not inst.port:
                continue
            host = inst.entry.get("host", "127.0.0.1")
            try:
                with socket.create_connection((host, inst.port), timeout=HEALTH_CHECK_TIMEOUT):
                    self.statuses[inst.server_id] = {"alive": True, "timestamp": time.time()}
            except Exception:
                self.statuses[inst.server_id] = {"alive": False, "timestamp": time.time()}


class ServerProcessManager:
    """Manages all fleet MCP servers as supervised subprocesses."""

    def __init__(self, auto_start: bool = True):
        self._instances: list[ServerInstance] = []
        self._poller: HealthPoller | None = None
        self._load_registry()
        if auto_start:
            self.start_all()

    def _load_registry(self):
        entries = _read_registry()
        seen = set()
        for entry in entries:
            sid = entry["id"]
            if sid in seen:
                continue
            seen.add(sid)
            inst = ServerInstance(entry)
            if inst.viable:
                self._instances.append(inst)
        logger.info("Loaded %d manageable MCP servers from registry", len(self._instances))

    def start_all(self):
        for inst in self._instances:
            inst.start()
        self._poller = HealthPoller(self._instances)
        self._poller.start()
        logger.info("Started %d MCP servers + health poller", len(self._instances))

    def stop_all(self):
        if self._poller:
            self._poller.stop()
        for inst in self._instances:
            inst.stop()

    def get_instance(self, server_id: str) -> ServerInstance | None:
        for inst in self._instances:
            if inst.server_id == server_id:
                return inst
        return None

    @property
    def all_status(self) -> dict:
        return {inst.server_id: inst.status for inst in self._instances}

    def health_report(self) -> dict:
        alive = sum(1 for s in self.all_status.values() if s.get("running"))
        return {
            "total": len(self._instances),
            "alive": alive,
            "dead": len(self._instances) - alive,
            "cohesion": round((alive / max(len(self._instances), 1)) * 100),
        }
