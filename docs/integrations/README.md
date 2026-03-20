# Integration Docs — RoboFang Copy

**Canonical source**: MCP central docs. This directory is a **secondary copy** for RoboFang; contribute fixes and updates upstream when possible.

Detailed integration guides and API references for services that plug into the Agentic Mesh (connector behaviour, SDKs, MCP crosslinks).

| Integration | Status | Description |
|-------------|--------|-------------|
| [**Resonite**](resonite.md) | REAL | Runtime (ResoniteLink, OSC) + authoring via [Resonite SDK (Unity) beta](resonite.md#resonite-sdk-unity-editor-beta). Full [API/SDK reference](resonite.md#resonite-sdk-unity-editor-api--reference). |
| [**Unity3D**](unity3d.md) | BETA | Unity Editor authoring for Resonite via official SDK; unity3d-mcp for batch/robotics. Crosslinked with [Resonite](resonite.md). |
| **Robotics** | — | robotics-mcp composes unity3d-mcp, resonite-mcp, avatar-mcp; see [MCP Tools Roadmap](MCP_TOOLS_ROADMAP.md#4-robotics-mcp--new-tools) for suggested Resonite vbot tools. |
| [**bumi-mcp**](bumi-mcp.md) | **0.1.0** | Noetix Bumi humanoid MCP + webapp **10774/10775**; virtual twin via resonite-mcp / robotics-mcp / worldlabs-mcp. Central: [projects/bumi-mcp](https://github.com/sandraschi/mcp-central-docs/tree/master/projects/bumi-mcp). |

See also:

- [**MCP Tools Roadmap**](MCP_TOOLS_ROADMAP.md) — suggested new tools for unity3d-mcp, resonite-mcp, and avatar-mcp (Resonite SDK authoring and cross-stack).
- [Connector taxonomy](../connector_taxonomy.md) — status and legend for all connectors.
- [INTEGRATIONS.md](../INTEGRATIONS.md) — high-level integration philosophy and supported services.
