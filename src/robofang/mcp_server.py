"""
RoboFang MCP 3.1 server: tools, prompts, agentic workflow, help.
Unified Gateway: same process as the Bridge; tools call the orchestrator directly.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastmcp import Context

logger = logging.getLogger("robofang.mcp")

# Orchestrator is injected at registration time to avoid circular import.
_orchestrator: Any = None


def get_help_content() -> Dict[str, Any]:
    """Return structured help for dashboard /api/help (same as robofang_help categories)."""
    return dict(_HELP)


def register_mcp(mcp: Any, orchestrator: Any) -> None:
    """Register all RoboFang MCP tools and prompts. Call from main after creating mcp."""
    global _orchestrator
    _orchestrator = orchestrator

    mcp.tool()(robofang_status)
    mcp.tool()(robofang_help)
    mcp.tool()(robofang_ask)
    mcp.tool()(robofang_fleet)
    mcp.tool()(robofang_deliberations)
    mcp.tool()(robofang_agentic_workflow)

    # Voice bridge — MCP-to-MCP relay to kyutai-mcp
    from robofang.bridges.voice_bridge import robofang_voice

    mcp.tool()(robofang_voice)

    mcp.prompt()(robofang_quick_start)
    mcp.prompt()(robofang_council_workflow)
    mcp.prompt()(robofang_voice_workflow)
    logger.info("RoboFang MCP tools and prompts registered (including voice bridge).")


# ─── Help content (multi-level, like yahboom_help) ────────────────────────

_HELP: Dict[str, Any] = {
    "categories": {
        "tools": {
            "description": "MCP tools exposed by RoboFang (MCP & robots hub).",
            "topics": {
                "robofang_status": "Health and fleet summary. Returns bridge status, connector counts, version.",
                "robofang_help": "Multi-level help: call with no args for categories, category= for topics, category+topic= for detail.",
                "robofang_ask": "Send a message to the orchestrator. use_council=True for Council of Dozens; use_rag=True for RAG context.",
                "robofang_fleet": "Fleet registry: connectors (live + config), domain agents, summary counts.",
                "robofang_deliberations": "Recent reasoning log entries (Council/ReAct steps). limit=50.",
                "robofang_agentic_workflow": "High-level goal; uses sampling to plan and run steps (ask, fleet_status, deliberations) to achieve the goal.",
                "robofang_voice": "Voice relay to kyutai-mcp: voice turns, agentic briefings, Moshi service control, session history (MCP-to-MCP bridge).",
            },
        },
        "council": {
            "description": "Council of Dozens: multi-agent Enrich -> Execute -> Audit.",
            "topics": {
                "enrich": "Foreman: high-intelligence specification from raw prompt.",
                "execute": "ReAct loop: tool utilization and execution.",
                "audit": "Satisficer: post-execution verification against spec.",
                "use_council": "Set use_council=True in robofang_ask to run a council synthesis instead of single-model ask.",
            },
        },
        "connection": {
            "description": "Connecting to the RoboFang Bridge and MCP.",
            "topics": {
                "bridge": "Bridge runs on PORT (default 10871). Health: GET /health, fleet: GET /fleet.",
                "mcp_sse": "MCP over SSE: connect to http://localhost:PORT/sse for Cursor/Claude. Same process as Bridge.",
                "dashboard": "RoboFang Hub: port 10864 (or 10870). Real-time logs, deliberations, fleet control.",
            },
        },
        "skills": {
            "description": "Skill Bridge and operator skill.",
            "topics": {
                "skill_bridge": "Orchestrator integrates memops skill facility. List via Bridge GET /skills.",
                "operator": "See docs/skills/RoboFang-operator.md for when to use which tool and council workflow.",
            },
        },
        "voice": {
            "description": "Voice pipeline via kyutai-mcp bridge (Moshi 7B speech model).",
            "topics": {
                "turn": "Send an utterance through the staged voice pipeline (ack → intent → research → synthesis).",
                "speak_boilerplate": "Request an agentic spoken briefing for weather, news, AI news, or stocks.",
                "service_status": "Check Moshi speech server state (running, PID, HTTP probe).",
                "sessions": "List all voice sessions with turn counts.",
                "session_history": "Get full turn history for a specific session.",
                "health": "Probe kyutai-mcp backend reachability and Moshi liveness.",
            },
        },
    }
}


# ─── Tools ──────────────────────────────────────────────────────────────────


async def robofang_status() -> Dict[str, Any]:
    """
    Return RoboFang Bridge health and fleet summary.
    Use before planning multi-step workflows to confirm the hub is up and connectors are available.
    """
    if _orchestrator is None:
        return {"success": False, "error": "Orchestrator not initialized."}
    try:
        connector_states = {
            name: getattr(conn, "active", False) for name, conn in _orchestrator.connectors.items()
        }
        online = sum(1 for v in connector_states.values() if v)
        return {
            "success": True,
            "service": "RoboFang-bridge",
            "version": "0.3.0",
            "connectors_online": online,
            "connectors_total": len(connector_states),
            "connectors": connector_states,
            "running": getattr(_orchestrator, "running", False),
        }
    except Exception as e:
        logger.exception("robofang_status failed")
        return {"success": False, "error": str(e)}


async def robofang_help(
    category: Optional[str] = None,
    topic: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Multi-level help for RoboFang MCP.
    No args: list categories. category=: list topics. category= + topic=: full detail.
    Categories: tools, council, connection, skills.
    """
    cats = _HELP["categories"]
    if not category:
        return {
            "help": "RoboFang MCP & robots hub — MCP Help",
            "usage": "Call with category= to drill down, then category= + topic= for full detail.",
            "categories": {k: v["description"] for k, v in cats.items()},
        }
    cat = cats.get(category)
    if not cat:
        return {
            "error": f"Unknown category: '{category}'",
            "available": list(cats.keys()),
        }
    if not topic:
        return {
            "category": category,
            "description": cat["description"],
            "topics": dict(cat["topics"]),
            "hint": f"Add topic= with one of: {', '.join(cat['topics'].keys())}",
        }
    detail = cat["topics"].get(topic)
    if not detail:
        return {
            "error": f"Unknown topic: '{topic}'",
            "available": list(cat["topics"].keys()),
        }
    return {"category": category, "topic": topic, "detail": detail}


