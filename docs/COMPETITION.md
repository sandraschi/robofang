# Comparison: RoboFang vs Competitors

How RoboFang situates itself relative to OpenClaw and OpenFang.

---

## Concept Focus

| Project | Primary Focus | Methodology |
|---------|---------------|-------------|
| **OpenClaw** | **Communication** | Maximizing messaging channels and community plugins. |
| **OpenFang** | **Infrastructure** | Building a secure, high-performance "Agent OS" in Rust. |
| **RoboFang** | **Embodiment** | Bridging AI agents with physical/virtual robotics and a federated fleet. |

---

## Feature Matrix

| Capability | RoboFang | OpenClaw | OpenFang |
|------------|:--------:|:--------:|:--------:|
| Language | Python 3.12 | Node.js 22 | Rust |
| Local-First | Primary | Secondary | Secondary |
| Robotics (Physical) | ✅ Yes | ❌ No | ❌ No |
| Robotics (Virtual) | ✅ Yes | ❌ No | ❌ No |
| Multi-Model Debate | ✅ Yes | ⚠️ Limited | ❌ No |
| MCP Federation | ✅ Yes | ⚠️ Partial | ⚠️ Partial |
| Security Sandboxing | ⚠️ Logical | ⚠️ Logical | ✅ WASM |

---

## Strategic Advantages

### 1. The Embodiment Gap
RoboFang is the only framework that treats **joint control**, **LiDAR point clouds**, and **VR world spawning** as first-class primitives.

### 2. Zero Per-Token Research
By prioritizing local Ollama inference, RoboFang enables low-cost, high-frequency research loops that are financially unsustainable on cloud-based frameworks.

### 3. Federated Fleet
Instead of "one server to rule them all", RoboFang orchestrates a fleet of specialized MCP servers, each providing a clean tool surface for a specific domain (Plex, Blender, Docker, etc.).
