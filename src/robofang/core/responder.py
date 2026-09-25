"""
RoboFang Emergency Responder: AED (Autonomous Emergency Dispatch) Logic.
Coordinates multi-sensor verification and telephony escalation.

SAFETY: a real emergency call is only placed when ALL of these hold:
  - verification positively confirms fire (vision check - NOT implemented yet, so
    verification currently always fails closed and no call is ever placed);
  - ROBOFANG_AED_LIVE_DISPATCH=1;
  - a real dispatch address is configured (config "aed_location" or ROBOFANG_AED_LOCATION).
Otherwise the dispatch is logged as a dry run.
"""

import logging
import os
from typing import Any

logger = logging.getLogger("robofang.core.responder")


class EmergencyResponder:
    """
    Handles critical safety escalation.
    Triggers: Level 4 Environmental Events (e.g. 180°C heat).
    Verification Loop: Sensor -> Yahboom POV -> VLM -> Telephony.
    """

    def __init__(self, orchestrator: Any):
        self.orchestrator = orchestrator
        self.active_emergencies: set[str] = set()

    async def handle_environmental_alert(self, sensor_id: str, value: float, threshold: float):
        """
        Main entry point for Level 4 alerts.
        """
        if sensor_id in self.active_emergencies:
            return

        self.active_emergencies.add(sensor_id)
        try:
            logger.warning(f"CRITICAL EMERGENCY TRIGGERED: {sensor_id} reported {value} (Threshold: {threshold})")

            # 1. Immediate Private Notification (Non-public)
            msg = f"[AED] Kritisches Brandereignis detektiert: {sensor_id} ({value}°C). Starte Roboter-Verifizierung."
            try:
                await self.orchestrator.hands.call_tool("moltbook", "send_dm", {"to": "sandraschi", "message": msg})
            except Exception as e:
                logger.error(f"AED private notification failed: {e}")

            # 2. Multi-Bot Verification (Yahboom POV)
            if not await self._verify_threat_with_robot(sensor_id):
                logger.info("AED verification did not confirm fire. Aborting dispatch.")
                return

            # 3. Final Authority Dispatch (Telephony)
            await self._initiate_public_dispatch(sensor_id, value)
        finally:
            self.active_emergencies.discard(sensor_id)

    async def _verify_threat_with_robot(self, target_sensor: str) -> bool:
        """
        Sends the Yahboom Raspbot to POV verify.
        Note: SLAM is WIP, using directional/mission-based movement.
        """
        logger.info(f"Engaging Yahboom Raspbot for POV verification of {target_sensor}")
        try:
            # TODO: map sensor_id -> room from fleet_config
            room_name = "Serverraum"
            await self.orchestrator.hands.call_tool(
                "yahboom",
                "yahboom_agentic_workflow",
                {"goal": f"Fahre in den {room_name} und richte die Kamera auf den Brandherd."},
            )
        except Exception as e:
            logger.error(f"Verification mission failed: {e}")
            return False

        # Fail closed: there is no snapshot + vision (VLM) fire/smoke check yet, and an
        # unverified alarm must never reach the fire brigade.
        logger.warning("AED vision verification not implemented - failing closed (no dispatch).")
        return False

    async def _initiate_public_dispatch(self, sensor_id: str, value: float):
        """
        Places the telephony call in German - only when explicitly enabled and a real address is configured.
        """
        config = getattr(self.orchestrator, "config", {}) or {}
        location = config.get("aed_location") or os.getenv("ROBOFANG_AED_LOCATION", "")
        live = os.getenv("ROBOFANG_AED_LIVE_DISPATCH") == "1"
        if not live or not location:
            logger.critical(
                f"AED DRY RUN - would dispatch fire brigade (122) for {sensor_id} at {value}°C "
                f"(live={live}, location_configured={bool(location)})"
            )
            return

        logger.critical(f"INITIATING FIRST RESPONDER DISPATCH for {sensor_id}")
        template = await self.orchestrator.hands.call_tool(
            "telephony",
            "get_emergency_template",
            {"event_type": "Brand", "location": location, "details": f"{value} Grad Celsius"},
        )
        result = await self.orchestrator.hands.call_tool(
            "telephony",
            "place_call",
            {"to": "122", "message": template, "language": "de-AT"},  # 122 = fire brigade (AT)
        )
        logger.info(f"Dispatch status: {result}")
