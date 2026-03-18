# RoboFang: Integrations & Mesh Connectors

**Document Status**: Draft Extension  
**Date**: 2026-03-12

---

## 1. The Integration Philosophy

RoboFang does not believe in siloed applications. Every service you use — from your personal notes to your photo library — should be a tool available to your agentic council. This document explains how we bridge 3rd party services into the **Agentic Mesh**.

## 2. Supported Service Connectors

### 2.1 Notion (Knowledge Bridge)
- **Purpose**: Allows agents to read/write project notes, databases, and structured knowledge.
- **Implementation**: `mcp-notion-bridge`
- **Setup**: Requires a Notion Integration Token and Database ID.
- **Agent Capabilities**: Searching pages, creating database entries, appending task notes.

### 2.2 Immich (Visual Memory)
- **Purpose**: Provides agents with access to your photo library for visual RAG.
- **Implementation**: `mcp-immich-connector`
- **Setup**: Requires API Key and Server URL.
- **Agent Capabilities**: Retrieving image metadata, performing CLIP-based semantic search on photos.

### 2.3 Readly & Content Feeds (Intel Ingest)
- **Purpose**: Ingesting articles, news, and magazines for high-altitude research.
- **Implementation**: `mcp-intel-inbox`
- **Setup**: Requires account credentials or RSS feed URLs.
- **Agent Capabilities**: Summarizing recent technical articles, tracking specific keywords (e.g., "Humanoid Robotics").

### 2.4 Tapo & Smart Home (Environmental Awareness)
- **Purpose**: Real-time camera feeds and device control.
- **Implementation**: `mcp-tapo-guardian`
- **Setup**: Requires local TP-Link credentials.
- **Agent Capabilities**: Monitoring rooms, toggling lights based on agentic occupancy logic.

### 2.5 Resonite (Virtual Worlds & Embodiment)
- **Purpose**: Runtime control of Resonite (sessions, avatars, worlds, ProtoFlux, ResoniteLink, OSC); authoring via **Resonite SDK (Unity) beta** (worlds, gadgets, avatars).
- **Implementation**: `resonite-mcp` (runtime); [Resonite SDK for Unity](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK) (authoring, beta).
- **Setup**: Resonite client, OSC enabled; for Unity authoring see [Integration: Resonite](integrations/resonite.md) and [Integration: Unity3D](integrations/unity3d.md).
- **Agent Capabilities**: Session/world/avatar control, inventory, ResoniteLink spawn/get/set, cloud session browser, world inspector; authoring in Unity then run in Resonite.
- **Detailed API** (copy; canonical in MCP central docs): [integrations/resonite.md](integrations/resonite.md) (full SDK API & reference).

### 2.6 Unity3D (Authoring & Virtual Robotics)
- **Purpose**: Author Resonite content in Unity Editor (official SDK beta); Unity batch/Editor via unity3d-mcp for virtual robotics.
- **Implementation**: [Resonite.UnitySDK](https://github.com/Yellow-Dog-Man/Resonite.UnitySDK) (beta), unity3d-mcp.
- **Setup**: Unity Editor + Resonite SDK package; Resonite 2026.3.11.1400+.
- **Agent Capabilities**: Build worlds/gadgets/avatars in Unity, convert for Resonite; coordinate with resonite-mcp for runtime. See [Integration: Unity3D](integrations/unity3d.md); SDK API details in [Integration: Resonite](integrations/resonite.md#resonite-sdk-unity-editor-api--reference).

**Integration docs** (secondary copy; canonical: MCP central docs): [docs/integrations/README.md](integrations/README.md) — index for Resonite, Unity3D, robotics. **New tools roadmap**: [docs/integrations/MCP_TOOLS_ROADMAP.md](integrations/MCP_TOOLS_ROADMAP.md) — suggested tools for unity3d-mcp, resonite-mcp, avatar-mcp, robotics-mcp.

## 3. Creating a Custom Connector

To build a new bridge for an unsupported service:

1. **Scaffold**: Use the FastMCP 3.1 template.
2. **Auth Layer**: Implement a secure credential storage mechanism (avoiding plaintext in code).
3. **Tool Definition**: Map the service's API endpoints to functional MCP tools.
4. **Registry**: Add the server to the global `mcp_config.json`.

---
*If it has an API, it can have a mind.*
