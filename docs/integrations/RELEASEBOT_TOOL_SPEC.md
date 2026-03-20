# Releasebot tool spec (for mcp-central-docs MCP server)

**Canonical**: mcp-central-docs. This file is a reference copy in RoboFang.

**Implementation**: `docs_mcp` MCP tool **`query_releasebot`** (`src/docs_mcp/releasebot.py` + registration in `server.py`).

**Purpose**: One tool that answers “was there a new release of X?” and points you to the details. No API key; uses public Releasebot pages only.

---

## Tool: `query_releasebot`

| Item | Value |
|------|--------|
| **Name** | `query_releasebot` |
| **Param** | `product_slug` (string, required) — e.g. `cursor`, `notion`, `zed`, `anthropic`, `openai`. See [releasebot.io/updates](https://releasebot.io/updates) / [alphabetical](https://releasebot.io/updates/alphabetical). |
| **Returns** | Short summary: “Recent releases: [date] — [headline]; [date] — [headline]; …” plus the link `https://releasebot.io/updates/{product_slug}` so the user can open it for full details. |
| **Implementation** | GET `https://releasebot.io/updates/{product_slug}`; parse only enough to extract last N release dates + headlines (no full body). On 404 or empty, return “No feed found for slug ‘{slug}’ or no recent releases. Check https://releasebot.io/updates/alphabetical for valid slugs.” |

**Use case**: “Was there a new Cursor / Zed / Notion release?” → tool says “yes, Mar 11 — Over 30 new plugins…” and gives the link; user clicks through for full notes. No paid API.

---

## Notes

- Releasebot’s **structured API** (JSON, backfill) is contact/sales; not needed for this.
- Optional: second param `limit` (default 5) for “last N releases” to keep response small.
