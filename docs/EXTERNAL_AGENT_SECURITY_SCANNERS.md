# External Agent Security Scanners: Cisco + OpenClaw Ecosystem

**RoboFang adoption status (bridge + hub):** see [SECURITY_INTEGRATIONS.md](./SECURITY_INTEGRATIONS.md) — this file surveys upstream tools; it does not mean those tools are installed or active here.

## Purpose

This document captures practical usage guidance for current external security tooling related to:

- `cisco-ai-defense/mcp-scanner`
- `cisco-ai-defense/skill-scanner`
- `cisco-ai-defense/defenseclaw`
- `NVIDIA/OpenShell` and `NVIDIA/NemoClaw`

The goal is to decide what to adopt now for repository and runtime hardening, and what to monitor.

## Current Status (as of 2026-03-26)

- `mcp-scanner` is live and actively released (`cisco-ai-mcp-scanner` on PyPI).
- `skill-scanner` is live and actively released (`cisco-ai-skill-scanner` on PyPI, currently `2.0.6`).
- `defenseclaw` is live on GitHub (newer project, governance-focused messaging).
- `OpenShell` is live (NVIDIA runtime hardening layer for autonomous agents).
- `NemoClaw` is live as an alpha/early-preview reference stack around OpenClaw + OpenShell.

## What Each Tool Is Good For

### 1) MCP Scanner

Primary fit: MCP server security posture.

- Scans MCP endpoints and metadata: tools, prompts, resources, instructions.
- Supports static/offline and behavioral source scanning.
- Useful for MCP-specific abuse patterns:
  - prompt/tool poisoning indicators
  - suspicious code behavior mismatch
  - risky capabilities exposed via tools

Use this for repos that implement or host MCP servers.

### 2) Skill Scanner

Primary fit: skill package and `SKILL.md` supply-chain hardening.

- Scans skill directories used by agent frameworks.
- Uses layered analyzers (pattern/rule, behavioral, optional LLM/meta/cloud).
- Produces CI-friendly output (including SARIF) and supports pre-commit.

Use this where `.cursor/skills`, Codex/OpenAI-style skills, or similar reusable skill bundles exist.

### 3) DefenseClaw

Primary fit: governance and control-plane direction for agentic security.

- Early project; appears to focus more on policy/governance architecture than lightweight local scanning.
- Treat as emerging and monitor for production-ready workflows/API.

Use as a watch target, not a first hard dependency.

### 4) OpenShell / NemoClaw

Primary fit: runtime containment and policy enforcement.

- OpenShell is a sandbox/policy runtime approach.
- NemoClaw packages OpenClaw with OpenShell and model/runtime choices.
- Strong complement to scanners: enforce runtime constraints rather than only detect bad patterns.

Use when running long-lived autonomous agents with filesystem/network/tool privileges.

## Should We Clone All Repos to `D:\Dev\repos\external`?

Short answer: **yes, but selectively and intentionally**.

Recommended strategy:

- Clone for active evaluation and pinned reproducibility:
  - `cisco-ai-defense/mcp-scanner`
  - `cisco-ai-defense/skill-scanner`
  - `cisco-ai-defense/defenseclaw` (monitoring workspace)
  - `NVIDIA/OpenShell`
  - `NVIDIA/NemoClaw`
- Do not wire all of them into production CI immediately.
- Start with package-install usage for day-to-day scanning, keep clones for:
  - source audit
  - local patching
  - commit-pinned reproducible runs
  - rapid issue triage when signatures or behavior change

This balances engineering velocity with auditability.

## Practical Adoption Plan for Our Repos

### Phase 1: Fast Coverage (1-2 days)

- Add `mcp-scanner` scans for MCP repos:
  - `robofang`
  - `email-mcp`
  - `ocr-mcp`
  - `davinci-resolve-mcp`
- Add `skill-scanner` where skills exist:
  - `.cursor/skills/`
  - any `SKILL.md`-driven packages
- Run in report-only mode first.

### Phase 2: CI Enforcement (2-5 days)

- Gate PRs on severity thresholds (`high`/`critical`).
- Export scanner outputs as artifacts/SARIF where possible.
- Introduce baseline files for accepted findings to reduce alert fatigue.

### Phase 3: Runtime Hardening (later)

- Evaluate OpenShell-style policy isolation for long-running/high-privilege agents.
- Separate:
  - policy definition
  - policy enforcement
  - agent behavior
- Keep this independent from scanner pass/fail results.

## Trust and Provenance Notes

Cisco provenance is a strong positive signal for process maturity and enterprise threat modeling depth. It does **not** imply formal completeness:

- these scanners are best-effort, not proof of safety
- no-findings output is not a security guarantee
- model/rule updates can change outcomes between runs

Treat results as high-quality triage inputs inside defense-in-depth.

## Indirect Prompt Injection Hardening: Why It Stays Hard

Your intuition is right: complete detection resembles undecidable behavior in the general case.

Key reasons:

- intent can be obfuscated across natural language, code, and tool chains
- harmful behavior can emerge only after multi-step composition
- scanners reason on finite evidence, while adversarial space is open-ended
- benign and malicious patterns can be semantically similar

So practical hardening should combine:

- static/dynamic scanning
- least-privilege tool design
- runtime sandbox/policy enforcement
- human review for high-impact actions
- auditable logs and rollback controls

## Recommended Decision

Adopt now:

- `mcp-scanner` and `skill-scanner` as immediate controls.
- Clone related repos into `D:\Dev\repos\external` for reproducibility and source-level review.

Monitor and evaluate:

- `defenseclaw` maturity for governance integration.
- `OpenShell`/`NemoClaw` for runtime isolation patterns that can be adapted to our stack.

## Suggested External Clone Layout

```text
D:\Dev\repos\external\
  cisco-ai-defense\
    mcp-scanner\
    skill-scanner\
    defenseclaw\
  nvidia\
    openshell\
    nemoclaw\
```

## Operational Caveats

- Pin versions/commits in CI to avoid silent behavior drift.
- Keep API-key analyzers optional initially; start with offline/static analyzers.
- Track false positives with a transparent suppression process.
- Re-run scans after significant prompt/tool/schema changes, not just code changes.
