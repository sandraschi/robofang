# VRChat MCP

**By FlowEngineer sandraschi**

A FastMCP 2.12+ implementation for controlling VRChat avatars and assets via OSC protocol. **Designed primarily for Claude Desktop integration** - allows you to control VRChat using natural language commands. Also provides FastAPI HTTP API for web access.

## GitHub Topics

[![Claude Desktop](https://img.shields.io/badge/Claude-Desktop-orange)](https://docs.anthropic.com/claude/docs/desktop)
[![MCP Server](https://img.shields.io/badge/MCP-Server-blue)](https://modelcontextprotocol.io/)
[![FastMCP](https://img.shields.io/badge/FastMCP-2.12+-green)](https://github.com/jlowin/fastmcp)
[![VRChat](https://img.shields.io/badge/VRChat-Integration-purple)](https://docs.vrchat.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://python.org)

**Topics:** `mcp-server` `fastmcp` `claude-desktop` `vrchat` `python` `osc` `avatar-control` `plugin-system` `production-ready`

## Claude Desktop Quick Start

The easiest way to use VRChat MCP is through Claude Desktop:

### 1. Install the MCP Server
```bash
# Install from PyPI (when published)
pip install vrchat-mcp

# Or install from source
git clone https://github.com/sandraschi/vrchat-mcp.git
cd vrchat-mcp
uv pip install -e .
```

### 2. Configure Claude Desktop
Add this to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vrchat": {
      "command": "vrchat-mcp",
      "args": ["--mode", "mcp"]
    }
  }
}
```

### 3. Restart Claude Desktop
Restart Claude Desktop to load the new MCP server.

### 4. Start Controlling VRChat
In Claude Desktop, you can now use natural language commands like:
- "Load avatar with ID abc123"
- "Set the happy parameter to 0.8"
- "Send OSC message to /avatar/parameters/CustomParam with value 1.0"
- "Check VRChat connection status"

## Table of Contents
- [Claude Desktop Quick Start](#claude-desktop-quick-start)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Plugin Development](#plugin-development)
  - [Creating a Basic Plugin](#creating-a-basic-plugin)
  - [Using the @tool Decorator](#using-the-tool-decorator)
  - [Using the @event_listener Decorator](#using-the-event_listener-decorator)
  - [Best Practices](#best-practices)
- [VRChat Setup](#vrchat-setup)
- [Packaging & Distribution](#-packaging--distribution)
- [Development](#development)
- [License](#license)

## Features

- **✅ FastMCP 2.12+ Compatible** - Dual interface support (MCP stdio + FastAPI HTTP)
- **✅ Plugin System** - Extensible architecture with decorator-based tool registration
- **✅ OSC Integration** - Bidirectional communication with VRChat using Open Sound Control
- **✅ Avatar Control** - Basic parameter management for VRChat avatars
- **✅ Parameter Indexing** - Fast lookup of avatar parameters and OSC endpoints
- **✅ Help System** - Built-in documentation for all registered tools
- **✅ Modular Architecture** - Clean tool organization in category subdirectories
- **✅ Production Testing** - Comprehensive unit, integration, and API testing

## Planned Features

- **🔄 Intelligent NPCs** - Advanced conversation management with language model integration
- **🔄 Advanced Avatar Control** - Smooth interpolation and complex avatar state management
- **🔄 FastSearch** - Sophisticated search and indexing across all VRChat assets
- **🔄 Performance Monitoring** - Advanced metrics and rate limiting

## Production Readiness Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Dual Interface** | ✅ Complete | MCP stdio + FastAPI HTTP with `/health`, `/api/docs`, and `/api/v1/openapi.json` |
| **Modular Architecture** | ✅ Complete | Tools organized in category subdirectories |
| **Tool Registration** | ✅ Complete | Proper `@mcp.tool()` multiline decorators |
| **Testing Infrastructure** | ✅ Complete | Unit tests, integration tests, Postman collection |
| **Documentation** | ✅ Complete | README, CHANGELOG, CONTRIBUTING, SECURITY |
| **CLI Interface** | ✅ Complete | Command-line interface with dual/fastapi/mcp modes |
| **Error Handling** | ✅ Complete | Comprehensive error handling with graceful degradation |
| **Logging** | ✅ Complete | Structured logging with configurable levels |
| **FastAPI Endpoints** | ✅ Complete | Health check, OpenAPI docs, and API schema endpoints |
| **Basic OSC Integration** | ✅ Complete | OSC message sending and parameter indexing |
| **Plugin System** | ✅ Complete | Extensible plugin architecture with decorators |
| **Server Startup** | ✅ Complete | Reliable server startup in all modes |
| **Avatar Control** | ✅ Complete | Basic parameter get/set operations |
| **Parameter Indexing** | ✅ Complete | Fast lookup of avatar parameters and OSC endpoints |
| **Advanced NPC System** | ❌ Planned | Language model integration and conversation management |
| **Advanced Avatar Control** | ❌ Planned | Smooth interpolation and complex state management |
| **Performance Monitoring** | ❌ Planned | Advanced metrics and comprehensive rate limiting |
| **GitHub Infrastructure** | ⚠️ Partial | Repository structure ready, CI/CD pending |

## 🚀 Installation

### Prerequisites
- [uv](https://docs.astral.sh/uv/) installed (RECOMMENDED)
- Python 3.12+

### 📦 Quick Start
Run immediately via `uvx`:
```bash
uvx vrchat-mcp
```

### 🎯 Claude Desktop Integration
Add to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "vrchat-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/vrchat-mcp", "run", "vrchat-mcp"]
  }
}
```
## Configuration

Create a `.env` file in the project root with your configuration:

```ini
# OSC Configuration
OSC_SEND_HOST=127.0.0.1
OSC_SEND_PORT=9000
OSC_RECEIVE_HOST=127.0.0.1
OSC_RECEIVE_PORT=9001

# NPC Configuration
DEFAULT_MODEL=gpt-4
MAX_CONVERSATION_HISTORY=10
RESPONSE_TIMEOUT=30.0
ENABLE_EMOTIONS=true
```

## Usage

### Starting the Server

The VRChat MCP server supports multiple operation modes:

#### Dual Mode (Recommended)
Run both MCP stdio and FastAPI HTTP interfaces:
```bash
vrchat-mcp --mode dual --host 127.0.0.1 --port 8000
```

#### FastAPI Only Mode
Run HTTP API server only (for testing):
```bash
vrchat-mcp --mode fastapi --host 127.0.0.1 --port 8000
```

#### MCP Stdio Only Mode
Run MCP protocol server only:
```bash
vrchat-mcp --mode mcp
```

#### Available Endpoints (FastAPI mode)
- `GET /health` - Health check endpoint
- `GET /api/docs` - OpenAPI documentation
- `GET /api/v1/openapi.json` - OpenAPI schema
- `GET /mcp` - MCP protocol endpoint

### Testing

Run the comprehensive test suite:
```bash
# Run all tests
python run_tests.py

# Run specific test categories
pytest tests/unit/          # Unit tests
pytest tests/integration/   # Integration tests
pytest tests/local/         # Local interface tests

# Run with coverage
pytest --cov=src/vrchat_mcp --cov-report=html
```

### Using the MCP Client

```python
from fastmcp import MCPClient

async def main():
    async with MCPClient("stdio") as client:
        # Load an avatar
        await client.call("load_avatar", {
            "preset_name": "my_avatar",
            "parameters": {"happy": 1.0, "talking": True}
        })
        
        # Set an avatar parameter
        await client.call("set_parameter", {
            "parameter_name": "happy",
            "value": 0.5
        })
        
        # Start an NPC conversation
        response = await client.call("start_conversation", {
            "npc_id": "guide_bot",
            "message": "Hello, how are you?"
        })
        print(response)

asyncio.run(main())
```

## VRChat Setup

1. Enable OSC in VRChat:
   - Go to Settings → OSC
   - Enable both "OSC" and "ChatBox"
   - Set the correct ports (default: 9000 for sending, 9001 for receiving)

2. Configure your avatar:
   - Add an `Avatar Parameters` component
   - Define parameters you want to control
   - Set up animations and expressions to respond to these parameters

## Plugin Development

VRChat MCP provides a powerful plugin system that allows you to extend its functionality. Plugins can define tools (callable methods) and event listeners (async methods that respond to events).

### Creating a Basic Plugin

To create a new plugin, create a Python file in the `vrchat_mcp/plugins` directory and define a class that inherits from `Plugin`:

```python
from vrchat_mcp.plugins import Plugin

class MyPlugin(Plugin):
    @property
    def name(self) -> str:
        return "my_plugin"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def description(self) -> str:
        return "A brief description of what this plugin does."
    
    async def on_load(self, mcp: Any) -> None:
        """Called when the plugin is loaded."""
        print(f"{self.name} v{self.version} loaded!")
    
    async def on_unload(self) -> None:
        """Called when the plugin is unloaded."""
        print(f"{self.name} v{self.version} unloaded!")
```

### Using the @tool Decorator

The `@tool` decorator registers a method as a callable tool. It supports extensive metadata for documentation and validation:

```python
@tool(
    name="greet",
    category="Examples",
    description="Generate a greeting message.",
    args={
        "name": {
            "type": "string",
            "description": "The name to include in the greeting.",
            "required": True
        },
        "excited": {
            "type": "boolean",
            "description": "Whether to add an exclamation mark.",
            "default": False,
            "required": False
        }
    },
    returns={
        "type": "string",
        "description": "The generated greeting message.",
    },
    requires_auth=False,
    rate_limit={"calls": 60, "interval": 60}  # 60 calls per minute
)
def greet(self, name: str, excited: bool = False) -> str:
    """Generate a greeting message.
    
    This is the detailed docstring that will be used for documentation.
    It can span multiple lines and include detailed information.
    
    Args:
        name: The name to include in the greeting.
        excited: Whether to add an exclamation mark.
        
    Returns:
        A string containing the greeting message.
        
    Examples:
        >>> greet("Alice")
        'Hello, Alice.'
        >>> greet("Bob", excited=True)
        'Hello, Bob!'
    """
    message = f"Hello, {name}."
    if excited:
        message = message[:-1] + "!"  # Replace period with exclamation
    return message
```

### Using the @event_listener Decorator

The `@event_listener` decorator registers a method to handle specific events:

```python
@event_listener("player_joined")
async def on_player_joined(self, event_data: Dict[str, Any]) -> None:
    """Handle player_joined events.
    
    Args:
        event_data: Dictionary containing event details with at least 'player_name' and 'player_id'.
    """
    player_name = event_data.get('player_name', 'Unknown player')
    print(f"{player_name} has joined the instance!")
```

### Best Practices

1. **Documentation**: Always provide comprehensive docstrings for your tools and event listeners.
   - Include `Args` and `Returns` sections in Google-style format
   - Add examples when appropriate
   - Document any exceptions that might be raised

2. **Error Handling**:
   - Validate input parameters
   - Use specific exception types
   - Provide helpful error messages

3. **Performance**:
   - Use `@tool` for CPU-bound operations
   - Use `@event_listener` for I/O-bound operations
   - Be mindful of rate limits

4. **Testing**:
   - Write unit tests for your plugins
   - Test edge cases and error conditions
   - Mock external dependencies

5. **Versioning**:
   - Follow semantic versioning for your plugins
   - Update version numbers when making changes
   - Document breaking changes

## 📦 Packaging & Distribution

This repository is SOTA 2026 compliant and uses the officially validated `@anthropic-ai/mcpb` workflow for distribution.

### Pack Extension
To generate a `.mcpb` distribution bundle with complete source code and automated build exclusions:
```bash
# SOTA 2026 standard pack command
mcpb pack . dist/vrchat-mcp.mcpb
```

## Documentation

For detailed documentation, see the [docs](docs/) directory:

- [API Reference](docs/api.md)
- [Tutorials](docs/tutorials/)
- [Configuration](docs/configuration.md)
- [Advanced Usage](docs/advanced.md)

## License

MIT

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

For support, please open an issue on the [GitHub repository](https://github.com/sandraschi/vrchat-mcp/issues).

---

**🎯 Production Ready Core**: This VRChat MCP server provides a solid foundation with reliable MCP/FastAPI dual interface support, comprehensive testing, and basic VRChat integration. Ready for integration with Claude Desktop. Advanced features (intelligent NPCs, advanced avatar control) are planned for future releases.


## 🌐 Webapp Dashboard

This MCP server includes a free, premium web interface for monitoring and control.
By default, the web dashboard runs on port **10712**.
*(Assigned ports: **10712** (Web dashboard))*

To start the webapp:
1. Navigate to the `webapp` (or `web`, `frontend`) directory.
2. Run `start.bat` (Windows) or `./start.ps1` (PowerShell).
3. Open `http://localhost:10712` in your browser.
