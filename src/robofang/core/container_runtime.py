"""Container Runtime — abstraction for per-hand execution isolation.

Inspired by NanoClaw's container-runner.ts pattern. Each hand can run:
    - LocalRuntime: in-process asyncio task (current behavior, backward compat)
    - DockerRuntime: per-hand Docker container with explicit mounts, no host access

Key NanoClaw-inspired patterns:
    - Session DB (SQLite): clean IO boundary between host and hand container
    - Explicit mounts: hand can only access what's explicitly mounted
    - Credential-free: vault proxy injects keys at request time
    - Heartbeat + idle kill: container lifecycle managed from outside

Mount structure (DockerRuntime):
    /workspace/              ← hand workspace (read-write)
    /workspace/agent/        ← hand definition + CLAUDE.md (read-only)
    /workspace/repos/        ← Git repos (read-only, from host)
    /app/vault/              ← credential vault proxy endpoint (network)
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol, runtime_checkable

logger = logging.getLogger("robofang.runtime")


# ── Runtime protocol ───────────────────────────────────────────────────────────


@runtime_checkable
class Runtime(Protocol):
    """Contract for hand execution environments."""

    def launch(self, hand_id: str, config: dict[str, Any]) -> str:
        """Launch a hand. Returns a runtime_id for tracking."""
        ...

    async def stop(self, runtime_id: str) -> bool:
        """Stop a running hand. Returns True if successful."""
        ...

    def is_running(self, runtime_id: str) -> bool:
        """Check if a hand is still running."""
        ...


# ── Mount spec ─────────────────────────────────────────────────────────────────


@dataclass
class MountSpec:
    host_path: str
    container_path: str
    readonly: bool = False


@dataclass
class HandContainerConfig:
    image: str = "python:3.12-slim"
    cpu_limit: str = "1.0"
    memory_limit: str = "512m"
    timeout_seconds: int = 3600
    network: str = "none"  # "none" = air-gapped, "host" = host network
    mounts: list[MountSpec] = field(default_factory=list)
    env: dict[str, str] = field(default_factory=dict)
    capabilities: set[str] = field(default_factory=set)


# ── Local Runtime (backward-compatible, current behavior) ──────────────────────


class LocalRuntime:
    """Runs hands as in-process asyncio tasks. Current default behavior."""

    def __init__(self, hands_manager: Any):
        self._manager = hands_manager
        self._running: dict[str, asyncio.Task] = {}

    def launch(self, hand_id: str, config: dict[str, Any] | None = None) -> str:
        hand = self._manager.hands.get(hand_id)
        if not hand:
            raise ValueError(f"Hand '{hand_id}' not registered")

        async def _wrapper():
            hand.activate()
            while hand.active:
                try:
                    await hand.pulse(self._manager.orchestrator)
                except Exception as e:
                    logger.error("Hand '%s' pulse error: %s", hand_id, e)
                await asyncio.sleep(hand.pulse_interval or 10)

        task = asyncio.create_task(_wrapper())
        task_id = f"local_{hand_id}_{int(time.time() * 1000)}"
        self._running[task_id] = task
        logger.info("LocalRuntime launched hand '%s' (task=%s).", hand_id, task_id)
        return task_id

    async def stop(self, runtime_id: str) -> bool:
        task = self._running.pop(runtime_id, None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            logger.info("LocalRuntime stopped task '%s'.", runtime_id)
            return True
        return False

    def is_running(self, runtime_id: str) -> bool:
        task = self._running.get(runtime_id)
        return task is not None and not task.done()


# ── Docker Runtime (containerized, NanoClaw-inspired) ──────────────────────────


class DockerRuntime:
    """Launches hands in rootless Docker containers with explicit mounts.

    Inspired by NanoClaw's container isolation pattern:
    - Each hand gets its own container
    - Only explicitly mounted paths are visible
    - No host network access (network: none)
    - Heartbeat-based lifecycle management
    - Credentials injected via vault proxy, never stored in container
    """

    def __init__(
        self,
        hands_dir: Path,
        repos_root: Path = Path("d:/dev/repos"),
        docker_bin: str = "docker",
        vault_url: str = "http://host.docker.internal:10871/vault",
    ):
        self._hands_dir = Path(hands_dir)
        self._repos_root = Path(repos_root)
        self._docker = docker_bin
        self._vault_url = vault_url
        self._containers: dict[str, subprocess.Popen] = {}
        self._container_names: dict[str, str] = {}

    def _container_name(self, hand_id: str) -> str:
        ts = int(time.time())
        short_hash = hashlib.sha256(f"{hand_id}{ts}".encode()).hexdigest()[:8]
        return f"rf-hand-{hand_id}-{short_hash}"

    def _build_mounts(self, hand_id: str, config: HandContainerConfig) -> list[str]:
        """Build Docker -v mount args from MountSpec list."""
        args = []
        for mount in config.mounts:
            ro_flag = ":ro" if mount.readonly else ""
            args.extend(["-v", f"{mount.host_path}:{mount.container_path}{ro_flag}"])
        return args

    def _build_env(self, config: HandContainerConfig) -> list[str]:
        """Build Docker -e env args, minus any API key envs (vault handles those)."""
        args = []
        sensitive_keys = {"API_KEY", "TOKEN", "SECRET", "PASSWORD"}
        for key, value in config.env.items():
            if any(s in key.upper() for s in sensitive_keys):
                continue
            args.extend(["-e", f"{key}={value}"])
        args.extend(["-e", f"ROBOFANG_VAULT_URL={self._vault_url}"])
        return args

    def launch(self, hand_id: str, config: HandContainerConfig | None = None) -> str:
        cfg = config or HandContainerConfig()

        if not self._docker_available():
            raise RuntimeError("Docker not available — install Docker Desktop or switch to LocalRuntime")

        container_name = self._container_name(hand_id)
        args = [
            self._docker,
            "run",
            "-d",
            "--rm",
            "--name",
            container_name,
            "--cpus",
            cfg.cpu_limit,
            "--memory",
            cfg.memory_limit,
            "--network",
            cfg.network,
        ]

        if cfg.network == "none":
            args.append("--add-host=host.docker.internal:host-gateway")

        args.extend(self._build_mounts(hand_id, cfg))
        args.extend(self._build_env(cfg))
        args.append(cfg.image)

        hand_dir = self._hands_dir / hand_id
        if hand_dir.exists():
            args.extend(["-v", f"{hand_dir}:/workspace/agent:ro"])

        entrypoint_path = hand_dir / "entrypoint.sh"
        if entrypoint_path.exists():
            args.extend(["/bin/bash", "/workspace/agent/entrypoint.sh"])
        else:
            args.extend(["python", "-c", f"print('Hand {hand_id} container active')"])

        logger.info("DockerRuntime launching: %s", " ".join(args))
        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = proc.communicate(timeout=30)
        runtime_id = stdout.decode().strip()

        if proc.returncode != 0:
            raise RuntimeError(f"Docker launch failed: {stderr.decode()}")

        self._containers[runtime_id] = proc
        self._container_names[runtime_id] = container_name
        logger.info("DockerRuntime launched '%s' (container=%s, id=%s).", hand_id, container_name, runtime_id)
        return runtime_id

    async def stop(self, runtime_id: str) -> bool:
        container_name = self._container_names.get(runtime_id)
        if not container_name:
            return False
        try:
            subprocess.run(
                [self._docker, "stop", "-t", "10", container_name],
                capture_output=True,
                timeout=15,
            )
            self._containers.pop(runtime_id, None)
            self._container_names.pop(runtime_id, None)
            logger.info("DockerRuntime stopped container '%s'.", container_name)
            return True
        except Exception as e:
            logger.error("Failed to stop container '%s': %s", container_name, e)
            return False

    def is_running(self, runtime_id: str) -> bool:
        container_name = self._container_names.get(runtime_id)
        if not container_name:
            return False
        result = subprocess.run(
            [self._docker, "inspect", "-f", "{{.State.Running}}", container_name],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() == "true"

    def _docker_available(self) -> bool:
        try:
            subprocess.run([self._docker, "info"], capture_output=True, timeout=5)
            return True
        except Exception:
            return False

    def list_containers(self) -> list[dict[str, str]]:
        return [{"id": rid, "name": name} for rid, name in self._container_names.items()]


# ── Session DB (NanoClaw-inspired IO boundary) ─────────────────────────────────


class SessionDB:
    """In-process SQLite session DB for hand-container communication.

    Inspired by NanoClaw's inbound.db / outbound.db pattern.
    Provides a clean, typed IO boundary between host orchestration
    and hand execution, regardless of runtime (Local or Docker).

    Schema mirrors NanoClaw's messages_in / messages_out with
    Python-native types.
    """

    def __init__(self, session_id: str, db_path: str | None = None):
        self.session_id = session_id
        self._db_path = db_path or f"data/sessions/{session_id}.db"
        self._init_db()

    def _init_db(self):
        import sqlite3

        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self._db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages_in (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                content TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages_out (
                id TEXT PRIMARY KEY,
                in_reply_to TEXT,
                timestamp TEXT NOT NULL,
                delivered INTEGER DEFAULT 0,
                content TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()

    def write_inbound(self, kind: str, content: Any) -> str:
        import sqlite3
        import uuid

        msg_id = str(uuid.uuid4())
        conn = sqlite3.connect(self._db_path)
        conn.execute(
            "INSERT INTO messages_in (id, kind, timestamp, status, content) "
            "VALUES (?, ?, datetime('now'), 'pending', ?)",
            (msg_id, kind, json.dumps(content)),
        )
        conn.commit()
        conn.close()
        return msg_id

    def write_outbound(self, in_reply_to: str | None, content: Any) -> str:
        import sqlite3
        import uuid

        msg_id = str(uuid.uuid4())
        conn = sqlite3.connect(self._db_path)
        conn.execute(
            "INSERT INTO messages_out (id, in_reply_to, timestamp, delivered, content) "
            "VALUES (?, ?, datetime('now'), 0, ?)",
            (msg_id, in_reply_to, json.dumps(content)),
        )
        conn.commit()
        conn.close()
        return msg_id

    def read_pending(self) -> list[dict[str, Any]]:
        import sqlite3

        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM messages_in WHERE status = 'pending' ORDER BY timestamp ASC").fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def mark_processed(self, msg_id: str):
        import sqlite3

        conn = sqlite3.connect(self._db_path)
        conn.execute("UPDATE messages_in SET status = 'completed' WHERE id = ?", (msg_id,))
        conn.commit()
        conn.close()

    def read_undelivered(self) -> list[dict[str, Any]]:
        import sqlite3

        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM messages_out WHERE delivered = 0 ORDER BY timestamp ASC").fetchall()
        conn.close()
        return [dict(r) for r in rows]
