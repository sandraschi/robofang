"""
RoboFang Storage Layer: Persistent state management using SQLite.
Handles durability for security policies, personas, and fleet configuration.
"""

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class RoboFangStorage:
    """
    Sovereign storage engine for RoboFang.
    Ensures that fleet state survives reboots.
    """

    def __init__(self, db_path: Optional[Path] = None):
        if not db_path:
            # Default to repo_root/data/RoboFang.db
            repo_root = Path(__file__).parent.parent.parent.parent
            data_dir = repo_root / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = data_dir / "robofang.db"

        self.db_path = db_path
        self.logger = logging.getLogger("robofang.core.storage")
        self._init_db()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        """Initialize core tables if they don't exist."""
        self.logger.info(f"Initializing RoboFang Storage at {self.db_path}")
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 1. Security Policies (RBAC)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_policies (
                    subject TEXT PRIMARY KEY,
                    role TEXT NOT NULL,
                    permissions TEXT NOT NULL  -- JSON array of strings
                )
            """)

            # 2. Personality Personas
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS personas (
                    name TEXT PRIMARY KEY,
                    system_prompt TEXT NOT NULL,
                    metadata TEXT               -- JSON blob for extra traits
                )
            """)

            # 3. Fleet Configuration Overrides
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS fleet_config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL         -- JSON blob
                )
            """)

            # 4. Encrypted Secrets (v13.0 Materialist Storage)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS secrets (
                    key_name TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    metadata TEXT               -- JSON blob for algo/salt
                )
            """)

            # 5. Audit Logs (Persistent track of critical actions)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    level TEXT NOT NULL,
                    source TEXT NOT NULL,
                    event TEXT NOT NULL,
                    details TEXT                -- JSON blob
                )
            """)

            # 6. Private forum (local-only discussion; no Moltbook cloud)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS forum_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    author TEXT NOT NULL DEFAULT 'guest',
                    content TEXT NOT NULL,
                    thread_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()

    # --- Security Policy Operations ---

    def save_security_policy(self, subject: str, role: str, permissions: List[str]):
        """Persist a security policy to the database."""
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO security_policies (subject, role, permissions)
                VALUES (?, ?, ?)
            """,
                (subject, role, json.dumps(permissions)),
            )
            conn.commit()

    def load_all_security_policies(self) -> Dict[str, Dict[str, Any]]:
        """Load all security policies into memory."""
        policies = {}
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT subject, role, permissions FROM security_policies")
            for subject, role, permissions_json in cursor.fetchall():
                policies[subject] = {
                    "role": role,
                    "permissions": set(json.loads(permissions_json)),
                }
        return policies

    # --- Persona Operations ---

    def save_persona(
        self, name: str, system_prompt: str, metadata: Optional[Dict[str, Any]] = None
    ):
        """Persist a persona to the database."""
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO personas (name, system_prompt, metadata)
                VALUES (?, ?, ?)
            """,
                (name, system_prompt, json.dumps(metadata or {})),
            )
            conn.commit()

    def load_all_personas(self) -> Dict[str, Dict[str, Any]]:
        """Load all personas into memory."""
        personas = {}
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT name, system_prompt, metadata FROM personas")
            for name, system_prompt, metadata_json in cursor.fetchall():
                personas[name] = {
                    "system_prompt": system_prompt,
                    "metadata": json.loads(metadata_json),
                }
        return personas

    def load_persona(self, name: str) -> Optional[Dict[str, Any]]:
        """Load a single persona."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT system_prompt, metadata FROM personas WHERE name = ?", (name,)
            )
            row = cursor.fetchone()
            if row:
                return {"system_prompt": row[0], "metadata": json.loads(row[1])}
        return None

    # --- Secret Operations ---

    def save_secret(self, key_name: str, value: str, metadata: Optional[Dict[str, Any]] = None):
        """Persist a secret to the database."""
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO secrets (key_name, value, metadata)
                VALUES (?, ?, ?)
            """,
                (key_name, value, json.dumps(metadata or {})),
            )
            conn.commit()

    def get_secret(self, key_name: str) -> Optional[str]:
        """Retrieve a secret by name."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT value FROM secrets WHERE key_name = ?", (key_name,))
            row = cursor.fetchone()
            if row:
                return row[0]
        return None

    # --- Fleet Config / Key-Value (memory, hand metrics, PA state) ---

    def set_fleet_config(self, key: str, value: Any) -> None:
        """Persist a key-value pair (JSON-serialized) for fleet/memory state."""
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO fleet_config (key, value)
                VALUES (?, ?)
            """,
                (key, json.dumps(value)),
            )
            conn.commit()

    def get_fleet_config(self, key: str) -> Optional[Any]:
        """Retrieve a value by key; returns None if missing."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT value FROM fleet_config WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                try:
                    return json.loads(row[0])
                except (TypeError, ValueError):
                    return row[0]
        return None

    # --- Audit Log Operations ---

    def log_event(
        self, level: str, source: str, event: str, details: Optional[Dict[str, Any]] = None
    ):
        """Persist a critical event to the audit log."""
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO audit_logs (level, source, event, details)
                VALUES (?, ?, ?, ?)
            """,
                (level, source, event, json.dumps(details or {})),
            )
            conn.commit()

    def get_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve the most recent audit logs."""
        logs = []
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT id, timestamp, level, source, event, details FROM audit_logs ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
            for row in cursor.fetchall():
                logs.append(
                    {
                        "id": row[0],
                        "timestamp": row[1],
                        "level": row[2],
                        "source": row[3],
                        "event": row[4],
                        "details": json.loads(row[5]),
                    }
                )
        return logs

    # --- Private forum (local-only discussion) ---

    def save_forum_post(
        self,
        content: str,
        author: str = "guest",
        thread_id: Optional[int] = None,
    ) -> int:
        """Persist a forum post. Returns the new post id."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO forum_posts (author, content, thread_id)
                VALUES (?, ?, ?)
                """,
                (author, content, thread_id),
            )
            conn.commit()
            return cursor.lastrowid or 0

    def get_forum_feed(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve the most recent forum posts (newest first)."""
        posts = []
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT id, author, content, thread_id, created_at
                FROM forum_posts
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (min(max(1, limit), 500),),
            )
            for row in cursor.fetchall():
                posts.append(
                    {
                        "id": row[0],
                        "author": row[1],
                        "content": row[2],
                        "thread_id": row[3],
                        "created_at": row[4],
                    }
                )
        return posts
