# Agentic Mesh Integration — robofang

**Status:** Design — Phase 4 target  
**Date:** 2026-02-23  
**Full spec:** [mcp-central-docs/architecture/AGENTIC_MESH_robofang_INTEGRATION.md](../../mcp-central-docs/architecture/AGENTIC_MESH_robofang_INTEGRATION.md)  
**Architecture:** [mcp-central-docs/architecture/AGENTIC_MESH_ARCHITECTURE.md](../../mcp-central-docs/architecture/AGENTIC_MESH_ARCHITECTURE.md)  
**Security:** [mcp-central-docs/architecture/AGENTIC_MESH_SECURITY.md](../../mcp-central-docs/architecture/AGENTIC_MESH_SECURITY.md)

---

## What This Is

robofang becomes the trust-enforcing orchestrator for a mesh of MCP servers that can delegate to each other via sampling bridges. Each server exposes bridge functions — plain Python callables that call other servers. These are passed as `tools=` to `ctx.sample()`. The LLM autonomously orchestrates, gets structured validated results, no client round-trips.

The **Council of Dozens** maps directly onto this: each council member is a `ctx.sample()` meta-tool with a specific set of bridges and a Pydantic result type.

---

## Files to Create (Phase 4)

```
robofang/
├── configs/
│   └── bridge_registry.json         ← which server can call which + scope constraints
├── src/robofang/
│   ├── bridges/
│   │   └── factory.py               ← BridgeFactory: generates validated callables from registry
│   ├── security/
│   │   └── sanitize.py              ← strip injection patterns before external content enters prompts
│   └── tools/
│       └── council.py               ← council meta-tools using ctx.sample() + bridges
```

---

## Council Members (planned)

| Tool | Tier | Key bridges |
|---|---|---|
| `council_research_synthesiser` | 1-2 | advanced-memory, local-llm |
| `council_camera_event_handler` | 3 | tapo-camera, filesystem, advanced-memory, local-llm |
| `council_knowledge_curator` | 1 | advanced-memory, local-llm |
| `council_fleet_health_monitor` | 0-3 read-only | all servers, read scope |
| `council_robotics_coordinator` | 4, disabled default | robotics-mcp with confirmation gate |

---

## Security Non-Negotiables

- Bridge registry is enforced in Python code, not by LLM discretion
- All external content sanitized before entering `workflow_prompt`
- `result_type=PydanticModel` on every `ctx.sample()` call
- Robotics bridges: hard confirmation gate in bridge function, DRY_RUN default
- Emergency stop: hardware-level, wired to dashboard, outside the mesh
- hop_count propagated across all bridge calls, max 3

---

## Robotics Note

When robotics-mcp is integrated, `council_robotics_coordinator` is the only path to physical actuation. It is disabled until:
1. All Phase 4a-4b controls are implemented and tested
2. 48h DRY_RUN with adversarial prompts passes
3. Physical safety perimeter confirmed

Emergency stop is always reachable from the dashboard regardless of mesh state.
