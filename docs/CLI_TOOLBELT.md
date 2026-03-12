# CLI Toolbelt

Internal scripts and CLI commands for managing the RoboFang ecosystem.

## Core Scripts

### `start.ps1`
The primary entry point for launching any RoboFang component.
- Clears port zombies.
- Builds frontend (if applicable).
- Starts backend service.

### `verify_connectors.ps1`
Diagnostic script to check port availability and connector health.

### `robofang-bridge` (via `pip install -e .`)
Command-line alias for `robofang.main:main`.

## Development Utilities

### `scripts/dev_setup.ps1`
Environment initialization for new contributors.

### `scripts/scan_mcp.py`
Automated tool discovery across all registered MCP servers.
