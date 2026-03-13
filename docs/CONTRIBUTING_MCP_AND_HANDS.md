# Contributing MCP Servers and Hands

How third parties can contribute **MCP servers** (tools the bridge talks to) and **Hands** (autonomous agent processes) to RoboFang.

**Terminology:** The list of installable MCP servers (from `fleet_manifest.yaml`) is called the **catalog**. The hub’s Fleet Installer loads it via `GET /api/fleet/installer-catalog` (response key `catalog`). Onboarding uses `GET /api/fleet/catalog` (response key `hands`). There is no “market”; everything is catalog or hands.

---

## 1. Contributing an MCP Server (Connector)

An MCP server is an HTTP backend the bridge proxies to. Users see it in **Fleet** and **Home Hub**; the bridge calls it for tools and optional frontend.

### 1.1 What you need to build

- **HTTP transport**: The bridge expects an MCP backend at a URL. It calls `POST /tool` with `{ "name": "<tool_name>", "arguments": { ... } }` and optionally proxies other routes (e.g. `/tools`, `/health`).
- **Health endpoint (required)**: The bridge checks whether the server is up via **GET /api/connectors/{id}/status**. Your server **must** implement at least one of: **GET /api/v1/health**, **GET /health**, **GET /status**, or **GET /api/status** returning 200 (body can be JSON e.g. `{"message": "ok"}` or plain text). If none of these respond, the bridge may try a tool whose name contains "status" via POST /tool. Without a working health/status path, the Fleet UI and status API cannot report the server as healthy.
- **GET /tools (required)**: The bridge calls **GET /tools** on your backend to list available tools (Fleet UI, tool discovery, and status fallback). Return a JSON array of tools or an object with a `tools` array; each tool should have at least a `name` (or `title`) so the bridge can display and invoke it.
- **POST /tool (required)**: The bridge invokes tools via **POST /tool** with body `{"name": "<tool_name>", "arguments": { ... }}`. Your server must accept this, run the tool, and return JSON (e.g. `{"message": "..."}` or `{"data": ...}`). For status fallback the bridge may also send `{"tool": "<name>", "params": {...}}`; supporting both shapes is recommended.
- **Port**: Use a port in the fleet range (e.g. 10700–10899). Avoid clashes with [MCP_BACKENDS](https://github.com/sandraschi/robofang/blob/master/src/robofang/main.py) in the bridge.
- **Start script**: Provide `start.ps1` (or equivalent) so the bridge/Installer can launch the server (e.g. `uv run fastmcp dev` or `python -m my_mcp.server`).

**Optional:** The bridge proxies **GET/POST/PUT/DELETE /home/{connector}/{path}** to your backend, so you can expose a webapp or other routes (e.g. `/`, `/dashboard`) and the Hub will reach them through the bridge (single origin for CORS).

### 1.2 Getting your server into the catalog (Installer)

Add an entry to **fleet_manifest.yaml** so your server appears in the hub’s **Installer** and can be installed into `hands/`:

```yaml
# fleet_manifest.yaml
hands:
  - id: my-mcp          # short id (used in URLs and config)
    name: My MCP Hand   # display name
    category: Knowledge # or Creative, Infrastructure, Robotics, etc.
    description: >
      One-line or short description of what your server does.
    repo_url: https://github.com/your-org/my-mcp
    install_script: start.ps1   # optional; default start.ps1
    tags: ["tag1", "tag2"]
```

- **id**: Unique; used as connector id in config and in `REPO_MAP`/`MCP_BACKENDS` when the maintainer adds defaults.
- **repo_url**: GitHub clone URL. Installer runs `gh repo clone owner/repo` into `hands/<id>`, then **installs Python deps** (required for the MCP server to be usable): `uv sync` if `pyproject.toml` exists, else `pip install -e .`, then runs `install_script` if present.
- **install_script**: Optional (e.g. `start.ps1`) to start the server or run other post-install steps. Deps are installed automatically before this; users can also start via Fleet UI (Launch).

After this, users can **Install** your hand from the hub; the repo is cloned under `hands/`. They still need to configure the bridge to use it (see below).

**Launch requires install.** MCP servers are only started (Fleet "Start webapp", connector launch API, or auto-launch when `ROBOFANG_AUTO_LAUNCH_CONNECTORS=1`) when the server is already installed: the repo must exist at the path the bridge uses (REPO_MAP for built-in connectors, or `hands/<id>` for Installer-installed hands). If the path does not exist, launch returns a clear error and auto-launch skips that connector.

**Starting and checking health after install**

Once the repo is cloned and deps are installed, the MCP server can be started and its health checked:

1. **Start the server**  
   - **API**: `POST /api/connector/launch/{name}` (bridge runs `start.ps1` in the repo). Use the connector name, e.g. `ring` for hand_id `ring-mcp` (bridge resolves the repo at REPO_MAP or `hands/<name>-mcp`).  
   - **UI**: Fleet Installer → “Start webapp” (or equivalent) for that hand.  
   - **Auto-launch**: Set `ROBOFANG_AUTO_LAUNCH_CONNECTORS=1` so enabled connectors start on bridge startup (repo must already be installed).

2. **Check health**  
   - **API**: `GET /api/connectors/{connector_id}/status`. The bridge calls the connector’s backend at the URL from `MCP_BACKENDS` or `federation_map.json`, then tries (in order) `GET /api/v1/health`, `GET /health`, `GET /status`, `GET /api/status`; if none respond, it uses a status-like tool via `POST /tool`.  
   - Returns `{"success": true, "server_status": "..."}` when the backend is reachable and one of those endpoints (or the tool) succeeds.

The connector must be wired (see 1.3) so the bridge knows its backend URL (e.g. `http://localhost:10702` for ring). Without that, status checks get 404 (unknown connector).

**Where installs live and when they appear as “installed”**

- **Clone location**: When you use the Fleet Installer to install an MCP server, it is cloned into the RoboFang repo under **`hands/<hand_id>/`** (e.g. `hands/ring-mcp/`). The repo root is the package root (where `fleet_manifest.yaml` and `hands/` live), typically the RoboFang project root (e.g. `D:/Dev/repos/robofang/hands/`).
- **“Installed” in the UI**: A server is shown as installed if that directory exists (and, for catalog entries, the same is true after you install from the Installer). On a fresh start with no installs yet, **no** MCP servers are shown as installed until you run Install at least once.
- **Launch path**: The bridge tries REPO_MAP first (e.g. `d:/Dev/repos/ring-mcp`). If that path does not exist, it falls back to **`hands/<connector>-mcp`** (e.g. `hands/ring-mcp`), so Launch works for servers installed only via the Fleet Installer.

**If installs fail and `hands/` stays empty**

The bridge resolves the manifest and `hands/` directory from the package root (derived from the orchestrator module path). If the bridge is run from a different cwd or the package is installed elsewhere, that path may be wrong or read-only. Fix it by setting **environment variables** before starting the bridge:

- **`ROBOFANG_FLEET_MANIFEST`** — full path to `fleet_manifest.yaml` (e.g. `D:\Dev\repos\robofang\fleet_manifest.yaml`).
- **`ROBOFANG_HANDS_DIR`** — full path to the directory where repos are cloned (e.g. `D:\Dev\repos\robofang\hands`).

Example (PowerShell, from repo root):

```powershell
$env:ROBOFANG_FLEET_MANIFEST = "D:\Dev\repos\robofang\fleet_manifest.yaml"
$env:ROBOFANG_HANDS_DIR = "D:\Dev\repos\robofang\hands"
uv run robofang-bridge
```

Check where the bridge is actually using: **GET** `http://localhost:10871/api/fleet/installer-paths` (or your bridge port). It returns `manifest_path`, `hands_dir`, `manifest_exists`, and `manifest_writable`. If `manifest_writable` is false, set the env vars above and restart.

### 1.3 Wiring the bridge to your server

The bridge resolves a connector’s backend URL in this order:

1. **configs/federation_map.json** → `connectors.<id>.mcp_backend`
2. **main.py** → `MCP_BACKENDS[<id>]`

So contributors have two paths:

- **Upstream (main repo)**: Open a PR that adds your server to:
  - **fleet_manifest.yaml** (catalog entry; see above).
  - **MCP_BACKENDS** in `src/robofang/main.py` (default port, e.g. `"my-mcp": "http://localhost:10750"`).
  - **REPO_MAP** in `src/robofang/main.py` (local path for launch, e.g. `"my-mcp": "d:/Dev/repos/my-mcp"`).
- **Local / downstream**: Without changing the main repo, operators can add your connector to **configs/federation_map.json**:

```json
"connectors": {
  "my-mcp": {
    "enabled": true,
    "mcp_backend": "http://localhost:10750",
    "description": "My MCP server — what it does"
  }
}
```

If the hub has “discover” / “add from external”, it may pull from the [MCP Registry](https://registry.modelcontextprotocol.io) and add entries to topology; publishing your server there can help discovery.

### 1.4 Summary: MCP server contribution

| Step | Action |
|------|--------|
| 1 | Implement HTTP MCP server + `start.ps1`. |
| 2 | Add entry to **fleet_manifest.yaml** (id, name, category, repo_url, install_script, tags). |
| 3 | (Optional) Publish to MCP Registry for discovery. |
| 4 | (Upstream) PR: add to **MCP_BACKENDS** and **REPO_MAP** in main.py. |
| 5 | (Local) Or add to **configs/federation_map.json** with `enabled` and `mcp_backend`. |

---

## 2. Contributing a Hand (Autonomous Agent)

A **Hand** is an autonomous process that runs on a schedule: it implements `_on_pulse(orchestrator)` and can use the orchestrator (connectors, knowledge, routines, etc.). Examples: **CollectorHand**, **RoboticsHand**, **RoutineRunnerHand**.

### 2.1 Hand contract

- **Base class**: `robofang.core.base_hand.Hand`
- **Constructor**: `__init__(self, definition: HandDefinition)` — `definition` comes from HAND.toml or code.
- **Lifecycle**: The orchestrator calls `hand.pulse(orchestrator)` on an interval. Override `_on_pulse(self, orchestrator)` to implement behavior.
- **State**: `hand.active` (activate/pause), `hand.pulse_interval` (seconds), `hand.last_run`, `hand.next_run`.

Definition fields (from **HandDefinition** / HAND.toml): `id`, `name`, `description`, `category`, `agent` (HandAgentConfig: name, description, system_prompt, etc.), optional `settings`, `tools`, `skills`, `mcp_servers`, `requires`, `dashboard`.

### 2.2 Option A: In-tree Hand (core or bundled)

**Core plugin (always loaded)**  
Add a new Python module under `src/robofang/plugins/` and register it in `main.py`:

1. Create e.g. `src/robofang/plugins/my_hand.py`:

```python
from robofang.core.base_hand import Hand
from robofang.core.hand_manifest import HandAgentConfig, HandDefinition

class MyHand(Hand):
    async def _on_pulse(self, orchestrator):
        # Your logic: call orchestrator.ask(), orchestrator.run_routine(), etc.
        pass
```

2. In `src/robofang/main.py`, import and register:

```python
from robofang.plugins.my_hand import MyHand

orchestrator.hands.register_hand(
    MyHand(
        HandDefinition(
            id="my_hand",
            name="My Hand",
            description="What it does.",
            category="system",
            agent=HandAgentConfig(
                name="MyHand",
                description="...",
                system_prompt="...",
            ),
        )
    )
)
```

**Bundled Hand (HAND.toml + optional hand.py)**  
The orchestrator loads hands from:

- `src/robofang/plugins/`
- `src/robofang/plugins/bundled/`

For **bundled**, add a **directory** under `plugins/bundled/` with:

- **HAND.toml** — same schema as HandDefinition (id, name, description, category, agent, etc.).
- **hand.py** (optional) — implementation. The loader expects a class named `{Id}Hand` (e.g. `id = "dawn"` → `DawnHand`) or `PersonalAssistantHand` for `id = "pa"`.

Example **HAND.toml**:

```toml
id = "dawn"
name = "Dawn Patrol"
description = "Runs dawn patrol routine."
category = "system"

[agent]
name = "DawnPatrol"
description = "Patrol scheduler"
system_prompt = "Run dawn patrol at scheduled time."
```

If `hand.py` is missing, the base `Hand` is used (no custom `_on_pulse`). If present, it is loaded dynamically and registered.

### 2.3 Option B: External Hand (installable)

Today, **fleet_manifest.yaml** and the Installer clone repos into **hands/** at the repo root. The orchestrator **does not** load hands from that directory by default; it only loads from `src/robofang/plugins/` and `plugins/bundled/`.

To support installable external hands, the bridge would need to call `orchestrator.hands.load_hands_from_dir(hands_base_dir)` at startup (or equivalent). Until then, external contribution options are:

- **PR to main repo**: Add your Hand as **bundled** (under `plugins/bundled/<your-hand>/` with HAND.toml + hand.py). Then it’s part of the release and loaded automatically.
- **Fork / downstream**: Add your Hand under `plugins/` or `plugins/bundled/` in your fork and register or load it as above.

If and when the bridge loads from `hands/`, a third option will be: add an entry to **fleet_manifest.yaml** (like an MCP server); users Install the hand; the bridge loads HAND.toml (+ hand.py) from `hands/<id>/`.

### 2.4 HAND.toml reference (for bundled / future external)

- **id**, **name**, **description**, **category** (required).
- **[agent]** — name, description, system_prompt; optional module, provider, model, api_key_env, base_url, max_tokens, temperature, max_iterations.
- **settings** — list of HandSetting (key, label, description, setting_type, default, options).
- **tools**, **skills**, **mcp_servers** — lists of ids.
- **requires** — list of HandRequirement (key, label, requirement_type, check_value, install).
- **dashboard.metrics** — list of HandMetric (label, memory_key, format).

See `robofang.core.hand_manifest` and existing HAND.toml under `plugins/` or `plugins/bundled/` (if any) for full schema.

### 2.5 Summary: Hand contribution

| Goal | Action |
|------|--------|
| New core Hand | Add `plugins/my_hand.py`, subclass Hand, implement `_on_pulse`; register in main.py with HandDefinition. |
| New bundled Hand | Add `plugins/bundled/<id>/` with HAND.toml and optional hand.py (class `{Id}Hand`); no main.py change. |
| External / installable | Today: contribute as bundled via PR, or maintain a fork. Future: fleet_manifest entry + bridge loading from `hands/`. |

---

## 3. OpenFang vs RoboFang hands (keep separate)

**RoboFang hand levels** (section 2) are **core** (plugins/ + main.py), **bundled** (plugins/bundled/), and **installable** (future: hands/). These are native hands: they use RoboFang’s tool registry and MCP fleet directly.

**OpenFang-style hands** are imported from the OpenFang project: HAND.toml + SKILL.md, prompt-driven, with tool names resolved via **openfang_tool_mapping.json**. They must stay clearly separate so that:

- **Naming**: Use a dedicated prefix or directory (e.g. `openfang-researcher`, `plugins/bundled/openfang-*`) so they are never confused with native RoboFang hands.
- **Tool resolution**: OpenFang hands use the OpenFang adapter and mapping file; native hands use the MCP fleet / connector IDs directly. Do not mix the two resolution paths.
- **Loading**: If you import OpenFang hands, put them in a distinct subtree (e.g. `plugins/bundled/openfang-*` or a dedicated `hands/openfang/`) and document that they are imported, not first-class RoboFang hands.

Section 3.1 below describes how to import OpenFang hands **without** blurring this boundary.

---

## 4. Importing OpenFang Hands

OpenFang ([RightNow-AI/openfang](https://github.com/RightNow-AI/openfang)) ships **eight bundled hands** (Clip, Lead, Collector, Predictor, Researcher, Twitter, Browser, Trader) as plain files: each hand is a directory with **HAND.toml** (manifest + multi-phase system prompt) and **SKILL.md** (domain reference). There is no separate FangHub API; the source of truth is the repo.

### 4.1 Import path (copy from repo)

1. Clone or download the OpenFang repo and copy the bundled hands into RoboFang:
   - Source: `crates/openfang-hands/bundled/<hand>/` (each has `HAND.toml` + `SKILL.md`).
   - Target: e.g. `src/robofang/plugins/bundled/openfang-researcher/` (or a dedicated `hands/openfang/` dir if you enable `load_hands_from_dir(hands_base)` at startup).

2. **Schema**: RoboFang’s HAND.toml schema is compatible (id, name, description, category, agent with system_prompt, settings, dashboard, etc.). The **system prompt** in OpenFang hands is a long multi-phase playbook (500+ lines for Researcher); it lives in `[agent].system_prompt` and is used as-is.

3. **SKILL.md**: If you place SKILL.md next to HAND.toml in the same directory, `load_hands_from_dir` will load it and set `definition.skill_content`. The Council/orchestrator can inject this into the agent context when running the hand.

4. **Tool mapping**: OpenFang hands reference tools by name (e.g. `web_search`, `memory_store`, `knowledge_add_entity`, `event_publish`, `schedule_create`, `file_read`, `web_fetch`). RoboFang uses the **MCP fleet** for tools. The **OpenFang adapter** (`robofang.core.openfang_adapter`) loads `configs/openfang_tool_mapping.json` and maps each OpenFang tool name to `(connector_id, mcp_tool_name)`. When `orchestrator.execute_tool(tool_name, ...)` is called and the tool is not in the bridge registry, the adapter resolves the name and invokes the MCP backend via `_connector_invoker`. Edit the JSON file to match your fleet (connector IDs and tool names); the hub **Hands** page (`/hands`) shows the current mapping in the UI.

5. **No hand.py required**: Imported OpenFang hands use the base `Hand` class and the prompt-driven behavior from HAND.toml; only add a custom `hand.py` if you need RoboFang-specific pulse logic.

### 3.2 Quick copy (PowerShell)

From the repo root, with OpenFang cloned at e.g. `../openfang`:

```powershell
$src = "..\openfang\crates\openfang-hands\bundled"
$dst = "src\robofang\plugins\bundled"
New-Item -ItemType Directory -Force -Path $dst
foreach ($name in @("researcher","lead","collector","predictor","clip","twitter","browser","trader")) {
  $d = Join-Path $dst "openfang-$name"
  New-Item -ItemType Directory -Force -Path $d
  Copy-Item (Join-Path $src $name "\*") $d -Recurse -Force
}
```

Then ensure the orchestrator loads that directory (e.g. `load_hands_from_dir(plugins_bundled_path)` or load `hands/` if you point it there).

---

## 5. References

- **Bridge**: `src/robofang/main.py` — MCP_BACKENDS, REPO_MAP, register_hand, startup. Installer catalog: `GET /api/fleet/installer-catalog` (returns `{ catalog: [...] }`). Hands list: `GET /api/fleet/catalog` (returns `{ hands: [...] }`).
- **Hub (Fleet Installer)**: `robofang-hub/src/api/fleet.ts` — `getFleetCatalog()`; `Installer.tsx` and Onboarding use **catalog** (not “market”) for the installable server list.
- **Orchestrator**: `src/robofang/core/orchestrator.py` — connectors, topology, hands, lifecycle.
- **Hands**: `src/robofang/core/hands.py` (HandsManager, load_hands_from_dir), `src/robofang/core/base_hand.py` (Hand), `src/robofang/core/hand_manifest.py` (HandDefinition, HAND.toml).
- **Installer**: `src/robofang/core/installer.py` (HandInstaller, fleet_manifest), `fleet_manifest.yaml`.
- **Discovery**: `src/robofang/core/external_registries.py` — MCP Registry, Docker catalog.
- **Topology**: `configs/federation_map.json` — connectors (enabled, mcp_backend), nodes, council_members.
