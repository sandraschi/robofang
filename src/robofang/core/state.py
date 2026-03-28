"""RoboFang State: Source of truth for the global Orchestrator singleton."""

import logging

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

# Register Autonomous Hands
orchestrator.hands.register_hand(
    CollectorHand(
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
        )
    )
)

orchestrator.hands.register_hand(
    RoboticsHand(
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
        )
    )
)

orchestrator.hands.register_hand(
    RoutineRunnerHand(
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
        )
    )
)
