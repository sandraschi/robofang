"""
RoboFang/supervisor.py
======================
Lightweight process supervisor for the RoboFang bridge.

Runs on port 10866. Manages the bridge process (port 10865) via subprocess.
The dashboard calls this to start / stop / restart the bridge and stream logs.

Architecture:
    dashboard :10864  →  supervisor :10866  (process control)
    dashboard :10864  →  bridge     :10865  (normal API)
                              ↑
                      supervisor manages this process
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
from typing import Deque, Optional

import uvicorn
from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Configuration ─────────────────────────────────────────────────────────────

SUPERVISOR_PORT = 10872
BRIDGE_PORT = 10871
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPOS_ROOT = os.environ.get("ROBOFANG_REPOS_ROOT", os.path.dirname(_REPO_ROOT))
FLEET_REGISTRY_PATH = os.path.join(
    REPOS_ROOT, "mcp-central-docs", "operations", "fleet-registry.json"
)

# Command to start the bridge — same as running `python -m robofang.main`
BRIDGE_CMD = [sys.executable, "-m", "robofang.main"]
BRIDGE_CWD = _REPO_ROOT
BRIDGE_STDOUT_LOG = os.path.join(_REPO_ROOT, "temp", "bridge_stdout.log")


# Fleet Installer: paths the bridge needs for installer-catalog. Set when spawning bridge so start.bat works.
def _bridge_env() -> dict:
    env = {**os.environ}
    env["PORT"] = str(BRIDGE_PORT)
    env["PYTHONUNBUFFERED"] = "1"  # so bridge tracebacks appear immediately in bridge_stdout.log
    if not env.get("ROBOFANG_FLEET_MANIFEST"):
        env["ROBOFANG_FLEET_MANIFEST"] = os.path.join(_REPO_ROOT, "fleet_manifest.yaml")
    if not env.get("ROBOFANG_HANDS_DIR"):
        env["ROBOFANG_HANDS_DIR"] = os.path.join(_REPO_ROOT, "hands")
    if not env.get("ROBOFANG_FLEET_REGISTRY") and os.path.isfile(FLEET_REGISTRY_PATH):
        env["ROBOFANG_FLEET_REGISTRY"] = FLEET_REGISTRY_PATH
    if "PYTHONPATH" not in env or _REPO_ROOT not in env.get("PYTHONPATH", ""):
        src = os.path.join(_REPO_ROOT, "src")
        env["PYTHONPATH"] = f"{src};{env.get('PYTHONPATH', '')}".strip(";")
    return env


# Rolling log buffer (stdout + stderr interleaved)
LOG_BUFFER_SIZE = 500

# Auto-restart on crash: True = supervisor restarts bridge automatically
AUTO_RESTART = False
AUTO_RESTART_DELAY_S = 3.0

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] supervisor: %(message)s",
)
logger = logging.getLogger("ROBOFANG_supervisor")

# ── Heartbeat ────────────────────────────────────────────────────────────────


class HeartbeatManager:
    """Maintains an adversarial system pulse for health monitoring."""

    def __init__(self, interval: float = 5.0):
        self.interval = interval
        self.last_pulse = 0.0
        self.pulse_count = 0
        self._running = False
        self._lock = threading.Lock()
        self.integrity_status = "nominal"

    def start(self):
        self._running = True
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()

    def _run(self):
        while self._running:
            # Adversarial check: verify we can still reach the bridge if running
            check_state = self._adversarial_check()

            with self._lock:
                self.last_pulse = time.time()
                self.pulse_count += 1
                self.integrity_status = check_state
            time.sleep(self.interval)

    def _adversarial_check(self) -> str:
        """Internal integrity check to ensure RoboFang hasn't been 'lobotomized'."""
        try:
            # Example check: Verify bridge port is bound if we think it should be
            if _bridge.status["running"]:
                import socket

                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(0.5)
                    if s.connect_ex(("127.0.0.1", BRIDGE_PORT)) != 0:
                        return "degraded (bridge port unreachable)"
            return "nominal"
        except Exception:
            return "degraded"

    def get_pulse(self):
        with self._lock:
            return {
                "timestamp": self.last_pulse,
                "count": self.pulse_count,
                "uptime": self.pulse_count * self.interval,
                "status": "alive",
                "integrity": self.integrity_status,
            }


