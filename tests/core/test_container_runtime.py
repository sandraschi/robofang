"""Tests for Container Runtime (hand execution isolation)."""

import os
import tempfile

import pytest
from robofang.core.container_runtime import (
    HandContainerConfig,
    MountSpec,
    SessionDB,
)


class TestSessionDB:
    @pytest.fixture
    def db(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db = SessionDB("test-session", os.path.join(tmpdir, "session.db"))
            yield db

    def test_write_inbound(self, db):
        msg_id = db.write_inbound("chat", {"text": "hello"})
        assert msg_id is not None
        assert len(msg_id) > 0

    def test_read_pending(self, db):
        db.write_inbound("chat", {"text": "msg1"})
        db.write_inbound("task", {"prompt": "do something"})
        pending = db.read_pending()
        assert len(pending) == 2
        assert all(p["status"] == "pending" for p in pending)

    def test_mark_processed(self, db):
        msg_id = db.write_inbound("chat", {"text": "process me"})
        pending = db.read_pending()
        assert len(pending) == 1
        db.mark_processed(msg_id)
        pending_after = db.read_pending()
        assert len(pending_after) == 0

    def test_write_outbound(self, db):
        in_id = db.write_inbound("chat", {"text": "input"})
        out_id = db.write_outbound(in_id, {"text": "response"})
        assert out_id is not None

    def test_read_undelivered(self, db):
        db.write_outbound(None, {"text": "out1"})
        db.write_outbound(None, {"text": "out2"})
        messages = db.read_undelivered()
        assert len(messages) == 2
        assert all(m["delivered"] == 0 for m in messages)

    def test_wal_mode(self, db):
        import sqlite3

        conn = sqlite3.connect(db._db_path)
        result = conn.execute("PRAGMA journal_mode").fetchone()
        conn.close()
        assert result[0] == "wal"


class TestMountSpec:
    def test_mount_spec_defaults(self):
        m = MountSpec(host_path="/data", container_path="/workspace/data")
        assert m.readonly is False

    def test_mount_spec_readonly(self):
        m = MountSpec(host_path="/data", container_path="/workspace/data", readonly=True)
        assert m.readonly is True


class TestHandContainerConfig:
    def test_defaults(self):
        cfg = HandContainerConfig()
        assert cfg.network == "none"
        assert cfg.cpu_limit == "1.0"
        assert cfg.memory_limit == "512m"
        assert cfg.timeout_seconds == 3600

    def test_custom_config(self):
        cfg = HandContainerConfig(
            image="robofang/hand:latest",
            cpu_limit="2.0",
            memory_limit="1g",
            network="host",
            mounts=[MountSpec("/repos", "/workspace/repos", readonly=True)],
        )
        assert cfg.image == "robofang/hand:latest"
        assert len(cfg.mounts) == 1
        assert cfg.mounts[0].host_path == "/repos"
