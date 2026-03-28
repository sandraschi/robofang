# Architecture Overview

RoboFang is designed as a multi-process coordination node for local-first tool orchestration.

---

## Process Topology

The platform consists of three primary processes communicating via standard HTTP:

1. **Dashboard (Port 10864)**: React/Vite interface for project monitoring, fleet configuration, and log analysis.
2. **Bridge (Port 10871)**: FastAPI gateway. Handles task routing, connector lifecycles, and tool schemas.
3. **Supervisor (Port 10872)**: Process manager responsible for health monitoring and Bridge recovery.

---

## Module Reference

- **Orchestrator**: Core logic for task coordination, security policy enforcement, and scheduler pulses.
- **Reasoning Engine**: Manages local inference sessions and the multi-agent Council protocol.
- **Connectors**: Adapt local and remote services (Email, IoT, MCP) into a normalized tool surface.
- **Hands**: Manages the execution of schedule-driven background agents.

---

## Data Flow

Tasks are processed through a structured pipeline:
1. **Intake**: Dashboard submits a request to the Bridge.
2. **Evaluation**: Orchestrator assesses task difficulty and routes to a single model or the full Council.
3. **Execution**: Reasoning Engine executes tool-use loops via the required Connectors.
4. **Adjudication**: For sensitive tasks, a logical gate verifies the action before finalization.
5. **Output**: The processed result and event trace are returned to the Dashboard.
