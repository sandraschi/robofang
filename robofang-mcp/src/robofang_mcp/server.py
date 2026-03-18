"""
RoboFang MCP — thin FastMCP 3.1 server for Cursor/Antigrav.
Talks to the RoboFang bridge over HTTP; supports sampling, prompts, skills; no webapp.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Annotated, Any, Dict, Optional

from fastmcp import Context, FastMCP
from pydantic import Field

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
    sections: Annotated[
        Optional[str],
        Field(
            description="Comma-separated or 'all'. Include: activity, scheduling, config, hands, personas. Example: 'activity,personas' or 'all'. Omit for bridge health and connector summary only."
        ),
    ] = None,
    activity_limit: Annotated[
        int, Field(description="Max deliberations to include when sections includes activity.")
    ] = 20,
    logs_limit: Annotated[
        int, Field(description="Max log entries when sections includes activity.")
    ] = 50,
) -> Dict[str, Any]:
    """
    RoboFang status and optional deep inspection. No args: bridge health and connector summary only.

    Returns:
        dict: success, running, connectors_online; optional activity, scheduling, config, hands, personas when sections is set.
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
    category: Annotated[
        Optional[str], Field(description="Help category: tools, council, connection, skills.")
    ] = None,
    topic: Annotated[
        Optional[str], Field(description="Topic within category for full detail.")
    ] = None,
    depth: Annotated[
        Optional[str],
        Field(
            description="'0'=one-line summary, '1'=categories, '2'=topics per category, '3'=full category, 'full'=entire tree."
        ),
    ] = "2",
    path: Annotated[
        Optional[str],
        Field(description="Shortcut: e.g. 'council.use_council' sets category and topic."),
    ] = None,
) -> Dict[str, Any]:
    """
    Multi-level detailed help for RoboFang MCP. Returns categories, topics, or full topic detail depending on depth/category/topic/path.

    Returns:
        dict: help, usage, categories; or category, description, topics/topics_full; or category, topic, detail. On error: error, available.
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
    message: Annotated[
        str, Field(description="The question or instruction to send to the orchestrator.")
    ],
    use_council: Annotated[
        bool, Field(description="If true, run Council of Dozens synthesis.")
    ] = False,
    use_rag: Annotated[bool, Field(description="If true, augment with RAG context.")] = True,
    subject: Annotated[str, Field(description="Security subject; default guest.")] = "guest",
    persona: Annotated[
        str, Field(description="Personality name; default sovereign.")
    ] = "sovereign",
) -> Dict[str, Any]:
    """
    Send a message to the RoboFang orchestrator.

    Returns:
        dict: success; on success message (str), model (str); on failure error (str).
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
    Return the full fleet registry: connectors (live + config), domain agents, summary. Same data as GET /fleet on the Bridge.

    Returns:
        dict: success, connectors/config, domain agents, summary (structure from bridge /fleet).
    """
    return await fetch_fleet()


@mcp.tool()
async def robofang_deliberations(
    limit: Annotated[int, Field(description="Max number of deliberation entries to return.")] = 50,
) -> Dict[str, Any]:
    """
    Return recent reasoning log entries (Council/ReAct deliberation steps).

    Returns:
        dict: success; deliberations (list of entries), count (int).
    """
    return await fetch_deliberations(limit=limit)


# ─── Agentic tasks (routines) CRUD ──────────────────────────────────────────


@mcp.tool()
async def robofang_task_list() -> Dict[str, Any]:
    """
    List all RoboFang agentic tasks (routines): scheduled actions like yahboom patrol, dawn patrol.

    Returns:
        dict: success; routines (list of {id, name, time_local, recurrence, action_type, enabled, last_run}).
    """
    return await fetch_routines()


@mcp.tool()
async def robofang_task_get(
    routine_id: Annotated[str, Field(description="Routine id from robofang_task_list.")],
) -> Dict[str, Any]:
    """
    Get a single agentic task (routine) by id.

    Returns:
        dict: success; routine (id, name, time_local, recurrence, action_type, enabled, last_run, ...) or error.
    """
    return await fetch_routine(routine_id)


@mcp.tool()
async def robofang_task_create_from_phrase(
    phrase: Annotated[
        str,
        Field(
            description="Natural language task, e.g. 'yahboom robot patrol 7am daily', 'dawn patrol and report anomalies'."
        ),
    ],
    report_email: Annotated[
        Optional[str], Field(description="Optional email for report delivery.")
    ] = None,
    run_now: Annotated[
        bool, Field(description="If true, run the task immediately and return run result.")
    ] = False,
) -> Dict[str, Any]:
    """
    Create an agentic task from natural language. Bridge parses into name, time, recurrence, action_type.

    Returns:
        dict: success; created routine (id, name, ...) or, if run_now, run result (e.g. patrol report). On failure error.
    """
    return await create_routine_from_phrase(phrase, report_email=report_email, run_now=run_now)


@mcp.tool()
async def robofang_task_run_from_phrase(
    phrase: Annotated[
        str,
        Field(
            description="Natural language task to run now, e.g. 'start yahboom robot patrol and report anomalies'."
        ),
    ],
    report_email: Annotated[
        Optional[str], Field(description="Optional email for report delivery.")
    ] = None,
) -> Dict[str, Any]:
    """
    Start an agentic task from natural language and report back. Creates task if needed, runs now.

    Returns:
        dict: success; run result (patrol output, report, etc.) or error.
    """
    return await create_routine_from_phrase(phrase, report_email=report_email, run_now=True)


@mcp.tool()
async def robofang_task_run(
    routine_id: Annotated[str, Field(description="Routine id from robofang_task_list.")],
) -> Dict[str, Any]:
    """
    Run an existing agentic task (routine) by id once.

    Returns:
        dict: success; run result (e.g. patrol report) or error.
    """
    return await bridge_run_routine(routine_id)


@mcp.tool()
async def robofang_task_update(
    routine_id: Annotated[str, Field(description="Routine id to update.")],
    name: Annotated[Optional[str], Field(description="New name; omit to keep current.")] = None,
    time_local: Annotated[
        Optional[str], Field(description="New local time; omit to keep current.")
    ] = None,
    recurrence: Annotated[
        Optional[str], Field(description="New recurrence; omit to keep current.")
    ] = None,
    action_type: Annotated[
        Optional[str], Field(description="New action_type; omit to keep current.")
    ] = None,
    enabled: Annotated[
        Optional[bool], Field(description="Enable or disable; omit to keep current.")
    ] = None,
) -> Dict[str, Any]:
    """
    Update an agentic task (routine) by id. Pass only fields to change.

    Returns:
        dict: success; updated routine or error.
    """
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
    """
    Delete an agentic task (routine) by id.

    Returns:
        dict: success or error.
    """
    return await bridge_delete_routine(routine_id)


@mcp.tool()
async def robofang_bootstrap_check() -> Dict[str, Any]:
    """
    Check whether the RoboFang bridge is reachable and what state the stack is in.
    Use from IDE before the bridge is running to see connection status and next steps.
    Returns: bridge_url, bridge_reachable, service name/version if up, connectors count, and next_step hint.
    """
    from robofang_mcp._bridge import get_bridge_url

    bridge_url = get_bridge_url()
    out = await fetch_status()
    if out.get("success") and out.get("running"):
        return {
            "success": True,
            "bridge_url": bridge_url,
            "bridge_reachable": True,
            "service": out.get("service", "RoboFang-bridge"),
            "version": out.get("version", "?"),
            "connectors_online": out.get("connectors_online", 0),
            "connectors_total": out.get("connectors_total", 0),
            "next_step": "Bridge is up. Optional: start the Sovereign Hub (port 10864), run this MCP server for IDE access, or use robofang_bootstrap_guide for a full setup checklist.",
        }
    return {
        "success": True,
        "bridge_url": bridge_url,
        "bridge_reachable": False,
        "error": out.get("error", "Bridge not reachable"),
        "next_step": "Start the RoboFang bridge: from the RoboFang repo run `uv run python -m robofang.main` or `robofang-bridge` (default port 10871). Set ROBOFANG_BRIDGE_URL if the bridge runs elsewhere.",
    }


@mcp.tool()
async def robofang_bootstrap_guide(
    include_ide: Annotated[
        bool, Field(description="If true, include IDE (Cursor/Antigrav) and robofang-mcp steps.")
    ] = True,
) -> Dict[str, Any]:
    """
    Return a step-by-step setup guide for the RoboFang stack.

    Returns:
        dict: success, bridge_url, bridge_reachable, current_step (int), steps (list of {order, title, action, detail}), message.
    """
    from robofang_mcp._bridge import get_bridge_url

    bridge_url = get_bridge_url()
    status_out = await fetch_status()
    bridge_up = status_out.get("success") and status_out.get("running")

    steps = [
        {
            "order": 1,
            "title": "Start the RoboFang bridge",
            "action": "Run bridge (port 10871)",
            "detail": "From RoboFang repo: `uv run python -m robofang.main` or `robofang-bridge`. Set ROBOFANG_BRIDGE_URL if different.",
        },
        {
            "order": 2,
            "title": "Verify bridge",
            "action": "Call robofang_bootstrap_check or robofang_status",
            "detail": "Confirm bridge_reachable and connectors_online.",
        },
        {
            "order": 3,
            "title": "Optional: Sovereign Hub (dashboard)",
            "action": "Run hub on port 10864",
            "detail": "From repo: `cd robofang-hub; npm run dev` or use start.ps1. Hub talks to bridge for fleet, chat, deliberations.",
        },
        {
            "order": 4,
            "title": "Optional: robofang-mcp for IDE",
            "action": "Add robofang-mcp to Cursor/Antigrav",
            "detail": "Run `robofang-mcp` (stdio) or `robofang-mcp --sse` (port 10867). In client config: command `robofang-mcp`. Use robofang_ask, robofang_fleet, robofang_agentic_workflow.",
        },
        {
            "order": 5,
            "title": "Optional: robofang-mcp webapp",
            "action": "Run webapp backend (10761) and frontend (10760)",
            "detail": "See robofang-mcp/webapp/README.md for status and tool testing UI.",
        },
    ]
    if not include_ide:
        steps = [s for s in steps if s["order"] in (1, 2, 3)]

    current_step = 0
    if bridge_up:
        current_step = 2
        if include_ide:
            current_step = 4  # suggest IDE + webapp as next

    return {
        "success": True,
        "bridge_url": bridge_url,
        "bridge_reachable": bridge_up,
        "current_step": current_step,
        "steps": steps,
        "message": "Use robofang_bootstrap_check to re-check reachability anytime.",
    }


@mcp.tool()
async def robofang_agentic_workflow(
    goal: Annotated[
        str,
        Field(
            description="High-level goal in natural language, e.g. 'Summarize fleet status and suggest one improvement'."
        ),
    ],
    ctx: Context,
) -> str:
    """
    Achieve a high-level goal by planning and executing steps via the hub (sampling). Uses status, ask, fleet, deliberations as sub-tools.

    Returns:
        str: Summary of what was done and the outcome (or error message if the workflow failed).
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
def robofang_quick_start(
    bridge_url: Annotated[
        str, Field(description="Bridge base URL for SSE/API.")
    ] = "http://localhost:10871",
) -> str:
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
