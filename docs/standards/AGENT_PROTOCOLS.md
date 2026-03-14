---
agent_protocol: "follow_all_rules"
powershell_standard: "native_cmdlets_only"
title: "Agent Protocols - Mandatory Development Standards"
category: standard
status: active
audience: all
skill_candidate: true
last_updated: 2026-02-13
---

**Version**: 1.12
**Last Updated**: 2026-03-01
**Status**: SOTA Active

---

## ⚠️ CLAUDE DESKTOP ONLY: str_replace Tool is Broken for Windows Paths

**This section applies to Claude Desktop only. Antigravity and other IDEs are not affected.**

The built-in `str_replace` tool in Claude Desktop operates on the **Linux container backend**, NOT on the Windows filesystem (`C:\`, `D:\`). Using it on Windows paths silently fails or produces garbage results.

**Rule**: For ANY file edit on a Windows path, ALWAYS use `fileops:file_ops` with `edit_file`:

```python
fileops:file_ops(
    operation="edit_file",
    path="D:\\Dev\\repos\\myproject\\file.py",
    old_string="text to replace",
    new_string="replacement text"
)
```

**Never** use the built-in `str_replace` for Windows paths. It is only valid for Linux container paths (rare, specific use cases).

---

## 📋 POL Rule (Proof of Life)

**MANDATORY**: If you have read this AGENT_PROTOCOLS.md document, you MUST demonstrate proof of life by responding with "hi" (or similar greeting) when first engaging with a user or starting a new agent session.

**Purpose**: Ensures standards compliance and demonstrates that critical documentation has been reviewed.

---

## Purpose

This document defines the documentation standards for all MCP projects in the repository collection. Following these standards ensures:
- Consistent quality across all projects
- Easy discoverability and learning
- Professional presentation
- Community-ready documentation
- FastMCP 3.1+ compliance (SOTA requirement; dual transport stdio + HTTP — see MCP_SERVERS.md and FASTMCP3_UPGRADE_STRATEGY.md)
- Tool family modularization for complex servers
- Avatar-mcp integration for compositing workflows
- Unity-specific VRM integration patterns
- Modern MCPB packaging standards

### 🏗️ SOTA Compliance Requirements

To be considered **SOTA (State of the Art)**, an MCP server MUST meet the following requirements. These standards prioritize **discoverability, reliability, and behavioral integration** with AI agents.

### **The Three Pillars of SOTA Compliance**

1.  **Architecture**: Modular design using FastMCP 3.0+ (see FASTMCP3_UPGRADE_STRATEGY.md).
2.  **Behavior**: High-quality tool documentation and iterative sampling patterns.
3.  **Operations**: Complete lifecycle management (Lifespans) and correlation tracing.
4.  **Strategy**: Adherence to the [Container Orchestration Strategy](../patterns/CONTAINER_ORCHESTRATION_STRATEGY.md) (Docker Compose vs. K8s).
5.  **Networking**: MANDATORY port range **10700-10800** for all webapps. Frontend and Backend ports MUST be kept together (Adjacent Rule). See [Webapp Port Reservoir](../operations/WEBAPP_PORTS.md) for allocation registry.
6.  **Webapp Startup (MANDATORY)**: Every webapp MUST have: (1) **start.ps1** that clears the port from zombies/squatters before binding, then builds and runs; (2) **start.bat** for double-click launch.
7.  **Webapp Backend Substrate (MANDATORY)**: Every webapp MUST include a FastAPI-powered backend substrate (typically on port 10x60) that provides:
    - **Unified Gateway**: Bridges MCP SSE transport with custom REST/WebSocket endpoints.
    - **Health Monitoring**: Standardized `/api/v1/health` endpoint.
    - **Provider Transparency**: Standardized endpoints to list available AI/TTS providers (e.g., `/api/v1/voices`).
    - **CORS Compliance**: Pre-configured middleware for secure frontend-backend communication.
8.  **Webapp Interface Standards (Zero Runts)**: All webapps MUST follow the SOTA UI/UX blueprint (Dark mode, AppLayout). However, this is not a literal code copy of `calibre-mcp`. The webapp MUST dynamically analyze the host MCP server to build a powerful **Tools page** that supports:
    - **Portmanteau Analysis**: Drill-down views for composite tools.
    - **Dynamic Navigation**: "Apps Hub" must use real-time **Fleet Discovery** to populate navigation cards. Discovered apps MUST be cross-referenced with the `Projects` registry in `mcp-central-docs` to filter out junk/ghost processes.
    - **Local Intelligence**: MUST implement "Glom On" auto-discovery for local LLMs (Ollama/LM Studio).
    - **GPU Opportunity**: MUST detect high-end GPUs and suggest local LLM installation if missing.
    - **Rich Docstrings**: Pretty-printed rationales and examples.
    - **Self-Discovery**: Use of `GrokTools` (meta-mcp integration) for automated schema-aware UI generation.
9.  **Webapp Neural Audio Interface (MANDATORY)**: To enhance the "Synaptic Handshake" experience, all SOTA webapps MUST implement a procedural audio layer:
    - **Web Audio API**: MUST use the native Web Audio API for interactive feedback (no heavy MP3 assets for handshakes).
    - **Neural Jingle Pattern**: Handshakes should consist of high-performance, procedural sine/triangle/square wave sequences (e.g., `useNeuralJingle` pattern).
    - **Visual Sync**: Audio triggers MUST be synchronized with visual telemetry (soundwaves, neural pulses).
10. **Advanced Cognitive Mapping**: Experimental features like **Nano Banana** cognitive telemetry and **FTL Data Bus** monitoring MUST be clearly flagged and grouped under an "Experimental" or "Phase 5+" category.
---

## 🧠 Core Principles

### 1. Complete
- Document all features, not just the "main" ones
- No "TODO: document this" placeholders in public docs
- Cover basic to advanced usage

### 2. Clear
- Write for your target audience (users, developers, contributors)
- Use concrete examples, not abstract descriptions
- Progressive disclosure (simple first, advanced later)

### 3. Correct
- Keep docs synchronized with code
- Test all examples before committing
- Update docs when features change
- Specify version compatibility

### 4. Consistent
- Use standard structure across all repos
- Use same terminology throughout
- Apply same quality standards everywhere

### 5. Discoverable
- Good navigation and linking
- Clear table of contents for long docs
- Searchable content
- Proper headings hierarchy

### 6. Professional
- No rough drafts in public docs (use docs-private/)
- Proper grammar and spelling
- Good markdown formatting
- Appropriate tone

---

### 2.3. Config and Log Locations

**Standardized locations for agentic IDE configuration and diagnostic data on Windows:**

| IDE | Configuration Folder | MCP Config File | Log Folder |
| :--- | :--- | :--- | :--- |
| **Antigravity** | `%USERPROFILE%\.gemini\antigravity` | `mcp_config.json` | `%APPDATA%\Antigravity\logs` |
| **Claude Desktop** | `%APPDATA%\Claude` | `claude_desktop_config.json` | `%APPDATA%\Claude\logs` |
| **Windsurf** | `%APPDATA%\Windsurf` | `mcp_config.json` | `%APPDATA%\Windsurf\logs` |
| **Cursor** | `%APPDATA%\Cursor\User\globalStorage\cursor-storage` | `mcp_config.json` | `%APPDATA%\Cursor\logs` |
| **Zed** | `%APPDATA%\Zed` | `settings.json` | `%LOCALAPPDATA%\Zed\logs` |

### 2.4. Developmental Artifacts & Scratchpads (MANDATORY)

**To prevent clutter in configuration root directories, all temporary scripts, patches, and developmental artifacts MUST be placed in the `scratchpad` subdirectory.**

- **Antigravity Scratchpad**: `%USERPROFILE%\.gemini\antigravity\scratchpad\`
- **Protocol**: 
  - 🛑 **DO NOT** write scripts directly to `%USERPROFILE%\.gemini\antigravity\`
  - ✅ **DO** use the `scratchpad/` subdirectory for all `*.py` or `*.ps1` developmental tools.
  - ✅ **Cleanup**: Agents should delete their scratchpad files after successful execution unless the user explicitly requests to keep them.

> [!NOTE]
> `%APPDATA%` typically resolves to `C:\Users\<user>\AppData\Roaming`.
> `%LOCALAPPDATA%` typically resolves to `C:\Users\<user>\AppData\Local`.
> `%USERPROFILE%` typically resolves to `C:\Users\<user>`.

### 2.5. Orchestration & Reasoning Flows (v2.0 Dark Integration)

**All complex agentic missions MUST follow the v2.0 "Dark Integration" 3-phase flow for specialized orchestration:**

1.  **Phase 1: Enrich (The Foreman)**:
    - **Goal**: Transform raw user input into a high-fidelity technical specification.
    - **Agent Role**: High-intelligence reasoning agent (Foreman).
    - **Output**: Multi-artifact implementation plan or technical brief.
2.  **Phase 2: Execute (The Labor)**:
    - **Goal**: Perform the actual work (code edits, terminal commands, tool use).
    - **Agent Role**: Specialized ReAct loop agents.
    - **Output**: Modified system state (files, containers, services).
3.  **Phase 3: Audit (The Satisficer)**:
    - **Goal**: Post-execution verification against the Phase 1 specification.
    - **Agent Role**: Adversarial audit agent (Satisficer).
    - **Compliance**: Mission only marked "Complete" if it passes Satisficer verification.

**Reasoning Log (Forensics)**: Every orchestration mission MUST maintain a high-fidelity event log (Forensic Trace) exposed via a standard `/deliberations` endpoint for dashboard visualization.

> [!TIP]
> **Debugging Startup Issues**: Claude Desktop's Log Folder (`%APPDATA%\Claude\logs`) and **Cursor's Log Folder** (`%APPDATA%\Cursor\logs`) are the primary sources of truth for MCP server startup failures. If a server fails to appear in the UI, check these logs for `stderr` output or JSON-RPC handshake errors.

---

## FastMCP & Protocol Standards

### Version Requirements
```bash
# Minimum version for SOTA compliance — FastMCP 3.1 (dual transport standard)
fastmcp>=3.1,<4.0.0
```
**Latest Protocol Version**: `2025-11-25`  
**FastMCP Version**: 3.1+ (GA Feb 18 2026; dual transport stdio + HTTP is standard). See `standards/FASTMCP3_UPGRADE_STRATEGY.md` and `docs/MCP_SERVERS.md`.

### Essential File Structure
Standard project layout for all MCP servers:
```
mcp-server-name/
├── src/mcp_server_name/
│   ├── __init__.py
│   ├── server.py          # FastMCP server
│   ├── providers/        # FastMCP 3.0 Providers
│   └── transforms/       # FastMCP 3.0 Transforms
├── tests/
├── docs/
├── pyproject.toml        # fastmcp>=3.1
├── mcpb/                # Packaging config (v2)
└── README.md
```

---

## 🛠️ Tool Development Standards

### Tool Documentation Requirements

**All MCP servers MUST use FastMCP 3.0+ standards for SOTA compliance:**

- ✅ **FastMCP 3.0+** minimum version required
- ✅ **Context Injection (`ctx: Context`)**: Tool functions MUST accept `ctx` to enable correlation and sampling.
- ✅ **Correlation Tracing**: All operational logs MUST include a `correlation_id` (retrieved from `ctx.correlation_id`).
- ✅ **Iterative Sampling**: Built-in support for AI-guided iterative refinement (see `sample_logs` pattern).
- ✅ **Enhanced Response Patterns** for rich AI dialogue (Progressive, Clarification, Recovery, Rich Metadata)
- ✅ **Server Lifespan** management for stateful servers (Startup/Shutdown)
- ✅ **Persistent Storage** - Key-Value store persisting across OS reboots
- ✅ **Advanced Tool Management** (Transformations, Serialization, Duplicate Handling)
- ✅ **Dual transport (FastMCP 3.1 standard)**: One process MUST serve both stdio (for Cursor/Claude) and HTTP (for webapp/bridge). Use `run_stdio_async()` alongside your HTTP server (e.g. uvicorn) in the same event loop.
- ✅ **Transport**: `run_stdio_async()` for stdio; HTTP via FastAPI/uvicorn with `POST /tool` or mounted MCP endpoint.
- ✅ **Agentic workflow tools (SEP-1577, mandatory)**: Servers MUST implement at least one agentic workflow tool that uses **sampling** (FastMCP 3.1 `ctx.sample()` / "sampling with tools"). This enables the client to orchestrate multi-step or multi-tool workflows autonomously. Single-shot tools alone are not SOTA; complex operations MUST use sampling where appropriate.

**Fleet standard:** `docs/MCP_SERVERS.md` (FastMCP 3.1). **Upgrade path:** `standards/FASTMCP3_UPGRADE_STRATEGY.md`.

### 1. Docstring Standards

#### Portmanteau Pattern Rationale
**Every portmanteau tool MUST include a PORTMANTEAU PATTERN RATIONALE section** (2-3 lines maximum) at the very start of the docstring:

```python
PORTMANTEAU PATTERN RATIONALE:
Consolidates N related operations into single interface. Prevents tool explosion while maintaining
full functionality. Follows FastMCP 3.1+ best practices.
```

#### Args Section Formatting
**Note**: Use "Args" consistently. Each parameter MUST be on its own line with proper indentation and type hints:

```python
Args:
    action (Literal, required): The operation to perform. Must be one of: "list", "add", "remove".
        - "list": List all items (no other parameters required)
        - "add": Add new item (requires: name, type)
    device_id (str | None): Device identifier. Required for: add, remove operations.
```

### 2. Enhanced Response Patterns (Structured Returns)

**All SOTA tools MUST implement FastMCP 3.1+ enhanced response patterns** to enable rich dialogue:

| Pattern | Purpose | Key Content |
| :--- | :--- | :--- |
| **Progressive** | Multi-level detail | `available_types`, `recommendations`, `next_steps`, `follow_up_analyses` |
| **Clarification** | Ambiguity resolution | `status: clarification_needed`, `clarification_options`, `suggested_questions` |
| **Error Recovery**| Fail-fast with options | `recovery_options`, `diagnostic_info`, `alternative_solutions`, `workarounds` |
| **Rich Metadata** | Search/navigation | `pagination`, `search_metadata`, `refinement_suggestions`, `export_formats` |
| **Sampling** | AI Reasoning | `requires_sampling: true`, `sampling_intent`, `fallback_behavior` |

**Example (Contextual Error Recovery):**
```python
return {
    "success": False,
    "error": "Connection failed",
    "recovery_options": ["Retry (automatic)", "Check status", "Verify config"],
    "diagnostic_info": {"host_reachable": False, "port": 32400},
    "alternative_solutions": ["Use cached data", "Switch to backup"]
}
```

### 3. Prompt and Resource Registration

**FastMCP runtime prompts and resources must be registered during server initialization.**

#### Initialization Pattern
To prevent garbage collection of decorated functions, store references in the server class:

```python
def __init__(self):
    self._initialize_prompts_and_resources()

def _initialize_prompts_and_resources(self):
    @self.mcp.prompt()
    def my_prompt(): ...
    
    @self.mcp.resource("scheme://path")
    async def my_resource(): ...

    # Store references
    self._prompt_refs = [my_prompt]
    self._resource_refs = [my_resource]
```

### 4. Integration Verification Standards
- ✅ **The "10 0 0" Log Red Herring**: FastMCP logs may show 0 prompts/resources during startup due to timing; always verify in the client UI.
- ✅ **Status Tool Integration**: All servers must include a status tool that reports MCP capabilities (tools, prompts, resources count).


#### ❌ Prohibited Patterns
- **NO** `@mcp.tool(description="...")` decorators
- **NO** basic docstrings without comprehensive documentation
- **NO** incomplete parameter documentation
- **NO** missing return value documentation
- **NO DESTRUCTIVE DELETION**: You are generally not allowed to remove stuff you do not understand; request clarification instead.

### MCPB Packaging Standards

**All MCP servers MUST use MCPB packaging:**

#### Required Files
- `manifest.json` - MCPB manifest configuration
- `assets/` directory - Icons, screenshots, prompts
- `pyproject.toml` - Python project configuration
- `requirements.txt` - Runtime dependencies
- `storage/` directory - Local persistent data (if using FastMCP storage)

#### Manifest Requirements
```json
{
  "manifest_version": "0.2",
  "server": {
    "type": "python",
    "entry_point": "src/package_name/mcp_server.py",
    "mcp_config": {
      "command": "python",
      "args": ["-m", "package_name.mcp_server"]
    }
  }
}
```

### Portmanteau Pattern Standards

**For feature-rich MCP servers, use the Portmanteau Pattern:**

#### Benefits
- Prevents tool explosion (60+ tools → 10 portmanteau tools)
- Improves discoverability
- Better user experience
- Easier maintenance

#### Implementation
- Group related operations into single tools
- Use operation parameter to specify actions
- Provide comprehensive documentation for each operation
- Include usage examples for all operations

### Tool Family Modularization

**Complex MCP servers MUST use tool family modularization:**

#### Architecture Pattern
```
server.py
├── tools/
│   ├── __init__.py          # Clean exports
│   ├── motor_manager.py     # Motor control family
│   ├── path_manager.py      # Path movement family
│   ├── import_export.py     # Import/export family
│   └── vrm_avatar.py        # VRM integration family
```

#### Benefits
- Clean separation of concerns
- Easier maintenance and testing
- Better code organization
- Scalable architecture for complex servers

#### Implementation Standards
- Each tool family in separate `*_manager.py` file
- Manager classes with `register_tools()` method
- Clean imports via `tools/__init__.py`
- Tool families should be cohesive but allow overlap
- Unity-specific families can delegate to avatar-mcp for compositing

#### Example Structure
```python
# tools/motor_manager.py
class MotorManager:
    def register_tools(self):
        @self.app.tool
        async def api_start_motor(...):
            # Motor control logic

# server.py
from .tools import MotorToolManager
motor_mgr = MotorToolManager(self.app, self.motor_manager)
motor_mgr.register_tools()

---

## 🏗️ FastMCP 3.1+ Architectural Patterns

SOTA servers must choose between (or combine) two primary architectural patterns depending on task complexity.

### 1. The Compositing Pattern (Structural)
**Best for**: Modular features, multi-server environments.
- **Mechanism**: Small, atomic tools that are "composed" together by the agent.
- **Rule**: Tools should have zero side effects on other tools unless explicitly documented as a state change.
- **Requirement**: Must provide `import_id` or similar linkage if state is passed between tools.

### 2. The Cooperative Pattern (Behavioral)
**Best for**: Complex workflows, high-uncertainty tasks (e.g., recursive research).
- **Mechanism**: Tools that interactively guide the agent through a "dialogue" of operations.
- **Requirement**: Must use **Interactive Clarification** (Prompting for missing data) and **Progressive Disclosure** (Returning partial results with next steps).

### 3. Agentic workflow tools (SEP-1577, mandatory)
**SEP-1577** ("sampling with tools") is standard in FastMCP 3.1. All SOTA servers MUST expose at least one **agentic workflow tool** that uses sampling so the client LLM can orchestrate multi-step or multi-tool workflows autonomously.
- **Implementation**: Use `ctx.sample()` (or the FastMCP 3.1 sampling API) inside a tool to request the client to reason and call other tools before returning. The tool describes the intent; the client performs the sub-steps via sampling.
- **Requirement**: Complex operations (multi-step, conditional, or delegating to other tools) MUST use sampling where appropriate. Single-shot tools only do not satisfy SOTA.

---

## 🏎️ Advanced Response Patterns (SOTA)

### 1. Wait for AI Sampling
When an operation requires high-reasoning or multi-step verification, use the **Sampling Signal**.
- **Implementation**: Return a result indicating the tool has COMPLETED its phase and the agent should now **Review, Think, and Sample** before calling the next tool.
- **Metadata**: Include `requires_sampling: true` in structured output if applicable.

### 2. Interactive Clarification
Instead of failing when a parameter is missing, return a list of options or a clarifying question.
- **SOTA Format**: 
  ```json
  {
    "status": "clarification_needed",
    "message": "Multiple 'Steve's found. Which one did you mean?",
    "options": ["Steve (Brother)", "Steve Jobs (Research)"]
  }
  ```

### 3. Progressive Disclosure
For long-running or data-heavy tasks, return the first "chunk" and a tool to get more.
- **Requirement**: Always include a `next_token` or `page` parameter in search/read tools.

---

## 📦 FastMCP 3.1+ Specific Standards (SOTA)

### For Portmanteau Tools:
- **PORTMANTEAU PATTERN RATIONALE**: Every portmanteau tool MUST include this section in its description.
- **Consolidation Limit**: Do not exceed 15 operations per tool; split into "Sub-Portmanteaus" if necessary (e.g., `adn_content` vs `adn_navigation`).
- ✅ **REQUIRED**: Implement enhanced response patterns (Progressive, Clarification, Recovery, Rich Metadata).
- ✅ **REQUIRED**: **Dual transport (3.1 standard)**: One process serves stdio (Cursor/Claude) and HTTP (webapp/bridge). Run uvicorn (or other HTTP) in an asyncio task and `await mcp.run_stdio_async()` in the same event loop.
- ✅ **REQUIRED**: **Agentic workflow tools (SEP-1577)**: At least one tool MUST use sampling (`ctx.sample()` / FastMCP 3.1 sampling with tools) so the client can orchestrate multi-step workflows autonomously. Standard in FastMCP 3.1.
- ✅ **REQUIRED**: Implement `server_lifespan` for stateful servers.

#### SOTA Startup Pattern (FastMCP 3.1+ dual transport)

```python
# ✅ CORRECT - Dual transport: HTTP + stdio in one process
def main():
    import asyncio
    import uvicorn
    async def _run():
        config = uvicorn.Config(app, host=HOST, port=PORT, log_level="info")
        server = uvicorn.Server(config)
        http_task = asyncio.create_task(server.serve())
        try:
            await mcp.run_stdio_async()
        finally:
            http_task.cancel()
            try:
                await http_task
            except asyncio.CancelledError:
                pass
    asyncio.run(_run())

# ❌ WRONG - HTTP-only (no stdio for Cursor)
if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
```

#### Persistent Storage Pattern

```python
@mcp.tool()
async def access_knowledge(key: str) -> dict:
    """Access persistent cross-session knowledge."""
    data = await mcp.storage.get(key)
    return {"data": data}
```

4. ✅ Write comprehensive docstrings (200+ lines for complex tools)
5. ✅ Document ALL sub-operations in docstring
6. ✅ Provide examples for each operation
7. ✅ Check imports (no circular dependencies)
8. ✅ Run ruff before committing

**Fleet standard:** `docs/MCP_SERVERS.md`. **Upgrade:** `standards/FASTMCP3_UPGRADE_STRATEGY.md`.

---

## Unity VRM Integration Standards

**Unity-specific MCP servers MUST follow VRM integration patterns:**

### VRM Avatar Tool Family
- Unity-focused VRM import/export operations
- Unity project integration (rigging, materials, build pipeline)
- Delegation to avatar-mcp for advanced compositing
- Clean separation: Unity setup vs. avatar manipulation

### Avatar-MCP Integration Pattern
```python
# Unity VRM tools focus on Unity integration
async def import_vrm_to_unity(vrm_path, project_path):
    # Unity project setup, rigging, materials
    # Returns import_id for avatar-mcp integration

# Avatar-mcp handles advanced operations
async def integrate_with_avatarmcp(import_id, avatar_config):
    # Bone manipulation, facial rigging, compositing
    # OSC control, animation sync
```

### OSC Tool Organization Pattern

**For MCP servers handling OSC protocols:**

- **`osc-mcp` (Protocol Layer):** Generic OSC operations (send/receive messages, manage connections, protocol-level tools)
- **`vrchat-mcp` (Application Layer):** VRChat-specific OSC operations (avatar parameters, VRChat conventions, platform-specific mappings)
- **Domain MCPs (Orchestration Layer):** High-level orchestration (robotics-mcp coordinates both for specific use cases)

**Benefits:**
- Clean separation between protocol and application concerns
- Prevents tool duplication across servers
- Enables compositing without confusion
- Maintains specialization while allowing orchestration

### Benefits
- Unity-specific optimizations
- Seamless avatar-mcp compositing workflow
- Clean architectural separation
- Reusable across Unity-based MCP servers
- OSC protocol organization prevents duplication

---

## Avatar-MCP Compositing Patterns

**Complex avatar workflows MUST integrate with avatar-mcp:**

### Compositing Architecture
```
unity3d-mcp (Unity setup) → avatar-mcp (advanced manipulation)
robotics-mcp (orchestration) → avatar-mcp (character control)
vrchat-mcp (world integration) → avatar-mcp (avatar sync)
```

### Integration Standards
- Unity tools provide import_id for avatar-mcp tracking
- Avatar-mcp handles bone manipulation, facial rigging, animations
- Robotics MCP orchestrates avatar-mcp for character control
- Clean API boundaries between Unity setup and avatar compositing

### Required Integration Points
- OSC control setup for real-time avatar manipulation
- Bone mapping between Unity and avatar-mcp systems
- Blendshape synchronization for facial expressions
- Locomotion integration for character movement

---

## Code Quality Standards

**All Python code MUST follow strict quality standards for maintainability and consistency.**

### Ruff Linting and Formatting

**All Python MCP servers MUST use Ruff for linting and formatting:**

#### Required Setup

```toml
# pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "UP",  # pyupgrade
]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

#### Pre-Commit Checks

**Before committing, run:**

```powershell
# Lint and auto-fix
ruff check --fix .

# Format code
ruff format .
```

#### Code Style Requirements

**1. Type Annotations (Modern Syntax)**

```python
# ✅ CORRECT - Modern syntax
def get_models() -> dict[str, Any]:
    return {}

def find_path(app_id: str) -> str | None:
    return None

# ❌ WRONG - Deprecated syntax
def get_models() -> Dict[str, Any]:
    return {}

def find_path(app_id: str) -> Optional[str]:
    return None
```

**2. Exception Handling**

```python
# ✅ CORRECT - Exception chaining
try:
    result = await mcp_client.call_tool(...)
except Exception as e:
    logger.error(f"Error: {e}")
    raise HTTPException(status_code=500, detail=str(e)) from e

# ❌ WRONG - No exception chaining
try:
    result = await mcp_client.call_tool(...)
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

**3. Unused Variables**

```python
# ✅ CORRECT - Prefix unused variables with _
for _app_id, config in APP_CONFIGS.items():
    # app_id not used
    process_config(config)

# ❌ WRONG - Unused variable
for app_id, config in APP_CONFIGS.items():
    # app_id never used
    process_config(config)
```

**4. Blank Lines**

- No whitespace on blank lines
- Two blank lines between top-level definitions
- One blank line between methods

**5. Import Organization**

Ruff automatically sorts imports:
- Standard library imports first
- Third-party imports second
- Local imports last

### Common Ruff Errors and Fixes

| Error Code | Description | Fix |
|------------|-------------|-----|
| `UP006` | Use `dict` instead of `Dict` | Replace `Dict[str, Any]` with `dict[str, Any]` |
| `UP045` | Use `X \| None` instead of `Optional[X]` | Replace `Optional[str]` with `str \| None` |
| `B904` | Exception chaining required | Add `from e` to raise statements |
| `W293` | Blank line whitespace | Remove whitespace from blank lines |
| `I001` | Import sorting | Run `ruff check --fix` |
| `F841` | Unused variable | Remove or prefix with `_` |
| `B007` | Loop control variable not used | Prefix with `_` |

### TypeScript/JavaScript Standards

**For frontend code (React, Vue, etc.):**

- Use TypeScript for type safety
- Define interfaces for all API responses
- Avoid `any` - use `unknown` or proper types
- Use ESLint/Prettier for formatting
- Follow React/Vue best practices

### Code Review Checklist

**Before submitting code:**

- [ ] Python code passes `ruff check`
- [ ] Python code formatted with `ruff format`
- [ ] TypeScript types are correct
- [ ] Error handling is proper (exception chaining)
- [ ] No unused imports/variables
- [ ] Modern type annotations (`dict` not `Dict`, `X | None` not `Optional[X]`)
- [ ] All tests pass

### Reference Implementation

**Example:** `robotics-webapp` backend
- Repository: `https://github.com/sandraschi/robotics-webapp`
- Code Quality Guide: `docs/CODE_QUALITY.md`
- All Python code passes Ruff checks

---

## Browser Automation Testing Standards

### Cursor Browser Tools (CRITICAL for Web Development)

**When working on web applications, ALWAYS use Cursor's built-in browser automation tools instead of asking users to test manually.**

#### When to Use Browser Automation

**AUTOMATICALLY use browser tools when:**
- ✅ Testing web applications or debugging frontend issues
- ✅ Verifying fixes after making frontend changes
- ✅ Documenting working state with screenshots
- ✅ Checking console logs for JavaScript errors
- ✅ Interacting with UI elements (clicks, form fills, etc.)
- ✅ Validating API responses in the browser

**Only ask user to test manually if:**
- ❌ Authentication/login required
- ❌ Specific user state needed (session data, preferences)
- ❌ Browser tools cannot access the page
- ❌ External services or OAuth flows

#### Standard Testing Workflow

```javascript
// 1. Navigate to the page
browser_navigate("http://localhost:PORT")

// 2. Check console for errors
browser_console_messages()

// 3. Take snapshot to verify UI state
browser_snapshot()

// 4. Interact with elements if needed
browser_click(element, ref)
browser_type(element, ref, text)

// 5. Take screenshot for documentation
browser_take_screenshot(fullPage: true, filename: "feature-working.png")

// 6. Verify the fix worked before reporting to user
```

#### Available Browser Tools

**Navigation:**
- `browser_navigate(url)` - Navigate to URL
- `browser_navigate_back()` - Go back
- `browser_tabs(action)` - Manage tabs

**Inspection:**
- `browser_snapshot()` - Get page accessibility tree (better than screenshot for testing)
- `browser_take_screenshot()` - Visual screenshot
- `browser_console_messages()` - JavaScript console logs
- `browser_network_requests()` - Network activity

**Interaction:**
- `browser_click(element, ref)` - Click elements
- `browser_type(element, ref, text)` - Type into inputs
- `browser_hover(element, ref)` - Hover over elements
- `browser_select_option(element, ref, values)` - Select dropdown options
- `browser_fill_form(fields)` - Fill multiple form fields

**Utilities:**
- `browser_wait_for(time/text)` - Wait for conditions
- `browser_press_key(key)` - Press keyboard keys
- `browser_evaluate(function)` - Run JavaScript

#### Example: Document Viewer Fix

```javascript
// After fixing document viewer frontend:

// 1. Navigate and check initial state
await browser_navigate("http://localhost:5192");
const console_logs = await browser_console_messages();
// Verify no 404 errors in console

// 2. Take screenshot of initial state
await browser_take_screenshot({
  fullPage: true,
  filename: "document-viewer-loaded.png"
});

// 3. Interact with UI - expand folder
const snapshot = await browser_snapshot();
// Find chevron icon ref from snapshot
await browser_click("Chevron to expand docs folder", "e51");

// 4. Verify folder expanded
await browser_wait_for({time: 1});
const updated_snapshot = await browser_snapshot();
// Check for file list in snapshot

// 5. Click on file to load it
await browser_click("README.md file", "e274");

// 6. Verify document loaded
await browser_wait_for({time: 2});
const final_logs = await browser_console_messages();
// Check for successful load in logs

// 7. Take final screenshot
await browser_take_screenshot({
  fullPage: true,
  filename: "document-loaded-success.png"
});

// 8. Report success with evidence
```

#### Benefits

**For Developers:**
- ✅ Faster verification (no manual testing required)
- ✅ Automated documentation (screenshots as proof)
- ✅ Catch issues immediately
- ✅ Reproducible test cases

**For Users:**
- ✅ Fixes verified before deployment
- ✅ Visual proof that features work
- ✅ No need to interrupt workflow
- ✅ Higher quality deliverables

#### Best Practices

1. **Always verify before reporting:**
   - Don't just make changes and assume they work
   - Use browser tools to actually test the fix
   - Take screenshots as evidence

2. **Check console logs:**
   - JavaScript errors often show in console
   - Network requests reveal API issues
   - Use `browser_console_messages()` to catch problems

3. **Use snapshots for automation:**
   - `browser_snapshot()` gives accessible tree for clicking
   - Better than screenshots for finding elements
   - Use refs from snapshot for reliable element selection

4. **Document with screenshots:**
   - Take "before" and "after" screenshots
   - Show the working state
   - Help users understand what to expect

---

## PowerShell Script Error Handling Standards (MANDATORY FOR ALL SCRIPTS)

### ⚠️ CRITICAL: SOTA Error Handling Required for All PowerShell Scripts

**ABSOLUTE REQUIREMENTS:**
1. **NEVER fail silently** - All scripts MUST have comprehensive error handling
2. **NEVER exit without logging** - Every error must be logged with context
3. **NEVER crash on partial failures** - Implement graceful degradation
4. **ALWAYS provide actionable error messages** with paths, values, and solutions
5. **ALWAYS implement retry logic** for transient failures (network, file locks)
6. **ALWAYS validate prerequisites** before starting operations
7. **ALWAYS cleanup on failures** (remove partial files, close handles, etc.)

**Reference Implementation:** `sota-scripts/backup-system/backup-repo.ps1` demonstrates all SOTA patterns

### Required Error Handling Patterns

#### 1. Error Action Preference
```powershell
# Set at script start
$ErrorActionPreference = "Stop"
$PSDefaultParameterValues['*:ErrorAction'] = 'Stop'
```

#### 2. Error Logging Function
```powershell
function Write-ErrorLog {
    param(
        [string]$Message,
        [string]$Category = "Error",
        [Exception]$Exception = $null
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Category] $Message"
    if ($Exception) {
        $logEntry += "`n  Exception: $($Exception.GetType().FullName)"
        $logEntry += "`n  Message: $($Exception.Message)"
        $logEntry += "`n  StackTrace: $($Exception.StackTrace)"
    }
    $script:ErrorLog += $logEntry
    Write-Host $logEntry -ForegroundColor $(if ($Category -eq "Error") { "Red" } elseif ($Category -eq "Warning") { "Yellow" } else { "Gray" })
}
```

#### 3. Retry Logic with Exponential Backoff
```powershell
function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [string]$OperationName,
        [int]$MaxRetries = 3,
        [int]$InitialDelaySeconds = 2
    )
    
    $attempt = 0
    $delay = $InitialDelaySeconds
    
    while ($attempt -le $MaxRetries) {
        try {
            return & $ScriptBlock
        } catch {
            $attempt++
            if ($attempt -gt $MaxRetries) {
                Write-ErrorLog "Operation '$OperationName' failed after $MaxRetries retries" "Error" $_
                throw
            }
            
            Write-ErrorLog "Operation '$OperationName' failed (attempt $attempt/$MaxRetries). Retrying in $delay seconds..." "Warning" $_
            Start-Sleep -Seconds $delay
            $delay = [math]::Min($delay * 2, 60) # Exponential backoff, max 60 seconds
        }
    }
}
```

#### 4. Prerequisite Validation
```powershell
# Validate paths exist and are accessible
function Test-PathAccess {
    param(
        [string]$Path,
        [string]$Operation = "Write"
    )
    try {
        $parentPath = Split-Path $Path -Parent
        if (-not (Test-Path $parentPath)) {
            Write-ErrorLog "Parent directory does not exist: $parentPath" "Error"
            return $false
        }
        
        if ($Operation -eq "Write") {
            $testFile = Join-Path $parentPath ".test-$(Get-Random).tmp"
            try {
                New-Item -ItemType File -Path $testFile -Force | Out-Null
                Remove-Item $testFile -Force -ErrorAction SilentlyContinue
                return $true
            } catch {
                Write-ErrorLog "No write access to $parentPath`: $_" "Error" $_
                return $false
            }
        }
        return $true
    } catch {
        Write-ErrorLog "Failed to test path access for $Path`: $_" "Error" $_
        return $false
    }
}
```

#### 5. Resource Validation (Disk Space, etc.)
```powershell
function Test-DiskSpace {
    param(
        [string]$Path,
        [long]$RequiredBytes
    )
    try {
        $drive = (Get-Item $Path).PSDrive.Name
        $driveInfo = Get-PSDrive $drive -ErrorAction Stop
        $availableBytes = $driveInfo.Free
        
        if ($availableBytes -lt $RequiredBytes) {
            Write-ErrorLog "Insufficient disk space on $drive`: Available: $([math]::Round($availableBytes / 1MB, 2)) MB, Required: $([math]::Round($RequiredBytes / 1MB, 2)) MB" "Warning"
            return $false
        }
        return $true
    } catch {
        Write-ErrorLog "Failed to check disk space for $Path`: $_" "Warning" $_
        return $true # Assume OK if we can't check
    }
}
```

#### 6. Individual Operation Error Handling
```powershell
# Handle each operation independently - don't fail all if one fails
$successfulOperations = 0
$failedOperations = 0

