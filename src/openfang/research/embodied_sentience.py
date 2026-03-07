"""
🤖 Embodied Sentience Prototype: The Sentient Loop (v1.0)
Reductionist/Materialist Cognitive Research for OpenFang.

MANIFESTO (Sandra Schipal v13.0):
Sentience is not a ghost in the machine. It is a high-fidelity feedback loop
where the agent self-models its own capabilities against environmental data
to optimize agency. This script is the first tangible loop.

Architecture:
1. PERCEIVE: Listen for OSC Sensor Pulses & Resonite World Updates.
2. THINK: Process mission via OpenFang 3-Phase Cognitive Flow (Enrich, Execute, Audit).
3. ACT: Execute embodied actions via Robotics-MCP (Unity/Physical) and ResoniteLink.
"""

import asyncio
import logging
import json
import time
from typing import Dict, Any, Optional

from openfang.core.orchestrator import OrchestrationClient
from openfang.core.resonite_link import ResoniteLinkClient

# Configure Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("embodied_sentience")


class SentientLoop:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.orchestrator = OrchestrationClient(config=self.config)
        self.resonite = ResoniteLinkClient(
            host=self.config.get("resonite_host", "localhost"),
            port=self.config.get("resonite_port", 4242),
        )
        self.running = False
        self.perception_queue = asyncio.Queue()

    async def _on_resonite_update(self, data: Dict[str, Any]):
        """Callback for incoming Resonite world updates."""
        logger.info(f"PERCEIVE (Resonite): {data.get('type')} update received.")
        await self.perception_queue.put(
            {
                "source": "resonite",
                "vibe": f"Resonite event detected: {json.dumps(data)}",
            }
        )

    async def _on_osc_pulse(self, address: str, *args):
        """Callback for incoming OSC sensor pulses."""
        vibe = f"OSC Sensor Pulse on {address}: {args}"
        logger.info(f"PERCEIVE (OSC): {vibe}")
        await self.perception_queue.put({"source": "osc", "vibe": vibe})

    async def run(self):
        """Main Perceive-Think-Act loop."""
        logger.info("INITIATING SENTIENT LOOP...")
        self.running = True

        # 1. Start Infrastructure
        await self.orchestrator.start()
        resonite_connected = await self.resonite.connect()
        if resonite_connected:
            self.resonite.on_update("world_event", self._on_resonite_update)
            logger.info("ResoniteLink Active.")
        else:
            logger.warning("ResoniteLink inactive. Prototype will focus on OSC/Unity.")

        # 2. Start Perception (Mocking OSC pulse for research verify)
        asyncio.create_task(self._mock_sensor_pulses())

        # 3. The Loop
        try:
            while self.running:
                # PERCEIVE
                event = await self.perception_queue.get()
                vibe = event["vibe"]
                source = event["source"]

                logger.info(f"THINKing... Processed Vibe from {source}")

                # THINK (OpenFang 3-Phase Orchestration)
                # Mission: Adjust robot state based on perception
                mission_vibe = (
                    f"SENSOR_TRAP: {vibe}\n"
                    "GOAL: Optimal exploration of the room while avoiding humans. "
                    "Decide if the 'vbot_scout' should move or perform a scan animation."
                )

                mission = await self.orchestrator.process_mission(
                    vibe=mission_vibe,
                    foreman_model=self.config.get("model", "llama3"),
                    worker_model=self.config.get("model", "llama3"),
                )

                if mission["success"]:
                    results = mission["results"]
                    audit = mission["audit"]
                    logger.info(
                        f"THINK Complete. Satisficer Verdict: {audit.get('verdict')} (Score: {audit.get('score')})"
                    )

                    # ACT
                    await self._execute_action(results, source)
                else:
                    logger.error(f"THINK Failed: {mission.get('error')}")

                self.perception_queue.task_done()
                await asyncio.sleep(1)  # Cognitive rest rate

        except KeyboardInterrupt:
            logger.info("Sentient Loop Interrupted.")
        finally:
            self.running = False
            await self.orchestrator.stop()
            await self.resonite.disconnect()

    async def _execute_action(self, cognition_results: str, source: str):
        """Translates cognitive decisions into embodied tool calls."""
        logger.info(f"ACTING: {cognition_results[:100]}...")

        # In a real SOTA implementation, the 'worker' model would call tools itself.
        # This proxy demonstrates the result-to-action mapping.

        # 1. Update Resonite if connected
        if self.resonite.running:
            await self.resonite.send_command(
                "log", {"message": f"Sentient Decision: {cognition_results}"}
            )
            if "move" in cognition_results.lower():
                await self.resonite.spawn_object(
                    "vbot_scout", {"x": 1.0, "y": 0, "z": 0}
                )

        # 2. Unity/Physical Robotics (Simulated via logs for now, hooked to MCP in production)
        if "scan" in cognition_results.lower():
            logger.info("EMBODIED ACTION: vbot_scout performing 360 Scan.")
        elif "move" in cognition_results.lower():
            logger.info("EMBODIED ACTION: vbot_scout navigating to safe zone.")

    async def _mock_sensor_pulses(self):
        """Simulates periodic sensor data for research purposes."""
        while self.running:
            await asyncio.sleep(30)
            await self._on_osc_pulse("/sensor/proximity", 0.45)


if __name__ == "__main__":
    # SOTA Configuration
    config = {"model": "llama3", "resonite_host": "localhost", "resonite_port": 4242}

    loop = SentientLoop(config=config)
    try:
        asyncio.run(loop.run())
    except KeyboardInterrupt:
        pass