_pulse = HeartbeatManager()
_pulse.start()


class FleetHealthMonitor:
    """Monitors connectivity and cohesion across the federated fleet."""

    def __init__(self, interval: float = 30.0):
        self.interval = interval
        self.cohesion_score = 100
        self.node_stats = {}  # node_id: {alive: bool, latency: float}
        self._running = False
        self._lock = threading.Lock()

    def start(self):
        self._running = True
        threading.Thread(target=self._run, daemon=True, name="fleet-health").start()

    def _run(self):
        while self._running:
            self._check_fleet()
            time.sleep(self.interval)

    def _check_fleet(self):
        try:
            with open(FLEET_REGISTRY_PATH, "r") as f:
                registry = json.load(f)
                fleet = registry.get("fleet", [])
        except Exception:
            return

        import socket

        new_stats = {}
        alive_count = 0

        for node in fleet:
            node_id = node["id"]
            host = node.get("host", "127.0.0.1")
            port = node.get("port")

            if not port:
                continue

            start_t = time.time()
            try:
                with socket.create_connection((host, port), timeout=1.0):
                    latency = (time.time() - start_t) * 1000
                    new_stats[node_id] = {"alive": True, "latency": latency}
                    alive_count += 1
            except Exception:
                new_stats[node_id] = {"alive": False, "latency": -1}

        with self._lock:
            self.node_stats = new_stats
            if fleet:
                self.cohesion_score = int((alive_count / len(fleet)) * 100)
            else:
                self.cohesion_score = 100

    def get_report(self):
        with self._lock:
            return {
                "cohesion_score": self.cohesion_score,
                "nodes": self.node_stats,
                "timestamp": time.time(),
            }


class SkillsWatcher:
    """Auto-discovers new MCP/Moltbot repositories in REPOS_ROOT."""

    def __init__(self, interval: float = 600.0):
        self.interval = interval
        self.discovered_nodes = []
        self._running = False

    def start(self):
        self._running = True
        threading.Thread(target=self._run, daemon=True, name="skills-watcher").start()

    def _run(self):
        while self._running:
            self._scan()
            time.sleep(self.interval)

    def _scan(self):
        new_discoveries = []
        if not os.path.exists(REPOS_ROOT):
            return

        for folder in os.listdir(REPOS_ROOT):
            full_path = os.path.join(REPOS_ROOT, folder)
            if not os.path.isdir(full_path):
                continue

            # Look for indicators of an MCP server or Moltbot skill
            if (
                os.path.exists(os.path.join(full_path, "mcpb.json"))
                or os.path.exists(os.path.join(full_path, "mcp.json"))
                or os.path.exists(os.path.join(full_path, "SKILL.md"))
            ):
                new_discoveries.append({"id": folder, "path": full_path, "type": "discovered_mcp"})

        self.discovered_nodes = new_discoveries

    def get_discoveries(self):
        return self.discovered_nodes


_health = FleetHealthMonitor()
_health.start()

_watcher = SkillsWatcher()
_watcher.start()

# ── Process State ─────────────────────────────────────────────────────────────


