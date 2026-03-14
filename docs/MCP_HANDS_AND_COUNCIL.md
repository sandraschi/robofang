# MCP Servers in hands/ and Council Use

## Current flow

### 1. Clone → hands directory

- **Fleet Installer**: User picks a hand from the catalog (e.g. `virtualization-mcp`). Install adds it to `fleet_manifest.yaml` and runs `HandInstaller.install(hand_id)`.
- **Clone target**: `hands_base_dir / hand_id` (e.g. `hands/virtualization-mcp`). So catalog `id` must be like `virtualization-mcp` so the folder is `hands/virtualization-mcp`.
- **Deps**: Installer runs `uv sync` or `pip install -e .` in the cloned repo so the MCP server is runnable.
- **Launch path**: `POST /api/connector/launch/{name}` uses `name` = connector id (e.g. `virtualization`). It looks up `REPO_MAP` first; if missing, fallback is `hands_base / f"{name}-mcp"` (e.g. `hands/virtualization-mcp`). So connector name = `hand_id` minus `-mcp`.

### 2. How the council sees tools today

- **Tool bridge** (`orchestrator._tool_registry`): Built once at startup from:
  - **Skills**: `skill_<id>` with description from skills config.
  - **Connectors**: one entry per connector, `connector_<name>` (e.g. `connector_virtualization`) with a generic description like "Fleet connector for virtualization".
- **Council / reason_and_act**: Gets `tools_list = [{"name": k, "description": v["description"]} for k, v in _tool_registry.items()]`. So the LLM only sees **one tool per connector**, not per MCP tool (e.g. it sees `connector_virtualization`, not `vm_management`, `sandbox_launch`, etc.).
- **Execution**: When the council (or agentic workflow) requests a tool by name:
  - If the name is in `_tool_registry`, it runs the skill or the connector’s default action (e.g. `send_message`).
  - If the name is **not** in `_tool_registry`, `execute_tool` uses **OpenFang adapter**: `openfang_resolve(tool_name)` → `(connector_id, mcp_tool_name)`. Then `_connector_invoker(connector_id, mcp_tool_name, kwargs)` calls the MCP backend `POST /tool` with `{name: tool_name, arguments: params}`. So any tool name present in `configs/openfang_tool_mapping.json` can be invoked, but the council is **not** shown those names in its tool list—only the connector-level entries.

### 3. Consequence

- **Efficiency**: The council can’t efficiently choose “run vm_management with action=list” because it only sees “connector_virtualization.” It can either call the coarse `connector_virtualization` (which has no structured MCP tool/args) or rely on you having added explicit mappings in `openfang_tool_mapping.json` and the LLM guessing the right name.
- **Cloning into hands**: Already correct. Install → `hands/<hand_id>`, launch → `hands/<name>-mcp`, with `_hand_id_to_connector(hand_id)` mapping e.g. `virtualization-mcp` → `virtualization`.

---

## Making the council use them efficiently

### Option A: Per-MCP-tool discovery (recommended)

- After an MCP server is considered “available” (enabled in topology and, optionally, launched), call its **tools** endpoint (e.g. backend `GET /api/v1/tools` or MCP `tools/list`).
- For each returned tool, register in `_tool_registry` (or a parallel structure) e.g. `mcp_<connector>_<tool_name>` or just `<tool_name>` with metadata `{ "type": "mcp", "connector": "<connector_id>", "mcp_tool": "<tool_name>" }`.
- When building the prompt for the council / `reason_and_act`, pass this **per-tool** list (name + description) so the LLM sees e.g. `vm_management`, `sandbox_launch`, etc.
- In `execute_tool`, when the requested name is an MCP tool (e.g. `vm_management`), resolve to `(connector_id, mcp_tool_name)` and call `_invoke_connector_tool(connector_id, mcp_tool_name, kwargs)`.

This requires:

- A way to know which connectors are “active” (launched or configured with a backend URL).
- One-time or periodic fetch of tools from each such backend and merge into the tool list the council sees.

### Option B: Enrich OpenFang mapping only

- Keep the current “one tool per connector” prompt, but maintain `openfang_tool_mapping.json` with many entries, e.g. `vm_management` → `{"connector": "virtualization", "tool": "vm_management"}`.
- The council would still only see “connector_virtualization” in its list; to use `vm_management` the user or a higher-level prompt would need to request that name specifically (e.g. via a dedicated “run MCP tool” wrapper). So the council does **not** get efficient per-tool choice without also exposing those names in the tool list (which brings you back to Option A).

### Implemented (Option A)

- **Discovery**: After startup, bridge fetches tools from each backend via `GET /tools` or `GET /mcp/tools` (FastMCP 3.1). Registered as `mcp_<connector>_<tool_name>` in `_tool_registry`.
- **Council**: Full per-tool list passed to `reason_and_act`; system prompt advises preferring `agentic_workflow` / `intelligent_*` for multi-step goals (FastMCP 3.1 sampling).
- **Invoke**: `POST /tool` then `POST /mcp/tools/call` with `{name, arguments}`. `POST /api/mcp-tools/refresh` re-runs discovery.

---

## References

- Install: `src/robofang/core/installer.py` (`HandInstaller.install`, `_install_deps`).
- Launch: `main.py` `launch_connector`, `_hands_base_dir()`, fallback `hands_base / f"{name}-mcp"`.
- Tool bridge: `orchestrator._build_tool_bridge`, `_tool_registry`, `execute_tool`, `openfang_resolve` + `_invoke_connector_tool`.
- Council: `reasoning.reason_and_act(tool_executor=orchestrator.execute_tool, tools=...)`; tools come from `_tool_registry`.
- Mapping: `configs/openfang_tool_mapping.json`, `src/robofang/core/openfang_adapter.py`.