async def robofang_ask(
    message: str,
    use_council: bool = False,
    use_rag: bool = True,
    subject: str = "guest",
    persona: str = "sovereign",
) -> Dict[str, Any]:
    """
    Send a message to the RoboFang orchestrator.
    use_council=True: run Council of Dozens synthesis. use_rag=True: augment with RAG context.
    subject: security subject (default guest). persona: personality name (default sovereign).
    """
    if _orchestrator is None:
        return {"success": False, "error": "Orchestrator not initialized."}
    try:
        result = await _orchestrator.ask(
            message,
            use_council=use_council,
            use_rag=use_rag,
            subject=subject,
            persona=persona,
        )
        if result.get("success"):
            return {
                "success": True,
                "message": result.get("response", ""),
                "model": result.get("model"),
            }
        return {
            "success": False,
            "error": result.get("error", "Reasoning failed"),
        }
    except Exception as e:
        logger.exception("robofang_ask failed")
        return {"success": False, "error": str(e)}


async def robofang_fleet() -> Dict[str, Any]:
    """
    Return the full fleet registry: connectors (live + config), domain agents, summary.
    Same data as GET /fleet on the Bridge.
    """
    if _orchestrator is None:
        return {"success": False, "error": "Orchestrator not initialized."}
    try:
        live: Dict[str, Any] = {}
        for name, conn in _orchestrator.connectors.items():
            live[name] = {
                "id": name,
                "name": name.replace("-", " ").title(),
                "type": getattr(conn, "connector_type", "connector"),
                "status": "online" if getattr(conn, "active", False) else "offline",
                "source": "live",
            }
        topology = _orchestrator.topology
        for name, cfg in topology.get("connectors", {}).items():
            if name not in live:
                live[name] = {
                    "id": name,
                    "name": name.replace("-", " ").title(),
                    "type": "connector",
                    "status": "offline",
                    "source": "config",
                }
        agents = []
        for domain_name, domain_entries in topology.get("domains", {}).items():
            for agent_id, agent_cfg in domain_entries.items():
                agents.append(
                    {
                        "id": f"{domain_name}/{agent_id}",
                        "name": agent_id.replace("-", " ").title(),
                        "type": "mcp-agent",
                        "domain": domain_name,
                    }
                )
        online = sum(1 for c in live.values() if c.get("status") == "online")
        return {
            "success": True,
            "summary": {
                "connectors_online": online,
                "connectors_total": len(live),
                "agents_discovered": len(agents),
            },
            "connectors": list(live.values()),
            "agents": agents,
        }
    except Exception as e:
        logger.exception("robofang_fleet failed")
        return {"success": False, "error": str(e)}


async def robofang_deliberations(limit: int = 50) -> Dict[str, Any]:
    """
    Return recent reasoning log entries (Council/ReAct deliberation steps).
    limit: max entries (default 50).
    """
    if _orchestrator is None:
        return {"success": False, "error": "Orchestrator not initialized."}
    try:
        entries = list(getattr(_orchestrator, "reasoning_log", []))
        limit = min(max(1, limit), 100)
        entries = entries[-limit:]
        return {
            "success": True,
            "count": len(entries),
            "deliberations": entries,
        }
    except Exception as e:
        logger.exception("robofang_deliberations failed")
        return {"success": False, "error": str(e)}


