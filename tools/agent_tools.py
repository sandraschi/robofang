"""RoboFang Agent Tools: Interaction with agents and Moltbook registration."""

from typing import Any, Dict, Literal, Optional

from fastmcp import Context, FastMCP

from robofang.core.orchestrator import OrchestrationClient

mcp = FastMCP("RoboFang-agent")
orchestrator = OrchestrationClient()


@mcp.tool()
async def fang_agent(
    ctx: Context,
    operation: Literal["register", "list", "get_feed", "post_journal"],
    name: Optional[str] = None,
    bio: Optional[str] = None,
    personality: Optional[str] = None,
    goals: Optional[str] = None,
    content: Optional[str] = None,
) -> Dict[str, Any]:
    """
    RoboFang agent and journal operations.

    Operations:
    - register: Register a new agent on Moltbook.
    - list: List registered agents (from local topology).
    - get_feed: Fetch recent Moltbook activity.
    - post_journal: Post an update to the agent's journal.
    """
    if operation == "register":
        if not name:
            return {"success": False, "error": "Agent name required for registration."}

        body = {
            "name": name,
            "bio": bio or "",
            "personality": personality or "",
            "goals": goals or "",
        }
        return await orchestrator.register_agent(body)

    if operation == "list":
        # Returns agents from the federation map
        routing = await orchestrator.get_routing_rules()
        return {"success": True, "agents": list(set(routing.values()))}

    if operation == "get_feed":
        return await orchestrator.get_moltbook_feed()

    if operation == "post_journal":
        if not content:
            return {"success": False, "error": "Content required for journal post."}
        return await orchestrator.moltbook.post("/post", {"content": content})

    return {"success": False, "error": "Invalid operation"}
