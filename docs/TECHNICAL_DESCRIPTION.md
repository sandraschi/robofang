# RoboFang Technical Architecture

RoboFang provides a unified orchestration layer for multi-agent reasoning, Model Context Protocol (MCP) server management, and physical robotics coordination.

## Core Components

### 1. Unified Gateway
The gateway consolidates the Bridge, MCP server, and Dashboard API into a single environment.
- **Port**: `10871`
- **Protocol**: SSE (Server-Sent Events) for MCP 3.1 compatibility.
- **Execution**: A single process manages tool orchestration, state persistence, and external connectivity.

### 2. Multi-Agent Reasoning Pipeline
RoboFang utilizes a 3-phase reasoning cycle to ensure precision in output generation:
1.  **Phase 1: Enrich**: Technical specification generation from initial user input.
2.  **Phase 2: Execute**: Tool-intensive execution phase utilizing specialized agentic patterns.
3.  **Phase 3: Audit**: Post-execution verification to ensure the results align with the initial specification.

### 3. Media Knowledge Base (RAG)
The `robofang_rag` system utilizes **LanceDB** for semantic retrieval across local media libraries.
- **Delta-Sync**: Incremental indexing for efficient updates.
- **Retrieval**: Support for text, metadata, and codebase documentation.

### 4. Local Inference & Performance
- **Ollama**: Native support for local model orchestration.
- **Hardware**: Optimization for high-VRAM NVIDIA GPUs (RTX 40-series).
- **Privacy**: Local-first architecture with minimal external dependencies.

## Connectivity

### MCP 3.1
Native support for the MCP 3.1 standard, enabling integration with the broader MCP ecosystem.

### OSC Protocol
Real-time orchestration for social VR environments (VRChat) and professional media suites.

### Robotics
Low-latency control for Unitree hardware and virtual models.

## Layout
- `/dashboard`: React/Vite/Tailwind frontend.
- `/src/robofang`: Application logic.
- `/tools`: Orchestration scripts and skill bridges.
- `/configs`: Federation and agent persona definitions.
- `/docs`: Technical and architectural documentation.
