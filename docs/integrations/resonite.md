# Integration: Resonite

**Canonical**: MCP central docs. This file is a secondary copy in RoboFang.

**Status**: REAL (runtime); BETA (authoring via Unity SDK)  
**Connector**: `resonite` (ResoniteLink WebSocket, OSC)  
**MCP server**: [resonite-mcp](../mcp-servers/resonite-mcp.md)

---

## 1. Overview

Resonite is the primary virtual-world and embodiment substrate in RoboFang. Integration is two-sided:

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Runtime** | ResoniteLink (WebSocket), OSC | REAL |
| **Authoring** | [Resonite SDK (Unity) beta](#resonite-sdk-unity-editor-beta) | BETA |

Runtime control (sessions, avatars, worlds, ProtoFlux, inventory, ResoniteLink) is provided by the **resonite** connector and **resonite-mcp**. Authoring of worlds, gadgets, and avatars can be done in-resonite or, as of 2026.3.11.1400, via the **official Resonite SDK for the Unity Editor** (beta).

Crosslink: authoring in Unity is documented under [Integration: Unity3D](unity3d.md); this page focuses on Resonite runtime + SDK API.

---

## 2. Runtime integration (resonite-mcp)

- **Config**: `configs/federation_map.json` → `resonite` (path `resonite-mcp`, ResoniteLink WebSocket JSON).
- **Capabilities**: Session start/status/end, world load, avatar load/parameters, ProtoFlux execute, inventory list/search/spawn/upload/delete/share/info, ResoniteLink connect/spawn/get/set, cloud session browser, world inspector, asset injection (VRM, props, furniture, architecture), presence gate.
- **Docs**: [Resonite MCP Server](../mcp-servers/resonite-mcp.md).

No change to runtime behaviour with the Unity SDK; the SDK is an authoring path only.

---

## 3. Resonite SDK (Unity Editor) — beta

Introduced in **Resonite 2026.3.11.1400** (Steam announcement: [Introducing Resonite SDK (beta) for Unity Editor](https://store.steampowered.com/news/app/2519830/view/529874048900923463)).

### 3.1 Purpose and scope

- **Purpose**: Use the **Unity Editor** to build content for Resonite and to bring **existing Unity content** into Resonite.
- **Content types**: **Worlds**, **gadgets**, **avatars**.
- **State**: Beta — some jank expected; for a hassle-free experience, consider waiting for stabilization.
- **License**: Fully **open source**; **modular, extensible conversion system**; community issues and PRs welcome.

### 3.2 Upstream and requirements

- **Repository**: [Yellow-Dog-Man/Resonite.UnitySDK](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK)
- **Releases**: v0.0.1 (initial alpha), v0.0.2, v0.0.3 (pre-releases as of March 2026)
- **Resonite client**: Requires a Resonite build that includes the SDK announcement (2026.3.11.1400 or later)
- **Related**: [Resonite.UnityShaders](https://github.com/Yellow-Dog-Man/Resonite.UnityShaders) — Unity shader reference for Resonite

### 3.3 Relationship to ResonitePackage

- **ResonitePackage** (`.resonitepackage`) is Resonite’s package format for sharing/importing avatars and objects (slot hierarchies, components, assets). See [ResonitePackage (Resonite Wiki)](https://wiki.resonite.com/ResonitePackage).
- **Unity does not open ResonitePackage files**; the format is intentionally separate from `.unitypackage`.
- The **Unity SDK** provides the **authoring and conversion path**: build in Unity → convert via SDK → content usable in Resonite. Export as ResonitePackage from *within* Resonite (in-world export), not directly from Unity; the wiki notes that ResonitePackage could become part of the Unity SDK flow in the future.

---

## 4. Resonite SDK (Unity Editor) — API & reference

This section is the **detailed API/spec reference** for the Resonite SDK (Unity) as relevant to RoboFang’s integration docs.

### 4.1 Installation and setup

- **Source**: Install or clone from [Yellow-Dog-Man/Resonite.UnitySDK](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK); use a release tag (e.g. v0.0.3) or main as appropriate.
- **Unity**: Use a Unity Editor version compatible with the SDK (check repo README/requirements).
- **Resonite**: Client 2026.3.11.1400 or later.

### 4.2 Conversion system (modular and extensible)

- The SDK provides a **conversion pipeline** from Unity scene/asset representation to Resonite-compatible output.
- **Modular extensible conversion**: Conversion is pluggable/extensible so the community (or RoboFang) can add converters for custom component or asset types.
- **Shader mapping**: Unity materials/shaders are mapped to Resonite’s shader set; reference shaders are in [Resonite.UnityShaders](https://github.com/Yellow-Dog-Man/Resonite.UnityShaders).

### 4.3 Key Unity-side concepts (from releases and wiki)

| Concept | Description |
|--------|-------------|
| **BipedAvatarDescriptor** | Avatar descriptor component; SDK auto-adds references when attaching (v0.0.3). |
| **Skinned meshes** | Correct detection improved in v0.0.2 (skinned mesh handling fixes). |
| **Gizmos** | BipedAvatarDescriptor hand/feet gizmos and custom editor drawers for Resonite components (v0.0.2). |
| **Templates / IDs** | Template and ID fixes in releases (e.g. v0.0.2, v0.0.3); ensure IDs in templates are correct for conversion. |
| **Missing components** | Conversion can break if required components are missing; v0.0.3 addresses missing components breaking conversion. |

### 4.4 Output and downstream use

- Converted content is intended for use **in Resonite** (load in session, spawn via ResoniteLink, etc.).
- **Runtime control** of that content is via **resonite-mcp** and the **resonite** connector (ResoniteLink, OSC), not via the Unity SDK.
- **ResonitePackage export**: Done from inside Resonite (in-world export), not from the Unity Editor; the SDK produces the content that you then use/export in Resonite.

### 4.5 Official and community links

- **Steam news**: [2026.3.11.1400 – Introducing Resonite SDK (beta) for Unity Editor](https://store.steampowered.com/news/app/2519830/view/529874048900923463)
- **GitHub**: [Yellow-Dog-Man/Resonite.UnitySDK](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK) (repo, issues, PRs)
- **Releases**: [Releases · Yellow-Dog-Man/Resonite.UnitySDK](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK/releases)
- **ResonitePackage**: [ResonitePackage – Resonite Wiki](https://wiki.resonite.com/ResonitePackage)
- **Unity SDK roadmap (wiki)**: [Resonite-Issues #6](https://github.com/Yellow-Dog-Man/Resonite-Issues/issues/6) (Unity SDK on roadmap)

---

## 5. Crosslinks

- **Authoring in Unity**: [Integration: Unity3D](unity3d.md) — Resonite SDK (Unity) usage and unity3d-mcp.
- **Connector status**: [Connector taxonomy](../connector_taxonomy.md) — resonite (REAL), unity3d (BETA).
- **MCP server**: [resonite-mcp](../mcp-servers/resonite-mcp.md).
