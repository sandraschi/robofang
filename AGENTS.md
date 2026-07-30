# robofang — Agent Guide

## Quick Ref
- **Ports**: Hub 10870, Bridge 10871, Supervisor 10872, robofang-mcp 10873
- **Start**: `.\robofang-hub\start.bat` or `.\start_all.ps1`
- **Bridge only**: `uv run python -m robofang.main`
- **Test**: `uv run pytest`
- **Lint**: `uv run ruff check src/`

## Entry Points
- `uv run robofang` → `robofang.cli:main`
- `uv run robofang-bridge` → `robofang.main:main` (FastAPI + MCP)
- `uv run robofang-supervisor` → `robofang.supervisor:app`
- `uv run robofang-mcp` → `robofang_mcp.server:main` (thin MCP server)

## Standards
- FastMCP 3.2+ portmanteau tool pattern — tools use `operation` enum param
- Responses: structured dicts with `success`, `message`, domain-specific fields
- Dual transport: stdio (Claude Desktop) + HTTP (`MCP_TRANSPORT=http`)
- See [mcp-central-docs](https://github.com/sandraschi/mcp-central-docs) for fleet-wide coding standards

## Key Files
| File | Purpose |
|------|---------|
| `src/robofang/` | Python package: bridge, supervisor, core, connectors, plugins |
| `robofang-hub/` | Vite React dashboard UI |
| `robofang-mcp/` | Thin MCP server for IDE clients |
| `native/` | Tauri 2.0 desktop wrapper (NSIS installer) |
| `fleet-start.config.ps1` | Fleet launcher config (ports, backend target) |
| `run_server.py` | PyInstaller dual-transport entry point |

Install docs: follow mcp-central-docs/standards/AGENT_INSTALL_REFERENCE.md