class BridgeProcess:
    """Thread-safe wrapper around the bridge subprocess."""

    def __init__(self) -> None:
        self._proc: Optional[subprocess.Popen] = None
        self._lock = threading.Lock()
        self._logs: Deque[str] = collections.deque(maxlen=LOG_BUFFER_SIZE)
        self._started_at: Optional[float] = None
        self._stopped_at: Optional[float] = None
        self._exit_code: Optional[int] = None
        self._reader_thread: Optional[threading.Thread] = None
        self._crash_count: int = 0

    # ── Public API ─────────────────────────────────────────────────────────

    def start(self) -> dict:
        with self._lock:
            if self._proc and self._proc.poll() is None:
                return {
                    "ok": False,
                    "reason": "Bridge is already running.",
                    "pid": self._proc.pid,
                }

            self._logs.clear()
            self._exit_code = None
            try:
                os.makedirs(os.path.dirname(BRIDGE_STDOUT_LOG), exist_ok=True)
                self._proc = subprocess.Popen(
                    BRIDGE_CMD,
                    cwd=BRIDGE_CWD,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,  # merge stderr into stdout
                    text=True,
                    bufsize=1,
                    encoding="utf-8",
                    errors="replace",
                    env=_bridge_env(),
                )
                self._started_at = time.time()
                self._stopped_at = None
                logger.info(f"Bridge started, PID {self._proc.pid}")
                self._start_reader()
                return {"ok": True, "pid": self._proc.pid}
            except Exception as e:
                logger.exception("Failed to start bridge: %s", e)
                return {"ok": False, "reason": str(e)}

    def stop(self, timeout: float = 8.0) -> dict:
        with self._lock:
            if not self._proc or self._proc.poll() is not None:
                return {"ok": False, "reason": "Bridge is not running."}
            try:
                self._proc.terminate()
                try:
                    self._proc.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    self._proc.kill()
                    self._proc.wait()
                self._exit_code = self._proc.returncode
                self._stopped_at = time.time()
                logger.info(f"Bridge stopped, exit code {self._exit_code}")
                return {"ok": True, "exit_code": self._exit_code}
            except Exception as e:
                return {"ok": False, "reason": str(e)}

    def restart(self) -> dict:
        self.stop()
        time.sleep(0.5)
        return self.start()

    @property
    def status(self) -> dict:
        with self._lock:
            running = bool(self._proc and self._proc.poll() is None)
            pid = self._proc.pid if self._proc else None
            poll = self._proc.poll() if self._proc else None

            if running:
                state = "running"
            elif self._proc is None:
                state = "never_started"
            elif poll == 0:
                state = "stopped"
            else:
                state = "crashed" if (poll is not None and poll != 0) else "stopped"

            uptime = None
            if running and self._started_at:
                uptime = round(time.time() - self._started_at)

            return {
                "state": state,
                "running": running,
                "pid": pid,
                "exit_code": self._exit_code,
                "uptime_seconds": uptime,
                "started_at": self._started_at,
                "stopped_at": self._stopped_at,
                "crash_count": self._crash_count,
                "auto_restart": AUTO_RESTART,
                "log_lines": len(self._logs),
                "bridge_port": BRIDGE_PORT,
                "bridge_cmd": " ".join(BRIDGE_CMD),
            }

    def logs(self, n: int = 100) -> list[str]:
        with self._lock:
            lines = list(self._logs)
        return lines[-n:] if n < len(lines) else lines

    # ── Internal ───────────────────────────────────────────────────────────

    def _start_reader(self) -> None:
        """Start a background thread that drains the bridge stdout pipe."""
        t = threading.Thread(target=self._read_loop, daemon=True, name="bridge-reader")
        t.start()
        self._reader_thread = t

    def _read_loop(self) -> None:
        proc = self._proc
        if not proc or not proc.stdout:
            return
        try:
            with open(BRIDGE_STDOUT_LOG, "w", encoding="utf-8", errors="replace") as bridge_log:
                for line in proc.stdout:
                    stripped = line.rstrip("\n")
                    bridge_log.write(stripped + "\n")
                    bridge_log.flush()
                    with self._lock:
                        self._logs.append(stripped)
            # stdout closed — process ended
            proc.wait()
            exit_code = proc.returncode
            with self._lock:
                self._exit_code = exit_code
                self._stopped_at = time.time()
                if exit_code not in (0, -15, None):  # -15 = SIGTERM
                    self._crash_count += 1
                    self._logs.append(f"[supervisor] Bridge exited with code {exit_code}")
                    crash_tail = list(self._logs)[-30:] if self._logs else []
                    logger.error(
                        "BRIDGE CRASHED exit_code=%s. Last 30 lines of bridge output:\n%s",
                        exit_code,
                        "\n".join(crash_tail) if crash_tail else "(no output)",
                    )
            logger.info("Bridge reader loop ended, exit=%s", exit_code)

            # Auto-restart on crash
            if AUTO_RESTART and exit_code not in (0, -15):
                logger.warning(
                    "Bridge crashed (exit %s), auto-restarting in %ss",
                    exit_code,
                    AUTO_RESTART_DELAY_S,
                )
                self._logs.append(f"[supervisor] Auto-restarting in {AUTO_RESTART_DELAY_S}s...")
                time.sleep(AUTO_RESTART_DELAY_S)
                self.start()
        except Exception as e:
            logger.exception("Bridge reader error: %s", e)


