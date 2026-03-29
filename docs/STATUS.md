# Ongoing Work & Technical Status

Current progress and identified technical deficiencies.

---

## Integration fixes (2026-03-28)

The following gaps from the Phase 8 bridge refactor were closed:

| Item | Change |
|------|--------|
| Hub webapp fleet deck | `App.tsx` now calls `GET /api/connectors/active` and maps `data.active` to the fleet list (was wrong path `/api/fleet/active` and wrong field `connectors`). |
| Hub operator query | Added `POST /api/hands/ask` delegating to `orchestrator.ask` (same contract as MCP `robofang_ask`). Responses expose `response` for the UI. |
| Council path at runtime | `ReasoningEngine.council_synthesis` was missing while `OrchestrationClient.ask` still called it — restored with parallel member rounds + synthesizer pass. |
| Bridge startup | Lifespan startup calls `update_backends_from_topology()` so `MCP_BACKENDS` reflects `federation_map` before serving APIs. |

**Verify locally:** `py -3 -m pytest tests\test_bridge_import.py -q` (use project venv if pytest-cov is required). Dev UI: Vite proxies `/api` → bridge `10871` per `vite.config.ts`.

**Vendor security stack (DefenseClaw / OpenShell / Bastio):** Roadmap and non-claims are in **`docs/SECURITY_INTEGRATIONS.md`**. Hub UI marks these as **Coming soon** until wired.

---

## Active Development

1. **Tool-Use Migration**: Refactoring the ReAct loop to use Ollama's native `/api/chat` tool-calling functionality instead of XML regex parsing.
2. **Bumi Integration**: Building the simulation pipeline for the Noetix Bumi humanoid.
3. **Connector Maturity**: Expanding the standard `get_capabilities()` schema across all 30+ fleet members.

---

## Known Deficiencies (Tech Debt)

- **Regex Reliability**: Small models (3B-7B) often struggle with correctly formatting XML tags for tool calls.
- **Hardcoded Paths**: Several modules still rely on `D:/Dev/repos` as a hardcoded root.
- **CORS Configuration**: Historical confusion between ports 10871 and 10865/10867 sometimes causes communication blocks.
- **Sync Blocking**: Some older connectors perform synchronous I/O operations that can block the Bridge's event loop.
- **DocsOps Synthesis Failure**: `ask_docs` tool occasionally returns raw search data instead of synthesized AI answers (Regression identified 2026-03-28).
- **DocsOps Reindexing Failure**: LanceDB crashes during document insertion due to strict type enforcement on stringified booleans (`pyarrow.lib.ArrowInvalid: Could not convert 'false' with type str`).

---

## Maintenance History

- **2026-03-28**: Major documentation overhaul and Moshi voice pipeline integration.
- **2026-03-20**: Initial LiDAR point cloud visualization verified.
- **2026-03-13**: Competitive audit vs OpenFang finalized.
