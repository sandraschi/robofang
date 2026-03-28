"""
RoboFang Bridge: Minimal entry point for the fleet orchestrator.
Refactored into robofang.app package structure for Phase 8.
"""

import os
import sys
import traceback

import uvicorn

from robofang.app.fleet import _default_bridge_port
from robofang.app.lifecycle import app


def main():
    """Entry point for the robofang-bridge script."""
    try:
        # Use port from environment or default from fleet-stack-ports.json
        port = int(os.getenv("PORT", _default_bridge_port()))
        host = os.getenv("ROBOFANG_BRIDGE_HOST", "0.0.0.0")

        # In development, you might want reload=True, but standard bridge is False
        uvicorn.run(app, host=host, port=port, reload=False)
    except Exception:
        traceback.print_exc(file=sys.stderr)
        sys.stderr.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()