# Singleton
_bridge = BridgeProcess()


class FleetManager:
    """Manages installation and status of fleet nodes."""

    def __init__(self):
        self._installs = {}  # id: {status: str, logs: list}
        self._lock = threading.Lock()

    def get_market(self):
        try:
            with open(FLEET_REGISTRY_PATH, "r") as f:
                return json.load(f)["fleet"]
        except Exception as e:
            logger.error(f"Failed to load fleet registry: {e}")
            return []

    def install(self, node_id: str):
        market = self.get_market()
        node = next((n for n in market if n["id"] == node_id), None)
        if not node:
            return {"ok": False, "reason": "Node not found in registry"}

        with self._lock:
            if node_id in self._installs and self._installs[node_id]["status"] == "installing":
                return {"ok": False, "reason": "Installation already in progress"}
            self._installs[node_id] = {"status": "installing", "logs": []}

        def run_install():
            logger.info(f"Starting installation for {node_id}")
            path = node["repo_path"]
            repo_url = (
                f"https://github.com/sandraschi/{node_id}.git"  # Assumption for this environment
            )

            def log(msg):
                with self._lock:
                    self._installs[node_id]["logs"].append(msg)
                    logger.info(f"[{node_id}] {msg}")

            try:
                if not os.path.exists(path):
                    log(f"Cloning {repo_url} to {path}...")
                    subprocess.run(
                        ["git", "clone", "--depth", "1", repo_url, path],
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                else:
                    log(f"Path {path} already exists. Skipping clone.")

                # Setup
                if os.path.exists(os.path.join(path, "pyproject.toml")):
                    log("Detected Python project. Running uv sync...")
                    subprocess.run(
                        ["uv", "sync"],
                        cwd=path,
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                elif os.path.exists(os.path.join(path, "package.json")):
                    log("Detected Node project. Running npm install...")
                    subprocess.run(
                        ["npm.cmd", "install"],
                        cwd=path,
                        shell=True,
                        check=True,
                        capture_output=True,
                        text=True,
                    )

                with self._lock:
                    self._installs[node_id]["status"] = "completed"
                log("Installation complete.")
            except Exception as e:
                with self._lock:
                    self._installs[node_id]["status"] = "failed"
                log(f"Installation failed: {e!s}")

        thread = threading.Thread(target=run_install, daemon=True)
        thread.start()
        return {"ok": True}

    def get_status(self):
        with self._lock:
            return self._installs


_fleet = FleetManager()


class SupervisorInterface:
    @property
    def status(self):
        return _bridge.status

    def get_pulse(self):
        return _pulse.get_pulse()["pulse"] if "pulse" in _pulse.get_pulse() else _pulse.get_pulse()

    @property
    def fleet_nodes(self):
        return _fleet.get_status()

    def get_fleet_health(self):
        return _health.get_report()

    def get_discoveries(self):
        return _watcher.get_discoveries()


supervisor = SupervisorInterface()

# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(title="RoboFang Supervisor", version="1.0.0")


@app.on_event("startup")
def _auto_start_bridge():
    """Start the bridge automatically so start.bat brings up bridge + hub with one click."""
    result = _bridge.start()
    if result.get("ok"):
        logger.info("Bridge auto-started on port %s (PID %s)", BRIDGE_PORT, result.get("pid"))
    else:
        logger.error(
            "Bridge auto-start FAILED: %s (check temp/bridge_stdout.log after bridge exits)",
            result.get("reason", "unknown"),
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:10864",
        "http://127.0.0.1:10864",
        "http://localhost:10870",
        "http://127.0.0.1:10870",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AutoRestartRequest(BaseModel):
    enabled: bool


@app.get("/supervisor/status")
def supervisor_status():
    return {"success": True, **_bridge.status}


@app.post("/supervisor/start")
def supervisor_start():
    result = _bridge.start()
    return {"success": result["ok"], **result}


@app.post("/supervisor/stop")
def supervisor_stop():
    result = _bridge.stop()
    return {"success": result["ok"], **result}


@app.post("/supervisor/restart")
def supervisor_restart():
    result = _bridge.restart()
    return {"success": result["ok"], **result}


@app.get("/supervisor/logs")
def supervisor_logs(n: int = 100):
    lines = _bridge.logs(n)
    return {"success": True, "lines": lines, "count": len(lines)}


@app.post("/supervisor/auto_restart")
def set_auto_restart(req: AutoRestartRequest):
    global AUTO_RESTART
    AUTO_RESTART = req.enabled
    return {"success": True, "auto_restart": AUTO_RESTART}


@app.get("/supervisor/fleet/market")
def get_fleet_market():
    return {"success": True, "market": _fleet.get_market()}


class InstallRequest(BaseModel):
    id: str


@app.post("/supervisor/fleet/install")
def install_fleet_node(req: InstallRequest, background_tasks: BackgroundTasks):
    result = _fleet.install(req.id)
    return {"success": result.get("ok", False), **result}


@app.get("/supervisor/fleet/status")
def get_fleet_status():
    return {"success": True, "status": _fleet.get_status()}


@app.get("/supervisor/pulse")
def get_supervisor_pulse():
    """Returns the heartbeat pulse of the supervisor with integrity check."""
    return {"success": True, "pulse": _pulse.get_pulse()}


@app.get("/supervisor/fleet/health")
def get_fleet_health_report():
    """Returns the comprehensive fleet health report."""
    return {"success": True, "report": _health.get_report()}


@app.get("/supervisor/fleet/discoveries")
def get_fleet_discoveries():
    """Returns the list of auto-discovered MCP servers."""
    return {"success": True, "discoveries": _watcher.get_discoveries()}


@app.get("/supervisor/health")
def supervisor_health():
    """Simple liveness probe for the supervisor itself."""
    return {
        "status": "healthy",
        "service": "RoboFang-supervisor",
        "port": SUPERVISOR_PORT,
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info(f"RoboFang Supervisor starting on port {SUPERVISOR_PORT}")
    logger.info(f"Bridge command: {' '.join(BRIDGE_CMD)}")
    logger.info(f"Bridge CWD:     {BRIDGE_CWD}")
    # Kill existing terminals before starting
    os.system(
        'taskkill /F /IM powershell.exe /T /FI "WINDOWTITLE eq RoboFang-Connector*" >nul 2>&1'
    )
    os.system('taskkill /F /IM cmd.exe /T /FI "WINDOWTITLE eq RoboFang-Connector*" >nul 2>&1')

    uvicorn.run(app, host="0.0.0.0", port=SUPERVISOR_PORT, log_level="info")
