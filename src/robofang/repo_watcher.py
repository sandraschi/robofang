import time
import requests
import structlog
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Timer

logger = structlog.get_logger()

REPOS_DIR = "d:/Dev/repos"
META_MCP_FLEET_ENDPOINT = "http://127.0.0.1:10711/api/v1/analysis/fleet"
DEBOUNCE_SECONDS = 5.0  # Wait 5 seconds after the last file event before scanning


class DebouncingRepoHandler(FileSystemEventHandler):
    def __init__(self):
        super().__init__()
        self._timer = None

    def on_any_event(self, event):
        # Ignore `.git` and `node_modules` paths to avoid spamming
        if (
            "\\.git\\" in event.src_path
            or "\\node_modules\\" in event.src_path
            or "\\.venv\\" in event.src_path
        ):
            return

        # Cancel existing timer
        if self._timer is not None:
            self._timer.cancel()

        # Start new timer
        self._timer = Timer(DEBOUNCE_SECONDS, self._trigger_fleet_scan)
        self._timer.start()

    def _trigger_fleet_scan(self):
        logger.info(
            "Changes detected and debounced; triggering Fleet Scan against meta_mcp..."
        )
        try:
            resp = requests.get(META_MCP_FLEET_ENDPOINT, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                logger.info(
                    f"Fleet scan complete: {data.get('total_repositories', 0)} repositories analyzed in {data.get('duration_seconds', 0)}s."
                )
            else:
                logger.error(f"Fleet scan failed with HTTP {resp.status_code}")
        except Exception as e:
            logger.error(f"Failed to reach meta_mcp fleet API: {e}")


def run_watcher():
    logger.info(f"Starting Repo Watcher on {REPOS_DIR}...")
    event_handler = DebouncingRepoHandler()
    observer = Observer()
    observer.schedule(event_handler, REPOS_DIR, recursive=True)
    observer.start()

    # Trigger an initial scan aligned perfectly with startup
    logger.info("Triggering initial sync...")
    event_handler._trigger_fleet_scan()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        logger.info("Repo Watcher stopped.")
    observer.join()


if __name__ == "__main__":
    run_watcher()
