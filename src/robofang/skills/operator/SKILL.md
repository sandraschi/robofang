# RoboFang Operator Skill

## What RoboFang does
RoboFang is a robotics orchestration hub: Fleet management, Council of Dozens reasoning,
voice bridge, connector management (13+ services), MCP agent discovery.

## Available tools
- **robofang_status** — health and connector summary
- **robofang_help** — multi-level help by category/topic
- **robofang_ask** — send message to orchestrator (use_council=True for Council of Dozens synthesis)
- **robofang_fleet** — fleet registry with connectors and domain agents
- **robofang_deliberations** — recent Council/ReAct reasoning log
- **robofang_agentic_workflow** — multi-step autonomous goals via sampling
- **robofang_shutdown** — graceful server shutdown
- **robofang_voice** — voice relay to kyutai-mcp

## Best practices
1. Start with robofang_status to confirm the Bridge is up
2. Use robofang_fleet to check connector availability before multi-step plans
3. Set use_council=True for complex decisions that need Enrich -> Execute -> Audit
4. Use robofang_agentic_workflow for multi-step goals that span status/ask/fleet
5. Check robofang_deliberations to review the reasoning log after council workflows
