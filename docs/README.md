# robofang Documentation

This directory contains detailed technical specifications, architectural diagrams, and protocol definitions. The tree is intended to be broad and deep (MCP apps, robots, philosophy, embodied AI, research); see [DOCS_STRUCTURE_AND_RAG.md](DOCS_STRUCTURE_AND_RAG.md) for structure and RAG strategy.

## Contents
- **Connectors & fleet**: [connector_taxonomy.md](connector_taxonomy.md) — Connector status (REAL / NOT IMPLEMENTED / DEPRECATED). [MCP_SERVER_STARTUP.md](MCP_SERVER_STARTUP.md) — Launch and liveness.
- **Memory & RAG**: [MEMOPS_STATUS.md](MEMOPS_STATUS.md) — Memops / Common Memory Pool (advanced-memory, journal bridge). [RAG_AND_LANCEDB_STATUS.md](RAG_AND_LANCEDB_STATUS.md) — In-repo LanceDB vs Advanced Memory.
- **Architecture**: [COGNITIVE_ARCHITECTURE.md](COGNITIVE_ARCHITECTURE.md), [ROBOFANG_MCP_AND_ROADMAP.md](ROBOFANG_MCP_AND_ROADMAP.md).
- **Comms & onboarding**: [COMMAND_VIA_EMAIL_TELEGRAM.md](COMMAND_VIA_EMAIL_TELEGRAM.md), [ONBOARDING_AND_COMMS_CREDENTIALS.md](ONBOARDING_AND_COMMS_CREDENTIALS.md).
- **Safety / startup**: [SAFETY.md](SAFETY.md), [STARTUP_ASSESSMENT.md](STARTUP_ASSESSMENT.md), [BRIDGE_ANALYSIS.md](BRIDGE_ANALYSIS.md).
- **Tasks & speed**: [JUST.md](JUST.md) — just recipe runner. [SPEEDUPS.md](SPEEDUPS.md) — Python compilation, when to use Rust.
- **Apple / iOS**: [apple/README.md](apple/README.md) — iOS app plan and notes.
