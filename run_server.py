"""PyInstaller entry point — dual transport for robofang-bridge.

Detects MCP_PORT/PORT env var to switch between HTTP (Tauri spawn) and stdio (Claude Desktop).
Overwrites sys.argv before argparse to prevent PyInstaller frozen args from leaking.
"""

import os
import sys

  # Overwrite frozen PyInstaller argv before any argparse parser sees it
  port = os.environ.get("ROBOFANG_PORT") or os.environ.get("MCP_PORT") or os.environ.get("PORT")
  if port:
      host = os.environ.get("ROBOFANG_HOST") or os.environ.get("MCP_HOST", "127.0.0.1")
      sys.argv = ["run_server.py", "--mode", "http", "--host", host, "--port", str(port)]
else:
    sys.argv = ["run_server.py", "--mode", "stdio"]

# ruff: noqa: E402 — imports below depend on sys.path manipulation above
sys.path.insert(0, "src")

from robofang.app.lifecycle import app
from robofang.cli import main as cli_main


  def main():
      port_str = os.environ.get("ROBOFANG_PORT") or os.environ.get("MCP_PORT") or os.environ.get("PORT")
      if port_str:
          import uvicorn

          host = os.environ.get("ROBOFANG_HOST") or os.environ.get("MCP_HOST", "127.0.0.1")
          port = int(port_str)
          uvicorn.run(app, host=host, port=port, log_level="info")
    else:
        cli_main()


if __name__ == "__main__":
    main()
