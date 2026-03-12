# API Reference

Detailed documentation for the RoboFang Sovereign Bridge REST API.

## Core Endpoints

### `GET /health`
Basic health probe. Returns service status, version, and connector states.

### `GET /system`
Extended system information including PID, uptime, memory usage, and detailed connector status.

### `GET /fleet`
Comprehensive fleet registry merging live connectors, configuration, and discovered domain agents.

### `GET /logs`
Access the in-memory log ring buffer with filtering for levels and categories.

### `GET /deliberations`
Reasoning log stream for visualizing model cognitive cycles (Council/ReAct).

## Fleet Orchestration

### `POST /api/connector/launch/{name}`
Launches a specific connector via its `start.ps1` or `start.bat` script.

### `GET /api/connectors/{id}/tools`
Proxies the `/tools` endpoint of a running MCP connector.

## Agentic Interface

### `POST /hooks/command`
Inbound webhook for natural language commands (Email/Telegram/Discord).

### `POST /api/ask`
Direct interface to the orchestrator for single-model or Council-mediated queries.
