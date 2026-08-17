# SPEC: Fleet Grading Autopilot

**Status**: Draft  
**Author**: Sandra Schipal  
**Date**: 2026-07-30  
**Target**: robofang v1.9.0

## Goal

Run automated quality assessment across all 187 fleet repos on a cron schedule, score them against SOTA standards, track deltas week-over-week, and auto-file GitHub issues for regressions.

## Why

The current `qualitycheck` and `assfix` workflow is manual. Sandra runs it on individual repos when she notices problems. The fleet has 187 repos; most haven't been assessed in weeks. Regressions (broken CI, stale docs, lint drift) accumulate silently. An autopilot that:
1. Scores every repo weekly (or daily for tier-1 repos)
2. Diffs against the previous score
3. Files issues for regressions

...keeps the fleet healthy without Sandra spending 2 hours/day on manual inspection.

## Requirements

### 1. Scoring Pipeline

Each repo is scored on these dimensions (matching `qualitycheck`):

| Dimension | Weight | Scale | Data Source |
|-----------|--------|-------|-------------|
| Lint Health | 15% | 0-10 | `ruff check src/ --quiet` exit code + warning count |
| Type Health | 10% | 0-10 | `tsc --noEmit` exit code (if webapp) |
| Test Health | 15% | 0-10 | `pytest` pass rate + coverage trend |
| Docs Freshness | 10% | 0-10 | README, CHANGELOG, llms-full.txt existence + line counts |
| CI Health | 15% | 0-10 | GitHub Actions: last 10 runs, % passing |
| Port Compliance | 10% | 0-10 | WEBAPP_PORTS.md matches actual code |
| Version Freshness | 10% | 0-10 | Days since last release (<30d=10, 30-90d=5, >90d=0) |
| Dependency Freshness | 10% | 0-10 | `uv run pip audit` + days since `uv sync` |
| Config Drift | 5% | 0-10 | .env.example vs actual os.getenv() calls |

Total score: weighted average, 0-10.

### 2. Schedule & Targeting

| Tier | Cadence | Scope |
|------|---------|-------|
| 1 (flagship, ~12 repos) | Every 6 hours | Full 9-dimension scan |
| 2 (active, ~40 repos) | Daily | Full scan |
| 3 (stable, ~80 repos) | Weekly | Lint + CI + docs only |
| 4 (dormant, ~55 repos) | On-demand | None — only when touched |

Tier assignment lives in `configs/fleet_tiers.json` (overridable).

### 3. Delta Tracking + Issue Filing

- Each run writes `data/grading/{repo}/{date}.json` with full scores
- `data/grading/trends.json` — per-repo score history (last 52 weeks)
- If any dimension drops by >= 2 points vs the previous run:

  ```
  gh issue create \
    --repo sandraschi/{repo} \
    --title "regression: {dimension} score dropped from {old} to {new}" \
    --body "## Autopilot Alert

  Scoring run: {date}

  | Dimension | Previous | Current | Delta |
  |-----------|----------|---------|-------|
  | {dim} | {old} | {new} | {delta} |

  [Full report](file:///D:/Dev/repos/robofang/data/grading/{repo}/{date}.json)
  "
  ```

### 4. Dashboard

A new hub panel: **Fleet Health** — sortable table of all repos with:
- Current score (color-coded: green >=8, yellow >=5, red <5)
- Delta arrow (↑↓→) from last run
- Sparkline of last 8 scores
- Click → detail page with dimension breakdown + trend chart

### 5. MCP Tools

- `robofang_grade(repo, dimensions=...)` — trigger grade for one repo now
- `robofang_grade_status(repo)` — show last grade + history
- `robofang_grade_fleet()` — trigger fleet-wide grade (respects tier schedule)
- `robofang_grade_autopilot()` — show schedule, last run, pending tiers

### 6. Non-Intrusive Design

- The autopilot MUST NOT modify any repo's source code. It reads, scores, files issues — never edits.
- Scoring runs are async (thread pool), never block the bridge.
- Rate limit GitHub issue creation to 5/min to avoid spam.
- If a repo already has an open issue for the same regression dimension, skip filing a duplicate.

## Non-Goals

- Auto-fixing regressions (that's what `assfix` is for — invoked manually)
- Scoring private/third-party repos (fleet only)
- PR creation from autopilot (issues only — human judges severity)

## Implementation Sketch

```
src/robofang/grading/
├── __init__.py
├── scanner.py        # per-repo dimension probes (subprocess calls)
├── scorer.py         # raw data → weighted scores
├── storage.py        # JSON read/write + trend computation
├── scheduler.py      # tier-based cron dispatcher (asyncio)
├── issue_filer.py    # GitHub issue creation + dedup check
├── tiers.py          # tier config + deadline computation
├── dashboard_api.py  # REST endpoints for hub panel
└── tools.py          # MCP tool handlers
```

## Open Questions

- Should the autopilot also track Glama scores (glama.ai) as a dimension? That requires scraping, which may hit rate limits.
- How do we handle repos that aren't cloned locally (D:\Dev\repos\{repo} doesn't exist)? Skip and log.
- Who gets notified when a tier-1 repo drops below 5.0? Direct Discord message to Sandra is probably right.
