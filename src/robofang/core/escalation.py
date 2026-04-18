"""
RoboFang/core/escalation.py
==========================
Service for managing agent help requests and fleet emergencies.
Enables agents to trigger notifications to human operators via Comms Connectors.
"""

import logging
from typing import Any

from robofang.messaging import _bridge as messaging_bridge

logger = logging.getLogger("robofang.core.escalation")


class Escalator:
    """Handles escalation requests from the fleet."""

    async def request_help(self, agent_id: str, reason: str, context: dict[str, Any] | None = None) -> bool:
        """
        Request human intervention for a specific agent.
        """
        message = f"Agent **{agent_id}** is requesting help.\n\n**Reason**: {reason}"
        if context:
            message += f"\n\n**Context**: {context}"

        logger.warning(f"Escalation triggered by {agent_id}: {reason}")
        return await messaging_bridge.send_emergency(message)

    async def report_fleet_health_issue(self, issues: list[str]) -> bool:
        """
        Broadcast a fleet-wide health issue.
        """
        issue_text = "\n".join([f"- {i}" for i in issues])
        message = f"Fleet health degradation detected:\n{issue_text}"

        logger.error(f"Fleet emergency broadcast: {len(issues)} issues reported.")
        return await messaging_bridge.send_emergency(message)


# Singleton
escalator = Escalator()
