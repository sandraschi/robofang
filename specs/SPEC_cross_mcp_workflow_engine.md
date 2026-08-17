# SPEC: Cross-MCP Workflow Engine

**Status**: Draft  
**Author**: Sandra Schipal  
**Date**: 2026-07-30  
**Target**: robofang v1.9.0

## Goal

Define, store, and execute multi-step pipelines that chain tool calls across multiple fleet MCP servers, with branching, error handling, and conditional gates.

## Why

The Council of Dozens is powerful but ad-hoc — each `robofang_ask` invocation reasons fresh about which tools to call in what order. A workflow DSL turns proven multi-step patterns (arxiv search → ingest → calibre store → email digest) into reusable, inspectable, auditable pipelines. robofang becomes the fleet's programmable orchestrator, not just a reactive supervisor.

## Requirements

### 1. Workflow DSL (YAML)

```yaml
name: arxiv-digest
version: 1
description: Search arxiv, ingest top paper, store to calibre, email digest

steps:
  - id: search
    server: arxiv-mcp
    tool: search_papers
    params:
      query: "{{query}}"
      limit: 1
    output: paper

  - id: fetch
    server: arxiv-mcp
    tool: fetch_full_text
    params:
      paper_id: "{{steps.search.result.papers[0].id}}"
    depends_on: [search]

  - id: ingest
    server: arxiv-mcp
    tool: ingest_paper_to_corpus
    params:
      paper_id: "{{steps.search.result.papers[0].id}}"
    depends_on: [fetch]

  - id: store
    server: arxiv-mcp
    tool: store_paper_to_calibre
    params:
      paper_id: "{{steps.search.result.papers[0].id}}"
    depends_on: [ingest]

  - id: notify
    server: robofang
    tool: robofang_ask
    params:
      message: "Paper {{steps.search.result.papers[0].title}} ingested and stored."
      use_council: false
    depends_on: [store]
```

### 2. Workflow Storage

- SQLite table `workflows` with columns: `id`, `name`, `version`, `yaml`, `created_at`, `updated_at`
- Directory `configs/workflows/` for checked-in YAML files (auto-loaded on startup)

### 3. Execution Engine

- `robofang_workflow_run(name, params, mode)` — execute a workflow
- `robofang_workflow_status(run_id)` — poll execution state
- `robofang_workflow_list()` — list stored workflows
- `robofang_workflow_create(yaml)` — register a new workflow

Execution modes:
- `sync` — block until complete, return full result
- `async` — return run_id immediately, poll via status
- `dry_run` — validate + print step plan, no execution

### 4. Variable Interpolation

- `{{param_name}}` — input parameters
- `{{steps.step_id.result.field}}` — reference previous step output
- `{{steps.step_id.error}}` — reference step error
- Built-in functions: `{{jsonpath(expr, data)}}`, `{{now()}}`, `{{uuid()}}`

### 5. Error Handling

- `on_error: fail | skip | fallback` per step
- `retry: { count: 3, delay: 5 }` per step
- `timeout: 60` seconds per step
- Overall workflow timeout (default 600s)

### 6. Cross-MCP Discovery

The engine must:
- Resolve `server: arxiv-mcp` against the fleet registry (config/fleet-repos.txt or `robofang_fleet`)
- Verify the target server is alive before starting
- Fail early with a clear message if a server is unavailable

### 7. MCP Tool

Add `robofang_workflow` portmanteau tool with operations: `run`, `status`, `list`, `create`, `delete`.

## Non-Goals

- Visual workflow editor (CLI + YAML only for v1)
- Parallel step execution (sequential DAG only for v1)
- State persistence across server restarts (run history survives, active runs do not)
- Third-party DSL compatibility (Airflow, Argo, etc.)

## Implementation Sketch

```
src/robofang/workflow/
├── __init__.py
├── dsl.py          # YAML schema, validation, variable interpolation
├── engine.py       # Step executor with retry/timeout/dep graph
├── storage.py      # SQLite CRUD for workflows + run logs
├── templates/      # Shipped example workflows
└── tools.py        # robofang_workflow portmanteau tool
```

## Open Questions

- Should workflows be allowed to call any MCP tool across any server, or restricted to a curated allowlist?
- How do we authenticate cross-server calls (ROBOFANG_API_KEY passed as header)?