foreach ($operation in $operations) {
    try {
        $result = Invoke-WithRetry -ScriptBlock {
            # Operation logic here
        } -OperationName $operation.Name -MaxRetries 3
        
        $successfulOperations++
        Write-Host "✅ $($operation.Name) completed successfully" -ForegroundColor Green
    } catch {
        $failedOperations++
        Write-ErrorLog "Failed to complete $($operation.Name)" "Error" $_
        Write-Host "❌ $($operation.Name) failed: $($_.Exception.Message)" -ForegroundColor Red
        # Continue with next operation instead of exiting
    }
}
```

#### 7. Cleanup on Failure
```powershell
$resource = $null
try {
    $resource = New-Resource
    # Use resource
} catch {
    Write-ErrorLog "Operation failed" "Error" $_
    # Always cleanup
    if ($resource) {
        try {
            $resource.Dispose()
        } catch {
            Write-ErrorLog "Failed to cleanup resource" "Warning" $_
        }
    }
    # Remove partial files
    if (Test-Path $partialFile) {
        Remove-Item $partialFile -Force -ErrorAction SilentlyContinue
    }
    throw
}
```

#### 8. Progress Reporting for Long Operations
```powershell
$totalItems = $items.Count
$processedItems = 0

foreach ($item in $items) {
    $processedItems++
    
    # Progress reporting for large operations
    if ($totalItems -gt 100 -and $processedItems % 100 -eq 0) {
        $percent = [math]::Round(($processedItems / $totalItems) * 100, 1)
        Write-Host "Progress: $percent% ($processedItems/$totalItems)" -ForegroundColor Gray
    }
    
    try {
        # Process item
    } catch {
        Write-ErrorLog "Failed to process item: $item" "Warning" $_
        # Continue with next item
    }
}
```

#### 9. Error Log Saving
```powershell
function Save-ErrorLog {
    param([string]$LogPath)
    try {
        $logContent = "Script Error Log`n"
        $logContent += "================`n"
        $logContent += "Start Time: $($script:StartTime)`n"
        $logContent += "End Time: $(Get-Date)`n"
        $logContent += "Duration: $((Get-Date) - $script:StartTime)`n"
        $logContent += "`nErrors:`n"
        $logContent += ($script:ErrorLog -join "`n`n")
        
        $logContent | Out-File -FilePath $LogPath -Encoding UTF8 -ErrorAction Stop
        Write-Host "`n📝 Error log saved to: $LogPath" -ForegroundColor Cyan
    } catch {
        Write-Host "⚠️  Failed to save error log: $_" -ForegroundColor Yellow
    }
}

