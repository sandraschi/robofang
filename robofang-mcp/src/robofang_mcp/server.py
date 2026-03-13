"""
RoboFang MCP — thin FastMCP 3.1 server for Cursor/Antigrav.
Talks to the RoboFang bridge over HTTP; supports sampling, prompts, skills; no webapp.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from fastmcp import Context, FastMCP

from robofang_mcp._bridge import (
    create_routine_from_phrase,
    fetch_ask,
    fetch_deliberations,
    fetch_fleet,
    fetch_fleet_settings,
    fetch_hands,
    fetch_help,
    fetch_logs,
    fetch_personas,
    fetch_routine,
    fetch_routines,
    fetch_status,
    fetch_system,
    get_bridge_url,
)
from robofang_mcp._bridge import (
    delete_routine as bridge_delete_routine,
)
from robofang_mcp._bridge import (
    run_routine as bridge_run_routine,
)
from robofang_mcp._bridge import (
    update_routine as bridge_update_routine,
)

logger = logging.getLogger("robofang_mcp")

# ─── FastMCP app ────────────────────────────────────────────────────────────

mcp = FastMCP(
    "RoboFang MCP",
    instructions="Thin MCP server that forwards to the RoboFang bridge. Set ROBOFANG_BRIDGE_URL if the bridge is not on localhost:10871.",
)

# Optional: expose operator skill as skill://operator/SKILL.md (FastMCP 3.1)
try:
    from fastmcp.server.providers.skills import SkillsDirectoryProvider

    _skills_root = Path(__file__).resolve().parent / "skills"
    if _skills_root.is_dir():
        mcp.add_provider(SkillsDirectoryProvider(roots=_skills_root))
except Exception as e:
    logger.debug("Skills provider not loaded: %s", e)


# ─── Tools (forward to bridge) ──────────────────────────────────────────────


@mcp.tool()
async def robofang_status(
    sections: Optional[str] = None,
    activity_limit: int = 20,
    logs_limit: int = 50,
) -> Dict[str, Any]:
    """
    RoboFang status and optional deep inspection.
    No args: bridge health and connector summary only.
    sections: comma-separated or 'all' to include activity (deliberations + logs), scheduling (hands + routines), config (fleet settings), hands (full fleet + hand status), personas (council/personality names). Example: 'activity,personas' or 'all'.
    activity_limit: max deliberations to include when sections includes activity (default 20).
    logs_limit: max log entries when sections includes activity (default 50).
    """
    out: Dict[str, Any] = await fetch_status()
    if not out.get("success"):
        return out
    include = (sections or "").strip().lower()
    if not include:
        return out
    want_all = include == "all"
    want = {s.strip() for s in include.split(",") if s.strip()}
    if want_all:
        want = {"activity", "scheduling", "config", "hands", "personas"}

    if "activity" in want:
        delib = await fetch_deliberations(limit=activity_limit)
        logs = await fetch_logs(limit=logs_limit)
        out["activity"] = {
            "deliberations": delib.get("deliberations", []) if delib.get("success") else [],
            "deliberations_count": delib.get("count", 0),
            "logs": logs.get("logs", []) if logs.get("success") else [],
            "logs_count": logs.get("count", 0),
        }
    if "scheduling" in want:
        hands_resp = await fetch_hands()
        routines_resp = await fetch_routines()
        out["scheduling"] = {
            "hands": hands_resp.get("hands", []) if hands_resp.get("success") else [],
            "routines": routines_resp.get("routines", []) if routines_resp.get("success") else [],
        }
    if "config" in want:
        sys_resp = await fetch_system()
        settings_resp = await fetch_fleet_settings()
        out["config"] = {
            "system": sys_resp
            if sys_resp.get("status") == "healthy"
            else {"error": sys_resp.get("error")},
            "fleet_settings": settings_resp
            if "error" not in settings_resp
            else {"error": settings_resp.get("error")},
        }
    if "hands" in want:
        fleet_resp = await fetch_fleet()
        hands_resp = await fetch_hands()
        out["hands"] = {
            "fleet": fleet_resp
            if fleet_resp.get("success")
            else {"error": fleet_resp.get("error")},
            "autonomous_hands": hands_resp.get("hands", []) if hands_resp.get("success") else [],
        }
    if "personas" in want:
        personas_resp = await fetch_personas()
        out["personas"] = personas_resp.get("personas", []) if personas_resp.get("success") else []

    return out


@mcp.tool()
async def robofang_help(
    category: Optional[str] = None,
    topic: Optional[str] = None,
    depth: Optional[str] = "2",
    path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Multi-level detailed help for RoboFang MCP.
    depth: '0' = one-line summary, '1' = categories only, '2' = topics per category, '3' = full text for one category (use category=), 'full' = entire help tree with all detail.
    path: shortcut to a topic, e.g. 'council.use_council' → category=council, topic=use_council; returns that topic's full detail.
    category= and topic=: drill down as usual (tools, council, connection, skills).
    """
    if path:
        parts = path.strip().split(".", 1)
        if len(parts) == 2:
            category = category or parts[0].strip()
            topic = topic or parts[1].strip()
    try:
        data = await fetch_help()
        if "error" in data:
            return data
        cats = data.get("categories") or {}
        if not isinstance(cats, dict):
            return {"error": "Help format unexpected", "raw": str(data)[:200]}

        depth_val = (depth or "2").strip().lower()
        if depth_val == "0":
            return {
                "help": "RoboFang MCP & robots hub — MCP Help",
                "usage": "Use depth=1 for categories, depth=2 for topics, depth=3 or full for full text. Use path='category.topic' for direct detail.",
            }
        if depth_val == "1":
            return {
                "help": "RoboFang MCP — Categories",
                "categories": {
                    k: (v.get("description", "") if isinstance(v, dict) else "")
                    for k, v in cats.items()
                },
            }
        if depth_val == "full" and not category and not topic:
            result: Dict[str, Any] = {"help": "RoboFang MCP — Full help tree", "categories": {}}
            for cat_name, cat_data in cats.items():
                if not isinstance(cat_data, dict):
                    continue
                result["categories"][cat_name] = {
                    "description": cat_data.get("description", ""),
                    "topics": dict(cat_data.get("topics", {})),
                }
            return result

        if not category:
            return {
                "help": "RoboFang MCP — Topics per category",
                "usage": "Set category= to get topics; set topic= for full detail. Or use path='category.topic'.",
                "categories": {
                    k: {
                        "description": (v.get("description", "") if isinstance(v, dict) else ""),
                        "topics": list((v.get("topics") or {}).keys())
                        if isinstance(v, dict)
                        else [],
                    }
                    for k, v in cats.items()
                },
            }
        cat = cats.get(category) if isinstance(cats.get(category), dict) else None
        if not cat:
            return {"error": f"Unknown category: '{category}'", "available": list(cats.keys())}
        if not topic:
            if depth_val == "3":
                return {
                    "category": category,
                    "description": cat.get("description", ""),
                    "topics_full": dict(cat.get("topics", {})),
                }
            return {
                "category": category,
                "description": cat.get("description", ""),
                "topics": dict(cat.get("topics", {})),
            }
        detail = (cat.get("topics") or {}).get(topic)
        if detail is None:
            return {
                "error": f"Unknown topic: '{topic}'",
                "available": list(cat.get("topics", {}).keys()),
            }
        return {"category": category, "topic": topic, "detail": detail}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
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
    out = await fetch_ask(
        message=message,
        use_council=use_council,
        use_rag=use_rag,
        subject=subject,
        persona=persona,
    )
    if out.get("success"):
        return {
            "success": True,
            "message": out.get("message", ""),
            "model": out.get("data", {}).get("model"),
        }
    return {"success": False, "error": out.get("error", "Reasoning failed")}


