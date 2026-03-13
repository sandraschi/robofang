# Docs Structure and RAG Strategy

The `docs/` tree is intended to be **broad and deep**: MCP-controlled apps, robots, the “robot revolution” (e.g. China), philosophical and neurophilosophical notes, embodied AI, protoconsciousness research, and related topics. For agents and future tooling to use this effectively, the tree must be **well RAG’d**: consistent structure, chunk-friendly content, and clear links.

---

## 1. Target doc tree (vision)

High-level areas; each can have subfolders and many detail pages.

| Area | Purpose | Example content |
|------|---------|-----------------|
| **MCP-controlled apps** | Every app/hub in the fleet: purpose, config, ports, tools. | `mcp-servers/*`, connector taxonomy, integration guides. |
| **Robots** | Physical and virtual robots: hardware, ROS, firmware, usage. | Yahboom, Noetix Bumi, Unitree, simulation, Resonite avatars. |
| **Robot revolution** | Industry and policy: who’s shipping, where (e.g. China), trends. | Market notes, geography, key players, timelines. |
| **Philosophy / neurophilosophy** | Concepts that inform the stack: agency, consciousness, Friston, etc. | Short essays, references, links to research. |
| **Embodied AI** | Embodiment, sensorimotor loop, “hands and legs”, simulation. | Architecture notes, papers, links. |
| **Protoconsciousness research** | Pre-reflective awareness, predictive processing, relevant literature. | Summaries, citations, working notes. |
| **Operations** | Runbooks, monitoring, safety, credentials, fleet installer. | Existing MONITORING, SAFETY, ONBOARDING, etc. |
| **Apple / iOS** | iOS app plan and implementation notes. | `apple/IOS_APP_PLAN.md`, build/run. |

Existing folders (`architecture/`, `mcp-servers/`, `skills/`, `standards/`) stay; new topic folders (e.g. `robots/`, `philosophy/`, `research/`) can be added as needed. Prefer **one concept per file** and **detail pages** under each area so RAG chunks stay focused.

---

## 2. Making the tree “well RAG’d”

So that semantic search (in-repo LanceDB or Advanced Memory) returns useful fragments:

- **Chunking:** Write so that a single section (or a few short sections) form a coherent chunk. Use clear headings (H2/H3). Avoid very long single pages with unrelated topics.
- **Frontmatter (optional but useful):** If the ingestion pipeline supports it, add YAML at the top of key pages: `title`, `tags`, `date`, `category` (e.g. `robots`, `philosophy`, `mcp-apps`). Enables filtered search and better retrieval.
- **Linking:** Use relative links between docs (`[text](path/to/doc.md)`). Helps both humans and graph-style RAG (e.g. “related docs”).
- **Stable paths:** Keep URLs/paths stable. Prefer `docs/area/topic.md` and avoid renaming files without redirects or index updates.
- **Index pages:** Each major area can have a `README.md` or `INDEX.md` that lists subpages and one-line descriptions; improves “what’s in this area?” retrieval.

Current RAG path: **Advanced Memory MCP** (see MEMOPS_STATUS.md, RAG_AND_LANCEDB_STATUS.md). To RAG this repo’s `docs/` directly, either ingest `docs/` into Advanced Memory or wire the in-repo LanceDB pipeline to index `docs/` and optionally other markdown under the repo.

---

## 3. Suggested next steps

1. Add topic folders under `docs/` as you add content (e.g. `docs/robots/`, `docs/philosophy/`, `docs/research/`).
2. Add an index at `docs/README.md` (or extend it) that links to each area and to this structure doc.
3. Decide ingestion path: Advanced Memory only, or in-repo LanceDB + script to index `docs/**` and sync into `RoboFangRAG` (see RAG_AND_LANCEDB_STATUS.md).
4. When adding new pages, use consistent headings and (where applicable) frontmatter so future RAG and tooling can rely on structure.

This file is the canonical reference for the intended docs layout and RAG strategy until a more formal information architecture doc exists.
