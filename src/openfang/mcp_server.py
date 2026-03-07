"""
OpenFang MCP 3.1 server: tools, prompts, agentic workflow, help.
Unified Gateway: same process as the Bridge; tools call the orchestrator directly.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastmcp import Context

logger = logging.getLogger("openfang.mcp")

# Orchestrator is injected at registration time to avoid circular import.
_orchestrator: Any = None


def get_help_content() -> Dict[str, Any]:
    """Return structured help for dashboard /api/help (same as openfang_help categories)."""
    return dict(_HELP)


def register_mcp(mcp: Any, orchestrator: Any) -> None:
    """Register all OpenFang MCP tools and prompts. Call from main after creating mcp."""
    global _orchestrator
    _orchestrator = orchestrator

    mcp.tool()(openfang_status)
    mcp.tool()(openfang_help)
    mcp.tool()(openfang_ask)
    mcp.tool()(openfang_fleet)
    mcp.tool()(openfang_deliberations)
    mcp.tool()(openfang_agentic_workflow)
    mcp.prompt()(openfang_quick_start)
    mcp.prompt()(openfang_council_workflow)
    logger.info("OpenFang MCP tools and prompts registered.")


# ─── Help content (multi-level, like yahboom_help) ────────────────────────

_HELP: Dict[str, Any] = {
    "categories": {
        "tools": {
            "description": "MCP tools exposed by OpenFang Sovereign Hub.",
            "topics": {
                "openfang_status": "Health and fleet summary. Returns bridge status, connector counts, version.",
                "openfang_help": "Multi-level help: call with no args for categories, category= for topics, category+topic= for detail.",
                "openfang_ask": "Send a message to the orchestrator. use_council=True for Council of Dozens; use_rag=True for RAG context.",
                "openfang_fleet": "Fleet registry: connectors (live + config), domain agents, summary counts.",
                "openfang_deliberations": "Recent reasoning log entries (Council/ReAct steps). limit=50.",
                "openfang_agentic_workflow": "High-level goal; uses sampling to plan and run steps (ask, fleet_status, deliberations) to achieve the goal.",
            },
        },
        "council": {
            "description": "Council of Dozens: multi-agent Enrich -> Execute -> Audit.",
            "topics": {
                "enrich": "Foreman: high-intelligence specification from raw prompt.",
                "execute": "ReAct loop: tool utilization and execution.",
                "audit": "Satisficer: post-execution verification against spec.",
                "use_council": "Set use_council=True in openfang_ask to run a council synthesis instead of single-model ask.",
            },
        },
        "connection": {
            "description": "Connecting to the OpenFang Bridge and MCP.",
            "topics": {
                "bridge": "Bridge runs on PORT (default 10871). Health: GET /health, fleet: GET /fleet.",
                "mcp_sse": "MCP over SSE: connect to http://localhost:PORT/sse for Cursor/Claude. Same process as Bridge.",
                "dashboard": "Sovereign Dashboard: port 10864 (or 10870). Real-time logs, deliberations, fleet control.",
            },
        },
        "skills": {
            "description": "Skill Bridge and operator skill.",
            "topics": {
                "skill_bridge": "Orchestrator integrates memops skill facility. List via Bridge GET /skills.",
                "operator": "See docs/skills/openfang-operator.md for when to use which tool and council workflow.",
            },
        },
    }
}


# ─── Tools ──────────────────────────────────────────────────────────────────


async def openfang_status() -> Dict[str, Any]:
    """
    Return OpenFang Bridge health and fleet summary.
    Use before planning multi-step workflows to confirm the hub is up and connectors are available.
    """
    if _orchestrator is None:
        return {"success": False, "error": "Orchestrator not initialized."}
    try:
        connector_states = {
            name: getattr(conn, "active", False)
            for name, conn in _orchestrator.connectors.items()
        }
        online = sum(1 for v in connector_states.values() if v)
        return {
            "success": True,
            "service": "openfang-bridge",
            "version": "0.3.0",
            "connectors_online": online,
            "connectors_total": len(connector_states),
            "connectors": connector_states,
            "running": getattr(_orchestrator, "running", False),
        }
    except Exception as e:
        logger.exception("openfang_status failed")
        return {"success": False, "error": str(e)}


async def openfang_help(
    category: Optional[str] = None,
    topic: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Multi-level help for OpenFang MCP.
    No args: list categories. category=: list topics. category= + topic=: full detail.
    Categories: tools, council, connection, skills.
    """
    cats = _HELP["categories"]
    if not category:
        return {
            "help": "OpenFang Sovereign Hub MCP Help",
            "usage": "Call with category= to drill down, then category= + topic= for full detail.",
            "categories": {k: v["description"] for k, v in cats.items()},
        }
    cat = cats.get(category)
    if not cat:
        return {"error": f"Unknown category: '{category}'", "available": list(cats.keys())}
    if not topic:
        return {
            "category": category,
            "description": cat["description"],
            "topics": dict(cat["topics"]),
            "hint": f"Add topic= with one of: {', '.join(cat['topics'].keys())}",
        }
    detail = cat["topics"].get(topic)
    if not detail:
        return {"error": f"Unknown topic: '{topic}'", "available": list(cat["topics"].keys())}
    return {"category": category, "topic": topic, "detail": detail}