@mcp.tool()
async def robofang_fleet() -> Dict[str, Any]:
    """
    Return the full fleet registry: connectors (live + config), domain agents, summary.
    Same data as GET /fleet on the Bridge.
    """
    return await fetch_fleet()


@mcp.tool()
async def robofang_deliberations(limit: int = 50) -> Dict[str, Any]:
    """
    Return recent reasoning log entries (Council/ReAct deliberation steps).
    limit: max entries (default 50).
    """
    return await fetch_deliberations(limit=limit)


# ─── Agentic tasks (routines) CRUD ──────────────────────────────────────────


@mcp.tool()
async def robofang_task_list() -> Dict[str, Any]:
    """
    List all RoboFang agentic tasks (routines): scheduled actions like yahboom patrol, dawn patrol.
    Returns routine id, name, time_local, recurrence, action_type, enabled, last_run.
    """
    return await fetch_routines()


@mcp.tool()
async def robofang_task_get(routine_id: str) -> Dict[str, Any]:
    """Get a single agentic task (routine) by id."""
    return await fetch_routine(routine_id)


@mcp.tool()
async def robofang_task_create_from_phrase(
    phrase: str,
    report_email: Optional[str] = None,
    run_now: bool = False,
) -> Dict[str, Any]:
    """
    Create an agentic task from natural language (e.g. 'yahboom robot patrol 7am daily', 'dawn patrol and report anomalies').
    The bridge parses phrase into name, time, recurrence, action_type (e.g. dawn_patrol for patrol + video + report).
    If run_now=True, run the task immediately and return the run result (e.g. patrol report with anomalies).
    """
    return await create_routine_from_phrase(phrase, report_email=report_email, run_now=run_now)