# Save log if errors occurred
if ($script:ErrorLog.Count -gt 0) {
    $logPath = Join-Path $env:TEMP "script-error-log-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').txt"
    Save-ErrorLog -LogPath $logPath
}
```

#### 10. Proper Exit Codes
```powershell
# Exit with appropriate code based on results
if ($successfulOperations -eq 0) {
    Write-Host "❌ All operations failed!" -ForegroundColor Red
    exit 1
} elseif ($failedOperations -gt 0) {
    Write-Host "⚠️  Some operations failed, but $successfulOperations succeeded" -ForegroundColor Yellow
    exit 0  # Partial success is still success
} else {
    Write-Host "✅ All operations completed successfully!" -ForegroundColor Green
    exit 0
}
```

### Required Script Structure

```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script description
    
.DESCRIPTION
    Detailed description with error handling features
    
.PARAMETER MaxRetries
    Maximum retry attempts (default: 3)
#>

[CmdletBinding()]
param(
    [int]$MaxRetries = 3
)

# Set error action preference
$ErrorActionPreference = "Stop"
$PSDefaultParameterValues['*:ErrorAction'] = 'Stop'

# Initialize error tracking
$script:ErrorLog = @()
$script:StartTime = Get-Date

#region Helper Functions
# Error logging, retry logic, validation functions here
#endregion

