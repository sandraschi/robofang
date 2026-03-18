# MCP Tools Roadmap: Unity3D, Resonite, Avatar, Robotics

**Canonical**: MCP central docs. This file is a secondary copy in RoboFang.

**Purpose**: Suggested **new tools** for unity3d-mcp, resonite-mcp, avatar-mcp, and **robotics-mcp** to support the **Resonite SDK (Unity) beta** authoring pipeline and cross-stack workflows.  
**Context**: [Integration: Resonite](resonite.md), [Integration: Unity3D](unity3d.md), [Resonite SDK (Unity) API](resonite.md#resonite-sdk-unity-editor-api--reference).

---

## 1. unity3d-mcp — new tools

Unity3d-mcp today: virtual robotics (batch mode, Editor REST), composition with robotics-mcp. With the **Resonite SDK (Unity)** there is a clear authoring path: Unity project → SDK conversion → Resonite. New tools should **drive or query that path** from the mesh without requiring manual Editor steps.

| Tool (suggested) | Operation / params | Rationale |
|------------------|-------------------|------------|
| **resonite_sdk_convert** | `project_path`, `target` (world \| gadget \| avatar), `output_path?`, `options?` | Trigger SDK conversion for a Unity project (or scene/prefab). Output path optional (default SDK output location). Enables "convert this Unity project for Resonite" from MCP. |
| **resonite_sdk_validate** | `project_path`, `target` (world \| gadget \| avatar) | Run SDK validation only (no export): check BipedAvatarDescriptor, skinned meshes, required components, IDs. Returns list of issues/warnings. |
| **resonite_sdk_status** | `project_path?` | Report whether Resonite SDK is installed in project, version, and last conversion result (if any). Optional project_path for a specific project. |
| **unity_project_open** | `project_path`, `wait_ready_seconds?` | Open a Unity project in the Editor (if not already open). Optional timeout for "project ready" (e.g. after domain reload). Complements existing batch/Editor use. |
| **unity_export_resonite_asset** | `asset_path` (scene/prefab), `target` (world \| gadget \| avatar), `output_path?` | Export a single asset via Resonite SDK conversion. Thin wrapper over SDK export for one asset. |

**Implementation notes**: Conversion/validation likely require Unity Editor to be running and the project open; tools can shell out to Unity CLI (batch mode) or call an Editor REST plugin if unity3d-mcp already exposes one. Resonite SDK APIs are Unity-side (C#); MCP tools would orchestrate, not implement, conversion.

---

## 2. resonite-mcp — new tools

Resonite-mcp already covers runtime: session, world, avatar, inventory, ResoniteLink, OSC, cloud sessions, world inspector, asset injection. New tools should **bridge authoring output → runtime** and **in-world export**.

| Tool (suggested) | Operation / params | Rationale |
|------------------|-------------------|------------|
| **resonite_inventory_import_package** | `file_path` (local .resonitepackage), `options?` | Import a ResonitePackage file from disk into the user's inventory (or current world). Complements `resonite_inventory_upload` for the package format. |
| **resonite_world_export_package** | `slot_or_world_id`, `output_path`, `include_variants?` | Request in-world export of a world/slot as .resonitepackage to a local path. May require Resonite to support a headless/API export; otherwise returns "export started" and path hint. |
| **resonite_authoring_status** | — | Return whether any authoring pipeline is active (e.g. "Unity SDK last conversion at X", if that state is exposed). Optional: link to presence of Unity Editor with Resonite SDK project. |
| **resonite_content_validate** | `url` or `local_path` | Validate a piece of content (by Resonite URL or local path) for loadability: required assets, missing refs, compatibility. Uses existing world inspector / ResoniteLink where applicable. |
| **resonite_link_batch_spawn** | `template_urls[]`, `positions?`, `parent_id?` | Spawn multiple objects via ResoniteLink in one call. Reduces round-trips for "place many props" workflows from Unity-authored content. |

**Implementation notes**: `resonite_inventory_import_package` and `resonite_world_export_package` depend on Resonite client/API supporting package import/export from external calls; otherwise document as "planned when API exists". ResoniteLink batch spawn is an extension of existing `resonite_link_spawn`.

---

## 3. avatar-mcp — new tools

Avatar-mcp: VRM load/unload, animation, bones, morphs, export (FBX, Unity package), Unity desktop integration, VRChat OSC. Gaps for **Resonite authoring**: get a VRM into Resonite (as avatar) and **validate/prepare for Resonite SDK** (BipedAvatarDescriptor, skeleton mapping).

| Tool (suggested) | Operation / params | Rationale |
|------------------|-------------------|------------|
| **avatar_export_for_resonite** | `avatar_id`, `output_path?`, `options?` | Export the current avatar (VRM) in a form ready for Resonite: ensure naming/rig compatible with Resonite avatars; optional sidecar descriptor (e.g. BipedAvatarDescriptor hints). Can be "VRM + metadata" until SDK supports direct ingest. |
| **avatar_validate_resonite** | `avatar_id` or `vrm_path` | Check VRM for Resonite/SDK compatibility: bone names, required nodes, mesh/skinned mesh, suggested BipedAvatarDescriptor settings. Returns list of issues and suggestions. |
| **avatar_resonite_descriptor_hints** | `avatar_id` | Return suggested BipedAvatarDescriptor (or equivalent) field values derived from the loaded VRM (skeleton, hand/feet slots, etc.) for use when authoring in Unity with the SDK. |
| **unity_avatar_sync** | `avatar_id`, `unity_project_path?` | Push avatar (VRM + optional descriptor hints) to a Unity project path or open Unity project, for use with Resonite SDK. Complements existing `unity_integration` with an explicit "send to Unity for Resonite" path. |

**Implementation notes**: Resonite SDK uses **BipedAvatarDescriptor** in Unity; avatar-mcp doesn't have Unity runtime. So `avatar_validate_resonite` and `avatar_resonite_descriptor_hints` are heuristics from VRM only; actual attachment of BipedAvatarDescriptor stays in Unity. `unity_avatar_sync` can copy VRM + a small JSON of hints into the project; unity3d-mcp or the user then attaches the descriptor in Editor.

---

## 4. robotics-mcp — new tools

Robotics-mcp today: 13 portmanteau tools (`robot_control`, `robot_virtual`, `vbot_crud`, `virtual_robotics`, `workflow_management`, etc.), composition with unity3d-mcp, osc-mcp, vrchat-mcp, avatar-mcp. Virtual substrates are Unity and VRChat; **Resonite** is listed but not yet first-class in the virtual pipeline. New tools should **orchestrate authoring → Resonite runtime** and **treat Resonite as a virtual robot target** alongside Unity/VRChat.

| Tool (suggested) | Operation / params | Rationale |
|------------------|-------------------|------------|
| **virtual_robotics** (extend) | Add `target: "resonite"`, `session_name?`, `world_path?`, `avatar_slot?` | Deploy or query virtual robot state in **Resonite** (session, world, avatar slot). Orchestrates calls to resonite-mcp (session_status, world_load, avatar_load) so robotics-mcp can "run vbot in Resonite" without the agent calling resonite-mcp directly. |
| **resonite_vbot_deploy** | `unity_project_path?`, `converted_asset_path?`, `session_name?`, `world_path?` | One-shot: ensure virtual robot content is in Resonite (convert via unity3d-mcp if project path given, or use pre-converted asset), start/attach to session, load world if needed. High-level "deploy vbot to Resonite" for the mesh. |
| **resonite_vbot_status** | `session_name?` | Return status of virtual robot(s) in Resonite: session id, world, avatar slot, OSC/ResoniteLink reachability. Reuses resonite_session_status + optional ResoniteLink state. |
| **workflow_management** (extend) | Add workflow type `resonite_authoring` or `virtual_to_resonite` | Pipeline: Unity project (or asset) → SDK convert (unity3d-mcp) → import package (resonite-mcp) → start session / load world. Single workflow tool that chains unity3d-mcp and resonite-mcp steps. |
| **robot_virtual** (extend) | Add `platform: "resonite"`, `action`: list_sessions \| load_world \| load_avatar \| get_pose \| send_osc | Mirror existing `robot_virtual(platform="unity"|"vrchat")` for Resonite: list sessions, load world/avatar, get pose (if exposed), send OSC. Delegates to resonite-mcp under the hood. |

**Implementation notes**: robotics-mcp composes other MCPs (unity3d-mcp, resonite-mcp); new tools are **orchestration** layers that call those servers (HTTP or stdio bridge). No direct Resonite client dependency inside robotics-mcp if the bridge already exposes resonite-mcp. LIDAR/map export to Unity is existing; a future **map_export** option for "Resonite world" could push map data into a Resonite-friendly format once a convention exists.

---

## 5. Cross-stack flow (summary)

- **Author (Unity)**: unity3d-mcp → `resonite_sdk_convert` / `resonite_sdk_validate` / `unity_export_resonite_asset`.
- **Runtime (Resonite)**: resonite-mcp → `resonite_inventory_import_package`, `resonite_link_batch_spawn`, session/world/avatar as today.
- **Avatar path**: avatar-mcp → `avatar_export_for_resonite`, `avatar_validate_resonite`, `avatar_resonite_descriptor_hints`; optionally `unity_avatar_sync` → Unity → SDK convert → resonite-mcp inventory/avatar load.
- **Orchestration (robotics-mcp)**: `resonite_vbot_deploy`, `resonite_vbot_status`, extended `virtual_robotics(target="resonite")` and `robot_virtual(platform="resonite")`; `workflow_management(resonite_authoring)` chains Unity convert → Resonite import → session.

---

## 6. Priority ordering

| Priority | Server | Tool(s) | Reason |
|----------|--------|---------|--------|
| P0 | resonite-mcp | `resonite_inventory_import_package` | Closes the loop: Unity/SDK output → package → inventory. |
| P0 | unity3d-mcp | `resonite_sdk_convert`, `resonite_sdk_validate` | Core authoring from MCP. |
| P1 | avatar-mcp | `avatar_validate_resonite`, `avatar_resonite_descriptor_hints` | Low implementation cost (VRM inspection), high value for SDK authoring. |
| P1 | resonite-mcp | `resonite_link_batch_spawn` | Simple extension of existing spawn. |
| P2 | unity3d-mcp | `resonite_sdk_status`, `unity_project_open`, `unity_export_resonite_asset` | Quality-of-life and single-asset export. |
| P2 | avatar-mcp | `avatar_export_for_resonite`, `unity_avatar_sync` | Depends on agreed "Resonite-ready" format and Unity project layout. |
| P2 | resonite-mcp | `resonite_world_export_package`, `resonite_authoring_status`, `resonite_content_validate` | Depends on Resonite client/API for export and status. |
| P1 | robotics-mcp | `virtual_robotics(target="resonite")`, `robot_virtual(platform="resonite")` | Makes Resonite a first-class virtual robot target; delegates to resonite-mcp. |
| P2 | robotics-mcp | `resonite_vbot_deploy`, `resonite_vbot_status`, `workflow_management(resonite_authoring)` | Orchestration over unity3d-mcp + resonite-mcp; implement once bridge can call both. |

---

*Crosslinks: [Connector taxonomy](../connector_taxonomy.md) · [Integration: Resonite](resonite.md) · [Integration: Unity3D](unity3d.md) · [resonite-mcp](../mcp-servers/resonite-mcp.md) · [robotics-mcp](../mcp-servers/robotics-mcp.md)*

**Tool docs (Cursor UI)**: For portmanteau tools, parameter descriptions in the schema fix "no description" in Cursor. Canonical: **mcp-central-docs/standards/MCP_TOOL_DOCSTRINGS_IMPROVEMENT_PLAN.md**.