async def robofang_agentic_workflow(goal: str, ctx: Context) -> str:
    """
    Achieve a high-level goal by planning and executing steps via the RoboFang hub (FastMCP 3.1 sampling).
    Use for: "Summarize fleet status and suggest one improvement", "Ask the council how to secure the hub", "Get recent deliberations and summarize the last decision".
    The LLM will use robofang_status, robofang_ask, robofang_fleet, robofang_deliberations as sub-tools.
    """
    if _orchestrator is None:
        return "Error: Orchestrator not initialized."

    async def status() -> str:
        out = await robofang_status()
        return str(out)

    async def ask(msg: str, use_council: bool = False) -> str:
        out = await robofang_ask(msg, use_council=use_council)
        return out.get("message", str(out)) if out.get("success") else out.get("error", str(out))

    async def fleet() -> str:
        out = await robofang_fleet()
        return str(out)

    async def deliberations(limit: int = 20) -> str:
        out = await robofang_deliberations(limit=limit)
        return str(out.get("deliberations", out))

    system_prompt = (
        "You are an operator for the RoboFang MCP & robots hub. You have sub-tools: "
        "status() for health and connector count; ask(message, use_council) to send a message (use_council=True for Council of Dozens); "
        "fleet() for full fleet registry; deliberations(limit) for recent reasoning log. "
        "Plan a short sequence of steps to achieve the user's goal. Execute the steps and then summarize what was done and the outcome."
    )
    try:
        result = await ctx.sample(
            messages=goal,
            system_prompt=system_prompt,
            tools=[status, ask, fleet, deliberations],
            temperature=0.2,
            max_tokens=1024,
        )
        return result.text or "No response from planner."
    except Exception as e:
        logger.exception("robofang_agentic_workflow failed")
        return f"Agentic workflow failed: {e}"


# ─── Prompts ─────────────────────────────────────────────────────────────────


def robofang_quick_start(bridge_url: str = "http://localhost:10871") -> str:
    """Get step-by-step instructions to connect and use the RoboFang hub (Bridge + MCP)."""
    return f"""You are helping set up the RoboFang MCP & robots hub.

1. Start the Bridge: from the RoboFang repo run `uv run python -m robofang.main` or `robofang-bridge` (default port 10871). Or set PORT=10867 and run the same.
2. The RoboFang Hub runs separately on port 10864 (or 10870). It talks to the Bridge for fleet, logs, and deliberations.
3. MCP clients (Cursor, Claude Desktop): connect via SSE to {bridge_url}/sse so the hub appears as an MCP server with tools robofang_status, robofang_help, robofang_ask, robofang_fleet, robofang_deliberations, robofang_agentic_workflow.
4. Use robofang_status first to confirm the Bridge is up and connectors are online. Use robofang_ask for single questions; set use_council=True for Council of Dozens synthesis. Use robofang_agentic_workflow for multi-step goals.
5. Help: robofang_help() for categories; robofang_help(category="tools") for tool list; robofang_help(category="council", topic="use_council") for detail."""


def robofang_council_workflow() -> str:
    """Generate a plan for using the Council of Dozens (Enrich -> Execute -> Audit) via RoboFang."""
    return """Plan a Council of Dozens workflow with RoboFang:

1. Use robofang_status to ensure the hub is up.
2. Use robofang_ask with use_council=True and a clear prompt that states the decision or synthesis you need (e.g. "Evaluate the security implications of enabling connector X" or "Draft a short specification for feature Y").
3. The Council runs Enrich (Foreman spec) -> Execute (ReAct) -> Audit (Satisficer). Results appear in the response.
4. Optionally call robofang_deliberations(limit=20) to inspect the reasoning log and then summarize the outcome for the user.
5. For multi-step goals that mix status, ask, and deliberations, use robofang_agentic_workflow(goal="...") and describe the goal in natural language."""


def robofang_voice_workflow() -> str:
    """Guide for using the voice pipeline via the kyutai-mcp bridge."""
    return """You have access to robofang_voice — a bridge to the kyutai-mcp voice pipeline.

1. Run robofang_voice(operation='health') to check if the kyutai-mcp backend is reachable.
2. Run robofang_voice(operation='service_status') to check if Moshi (the speech model) is running.
3. To process speech: robofang_voice(operation='turn', utterance='your text here')
   - The pipeline stages: quick ack → intent detection → agentic research → deep reasoner synthesis.
   - For weather: include a location, e.g. utterance='weather in Vienna'.
4. For topic briefings: robofang_voice(operation='speak_boilerplate', topic='world_news', style='brief')
   - Topics: weather, world_news, ai_news, stock_market.
5. Session history: robofang_voice(operation='sessions') to list, then (operation='session_history', session_id='...').
6. The voice relay calls kyutai-mcp REST directly (no double-MCP overhead). Ensure kyutai-mcp webapp is running on port 10924."""


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    import sys

    from fastmcp import FastMCP

    # Setup basic logging for standalone run
    logging.basicConfig(level=logging.INFO)

    # Check for SSE vs stdio
    transport = "sse" if "sse" in sys.argv else "stdio"
    port = int(os.getenv("MCP_PORT", 10867))

    mcp_standalone = FastMCP("RoboFang Substrate")

    # Standalone mode: no orchestrator; tools that need it are unavailable.
    @mcp_standalone.tool()
    async def substrate_ping() -> str:
        """Liveness check for RoboFang Substrate."""
        return "RoboFang Substrate is alive and reachable."

    logger.info(
        f"Starting RoboFang Substrate on {transport} (port {port if transport == 'sse' else 'N/A'})..."
    )

    if transport == "sse":
        mcp_standalone.run(transport="sse", port=port)
    else:
        mcp_standalone.run(transport="stdio")
