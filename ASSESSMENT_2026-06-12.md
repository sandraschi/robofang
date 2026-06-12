# RoboFang Technical Assessment (June 12, 2026)

**Assessed by:** Claude (Fable 5, Claude Desktop session)
**Repo state:** v1.8.0-alpha.2, near-clean working tree (4 modified), last commit `6b9ce07`
**Previous assessment:** 2026-04-19

---

## Executive Summary

Core is healthy: 43/43 tests pass, ruff is down to 11 findings, the bridge/supervisor/hub trio runs, FastMCP is pinned `>=3.2,<4`. But there are two P0s — **a tracked `.env` with live credentials in a public GitHub repo**, and **the in-process MCP gateway is dead code** (`register_mcp` has zero callers, while docs and prompts advertise it). Plus significant doc/version drift accumulated since the v1.8 push.

---

## P0 — Fix immediately

### 1. Secrets committed to public GitHub
`.env` is **tracked in git** (`git ls-files` confirms) and contains a non-empty `MOLTBOOK_API_KEY` (26 chars) and `EMAIL_PASSWORD` (19 chars). Remote is `https://github.com/sandraschi/robofang.git` (public, listed on Glama). `.gitignore` has no `.env` entry — the "Bastio Moat / credential vault" work guarded runtime secrets but missed the oldest leak vector.

**Remediation order matters:**
1. Rotate the Moltbook key and the email password *first* (history purge without rotation is theater).
2. `git rm --cached .env`; add `.env` to `.gitignore`; commit.
3. Purge history with `git filter-repo --path .env --invert-paths` (or BFG), force-push; note that existing forks/clones retain old history.

### 2. Unified Gateway MCP is never mounted
`src/robofang/mcp_server.py` defines the full tool set (`robofang_status`, `robofang_ask`, `robofang_fleet`, `robofang_deliberations`, `robofang_agentic_workflow`, `robofang_voice`) and `register_mcp(mcp, orchestrator)` — but **nothing calls it**. `app/lifecycle.py::create_app()` never creates a FastMCP instance or mounts an MCP app. Meanwhile the `robofang_quick_start` prompt, docstrings, and docs all tell clients to connect to `http://localhost:10871/sse`. That endpoint 404s.

The *actual* working MCP path is the thin `robofang-mcp/` connector (stdio → bridge HTTP), which is fine architecture — arguably better than in-process. **Decide:** either (a) mount the gateway (`mcp.http_app()` mounted into the FastAPI app in `create_app`, calling `register_mcp` after orchestrator init) or (b) delete the gateway claim, keep the tool functions as shared implementation behind the bridge REST routes, and fix every doc/prompt that mentions `/sse`. Option (b) is less code and matches reality.

---

## P1 — Bugs

1. **Version triple-personality.** pyproject says `1.8.0a2`; `robofang_status` hardcodes `"version": "0.3.0"`; `lifecycle.py` falls back to `"12.3.0"` (the old "System v12" numbering). Single-source via `importlib.metadata.version("robofang")` and delete the literals.
2. **INSTALL.md is fiction.** References `python -m robofang.server` (module doesn't exist — it's `robofang.main`) and `just bootstrap` / `just serve` / `just web` / `just kill-all` — none in the justfile (which has `install`, `run`, `test`, `lint`, `fix`, `exe`...). A newcomer following INSTALL.md fails at step 3. Rewrite against the real entry points or add the missing recipes.
3. **CORS misconfiguration.** `allow_origins=["*"]` with `allow_credentials=True` is invalid per the Fetch spec — Starlette won't emit `Access-Control-Allow-Origin: *` when credentials are on, so credentialed browser calls silently fail; and wildcard origin is wrong for a hub fronting email/Discord/home automation anyway. Pin origins to the hub ports (10864/10870) or drop `allow_credentials`.
4. **Secure-binding regression.** CHANGELOG 1.8.0a1 claims services "bind to the secure private network by default instead of `0.0.0.0`" via `robofang.utils.security` Tailscale detection — but `main.py` defaults `ROBOFANG_BRIDGE_HOST` to `0.0.0.0`. Either the wiring never landed or it regressed. With email/HA/Ring connectors behind this API, an all-interfaces LAN bind is real exposure.
5. **Port documentation drift.** `supervisor.py` docstring: supervisor 10866, bridge 10865. Runtime logs: 10872/10871. `mcp_server.py` help: dashboard "10864 (or 10870)". `configs/fleet-stack-ports.json` exists — make it the single source.
6. **Deprecated lifecycle in supervisor.** `@app.on_event("startup")` at supervisor.py:539 (DeprecationWarning on every boot). Migrate to lifespan like the bridge already did.
7. **SSE transport in standalone `mcp_server.__main__`.** FastMCP 3.x deprecates SSE in favor of streamable HTTP. If standalone substrate mode survives the P0-2 decision, switch `transport="sse"` → `"http"`.
8. **Fire-and-forget `asyncio.create_task`** (RUF006) in `core/hands.py:112`, `core/resonite_link.py:34`, `research/embodied_sentience.py:71`. Not lint pedantry: unreferenced tasks can be garbage-collected mid-flight and exceptions vanish. Keep a task set or use a supervisor pattern.
9. **`core/bastio.py` and `core/bastion.py` both exist.** One is presumably the typo'd ancestor of the other. Pick one, fix imports, delete.
10. **Duplicate dev dependency definitions.** `[project.optional-dependencies].dev` (pytest>=8, pytest-asyncio>=0.23) vs `[dependency-groups].dev` (pytest>=9.0.2, pytest-asyncio>=1.3.0). Worse: the last recorded test run (`pytest_final_check.txt`) used **miniconda's Python 3.13.11 with pytest 8.4.2 / asyncio 0.23.8** — not the repo venv. The green suite was validated against the *old* pins. Consolidate into `[dependency-groups]` and re-run under `uv run pytest`.

