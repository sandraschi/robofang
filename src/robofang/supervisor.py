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
import os
import subprocess
import sys
import threading
import time
import logging
from typing import Optional, Deque

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Configuration ─────────────────────────────────────────────────────────────

SUPERVISOR_PORT = 10872
BRIDGE_PORT = 10871

# Command to start the bridge — same as running `python -m RoboFang.main`
# We use sys.executable so we always get the same Python that ran the supervisor.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIDGE_CMD = [sys.executable, "-m", "robofang.main"]
BRIDGE_CWD = _REPO_ROOT

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
                self._proc = subprocess.Popen(
                    BRIDGE_CMD,
                    cwd=BRIDGE_CWD,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,  # merge stderr into stdout
                    text=True,
                    bufsize=1,
                    encoding="utf-8",
                    errors="replace",
                    env={**os.environ},
                )
                self._started_at = time.time()
                self._stopped_at = None
                logger.info(f"Bridge started, PID {self._proc.pid}")
                self._start_reader()
                return {"ok": True, "pid": self._proc.pid}
            except Exception as e:
                logger.error(f"Failed to start bridge: {e}")
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
        stop_result = self.stop()
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
            for line in proc.stdout:
                stripped = line.rstrip("\n")
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
                    self._logs.append(
                        f"[supervisor] Bridge exited with code {exit_code}"
                    )
            logger.info(f"Bridge reader loop ended, exit={exit_code}")

            # Auto-restart on crash
            if AUTO_RESTART and exit_code not in (0, -15):
                logger.warning(
                    f"Bridge crashed (exit {exit_code}), auto-restarting in {AUTO_RESTART_DELAY_S}s"
                )
                self._logs.append(
                    f"[supervisor] Auto-restarting in {AUTO_RESTART_DELAY_S}s..."
                )
                time.sleep(AUTO_RESTART_DELAY_S)
                self.start()
        except Exception as e:
            logger.error(f"Bridge reader error: {e}")


# Singleton
_bridge = BridgeProcess()

# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(title="RoboFang Supervisor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:10864",
        "http://127.0.0.1:10864",
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
    uvicorn.run(app, host="0.0.0.0", port=SUPERVISOR_PORT, log_level="info")
