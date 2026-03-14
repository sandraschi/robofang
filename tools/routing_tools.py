"""RoboFang Routing Tools: Management of fleet topology and message routing."""

from typing import Any, Dict, Literal

from fastmcp import Context, FastMCP
from robofang.core.orchestrator import OrchestrationClient

mcp = FastMCP("RoboFang-routing")
orchestrator = OrchestrationClient()


@mcp.tool()
async def fang_routing(
    ctx: Context,
    operation: Literal["get_routing_rules", "update_routing", "test_routing"],
    channel: str | None = None,
    agent: str | None = None,
) -> Dict[str, Any]:
    """
    RoboFang routing operations (OpenClaw Parity).

    Operations:
    - get_routing_rules: List channel-to-agent mappings.
    - update_routing: Change channel-to-agent mappings.
    - test_routing: Simulate routing for a specific channel.
    """
    if operation == "get_routing_rules":
        rules = await orchestrator.get_routing_rules()
        return {"success": True, "rules": rules}

    if operation == "update_routing":
        if not channel or not agent:
            return {"success": False, "error": "Channel and agent required for update."}
        success = await orchestrator.update_routing(channel, agent)
        return {"success": success, "message": f"Routed {channel} to {agent}"}

    if operation == "test_routing":
        # Placeholder for simulation logic
        return {"success": True, "simulation": "Route valid", "channel": channel}

    return {"success": False, "error": "Invalid operation"}
