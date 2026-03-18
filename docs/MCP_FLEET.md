# The MCP Fleet: Digital Hands

<p align="center">
  <img src="../assets/observability.png" alt="The Pulse of the Fleet" width="800">
</p>

Each "Hand" in the Robofang fleet is a specialized MCP server designed for deep, state-of-the-art orchestration.

## Active Hands

### Media Consumption
- **Plex Hand**: Real-time media search, playback control, and RAG-integrated metadata analysis.
- **Calibre Hand**: Bibliographic agency. Your agent becomes if the ultimate librarian, capable of managing knowledge across thousands of volumes.

### Creative Power
- **Blender Hand**: 3D agency. From geometry generation to procedural scene orchestration. 
- **GIMP Hand**: Advanced image manipulation and visual asset generation.
- **SVG Hand**: Mathematical precision in vector graphics.

### Infrastructure
- **RustDesk Hand**: Remote substrate navigation. Grant your agent access to manage remote physical nodes.

## Planned Hands
- **Discord Hand**: Social orchestration and community agency.
- **D-Bus/System Hand**: Deep OS-level intervention for Linux satellites.
- **Philips Hue Hand**: Physical environmental agency (Lighting).

---

## External MCP (discover and add)

The bridge exposes **discovery** and **add-from-external** so you can extend the fleet from public registries or GitHub without editing `fleet_manifest.yaml` by hand.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fleet/discover` | GET | List MCP servers from **registry** (MCP Registry API) or **docker** (Docker MCP catalog). Query: `source=registry\|docker`, `limit` (default 50). |
| `/api/fleet/add-from-external` | POST | Add a server to the fleet manifest and run install. Body: `source` (registry \| github \| docker), plus `id` (registry/docker) or `repo_url` (GitHub). Docker add returns 501 (discover only). |

- **Registry**: Uses [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io). Provide `id` (e.g. from discover); repo URL is resolved from the registry or you can pass `repo_url` in the body.
- **GitHub**: Pass `repo_url` (e.g. `https://github.com/owner/repo`). The hand is appended to the manifest and `git clone` + optional `start.ps1` run.
- **Docker**: `discover` lists servers from `docker mcp catalog server ls`. Adding from Docker is not implemented yet; use discover then configure `federation_map` or `mcp_sidecars` manually if needed.

---

## Repo-root metadata (RoboFang integration)

MCP repos can describe themselves for RoboFang by adding optional files in the **repo root**. The bridge reads these for **installed** hands (and, when autodetect exists, can fetch them from GitHub for catalog entries).

### 1. `robofang.json` (recommended)

A JSON file in the repo root with optional fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name (overrides manifest/catalog). |
| `category` | string | Category for catalog (e.g. Creative, Media, Home). |
| `description` | string | Short description for catalog and UI. |
| `webapp_script` | string | Relative path to start script (e.g. `webapp/start.ps1`, `web_sota/start.ps1`). If present, launch-hand uses this instead of probing. |
| `ports` | array of int | Optional list of ports the webapp uses (for docs/UI). |

Example:

```json
{
  "name": "Blender MCP",
  "category": "Creative",
  "description": "3D creation and scene control via Blender.",
  "webapp_script": "webapp/start.ps1",
  "ports": [10742]
}
```

### 2. `llm.txt` (optional)

If present, the bridge reads it and uses the **first 400 characters** (or up to a `## RoboFang` / `## Integration` section, if present) as an **integration summary**. This is exposed in the catalog as `integration_summary` and in hand info so the hub can show “what this hand does” from the repo’s own LLM-facing doc. No schema required.

**Summary:** Prefer `robofang.json` for structured catalog/launch fields; use `llm.txt` for a free-form integration blurb when you already maintain it for LLMs.

---

## Fleet analysis (FastMCP version and mcpb)

A **batch analysis script** scans **local** fleet repos (installed under `hands/`) and detects:

- **FastMCP version**: `3.1`, `2.x`, `unknown`, or `not_found` (from `pyproject.toml`, `requirements*.txt`, `uv.lock`).
- **mcpb present**: whether the repo has an mcpb package (root `mcpb.json`, `mcpb/` or `.mcpb`, or `[tool.mcpb]` in pyproject).

Run from repo root:

```bash
python scripts/analyze_fleet_fastmcp.py
```

This writes **`fleet_analysis.json`** next to `fleet_manifest.yaml`. The bridge merges it into the catalog and hand info: each hand gets **`fastmcp_version`** and **`mcpb_present`** in `GET /api/fleet/catalog` and `GET /api/fleet/hand/{id}/info`. If the script has not been run (or a hand is not installed), `fastmcp_version` may be omitted and `mcpb_present` is false. Scanning GitHub repos for the same data is a possible later improvement.

---

## Future: autodetect from GitHub

The onboarding catalog is currently a hardcoded list. A later improvement is to **autodetect** installable MCP repos from a GitHub org or user (e.g. `sandraschi`): list repos via GitHub API, filter by name pattern (e.g. `*-mcp`), optionally use repo description for category, and merge with `fleet_manifest` for `GET /api/fleet/catalog`. When autodetect is implemented, fetching `robofang.json` and `llm.txt` from the default branch (via GitHub API) will allow catalog entries to be fully driven by repo metadata.

---