#region Main Script
try {
    # Validate prerequisites
    # Perform operations with individual error handling
    # Save error log if needed
    # Exit with appropriate code
} catch {
    Write-ErrorLog "Fatal error in main script" "Error" $_
    exit 1
}
#endregion
```

### Error Handling Checklist

When creating or modifying PowerShell scripts, ensure:
- ✅ Error action preference set to "Stop"
- ✅ Error logging function implemented
- ✅ Retry logic for transient failures
- ✅ Prerequisite validation (paths, permissions, disk space)
- ✅ Individual error handling per operation (graceful degradation)
- ✅ Cleanup on failures (dispose resources, remove partial files)
- ✅ Progress reporting for long operations
- ✅ Error log saved if errors occur
- ✅ Proper exit codes (0 = success, 1 = failure)
- ✅ All exceptions caught and logged
- ✅ No silent failures

### Why This Matters
- **Production reliability**: Scripts don't crash unexpectedly
- **Easier debugging**: Full error context in logs
- **Better user experience**: Clear error messages and partial success handling
- **Operational resilience**: Retries handle transient failures
- **Professional quality**: SOTA error handling matches enterprise standards

---

## 🛡️ Infrastructure Reliability & Disaster Recovery (SOTA)

### 1. High-Availability Docker Guidelines
For mission-critical MCP integrations (Home Security, MyAI, Production Scrapers), Docker Desktop on Windows is considered a **Tier-2 host** due to Named Pipe and `vpnkit` instability.

#### The "Docker Zombie" Disaster Recovery (Magic Bullet) 🪄
If `docker ps` hangs or connectivity to containers (e.g., ports 7333, 7777) fails despite containers being listed as "Running", **do not restart the host PC**. Use the force-kill triplet:

```powershell
# SOTA Force-Reset Procedure
taskkill /F /IM "Docker Desktop.exe" /T
taskkill /F /IM "vpnkit.exe" /T
taskkill /F /IM "com.docker.backend.exe" /T
```

#### Reliability Hardening for Edge Servers (Mini-PCs)
When using low-power Windows 11 hosts (e.g., Osaka Failover server):
- ✅ **Disable Fast Startup**: Essential to prevent WSL2 clock-skew and network bridge corruption.
- ✅ **Exclusive Antivirus Rules**: Exclude `%LOCALAPPDATA%\Docker\wsl` to prevent disk I/O deadlocks.
- ✅ **Tailscale Coordination**: Be aware that VPN interface changes can trigger `vpnkit` failures; always verify Docker stability after Tailscale reconnects.

### 2. Monitoring & Health Check Standards
- **Health Checks**: Every `docker-compose.yml` MUST include health checks for databases (Postgres/Redis) to prevent app startup before dependencies are ready.
- **Failover Verification**: When deploying failover servers, verify that internal service ports (e.g., 7334) match documented standards across both main and backup nodes.

---

## Cursor v2 Multi-Workspace Shell Rule

### Problem

When working in multi-workspace setups (multiple repos in one Cursor window), the terminal does not auto-switch context when the agent starts working on a different repo.

### Rule

**Add to `.cursorrules` or Cursor User Rules:**

```markdown
# Shell Context Rule for Multi-Workspace
When switching to work on a different repo in a multi-workspace setup:
1. Start a fresh shell (don't reuse existing terminals from other repos)
2. Always cd to the target repo root as the first command
3. Verify Get-Location shows correct directory before running other commands
```

### Reference

Full documentation: `cursorrules/cursor-v2-shell-context-rule.md`

---

## Integration Definition

### What is an "Integration"?

**An "Integration" is an application or service that we control via MCP servers.**

This includes:
- **Media Applications**: Plex, Calibre, Immich
- **Creative Software**: Blender, GIMP, Unity 3D, VRChat, Reaper
- **Development Tools**: Notepad++, Typora
- **System Tools**: HandBrake, Virtual DJ, rTorrent
- **Infrastructure**: Tailscale, virtualization platforms
- **Any application** that can be automated and controlled programmatically

### What is NOT an Integration?

- **Development Tools**: Ruff, Semgrep, Mypy (these are development tools, not integrations)
- **Build Tools**: UV, pip, npm (these are build/packaging tools)
- **Testing Tools**: pytest, coverage (these are testing tools)
- **CI/CD Tools**: GitHub Actions, Docker (these are deployment tools)

### Integration Documentation Standards

All integration MCP servers must document:
- **Application Overview**: What the application does
- **MCP Server Purpose**: How the MCP server controls the application
- **Installation Requirements**: Prerequisites and setup
- **Configuration**: Environment variables and settings
- **Tool Documentation**: Complete API reference for all tools
- **Usage Examples**: Practical examples of common tasks
- **Troubleshooting**: Common issues and solutions

---

## Required Documentation Files

### Every MCP Repository MUST Have:

**1. README.md** (Root)
```markdown
# Project Name

Brief 1-2 sentence description.

## Features
- Key feature 1
- Key feature 2
- Key feature 3

## Installation
[Step-by-step instructions]

## Quick Start
[Copy-paste example]

## Documentation
- [Integration Guide](integration-guide.md)
- [Architecture](architecture.md)
- [API Reference](tools-reference.md)

## License
[License info]
```

**2. CHANGELOG.md** (Root)
```markdown
# Changelog

## [Version] - YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
```

**3. LICENSE** (Root)
- Choose appropriate license (MIT, Apache, etc.)

**4. docs/** (Directory)
- Organized documentation
- Clear structure by topic

---

## MCP Server Documentation Structure

### For FastMCP 3.1+ Servers (SOTA):

```
repo-name/
├── README.md (overview, quick start)
├── CHANGELOG.md (version history)
├── LICENSE
├── docs/
│   ├── integration-guide.md (Claude Desktop setup)
│   ├── architecture.md (system design)
│   ├── tools-reference.md (complete tool list)
│   ├── configuration.md (settings, env vars)
│   ├── troubleshooting.md (common issues)
│   └── examples/ (working examples)
└── docs-private/ (internal dev notes - git-ignored)
```

### Additional for Portmanteau Servers:

```
docs/
├── portmanteau-pattern/ (if using pattern)
│   ├── CONCEPT.md (what it is)
│   ├── TOOL_MODE_CONFIGURATION.md (switching modes)
│   └── WHAT_CLAUDE_SEES.md (discoverability)
```

---

## Documentation Templates

### README.md Template

```markdown
# {Project Name}

{1-2 sentence description of what it does}

## ✨ Features

- {Key feature 1}
- {Key feature 2}
- {Key feature 3}

## 📦 Installation

### Prerequisites
- {Requirement 1}
- {Requirement 2}

### Install via {package manager}
\`\`\`bash
{installation commands}
\`\`\`

## 🚀 Quick Start

\`\`\`json
{
  "mcpServers": {
    "{server-name}": {
      "command": "{command}",
      "args": ["{args}"]
    }
  }
}
\`\`\`

## 📚 Documentation

- [Integration Guide](integration-guide.md) - Setup with Claude Desktop
- [Architecture](architecture.md) - How it works
- [Tool Reference](tools-reference.md) - Complete API
- [Examples](examples/) - Working examples

## 🔧 Configuration

{Brief config info, link to docs/configuration.md}

## 🤝 Contributing

{Link to CONTRIBUTING.md or brief guidelines}

## 📄 License

{License info}

---

**Status:** {Production/Beta/Alpha}  
**MCP Version:** FastMCP {version}  
**Maintained by:** {Name}
```

---

## Integration Guide Template

**docs/integration-guide.md:**

```markdown
# Integration Guide - {Project Name}

## Claude Desktop Setup

### 1. Installation

{Installation steps}

### 2. Configuration

Edit your Claude Desktop config:

\`\`\`json
{
  "mcpServers": {
    "{server-name}": {
      "command": "{command}",
      "args": ["{args}"],
      "env": {
        "{ENV_VAR}": "{value}"
      }
    }
  }
}
\`\`\`

### 3. Verification

Restart Claude Desktop and ask:
"{test query}"

Expected response: {what to expect}

## First Steps

### Basic Operations

{3-5 common operations with examples}

### Common Use Cases

{3-5 use case scenarios}

## Troubleshooting

{Common issues and solutions}
```

---

## Architecture Documentation Template

**docs/architecture.md:**

```markdown
# Architecture - {Project Name}

## Overview

{System overview diagram or description}

## Components

### {Component 1}
- **Purpose:** {what it does}
- **Dependencies:** {what it needs}
- **Key Files:** {relevant files}

### {Component 2}
...

## Tool Organization

{How tools are organized, if portmanteau explain that}

## Data Flow

{How data flows through the system}

## Extension Points

{How to extend or customize}

## Dependencies

{Key dependencies and why}
```

---

## Tool Reference Template

**docs/tools-reference.md:**

```markdown
# Tool Reference - {Project Name}

## Tool List

### {tool_name}

**Description:** {what it does}

**Parameters:**
- `param1` (type, required/optional): {description}
- `param2` (type, required/optional): {description}

**Returns:**
\`\`\`json
{
  "success": true,
  "result": {example}
}
\`\`\`

**Example:**
\`\`\`python
result = await tool_name(param1="value")
\`\`\`

**Notes:**
- {Important note 1}
- {Important note 2}

---

{Repeat for each tool}
```

---

## 🎨 Tool Documentation Standards

### 1. Argument Formatting (SOTA)
All tools must document arguments using the following template to maintain consistency across the ecosystem.

**Template**:
```python
Args:
    operation: The operation to perform (action1, action2) - REQUIRED
    identifier: Unique identifier for the object - REQUIRED for [actions]
    content: Data to process - REQUIRED for write/edit
    tags: Categorization tags (comma-separated or list) - OPTIONAL
    page: Pagination page (default: 1)
```

### 2. The Portmanteau Pattern (SOTA)
To prevent "Tool Explosion", tools with related functionality MUST be consolidated into a single "Portmanteau" tool.

**Rules for Portmanteaus**:
- **Consolidation**: Group by entity (e.g., `adn_content` for all content CRUD).
- **Rationale**: Must include a `PORTMANTEAU PATTERN RATIONALE` block in the docstring explaining why these tasks are grouped.
- **Detailed Docstrings**: SOTA portmanteaus often require 100-200+ lines of documentation to explain all sub-operations, examples, and error states.

### 3. Return Value Standards
- Always return a JSON-encodable dictionary.
- Include a `success` boolean.
- Provide actionable `suggestions` on failure.

---

## 🛡️ Stability and Lifecycle (SOTA)

### 1. Lifespans
SOTA servers must use `@mcp.lifespan()` to manage connection pools and background tasks.

### 2. Resource Persistence
Avoid in-memory only state for critical data. Use SQLite or file-backed storage to ensure persistence across server restarts.

### Before Marking Docs as "Complete":

**README.md:**
- [ ] Clear 1-2 sentence description
- [ ] Features list
- [ ] Installation instructions work (tested!)
- [ ] Quick start example works (tested!)
- [ ] Links to detailed docs
- [ ] License info

**CHANGELOG.md:**
- [ ] Exists
- [ ] Last 3+ versions documented
- [ ] Follows semantic versioning

**docs/integration-guide.md:**
- [ ] Claude Desktop config shown
- [ ] First steps clear
- [ ] Common operations documented
- [ ] Troubleshooting section

**docs/architecture.md:**
- [ ] Components explained
- [ ] Data flow clear
- [ ] Dependencies listed

**docs/tools-reference.md:**
- [ ] All tools documented
- [ ] Parameters explained
- [ ] Return values shown
- [ ] Examples provided

**General:**
- [ ] No TODOs in public docs
- [ ] All examples tested
- [ ] Links work
- [ ] Grammar/spelling checked
- [ ] Formatted properly
- [ ] Up-to-date with code

**FastMCP 3.1+ Compliance:**
- [ ] PORTMANTEAU PATTERN RATIONALE included in portmanteau tools
- [ ] Args section uses standard formatting with type hints
- [ ] Enhanced Response Patterns implemented (Progressive/Clarification/Recovery)
- [ ] Prompts and Resources registered via decorators
- [ ] Prompt/Resource references stored to prevent garbage collection
- [ ] **Prompt Garbage Collection**: Store references to `@mcp.prompt()` and `@mcp.resource()` functions in a list (e.g., `self._prompt_refs`) to prevent them from being garbage collected in long-running processes.
- [ ] Status tool reports prompt and resource counts
- [ ] Examples provided for all structured return types

---

## 4. Docstring Construction Rules (SOTA)

Every SOTA MCP tool MUST follow the "Gold Standard" docstring structure. This ensures that AI assistants can understand complex portmanteau tools without calling them.

### 4.1. Structural Components (Order of Appearance)

1.  **Title/Summary**: A single-line description of the tool.
2.  **Portmanteau Pattern Rationale**: (Mandatory for Portmanteaus) A 3-line block explaining why the tool is consolidated.
3.  **Supported Operations**: A high-level bulleted list of operations.
4.  **Operations Detail**: A categorized breakdown of groups (e.g., CRUD, Search, Config) and what each action does.
5.  **Prerequisites/Features**: (Optional) Hardware or OS requirements.
6.  **Args**: The parameter definition block.
7.  **Returns**: Description of the standard return structure.
8.  **Examples**: Minimal working code snippets.
9.  **Errors**: Common error codes and solutions.

### 4.2. Portmanteau Rationale Template
```python
PORTMANTEAU PATTERN RATIONALE:
Instead of creating N separate tools (one per operation), this tool consolidates related
operations into a single interface. Prevents tool explosion (N tools -> 1 tool) while maintaining
full functionality and improving discoverability. Follows FastMCP 3.1+ SOTA standards.
```

### 4.3. Args Section Formatting
The `Args` section is the "Schema Bridge." It must be formatted precisely:
- **One parameter per line**: No exceptions.
- **Explicit Type Hints**: Must match the code (e.g., `(str | None)`, `(list[str])`).
- **Required/Optional**: Explicitly state if a parameter is required for specific operations.
- **Operation Context**: State which operations use the parameter (e.g., `Required for: create, delete`).
- **Nested Keys (Dicts)**: If a parameter is a dict, document the required keys.

**Example**:
```python
Args:
    operation (Literal, required): The operation to perform. Must be one of: "list", "add", "remove".
        - "list": List all items (no other parameters required)
        - "add": Add new item (requires: name, payload)
        
    name (str | None): Target item name. Required for: add, remove operations.
    
    payload (dict | None): Data object. Required for: add. 
        Must contain: "id" (int), "metadata" (dict).
```

### 4.4. The Return Rule
**All tools MUST return a value that can be represented as a string**. 
- Never return raw Pydantic models or complex objects directly to the MCP protocol.
- SOTA servers return a standard dictionary with `success`, `action`, `result`, and `error` keys, which FastMCP then serializes.
- If an underlying library returns an object, format it as a Markdown string before returning.

---

## 5. Packaging Standards (MCPB & Glama)

Proper packaging ensures that your MCP server is detectable, installable, and provides a SOTA experience in high-end clients like Claude Desktop and Glama.ai.

### 5.1. MCPB (Claude Desktop Exclusive)
The `.mcpb` format is the **Official Standard** for Claude Desktop. It allows for seamless drag-and-drop installation.

> [!CAUTION]
> **FORBIDDEN**: Never use `mcpb init` or `mcpb create`. 
> These commands generate non-standard, often broken manifest structures. Manually configure your project structure to ensure SOTA compliance.

#### **Package Requirements**
1.  **Self-Contained Source**: All Python source code must be included in `src/`.
2.  **No dependencies**: MCPB packages must NOT bundle external libraries.
3.  **Required Assets**:
    - `assets/icon.png`: 256x256px identifying icon.
    - `assets/prompts/`: Detailed instruction set (See SOTA Prompting).

### 5.2. SOTA Prompt Template Requirements (3-4-100 Rule)
A SOTA MCPB package is defined by its prompts. These are read by the client to understand when and how to invoke your tools.

| File | Requirement | Purpose |
| :--- | :--- | :--- |
| `system.md` | **3,000+ words** | Core capabilities, usage patterns, and error behavior. |
| `user.md` | **4,000+ words** | Natural language use cases, tutorials, and workflows. |
| `examples.json` | **100+ Structured Examples** | Precise tool call mappings for zero-shot accuracy. |

### 5.3. Glama Integration (`glama.json`)
While `manifest.json` handles Claude Desktop, `glama.json` is the **Discovery Marker** for the Glama.ai ecosystem.

- **Storage**: Place in the repository root (git-tracked).
- **Packaging**: **EXCLUDE** `glama.json` from the `.mcpb` build. It is for repository discovery, not the local bundle.
- **Function**: Enables automatic indexing in the Glama MCP registry and legitimacy verification.

### 5.4. LobeHub Integration (Marketplace & Discovery)
LobeHub (LobeChat) uses a discovery pattern based on well-known URI endpoints and marketplace metadata.

- **Discovery Endpoint**: SOTA servers should expose their machine-readable manifest at `/.well-known/mcp/manifest.json`.
- **Marketplace Metadata**: When submitting to the LobeHub Marketplace, ensure the following fields are defined in your registry entry:
    - `identifier`: A unique, stable ID for the server.
    - `meta.avatar`: A high-quality identifying icon or emoji.
    - `meta.tags`: Minimum of 3 descriptive tags for discovery.
- **Protocol Adherence**: LobeHub strictly enforces JSON-RPC 2.0 standards. Ensure all responses strictly follow the `Content-Type: application/json` header.

---

## 6. Security & Isolation

## 7. Documentation Standards (Public vs Private)

### 7.1. docs/ (Public - on GitHub)
**Include:**
- User-facing documentation
- Architecture and design
- Integration guides
- API reference
- Polished, professional content

### 7.2. docs-private/ (Private - git-ignored)
**Include:**
- Progress reports
- Debug notes
- Bloopers and mistakes
- Scratch work
- Internal planning
- WIP documentation

**Rule:** If it's rough or just for you → docs-private/  
If it helps others → polish and put in docs/

---

## 8. Maintenance

### Documentation is NOT "done once"

**When adding features:**
- [ ] Update relevant docs
- [ ] Add examples
- [ ] Update CHANGELOG

**When fixing bugs:**
- [ ] Update docs if behavior changed
- [ ] Add to troubleshooting if common issue

**Regular reviews (monthly):**
- [ ] Check all examples still work
- [ ] Update for version changes
- [ ] Fix broken links
- [ ] Improve clarity based on questions

---

## 9. Success Criteria

**Good Documentation (7-8/10):**
- All required files present
- Installation and quick start work
- Main features documented
- Examples provided

**Excellent Documentation (9-10/10):**
- Comprehensive coverage
- Multiple examples per feature
- Architecture explained
- Troubleshooting guide
- Contributes to community
- Used as reference by others

---

## 10. Code Quality & Formatting (SOTA Standards)

To maintain peer technical contributor status, all code must adhere to strict linting and formatting standards. This prevents "code rot" and ensures that logic is never simplified by destruction.

### 10.1. Python (Ruff)
Ruff is used for both linting and formatting. It is significantly faster than Flake8/Black and provides superior error detection.

```toml
# pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "UP",  # pyupgrade
]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

#### Pre-Commit Checks

**Before committing, run:**

```powershell
# Lint and auto-fix
ruff check --fix .

# Format code
ruff format .
```

#### Code Style Requirements

**1. Type Annotations (Modern Syntax)**

```python
# ✅ CORRECT - Modern syntax
def get_models() -> dict[str, Any]:
    return {}

def find_path(app_id: str) -> str | None:
    return None

# ❌ WRONG - Deprecated syntax
def get_models() -> Dict[str, Any]:
    return {}

def find_path(app_id: str) -> Optional[str]:
    return None
```

**2. Exception Handling**

```python
# ✅ CORRECT - Exception chaining
try:
    result = await mcp_client.call_tool(...)
except Exception as e:
    logger.error(f"Error: {e}")
    raise HTTPException(status_code=500, detail=str(e)) from e

# ❌ WRONG - No exception chaining
try:
    result = await mcp_client.call_tool(...)
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

**3. Unused Variables**

```python
# ✅ CORRECT - Prefix unused variables with _
for _app_id, config in APP_CONFIGS.items():
    # app_id not used
    process_config(config)

# ❌ WRONG - Unused variable
for app_id, config in APP_CONFIGS.items():
    # app_id never used
    process_config(config)
```

**4. Blank Lines**

- No whitespace on blank lines
- Two blank lines between top-level definitions
- One blank line between methods

**5. Import Organization**

Ruff automatically sorts imports:
- Standard library imports first
- Third-party imports second
- Local imports last

### Common Ruff Errors and Fixes

| Error Code | Description | Fix |
|------------|-------------|-----|
| `UP006` | Use `dict` instead of `Dict` | Replace `Dict[str, Any]` with `dict[str, Any]` |
| `UP045` | Use `X \| None` instead of `Optional[X]` | Replace `Optional[str]` with `str \| None` |
| `B904` | Exception chaining required | Add `from e` to raise statements |
| `W293` | Blank line whitespace | Remove whitespace from blank lines |
| `I001` | Import sorting | Run `ruff check --fix` |
| `F841` | Unused variable | Remove or prefix with `_` |
| `B007` | Loop control variable not used | Prefix with `_` |

### TypeScript/JavaScript Standards

**For frontend code (React, Vue, etc.):**

- Use TypeScript for type safety
- Define interfaces for all API responses
- Avoid `any` - use `unknown` or proper types
- Use ESLint/Prettier for formatting
- Follow React/Vue best practices

### Code Review Checklist

**Before submitting code:**

- [ ] Python code passes `ruff check`
- [ ] Python code formatted with `ruff format`
- [ ] TypeScript types are correct
- [ ] Error handling is proper (exception chaining)
- [ ] No unused imports/variables
- [ ] Modern type annotations (`dict` not `Dict`, `X | None` not `Optional[X]`)
- [ ] All tests pass

### Reference Implementation

**Example:** `robotics-webapp` backend
- Repository: `https://github.com/sandraschi/robotics-webapp`
- Code Quality Guide: `docs/CODE_QUALITY.md`
- All Python code passes Ruff checks

---

## 11. SOTA Installation & Deployment Patterns (2025/2026)

To maintain friction-less operation and technical integrity, all MCP servers must support at least one "Zero-Install" pattern and one "Developer" pattern.

### 11.1. Zero-Install Patterns (Tool Execution)

The preferred method for running MCP servers without manual dependency management or local cloning.

#### Python: `uvx` (The Gold Standard)
`uv` is the mandatory tool for Python-based MCP servers. Use `uvx` for one-off execution.

```powershell
# SOTA command for running a server
uvx mcp-server-git --repository D:/Dev/repos/my-repo
```

#### Node.js: `npx`
For TypeScript/JavaScript servers, use `npx` with auto-confirm.

```powershell
# SOTA command for running a Node server
npx -y @modelcontextprotocol/server-everything
```

### 11.2. Claude Desktop Integration (MCPB)

For users on the official Claude Desktop client, the **MCPB (.mcpb)** format is the required packaging standard as defined in Section 5.

- **Installation**: Drag-and-drop the `.mcpb` file into the Claude Desktop interface.
- **Manual Config**: Editing `claude_desktop_config.json` is considered a legacy fallback for complex environments.

### 11.3. Developer Deployment (The "Clone & Connect" Pattern)

For local development or custom modifications, the repository-based approach is used.

1. **Clone**: `git clone <repo_url> D:/Dev/repos/<server-name>`
2. **Setup**: Use `uv sync` (Python) or `npm install` (Node).
3. **Register**: Add the absolute path to the server executable in the MCP client configuration.

### 11.4. Auto-Discovery & Cloud Deployment

- **Glama**: Servers should be registered with Glama for directory-based discovery.
- **LobeHub**: Ensure the `/.well-known/mcp/manifest.json` is accessible for the "Add by URL" pattern.
- **Docker**: Containerization is required for cloud-scale deployments to ensure substrate consistency.

---

**Version History**:
- 1.5 (2026-01-01): Comprehensive SOTA v12.0 Update (Sampling, Structural Compositing, MCPB/Glama Standards, Renumbering)
- 1.4 (2025-12-29): Added Code Quality Standards (Ruff linting/formatting)
- 1.3 (2025-12-11): Added Tool Family Modularization, Unity VRM Integration, Avatar-MCP Compositing Standards
- 1.2 (2025-01-XX): Added PowerShell Script Error Handling Standards (SOTA)
- 1.1 (2025-11-04): Added Browser Automation Testing Standards
- 1.0 (2025-10-21): Initial standards based on virtualization-mcp

**Review Schedule:** Quarterly

**Owner:** Sandra Schi

