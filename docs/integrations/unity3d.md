# Integration: Unity3D

**Canonical**: MCP central docs. This file is a secondary copy in RoboFang.

**Status**: BETA (Resonite SDK authoring); PLANNED/BETA (unity3d-mcp batch and Editor)  
**Connector**: `unity3d`  
**MCP server**: unity3d-mcp (see [robotics-mcp](../mcp-servers/robotics-mcp.md) for composition)

---

## 1. Overview

Unity3D integration in RoboFang has two legs:

| Leg | Purpose | Status |
|-----|---------|--------|
| **Resonite SDK (Unity)** | Author **worlds, gadgets, avatars** in Unity Editor for Resonite | **BETA** (official, 2026.3.11.1400+) |
| **unity3d-mcp** | Unity batch mode, Editor REST plugin, virtual robotics | PLANNED / used in robotics stack |

Both tie into the **Resonite** runtime: content authored with the SDK is consumed in Resonite and controlled via the **resonite** connector and [resonite-mcp](../mcp-servers/resonite-mcp.md). Crosslink: [Integration: Resonite](resonite.md) for runtime and full **Resonite SDK API reference**.

---

## 2. Resonite SDK (Unity)

As of **Resonite 2026.3.11.1400**, the **Resonite SDK (beta) for Unity Editor** is the official way to build Resonite content in Unity.

- **Scope**: Worlds, gadgets, avatars; bring existing Unity projects into Resonite.
- **Repo**: [Yellow-Dog-Man/Resonite.UnitySDK](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK) (open source, modular conversion).
- **State**: Beta — expect some jank.

**Detailed API and conversion system**: See [Integration: Resonite — Resonite SDK (Unity Editor) — API & reference](resonite.md#resonite-sdk-unity-editor-api--reference).

**Downstream**: Converted content runs in Resonite; control via [resonite-mcp](../mcp-servers/resonite-mcp.md) (sessions, avatars, worlds, ResoniteLink, OSC). No change to runtime APIs when using the SDK for authoring.

---

## 3. unity3d-mcp

- **Role**: Unity batch mode, Editor REST plugin, virtual robotics (e.g. with [robotics-mcp](../mcp-servers/robotics-mcp.md)).
- **Ports**: See [WEBAPP_PORTS](../standards/WEBAPP_PORTS.md) (e.g. 10710, 10830/10831).
- **Composition**: Documented in [robotics-mcp](../mcp-servers/robotics-mcp.md) (unity3d-mcp enabled for virtual robotics).

Unity3D + Resonite flow:

1. **Author** in Unity using the Resonite SDK (Unity) → convert to Resonite content.
2. **Run** Resonite; control via **resonite** connector / resonite-mcp.
3. Optionally drive or coordinate from **unity3d-mcp** (batch/Editor) where applicable.

---

## 4. Crosslinks

- **Resonite runtime and SDK API**: [Integration: Resonite](resonite.md)
- **Connector status**: [Connector taxonomy](../connector_taxonomy.md) — unity3d (BETA), resonite (REAL)
- **MCP**: [resonite-mcp](../mcp-servers/resonite-mcp.md), [robotics-mcp](../mcp-servers/robotics-mcp.md) (unity3d-mcp)
