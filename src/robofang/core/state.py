"""RoboFang State: Source of truth for the global Orchestrator singleton."""

import logging

from robofang.core.capability_tokens import ToolScope, get_authority
from robofang.core.container_runtime import LocalRuntime
from robofang.core.credential_vault import get_vault
from robofang.core.hand_manifest import HandAgentConfig, HandDefinition
from robofang.core.orchestrator import OrchestrationClient
from robofang.messaging import set_comms_storage
from robofang.plugins.collector_hand import CollectorHand
from robofang.plugins.robotics_hand import RoboticsHand
from robofang.plugins.routine_runner_hand import RoutineRunnerHand

logger = logging.getLogger(__name__)

# Global orchestrator instance
orchestrator = OrchestrationClient()
set_comms_storage(orchestrator.storage)

# ── New SOTA modules (2026-05-27: NanoClaw-inspired blueprint) ────────────

# 1. Agent Vault — credential injection proxy; agents never hold raw API keys
vault = get_vault(storage=orchestrator.storage)

# 2. Capability Authority — tools as explicit tokens, not global strings
authority = get_authority()

# 3. Container Runtime — abstraction for per-hand isolation (default: local)
hand_runtime = LocalRuntime(orchestrator.hands)

# Wire into orchestrator so execute_tool and ask() can use them
orchestrator.set_vault(vault)
orchestrator.set_authority(authority)
orchestrator.set_hand_runtime(hand_runtime)

# ── Register Autonomous Hands ────────────────────────────────────────────

_SYSTEM_HANDS = [
    (
        CollectorHand,
        HandDefinition(
            id="collector",
            name="Collector Hand",
            description="System Hand: Health & Knowledge",
            category="system",
            agent=HandAgentConfig(
                name="Collector",
                description="System monitoring agent",
                system_prompt="Monitor the fleet.",
            ),
        ),
        ["system_dtu_stage", "system_dtu_commit"],  # capability grants
    ),
    (
        RoboticsHand,
        HandDefinition(
            id="robotics",
            name="Robotics Hand",
            description="System Hand: Physical Interaction",
            category="system",
            agent=HandAgentConfig(
                name="Roboter",
                description="Physical interaction agent",
                system_prompt="Manage physical robotics.",
            ),
        ),
        ["system_dtu_stage"],
    ),
    (
        RoutineRunnerHand,
        HandDefinition(
            id="routine_runner",
            name="Routine Runner",
            description="Runs scheduled routines (e.g. dawn patrol 7am daily).",
            category="system",
            agent=HandAgentConfig(
                name="RoutineRunner",
                description="Wall-clock scheduler for routines",
                system_prompt="Run user routines at scheduled time.",
            ),
        ),
        ["system_request_human_intervention"],
    ),
]

for hand_class, definition, capabilities in _SYSTEM_HANDS:
    hand = hand_class(definition)
    orchestrator.hands.register_hand(hand)
    # Issue capability tokens for each system hand AND store on the hand object
    for tool_name in capabilities:
        token = authority.issue(
            subject_id=definition.id,
            tool_name=tool_name,
            scope=ToolScope.EXECUTE,
        )
        hand.set_capability(tool_name, token)
    logger.info("System hand '%s' registered with %d capabilities.", definition.id, len(capabilities))

# Issue wildcard capability for orchestrator:root (admin)
authority.issue(
    subject_id="orchestrator:root",
    tool_name="*",
    scope=ToolScope.ADMIN,
)

# Issue broad capability for agent:cortex (default subject)
authority.issue(
    subject_id="agent:cortex",
    tool_name="*",
    scope=ToolScope.EXECUTE,
)
