"""RoboFang Application Logging: Ring buffer and file loggers."""

import collections
import logging
import time
from pathlib import Path
from typing import ClassVar

_LOG_BUFFER_SIZE = 300
log_buffer: collections.deque = collections.deque(maxlen=_LOG_BUFFER_SIZE)
_log_seq = 0  # monotonic id counter


class _RingHandler(logging.Handler):
    """Logging handler that pushes structured entries into _log_buffer."""

    LEVEL_MAP: ClassVar[dict[int, str]] = {
        logging.DEBUG: "debug",
        logging.INFO: "info",
        logging.WARNING: "warn",
        logging.ERROR: "error",
        logging.CRITICAL: "error",
    }

    def emit(self, record: logging.LogRecord) -> None:
        global _log_seq
        try:
            _log_seq += 1
            log_buffer.append(
                {
                    "id": f"{int(record.created * 1000)}-{_log_seq}",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(record.created)),
                    "level": self.LEVEL_MAP.get(record.levelno, "info"),
                    "source": record.name.replace("robofang.", "").replace("ROBOFANG_", "") or "core",
                    "message": self.format(record),
                    "category": _categorise(record.name),
                }
            )
        except Exception:
            pass


def _categorise(name: str) -> str:
    n = name.lower()
    if "mcp" in n or "connector" in n or "plugin" in n:
        return "mcp"
    if "security" in n or "auth" in n:
        return "auth"
    if "reason" in n or "skill" in n or "knowledge" in n or "personality" in n:
        return "agent"
    return "system"


def get_logs() -> list:
    """Return the current in-memory log buffer."""
    return list(log_buffer)


def setup_logging():
    """Configure the root logger with a ring buffer and optional file output."""
    # Ring handler MUST be added before basicConfig so every record hits it.
    ring_handler = _RingHandler()
    ring_handler.setFormatter(logging.Formatter("%(message)s"))
    logging.getLogger().addHandler(ring_handler)

    # Optional file log for Grafana/Loki (logs/robofang-bridge.log). Same format as console.
    log_file_handler: logging.Handler | None = None
    log_path: Path | None = None
    try:
        # Resolve templates relative to package folder (src/robofang/app/../../logs)
        repo_root = Path(__file__).resolve().parent.parent.parent.parent
        logs_dir = repo_root / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        log_path = logs_dir / "robofang-bridge.log"
        log_file_handler = logging.FileHandler(log_path, encoding="utf-8")
        log_file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
        logging.getLogger().addHandler(log_file_handler)
    except OSError:
        log_path = None

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    logger = logging.getLogger("robofang.app.logging")
    if log_path is not None:
        logger.info("File logging active: %s (Promtail/Loki: mount this dir as /logs)", log_path)
    else:
        logger.warning("File logging disabled: logs dir not writable; Loki will not receive bridge logs")