## P2 — Gaps & hygiene

- **Two dashboards.** `dashboard/` and `robofang-hub/` are near-duplicate Vite/React apps with overlapping page sets (Council, Fleet, Deliberations, Hands, *Hub pages). robofang-hub looks like the survivor (api/ layer, shadcn `components.json`). Retire `dashboard/` or document why both exist.
- **Root-level litter:** `pytest_output.txt`, `pytest_final.txt`, `pytest_final_check.txt`, `ruff_errors.txt`, `fleet_analysis.json`, `robofang_test.db`, `scratch_refactor.py`, multiple `README_*.bak` / `ASSESSMENT_*.bak`. Ignored or not, they obscure the tree. Sweep into `temp/` or delete.
- **`hands/` contains fully vendored repos** (rustdesk-mcp, virtualization-mcp, vrchat-mcp) including Rust `target/` build dirs — heavy disk for what should be fleet references via `federation_map.json`. Git-ignored, but bloat and confusing for agents scanning the tree.
- **Docs sprawl contradicts April consolidation claim.** ASSESSMENT_2026-04-19 says operational docs migrated to mcp-central-docs; `docs/` still holds 80+ files including `docs/standards/` duplicates of mcd standards (AGENT_PROTOCOLS.md, WEBAPP_PORTS.md) and a stray `docs/pyproject.toml`. Duplicated standards *will* diverge.
- **Connector test runtime:** 2:29 for 43 tests suggests real network waits (Ring deprecation warnings show live library paths). Mark network-dependent tests `integration` (marker already exists) so the default run is fast.
- **lancedb deprecations** (`table_names()` → `list_tables()`) in `core/rag_base.py:56,71` — cheap fix before it breaks.
- **STATUS.md tech-debt item "XML Regex Parsing — Critical"** still listed open, but CHANGELOG 0.12.6 says the Ollama native tool-use migration happened. Reconcile.

---

## Standards conformance

| Standard | Status |
|---|---|
| FastMCP `>=3.2,<4` pinned | ✅ |
| Portmanteau tools (robofang-mcp connector) | ✅ (per 04-19 migration) |
| mcpb packaging (`mcpb/manifest.json`, prompts) | ✅ present |
| glama.json | ✅ |
| CI (ci.yml, release.yml) | ✅ present |
| Headless `start.ps1` SOTA pattern | ✅ |
| justfile | ⚠️ present, recipes ≠ INSTALL.md |
| Ruff/Semgrep/pre-commit (Sovereign Trinity) | ✅ configs present; 11 ruff findings open |
| Secrets handling | ❌ `.env` tracked publicly (P0-1) |
| Single port source (fleet-stack-ports.json) | ⚠️ exists but bypassed by hardcoded docstrings |
| Docs consolidated to mcd | ❌ regressed/incomplete |
| Bridge-as-MCP-gateway claim | ❌ unmounted (P0-2) |

---

## Minimal spin-up (what actually works today)

```powershell
cd D:\Dev\repos\robofang
uv sync --all-extras

# 1. Bridge (FastAPI hub, port 10871). Council needs Ollama on :11434.
uv run python -m robofang.main          # or: uv run robofang-bridge

# 2. (optional) Supervisor — auto-starts/monitors the bridge, port 10872
uv run robofang-supervisor

# 3. (optional) Hub UI — Vite on 10864
.\robofang-hub\start.ps1

# 4. IDE/Claude Desktop MCP — the thin connector, stdio:
#    "robofang": {
#      "command": "uv",
#      "args": ["--directory", "D:\\Dev\\repos\\robofang\\robofang-mcp",
#               "run", "python", "-m", "robofang_mcp.server"],
#      "env": { "ROBOFANG_BRIDGE_URL": "http://localhost:10871" }
#    }
```

Minimum config: a (new, untracked!) `.env` with `OLLAMA_URL` is enough for council/ask; all connectors (Discord, Hue, Plex, Ring, email, ...) degrade to offline if unconfigured. Do **not** follow INSTALL.md until it's rewritten.

## Suggested order of work

1. Rotate creds → purge `.env` from history → gitignore (today).
2. Decide gateway fate (mount vs. delete claim) + fix `/sse` docs.
3. Version single-sourcing + INSTALL.md rewrite + port doc generation (one sitting).
4. CORS + default-bind fix; supervisor lifespan migration.
5. Hygiene sweep: bastio/bastion, root litter, dashboard/ retirement, ruff zero.
