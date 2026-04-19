file_path = "d:/dev/repos/robofang/robofang-mcp/src/robofang_mcp/server.py"
import re

with open(file_path, encoding="utf-8") as f:
    content = f.read()

# Replace robofang_task_*
tasks_str = """@mcp.tool()
async def robofang_tasks(
    operation: Annotated[str, Field(description="Operation to perform: list, get, create_from_phrase, run_from_phrase, run, update, delete")],
    routine_id: Annotated[str | None, Field(description="Routine id needed for get, run, update, delete")] = None,
    phrase: Annotated[str | None, Field(description="Natural language task phrasing needed for create_from_phrase, run_from_phrase")] = None,
    report_email: Annotated[str | None, Field(description="Optional email for report delivery")] = None,
    run_now: Annotated[bool, Field(description="Used in create_from_phrase")] = False,
    name: Annotated[str | None, Field(description="New name for update")] = None,
    time_local: Annotated[str | None, Field(description="New local time for update")] = None,
    recurrence: Annotated[str | None, Field(description="New recurrence for update")] = None,
    action_type: Annotated[str | None, Field(description="New action_type for update")] = None,
    enabled: Annotated[bool | None, Field(description="Enable or disable for update")] = None,
) -> dict[str, Any]:
    \"\"\"
    Manage RoboFang agentic tasks (routines). Uses FastMCP 3.2 Portmanteau pattern.
    \"\"\"
    if operation == "list":
        return await fetch_routines()
    elif operation == "get":
        if not routine_id: return {"error": "routine_id required for get"}
        return await fetch_routine(routine_id)
    elif operation == "create_from_phrase":
        if not phrase: return {"error": "phrase required for create_from_phrase"}
        return await create_routine_from_phrase(phrase, report_email=report_email, run_now=run_now)
    elif operation == "run_from_phrase":
        if not phrase: return {"error": "phrase required for run_from_phrase"}
        return await create_routine_from_phrase(phrase, report_email=report_email, run_now=True)
    elif operation == "run":
        if not routine_id: return {"error": "routine_id required for run"}
        return await bridge_run_routine(routine_id)
    elif operation == "update":
        if not routine_id: return {"error": "routine_id required for update"}
        return await bridge_update_routine(routine_id, name=name, time_local=time_local, recurrence=recurrence, action_type=action_type, enabled=enabled)
    elif operation == "delete":
        if not routine_id: return {"error": "routine_id required for delete"}
        return await bridge_delete_routine(routine_id)
    else:
        return {"error": f"Unknown operation: {operation}"}
"""

content = re.sub(
    r"@mcp\.tool\(\)\nasync def robofang_task_list.*?return await bridge_delete_routine\(routine_id\)\n\n",
    tasks_str + "\n\n",
    content,
    flags=re.DOTALL,
)


# Replace robofang_bootstrap_*
bootstrap_str = """@mcp.tool()
async def robofang_bootstrap(
    operation: Annotated[str, Field(description="Operation to perform: check, guide")],
    include_ide: Annotated[bool, Field(description="If true, include IDE steps for guide")] = True,
) -> dict[str, Any]:
    \"\"\"
    Bootstrap RoboFang MCP bridge reachability and setup guide. Uses FastMCP 3.2 Portmanteau pattern.
    \"\"\"
    from robofang_mcp._bridge import get_bridge_url
    bridge_url = get_bridge_url()
    out = await fetch_status()
    bridge_up = out.get("success") and out.get("running")

    if operation == "check":
        if bridge_up:
            return {
                "success": True,
                "bridge_url": bridge_url,
                "bridge_reachable": True,
                "service": out.get("service", "RoboFang-bridge"),
                "version": out.get("version", "?"),
                "connectors_online": out.get("connectors_online", 0),
                "connectors_total": out.get("connectors_total", 0),
                "next_step": "Bridge is up. Optional: start Sovereign Hub (port 10864)."
            }
        return {
            "success": True, "bridge_url": bridge_url, "bridge_reachable": False, "error": out.get("error", "Not reachable"),
            "next_step": "Start bridge: uv run python -m robofang.main"
        }
    elif operation == "guide":
        steps = [
            {"order": 1, "title": "Start bridge", "action": "Run bridge (10871)"},
            {"order": 2, "title": "Verify bridge", "action": "Call check"}
        ]
        if include_ide:
            steps.extend([
                {"order": 3, "title": "Optional: Hub", "action": "Run hub (10864)"},
                {"order": 4, "title": "Optional: IDE", "action": "Add robofang-mcp"}
            ])
        current_step = 2 if bridge_up else 0
        return {"success": True, "bridge_reachable": bridge_up, "steps": steps, "current_step": current_step}
    else:
        return {"error": f"Unknown operation: {operation}"}
"""

content = re.sub(
    r"@mcp\.tool\(\)\nasync def robofang_bootstrap_check.*?return \{.*?\n    \}\n",
    bootstrap_str + "\n",
    content,
    flags=re.DOTALL,
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