@mcp.tool()
async def robofang_task_run_from_phrase(
    phrase: str,
    report_email: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Start an agentic task from natural language and report back. Use for: 'RoboFang, start yahboom robot patrol and report back anomalies'.
    Creates the task from the phrase (if needed), runs it now, and returns the run result (patrol output, analysis, report).
    """
    return await create_routine_from_phrase(phrase, report_email=report_email, run_now=True)


@mcp.tool()
async def robofang_task_run(routine_id: str) -> Dict[str, Any]:
    """Run an existing agentic task (routine) by id once. Returns run result (e.g. patrol report)."""
    return await bridge_run_routine(routine_id)


@mcp.tool()
async def robofang_task_update(
    routine_id: str,
    name: Optional[str] = None,
    time_local: Optional[str] = None,
    recurrence: Optional[str] = None,
    action_type: Optional[str] = None,
    enabled: Optional[bool] = None,
) -> Dict[str, Any]:
    """Update an agentic task (routine) by id. Pass only fields to change."""
    return await bridge_update_routine(
        routine_id,
        name=name,
        time_local=time_local,
        recurrence=recurrence,
        action_type=action_type,
        enabled=enabled,
    )


@mcp.tool()
async def robofang_task_delete(routine_id: str) -> Dict[str, Any]:
    """Delete an agentic task (routine) by id."""
    return await bridge_delete_routine(routine_id)


@mcp.tool()
async def robofang_agentic_workflow(goal: str, ctx: Context) -> str:
    """
    Achieve a high-level goal by planning and executing steps via the RoboFang hub (FastMCP 3.1 sampling).
    Use for: "Summarize fleet status and suggest one improvement", "Ask the council how to secure the hub", "Get recent deliberations and summarize the last decision".
    The LLM will use robofang_status, robofang_ask, robofang_fleet, robofang_deliberations as sub-tools.
    """

    async def status() -> str:
        out = await fetch_status()
        return str(out)

    async def ask(msg: str, use_council: bool = False) -> str:
        out = await fetch_ask(msg, use_council=use_council)
        if out.get("success"):
            return out.get("message", str(out))
        return out.get("error", str(out))

    async def fleet() -> str:
        out = await fetch_fleet()
        return str(out)

    async def deliberations(limit: int = 20) -> str:
        out = await fetch_deliberations(limit=limit)
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


@mcp.prompt()
def robofang_quick_start(bridge_url: str = "http://localhost:10871") -> str:
    """Get step-by-step instructions to connect and use the RoboFang hub (Bridge + MCP)."""
    return f"""You are helping set up the RoboFang MCP & robots hub.

1. Start the Bridge: from the RoboFang repo run `uv run python -m robofang.main` or `robofang-bridge` (default port 10871). Or set PORT=10867 and run the same.
2. The RoboFang Hub runs separately on port 10864 (or 10870). It talks to the Bridge for fleet, logs, and deliberations.
3. MCP clients (Cursor, Claude Desktop, Antigrav): add this server (robofang-mcp) via stdio or connect to the Bridge SSE at {bridge_url}/sse for the full in-process MCP. This thin server (robofang-mcp) forwards to the bridge at ROBOFANG_BRIDGE_URL.
4. Use robofang_status first to confirm the Bridge is up. Use robofang_ask for single questions; set use_council=True for Council of Dozens. Use robofang_agentic_workflow for multi-step goals.
5. Help: robofang_help() for categories; robofang_help(category="tools") for tool list."""


@mcp.prompt()
def robofang_council_workflow() -> str:
    """Generate a plan for using the Council of Dozens (Enrich -> Execute -> Audit) via RoboFang."""
    return """Plan a Council of Dozens workflow with RoboFang:

1. Use robofang_status to ensure the hub is up.
2. Use robofang_ask with use_council=True and a clear prompt that states the decision or synthesis you need (e.g. "Evaluate the security implications of enabling connector X" or "Draft a short specification for feature Y").
3. The Council runs Enrich (Foreman spec) -> Execute (ReAct) -> Audit (Satisficer). Results appear in the response.
4. Optionally call robofang_deliberations(limit=20) to inspect the reasoning log and then summarize the outcome for the user.
5. For multi-step goals that mix status, ask, and deliberations, use robofang_agentic_workflow(goal="...") and describe the goal in natural language."""


# ─── Entry ──────────────────────────────────────────────────────────────────


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(name)s %(levelname)s %(message)s")
    transport = "sse" if "--sse" in sys.argv or "sse" in sys.argv else "stdio"
    port = int(os.getenv("MCP_PORT", "10867"))
    logger.info("RoboFang MCP (thin) — bridge=%s transport=%s", get_bridge_url(), transport)
    if transport == "sse":
        mcp.run(transport="sse", port=port)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