async def openfang_ask(
    message: str,
    use_council: bool = False,
    use_rag: bool = True,
    subject: str = "guest",
    persona: str = "sovereign",
) -> Dict[str, Any]:
    """
    Send a message to the OpenFang orchestrator.
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
        logger.exception("openfang_ask failed")
        return {"success": False, "error": str(e)}


async def openfang_fleet() -> Dict[str, Any]:
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
                agents.append({
                    "id": f"{domain_name}/{agent_id}",
                    "name": agent_id.replace("-", " ").title(),
                    "type": "mcp-agent",
                    "domain": domain_name,
                })
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
        logger.exception("openfang_fleet failed")
        return {"success": False, "error": str(e)}


async def openfang_deliberations(limit: int = 50) -> Dict[str, Any]:
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
        logger.exception("openfang_deliberations failed")
        return {"success": False, "error": str(e)}


async def openfang_agentic_workflow(goal: str, ctx: Context) -> str:
    """
    Achieve a high-level goal by planning and executing steps via the OpenFang hub (FastMCP 3.1 sampling).
    Use for: "Summarize fleet status and suggest one improvement", "Ask the council how to secure the hub", "Get recent deliberations and summarize the last decision".
    The LLM will use openfang_status, openfang_ask, openfang_fleet, openfang_deliberations as sub-tools.
    """
    if _orchestrator is None:
        return "Error: Orchestrator not initialized."

    async def status() -> str:
        out = await openfang_status()
        return str(out)

    async def ask(msg: str, use_council: bool = False) -> str:
        out = await openfang_ask(msg, use_council=use_council)
        return out.get("message", str(out)) if out.get("success") else out.get("error", str(out))

    async def fleet() -> str:
        out = await openfang_fleet()
        return str(out)

    async def deliberations(limit: int = 20) -> str:
        out = await openfang_deliberations(limit=limit)
        return str(out.get("deliberations", out))

    system_prompt = (
        "You are an operator for the OpenFang Sovereign Hub. You have sub-tools: "
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
        logger.exception("openfang_agentic_workflow failed")
        return f"Agentic workflow failed: {e}"


# ─── Prompts ─────────────────────────────────────────────────────────────────


def openfang_quick_start(bridge_url: str = "http://localhost:10871") -> str:
    """Get step-by-step instructions to connect and use the OpenFang Sovereign Hub (Bridge + MCP)."""
    return f"""You are helping set up the OpenFang Sovereign Hub.

1. Start the Bridge: from the openfang repo run `uv run python -m openfang.main` or `openfang-bridge` (default port 10871). Or set PORT=10867 and run the same.
2. The Sovereign Dashboard runs separately on port 10864 (see dashboard/start.bat). It talks to the Bridge for fleet, logs, and deliberations.
3. MCP clients (Cursor, Claude Desktop): connect via SSE to {bridge_url}/sse so the hub appears as an MCP server with tools openfang_status, openfang_help, openfang_ask, openfang_fleet, openfang_deliberations, openfang_agentic_workflow.
4. Use openfang_status first to confirm the Bridge is up and connectors are online. Use openfang_ask for single questions; set use_council=True for Council of Dozens synthesis. Use openfang_agentic_workflow for multi-step goals.
5. Help: openfang_help() for categories; openfang_help(category="tools") for tool list; openfang_help(category="council", topic="use_council") for detail."""


def openfang_council_workflow() -> str:
    """Generate a plan for using the Council of Dozens (Enrich -> Execute -> Audit) via OpenFang."""
    return """Plan a Council of Dozens workflow with OpenFang:

1. Use openfang_status to ensure the hub is up.
2. Use openfang_ask with use_council=True and a clear prompt that states the decision or synthesis you need (e.g. "Evaluate the security implications of enabling connector X" or "Draft a short specification for feature Y").
3. The Council runs Enrich (Foreman spec) -> Execute (ReAct) -> Audit (Satisficer). Results appear in the response.
4. Optionally call openfang_deliberations(limit=20) to inspect the reasoning log and then summarize the outcome for the user.
5. For multi-step goals that mix status, ask, and deliberations, use openfang_agentic_workflow(goal="...") and describe the goal in natural language."""
