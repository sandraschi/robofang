"""RoboFang Orchestrator: Internal gateway for fleet management and tool coordination."""

import asyncio
import collections
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, ClassVar

from robofang.bridges.journal_bridge import JournalBridge
from robofang.core.difficulty import assess_difficulty
from robofang.core.dtu import dtu as _dtu
from robofang.core.escalation import escalator as _escalator
from robofang.core.hands import HandsManager
from robofang.core.installer import HandInstaller
from robofang.core.knowledge import KnowledgeEngine
from robofang.core.lifecycle import LifecycleManager
from robofang.core.llm_routing import (
    get_capacity_hint,
    resolve_models_for_council,
)
from robofang.core.moltbook import MoltbookClient
from robofang.core.openfang_adapter import resolve as openfang_resolve
from robofang.core.personality import PersonalityEngine
from robofang.core.plugins import PluginManager
from robofang.core.reasoning import ReasoningEngine
from robofang.core.responder import EmergencyResponder
from robofang.core.routines import (
    create_routine as _create_routine,
)
from robofang.core.routines import (
    delete_routine as _delete_routine,
)
from robofang.core.routines import (
    get_routine as _get_routine,
)
from robofang.core.routines import (
    list_routines as _list_routines,
)
from robofang.core.routines import (
    mark_run as _mark_routine_run,
)
from robofang.core.routines import (
    should_run_now as _routine_should_run_now,
)
from robofang.core.routines import (
    update_routine as _update_routine,
)
from robofang.core.security import SecurityManager
from robofang.core.security_secrets import SecretsManager
from robofang.core.skills import SkillManager
from robofang.core.speech import SpeechHandler
from robofang.core.storage import RoboFangStorage

logger = logging.getLogger(__name__)

# Resolve templates relative to the package root (src/RoboFang/../../templates)
_PKG_ROOT = Path(__file__).parent.parent.parent.parent  # repo root


class _OrchestratorMemory:
    """Key-value memory backed by storage fleet_config for PA/hand metrics."""

    _PREFIX = "mem_"

    def __init__(self, storage: RoboFangStorage):
        self._storage = storage

    def store(self, key: str, value: Any) -> None:
        self._storage.set_fleet_config(self._PREFIX + key, value)

    def recall(self, key: str) -> Any | None:
        return self._storage.get_fleet_config(self._PREFIX + key)


class OrchestrationClient:
    """
    Sovereign replacement for the legacy OpenClaw Gateway.
    Handles tool routing, fleet state, and cross-server communication.
    """

    SENSITIVE_TOOLS: ClassVar[set[str]] = {
        "connector_email",
        "connector_discord",
        "connector_moltbook",
        "skill_delete_file",  # hypothetical
        "skill_mutate_config",  # hypothetical
    }

    def __init__(
        self,
        config: dict[str, Any] | None = None,
        fleet_config_path: Path | None = None,
        storage: RoboFangStorage | None = None,
    ):
        self.config = config or {}
        self.fleet_config_path = fleet_config_path or (_PKG_ROOT / "configs" / "federation_map.json")
        self.logger = logging.getLogger("robofang.orchestrator")
        self.topology: dict[str, Any] = {}
        self.connectors: dict[str, Any] = {}
        self._last_breeze_at: float = 0.0
        self.storage = storage or RoboFangStorage()
        self.moltbook = MoltbookClient(api_key=self.config.get("moltbook_api_key"))
        self.reasoning = ReasoningEngine(ollama_url=self.config.get("ollama_url", "http://localhost:11434"))
        self.skills = SkillManager()
        self.security = SecurityManager(storage=self.storage)
        self.secrets = SecretsManager(storage=self.storage)
        self.personality = PersonalityEngine(storage=self.storage)
        self.knowledge = KnowledgeEngine(storage=self.storage)
        self.memory = _OrchestratorMemory(storage=self.storage)
        self.hands = HandsManager(self)
        self.responder = EmergencyResponder(self)
        self._active_tasks: set[asyncio.Task] = set()

        # New Core Logic Extensions (RoboFang Evolution)
        # Installer paths: env wins; else cwd so install works wherever the bridge is started from.
        hands_dir_env = os.environ.get("ROBOFANG_HANDS_DIR")
        manifest_env = os.environ.get("ROBOFANG_FLEET_MANIFEST")
        if hands_dir_env and manifest_env:
            manifest_path = Path(manifest_env)
            hands_base_dir = Path(hands_dir_env)
            self.logger.info(
                "Using installer paths from env: manifest=%s hands_dir=%s",
                manifest_path,
                hands_base_dir,
            )
        else:
            cwd = Path.cwd()
            manifest_path = cwd / "fleet_manifest.yaml"
            hands_base_dir = cwd / "hands"
            self.logger.info(
                "Using installer paths from cwd: manifest=%s hands_dir=%s "
                "(set ROBOFANG_FLEET_MANIFEST and ROBOFANG_HANDS_DIR to override)",
                manifest_path,
                hands_base_dir,
            )
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.installer = HandInstaller(manifest_path=manifest_path, hands_base_dir=hands_base_dir)
        self.lifecycle = LifecycleManager(self)
        self.dtu = _dtu
        self.escalator = _escalator

        # Load bundled and specialized hands
        plugins_dir = _PKG_ROOT / "src" / "robofang" / "plugins"
        self.hands.load_hands_from_dir(str(plugins_dir))
        self.hands.load_hands_from_dir(str(plugins_dir / "bundled"))
        self.running = False
        self.heartbeat_task: asyncio.Task | None = None
        self.slow_task: asyncio.Task | None = None

        # Reasoning Log (Forensics Ring Buffer)
        self.reasoning_log = collections.deque(maxlen=100)

        self._load_topology()
        self._init_connectors()
        adn_connector = self.connectors.get("advanced-memory")
        self.journal_bridge = JournalBridge(adn_connector)

        speech_connector = self.connectors.get("speech")
        self.speech_handler = SpeechHandler(speech_connector)

        self._tool_registry: dict[str, Any] = {}
        self._build_tool_bridge()
        # MCP per-tool discovery: mcp_<connector>_<tool_name> entries added by bridge after startup
        self._mcp_tool_prefix = "mcp_"
        # Optional: set by bridge for routines (yahboom invoke, email send)
        self._connector_invoker: Any | None = None
        self._email_sender: Any | None = None
        # Optional: set by bridge for inbox (process message -> reply text)
        self._inbox_processor: Any | None = None

    def _build_tool_bridge(self):
        """Flattens connectors and skills into a searchable tool registry."""
        # 1. Register Skills as Tools
        for skill in self.skills.list_skills():
            self._tool_registry[f"skill_{skill['id']}"] = {
                "type": "skill",
                "id": skill["id"],
                "description": skill.get("description", "Sovereign skill"),
            }

        # 2. Register Connector Operations
        for name, connector in self.connectors.items():
            # Basic discovery of callable operations
            # In a real SOTA implementation, connectors would define their tool schema
            self._tool_registry[f"connector_{name}"] = {
                "type": "connector",
                "instance": connector,
                "description": f"Fleet connector for {name}",
            }
        # 3. Register System Management Tools (DTU, Escalation)
        self._tool_registry["system_request_human_intervention"] = {
            "type": "system",
            "handler": self.escalator.request_help,
            "description": (
                "Request immediate human intervention/help. Use when stuck, blocked, "
                "or in case of critical error. Parameters: reason(str), context(dict)."
            ),
        }
        self._tool_registry["system_dtu_stage"] = {
            "type": "system",
            "handler": self.dtu.stage_change,
            "description": (
                "Stage a file modification in the DTU shadow proxy for auditing. "
                "Parameters: target_base(str), rel_path(str), content(str)."
            ),
        }
        self._tool_registry["system_dtu_commit"] = {
            "type": "system",
            "handler": self.dtu.commit_all,
            "description": "Commit all staged DTU shadow files to the real volume. Parameters: target_base(str).",
        }

        self.logger.info(f"Tool Bridge built with {len(self._tool_registry)} tools.")

    def clear_mcp_tools(self) -> None:
        """Remove all mcp_* entries from the tool registry (before refreshing from backends)."""
        to_remove = [k for k in self._tool_registry if k.startswith(self._mcp_tool_prefix)]
        for k in to_remove:
            del self._tool_registry[k]
        if to_remove:
            self.logger.info("Cleared %d MCP tool entries.", len(to_remove))

    def register_mcp_tools(self, connector_id: str, tools: list[dict[str, Any]]) -> None:
        """Register per-tool entries for a FastMCP 3.1 backend so the council can call them by name."""
        for t in tools:
            name = t.get("name") or t.get("title") or ""
            if not name or not isinstance(name, str):
                continue
            desc = t.get("description") or ""
            if not desc:
                desc = f"MCP tool {name} ({connector_id}). FastMCP 3.1; use agentic_workflow for multi-step goals."
            elif "agentic" not in desc.lower() and "workflow" not in desc.lower():
                desc = f"{desc.rstrip('.')} (FastMCP 3.1; prefer agentic_workflow for multi-step goals in this domain.)"
            key = f"{self._mcp_tool_prefix}{connector_id}_{name}"
            self._tool_registry[key] = {
                "type": "mcp",
                "connector": connector_id,
                "mcp_tool": name,
                "description": desc,
            }
        self.logger.info("Registered %d MCP tools for connector %s.", len(tools), connector_id)

    def _load_topology(self):
        """Loads the current fleet topology from the federation map."""
        if self.fleet_config_path.exists():
            try:
                with open(self.fleet_config_path, encoding="utf-8") as f:
                    self.topology = json.load(f)
                self.logger.info(f"Topology loaded from {self.fleet_config_path}")
            except Exception as e:
                self.logger.error(f"Failed to load topology: {e}")
        else:
            self.logger.warning(f"Topology map not found at {self.fleet_config_path}")

    def _init_connectors(self):
        """Initialize enabled connectors lazily using the PluginManager.

        Priority for determining which connectors to enable:
        1. ROBOFANG_CONNECTORS env var (comma-separated, e.g. "moltbook,resonite")
        2. topology["enabled_connectors"] list in federation_map.json
        3. topology["connectors"][name]["enabled"] == True in federation_map.json
        4. Empty — no connectors started (explicit opt-in required)
        """
        manager = PluginManager()
        discovered = manager.discover_connectors()

        import os

        # Priority 1: env var
        enabled_str = os.getenv("ROBOFANG_CONNECTORS")
        if enabled_str:
            enabled_list = [s.strip() for s in enabled_str.split(",") if s.strip()]
            self.logger.info(f"Connectors from ROBOFANG_CONNECTORS env: {enabled_list}")
        # Priority 2: explicit list in federation map
        elif self.topology.get("enabled_connectors"):
            enabled_list = self.topology["enabled_connectors"]
            self.logger.info(f"Connectors from federation_map enabled_connectors: {enabled_list}")
        # Priority 3: derive from connectors.{name}.enabled == True
        elif self.topology.get("connectors"):
            enabled_list = [
                name
                for name, cfg in self.topology["connectors"].items()
                if isinstance(cfg, dict) and cfg.get("enabled", False)
            ]
            self.logger.info(f"Connectors derived from federation_map connectors.*.enabled: {enabled_list}")
        else:
            enabled_list = []
            self.logger.info("No connectors configured — starting with zero connectors.")

        for conn_type in enabled_list:
            if conn_type not in discovered:
                self.logger.warning(f"Enabled connector '{conn_type}' not found in plugin registry — skipping.")
                continue

            conn_class = manager.load_connector(conn_type)
            if not conn_class:
                self.logger.error(f"Failed to load enabled connector: {conn_type}")
                continue

            # Per-connector config: federation_map.connectors.{name} merged with top-level config
            federation_cfg = {}
            if self.topology.get("connectors", {}).get(conn_type):
                federation_cfg = dict(self.topology["connectors"][conn_type])
                federation_cfg.pop("enabled", None)  # strip the flag itself

            if conn_type == "social" and "social" in self.config:
                for platform, cfg in self.config["social"].items():
                    self.connectors[platform] = conn_class(platform, cfg)
            else:
                cfg = {**federation_cfg, **self.config.get(conn_type, {})}
                self.connectors[conn_type] = conn_class(conn_type, cfg)

        self.logger.info(f"Initialized {len(self.connectors)} connector(s): {list(self.connectors.keys()) or 'none'}")

    async def start(self):
        self.logger.info("Starting RoboFang Orchestrator...")
        self.running = True
        t0 = time.perf_counter()
        n_conn = len(self.connectors)
        for name, connector in self.connectors.items():
            try:
                await connector.connect()
            except Exception as e:
                self.logger.error("Connector '%s' failed to connect: %s", name, e)
        self.logger.info(
            "Orchestrator: %d connector(s) connect attempted (%.2fs)",
            n_conn,
            time.perf_counter() - t0,
        )

        # Greet the commander
        self.logger.info("RoboFang systems active. Greeting commander...")
        await self.speak("Good morning, commander. RoboFang systems are active. Fleet readiness is nominal.")

        # Start periodic loops: fast (reconnect/pulse), slow (inbox, etc.), and safety (AED)
        self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        self.slow_task = asyncio.create_task(self._slow_loop())
        self.safety_task = asyncio.create_task(self._safety_monitor_loop())

        t1 = time.perf_counter()
        await self.hands.start()
        self.logger.info("Orchestrator: hands.start done (%.2fs)", time.perf_counter() - t1)
        t2 = time.perf_counter()
        await self.lifecycle.start()
        self.logger.info(
            "Orchestrator: lifecycle.start done (%.2fs total start %.2fs)",
            time.perf_counter() - t2,
            time.perf_counter() - t0,
        )

    async def stop(self):
        self.logger.info("Stopping Orchestrator...")
        self.running = False
        for _, task in [
            ("heartbeat", self.heartbeat_task),
            ("slow", self.slow_task),
            ("safety", self.safety_task),
        ]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        for name, connector in self.connectors.items():
            try:
                await connector.disconnect()
            except Exception as e:
                self.logger.error(f"Connector '{name}' failed to disconnect: {e}")
        await self.moltbook.close()
        await self.reasoning.close()
        await self.hands.stop()
        await self.lifecycle.stop()

    async def _heartbeat_loop(self):
        """Main proactive loop for agent self-reflection and fleet pulse."""
        self.logger.info("[ORCHESTRATOR] Heartbeat loop started.")
        while self.running:
            try:
                # 1. Check connector health (iterate self.connectors, not a nonexistent connector_manager)
                for name, connector in self.connectors.items():
                    if not getattr(connector, "active", False):
                        self.logger.warning(f"Connector '{name}' reports inactive — attempting reconnect.")
                        try:
                            await connector.connect()
                        except Exception as e:
                            self.logger.error(f"Reconnect failed for '{name}': {e}")

                # 2. Soul Synthesis: assemble system prompt from templates
                templates_dir = _PKG_ROOT / "templates"
                system_prompt_parts = []
                for tmpl_name in ("SOUL.md", "HEART.md", "BODY.md"):
                    tmpl_path = templates_dir / tmpl_name
                    if tmpl_path.exists():
                        system_prompt_parts.append(
                            f"## {tmpl_name.replace('.md', '')}\n" + tmpl_path.read_text(encoding="utf-8")
                        )
                if system_prompt_parts:
                    self.logger.debug(f"Soul synthesis loaded {len(system_prompt_parts)} template(s).")

                # 3. Pulse Reflection: Summarize fleet status and "think"
                if self.moltbook.client:
                    try:
                        persona_list = list(self.personality.personas.keys())
                        status_summary = (
                            f"[RoboFang Pulse] Personas active: {persona_list}. "
                            f"Connectors: {list(self.connectors.keys())}. "
                            "Fleet is in a state of high-readiness."
                        )
                        await self.moltbook.post("/post", {"content": status_summary})
                        self.logger.info("Pulse reflection posted to Moltbook.")
                    except Exception as e:
                        self.logger.warning(f"Pulse reflection skipped: {e}")

                # 4. Lifecycle Slumber Check
                await self.lifecycle.check_slumber()

                await asyncio.sleep(30)  # Reconnect / pulse every 30s

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Heartbeat error: {e}")
                await asyncio.sleep(10)

        self.logger.info("[ORCHESTRATOR] Heartbeat loop stopped.")

    # Interval for slow periodic tasks (e.g. inbox check)
    SLOW_INTERVAL_S = 300  # 5 minutes

    async def _slow_loop(self):
        """Runs at lower frequency (e.g. every 5 min): inbox check, heavy polls."""
        self.logger.info("[ORCHESTRATOR] Slow loop started (interval=%ss).", self.SLOW_INTERVAL_S)
        while self.running:
            try:
                await asyncio.sleep(self.SLOW_INTERVAL_S)
                if not self.running:
                    break
                # Inbox check: email connector get_messages if present; process via bridge processor
                email_conn = self.connectors.get("email")
                if email_conn and getattr(email_conn, "active", False):
                    try:
                        messages = await email_conn.get_messages(limit=20)
                        if messages and self._inbox_processor:
                            for msg in messages:
                                body = msg.get("body") or msg.get("text") if isinstance(msg, dict) else str(msg)
                                if not body:
                                    continue
                                try:
                                    reply = await self._inbox_processor(body)
                                    self.logger.info("[ORCHESTRATOR] Inbox processed, reply: %s", reply[:80])
                                    if getattr(email_conn, "reply", None) and isinstance(msg, dict) and msg.get("id"):
                                        await email_conn.reply(msg["id"], reply)
                                except Exception as e:
                                    self.logger.warning("Inbox message process failed: %s", e)
                        elif messages:
                            self.logger.info(
                                "[ORCHESTRATOR] Inbox poll: %d message(s) (no processor).",
                                len(messages),
                            )
                    except Exception as e:
                        self.logger.warning("Inbox poll skipped: %s", e)

                # Discord agents channel: "shoot the breeze" when idle (optional)
                discord_conn = self.connectors.get("discord")
                agents_channel_id = self.topology.get("connectors", {}).get("discord", {}).get(
                    "agents_channel_id"
                ) or os.getenv("ROBOFANG_DISCORD_AGENTS_CHANNEL_ID")
                if agents_channel_id and discord_conn and getattr(discord_conn, "active", False):
                    try:
                        agents_channel_id = str(agents_channel_id).strip()
                        if agents_channel_id and (time.monotonic() - self._last_breeze_at) >= 600:
                            breeze_prompt = (
                                "You are a RoboFang agent with a moment of downtime. "
                                "Write one short, casual sentence to post in the team Discord (shoot the breeze). "
                                "No commands, no code. Just a thought or observation. Reply with only that sentence."
                            )
                            result = await self.reasoning.ask(breeze_prompt)
                            if result.get("success") and result.get("response"):
                                content = (result["response"] or "").strip()[:500]
                                if content:
                                    ok = await discord_conn.send_message(agents_channel_id, content)
                                    if ok:
                                        self._last_breeze_at = time.monotonic()
                                        self.logger.info("Agents breeze posted to Discord.")
                    except Exception as e:
                        self.logger.debug("Discord agents breeze skipped: %s", e)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error("Slow loop error: %s", e)
                await asyncio.sleep(60)
        self.logger.info("[ORCHESTRATOR] Slow loop stopped.")

    async def _safety_monitor_loop(self):
        """High-frequency loop (10s) for critical AED (Autonomous Emergency Dispatch) monitoring."""
        self.logger.info("[ORCHESTRATOR] Safety monitor loop started.")
        while self.running:
            try:
                # 1. Poll Netatmo / Environmental Sensors for Level 4 Triggers
                # We target sensors that might report the 180C threshold
                netatmo = self.connectors.get("netatmo")  # Example connector name
                if netatmo and getattr(netatmo, "active", False):
                    # Call a discovery or health tool to get latest telemetry
                    # In RoboFang, we use the hands_manager to call tools via the bridge
                    try:
                        # Hypothetical tool name from devices-mcp
                        data = await self.hands.call_tool("mcp_devices-mcp_get_thermal_telemetry", {})
                        if data and isinstance(data, dict):
                            for sensor_id, val in data.items():
                                if val >= 180:
                                    # Trigger the responder
                                    task = asyncio.create_task(
                                        self.responder.handle_environmental_alert(
                                            sensor_id=sensor_id, value=val, threshold=180
                                        )
                                    )
                                    self._active_tasks.add(task)
                                    task.add_done_callback(self._active_tasks.discard)
                    except Exception as e:
                        self.logger.debug(f"Safety poll fail (mcp_devices-mcp): {e}")

                await asyncio.sleep(10)  # 10 second safety pulse
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Safety monitor error: {e}")
                await asyncio.sleep(10)
        self.logger.info("[ORCHESTRATOR] Safety monitor loop stopped.")

    async def register_agent(self, body: dict[str, Any]) -> dict[str, Any]:
        """Register a new agent with Moltbook."""
        self.logger.info(f"Registering agent: {body.get('name')}")
        return await self.moltbook.post("/register", body)

    async def get_moltbook_feed(self) -> dict[str, Any]:
        """Fetch the Moltbook feed."""
        return await self.moltbook.get("/feed")

    async def onboard_hand(self, hand_id: str) -> dict[str, Any]:
        """Install a new Hand from the fleet manifest."""
        result = self.installer.install(hand_id)
        if result["success"]:
            # Reload hands to discover the new one
            base = self.installer.hands_base_dir
            self.hands.load_hands_from_dir(str(base))
        return result

    async def ask(
        self,
        prompt: str,
        use_council: bool = False,
        subject: str = "guest",
        persona: str = "sovereign",
        use_rag: bool = True,
        refine_prompt: bool = False,
        priority: str = "asap",
    ) -> dict[str, Any]:
        """Live reasoning via the reasoning engine with optional RAG context."""
        if not await self.security.is_authorized(subject, "reasoning:ask"):
            return {
                "success": False,
                "error": f"Subject '{subject}' is not authorized for reasoning:ask",
            }

        # --- SECURITY MOAT: Bastio Prompt Injection Defense ---
        if not await self.security.validate_prompt(prompt, orchestrator=self):
            return {
                "success": False,
                "error": "SECURITY_REJECTION: Bastio has detected a potential prompt injection or malicious intent.",
            }

        # 0. Difficulty assessment (simple vs ambitious → route to single vs council)

        difficulty = assess_difficulty(prompt)
        effective_council = use_council
        if not use_council and difficulty["suggest_council"]:
            effective_council = True
            self.logger.info(
                "Difficulty %s (score %s): auto-upgrading to Council for this request.",
                difficulty["level"],
                difficulty["score"],
            )
        elif use_council and difficulty["level"] == "simple":
            self.logger.info("Difficulty simple; user requested Council — using Council as requested.")
        self._log_reasoning(
            "Ask",
            "thought",
            (
                f"Ask started — difficulty {difficulty['level']} "
                f"(score {difficulty['score']}), council={effective_council}."
            ),
        )

        # 1. Prompt Refinement (Optional Phase 0)
        final_prompt = prompt
        if refine_prompt:
            self.logger.info(f"Refining prompt for subject {subject}")
            refinement = await self.reasoning.refine_prompt(prompt)
            if refinement["success"]:
                final_prompt = refinement["response"]
                self.logger.info("Prompt refined successfully.")
            else:
                self.logger.warning(f"Prompt refinement failed: {refinement.get('error')}")

        # 2. Personality: Get the system prompt
        system_prompt = self.personality.get_system_prompt(persona)

        # 3. Knowledge: Perform Auto-RAG if enabled
        context = ""
        if use_rag:
            if await self.security.is_authorized(subject, "knowledge:search"):
                context = await self.knowledge.get_context(final_prompt, orchestrator=self)
                self.logger.info(f"Auto-RAG: Context retrieved for {subject}")
            else:
                self.logger.warning(f"Auto-RAG: Subject {subject} denied knowledge:search")

        # 4. Augment prompt with context
        if context:
            final_prompt = f"RELEVANT CONTEXT:\n{context}\n\nUSER REQUEST: {final_prompt}"

        # 5. Reason (single or council based on effective_council)
        if effective_council:
            council = self.topology.get("council_members", ["llama3", "llama3.1", "phi3"])
            capacity = get_capacity_hint()
            council = resolve_models_for_council(council, capacity_hint=capacity)
            self.logger.info("Using Council of Dozens (capacity=%s): %s", capacity, council)
            # Second member (index 1) is devil's advocate when council has ≥2 members
            devil_index = 1 if len(council) >= 2 else None
            result = await self.reasoning.council_synthesis(final_prompt, council, devil_advocate_index=devil_index)
        else:
            self._log_reasoning("Ask", "thought", "Reasoning (single agent).")
            result = await self.reasoning.ask(final_prompt, system_prompt=system_prompt)

        if result.get("success") and isinstance(result, dict):
            result["difficulty"] = difficulty
        return result

    async def list_skills(self) -> list[dict[str, Any]]:
        """List all discovered skills."""
        return self.skills.list_skills()

    async def run_skill(self, skill_id: str, user_input: str, subject: str = "agent:cortex") -> dict[str, Any]:
        """Execute a skill-augmented prompt."""
        if not await self.security.is_authorized(subject, "skills:run", skill_id):
            return {
                "success": False,
                "error": f"Subject '{subject}' is not authorized for skills:run on {skill_id}",
            }

        skill_prompt = self.skills.get_skill_prompt(skill_id)
        if not skill_prompt:
            return {"success": False, "error": f"Skill {skill_id} not found"}

        full_prompt = f"{skill_prompt}\n\nUser Input: {user_input}"
        return await self.reasoning.ask(full_prompt)

    def _log_reasoning(self, agent: str, event_type: str, content: str):
        """Pushes a cognitive event to the reasoning log and to the bridge log stream (Grafana/Loki)."""
        entry = {
            "id": int(time.time() * 1000),
            "timestamp": time.strftime("%H:%M:%S"),
            "agent": agent,
            "type": event_type,
            "content": content,
        }
        self.reasoning_log.append(entry)
        # Emit to root logger so bridge file + ring buffer get it (Council / Operations stream in Grafana)
        self.logger.info(
            "[Council] %s | %s | %s: %s",
            entry["timestamp"],
            event_type,
            agent,
            content[:500] + ("..." if len(content) > 500 else ""),
        )

    async def execute_tool(self, tool_name: str, approval_gate: bool = True, **kwargs) -> dict[str, Any]:
        """Gateway for agentic tool execution with optional Council Approval Gate."""
        # --- SECURITY MOAT: DefenseClaw Action Validation ---
        if not await self.security.validate_action(tool_name, kwargs, orchestrator=self):
            return {
                "success": False,
                "error": (
                    f"SECURITY_REJECTION: DefenseClaw has blocked the action '{tool_name}' " "due to policy violation."
                ),
            }

        if tool_name not in self._tool_registry:
            # OpenFang adapter: map hand tool names to MCP connector + tool
            resolved = openfang_resolve(tool_name)
            if resolved and self._connector_invoker:
                connector_id, mcp_tool_name = resolved
                try:
                    result = await self._connector_invoker(connector_id, mcp_tool_name, kwargs or {})
                    return result if isinstance(result, dict) else {"success": True, "data": result}
                except Exception as e:
                    self.logger.error(
                        "OpenFang adapter invoke failed (%s -> %s/%s): %s",
                        tool_name,
                        connector_id,
                        mcp_tool_name,
                        e,
                    )
                    return {"success": False, "error": str(e)}
            return {
                "success": False,
                "error": f"Tool '{tool_name}' not found in bridge.",
            }

        # Handle Approval Gate for sensitive tools
        if approval_gate and tool_name in self.SENSITIVE_TOOLS:
            self.logger.info(f"Triggering Council Approval Gate for sensitive tool: {tool_name}")
            council = list(self.topology.get("nodes", {}).keys())  # Use all node IDs
            if not council:
                council = ["llama3"]  # Fallback to local

            # Specialized Personnel Assignment (Ported from dark-app-factory 'specialists')
            member_roles = {}
            for i, m in enumerate(council):
                if i == 0:
                    member_roles[m] = "Head of Security (High Intelligence)"
                elif i == 1:
                    member_roles[m] = "System Architect (Logic/Structural Bias)"
                else:
                    member_roles[m] = "General Personnel (Consensus Bias)"

            adjudication = await self.reasoning.council_adjudicate(
                tool_name=tool_name,
                tool_input=str(kwargs),
                council_members=council,
                member_roles=member_roles,
                context=f"Tool Execution targeting {tool_name}",
            )

            self._log_reasoning(
                "CouncilOfDozens",
                "adjudication",
                (
                    f"Tool: {tool_name} | Approved: {adjudication.get('approved')} | "
                    f"Rationale: {adjudication.get('rationale')}"
                ),
            )

            if adjudication["success"] and not adjudication["approved"]:
                return {
                    "success": False,
                    "error": (
                        f"ADJUDICIAL_REJECTION: The Council of Dozens has rejected this action. "
                        f"Rationale: {adjudication['rationale']}"
                    ),
                }

        tool = self._tool_registry[tool_name]
        try:
            if tool["type"] == "skill":
                return await self.run_skill(tool["id"], kwargs.get("input", ""))

            if tool["type"] == "mcp" and self._connector_invoker:
                return await self._connector_invoker(tool["connector"], tool["mcp_tool"], kwargs or {})

            if tool["type"] == "connector":
                # For now, generic send_message if it's a social/comm connector
                connector = tool["instance"]
                if hasattr(connector, "send_message"):
                    success = await connector.send_message(kwargs.get("target"), kwargs.get("content"))
                    return {"success": success}

                return {
                    "success": False,
                    "error": f"Connector {tool_name} has no default 'send_message' action.",
                }

            if tool.get("type") == "system":
                handler = tool["handler"]
                return await handler(**kwargs)

        except Exception as e:
            self.logger.error(f"Tool execution failed ({tool_name}): {e}")
            return {"success": False, "error": str(e)}
        finally:
            # Record usage for lifecycle management
            # Try to map tool name back to a hand ID if possible
            if tool_name.startswith("connector_"):
                hand_id = tool_name.replace("connector_", "")
                self.lifecycle.record_usage(hand_id)
            elif tool_name.startswith("skill_"):
                # Skills might be associated with specific hands or global
                pass

        return {"success": False, "error": "Unknown tool type."}

    async def route_message(self, target: str, content: str, channel: str):
        if channel in self.connectors:
            return await self.connectors[channel].send_message(target, content)
        self.logger.warning(f"No connector registered for channel: {channel}")
        return False

    async def get_routing_rules(self) -> dict[str, Any]:
        """Returns the current channel-to-agent mapping."""
        return self.topology.get("routing", {})

    async def process_mission(
        self, vibe: str, foreman_model: str = "llama3", worker_model: str = "llama3"
    ) -> dict[str, Any]:
        """
        Full 3-Phase DARK INTEGRATION workflow.
        1. Vibe Enrichment (Foreman/Architect)
        2. Agentic Execution (Labor/Worker)
        3. Satisficer Audit (Judge/Satisficer)
        """
        # --- SECURITY MOAT: Bastio Prompt Injection Defense ---
        if not await self.security.validate_prompt(vibe, orchestrator=self):
            return {
                "success": False,
                "error": "SECURITY_REJECTION: Bastio has blocked this mission due to potential malicious content.",
            }

        self.logger.info(f"INITIATING MISSION: {vibe[:50]}...")

        # DTU Shadow Prep (Simple Version)
        self.dtu.clear()
        self.logger.info("DTU Shadow cleared and prepared for pre-flight.")

        # PHASE 1: ENRICH
        self._log_reasoning("Foreman", "thought", f"Enriching Vibe: {vibe[:100]}...")
        enrichment = await self.reasoning.enrich_vibe(vibe, model=foreman_model)
        if not enrichment["success"]:
            self._log_reasoning("Foreman", "error", "Enrichment failed.")
            return {
                "success": False,
                "error": f"Enrichment Failure: {enrichment.get('error')}",
            }

        spec = enrichment["response"]
        self.logger.info("PHASE 1 (ENRICH) COMPLETE: Spec generated.")

        # Security: Foreman Spec Signing
        signing_secret = os.getenv("ROBOFANG_FOREMAN_SECRET", "SOTA_DEV_SECRET")
        spec_signature = self.security.bastio.sign_spec(spec, signing_secret)
        self.logger.info(f"Foreman Spec signed. Signature: {spec_signature[:8]}...")

        self._log_reasoning("Foreman", "system", "Specification finalized and signed. Passing to Worker.")

        # PHASE 2: EXECUTE (Labor)
        # Flatten tools for ReAct
        tools_list = [{"name": k, "description": v["description"]} for k, v in self._tool_registry.items()]

        # Use reason_and_act which calls execute_tool (Approval Gate integrated)
        self._log_reasoning("Worker", "thought", "Initiating Agentic ReAct loop.")
        work = await self.reasoning.reason_and_act(
            prompt=spec,
            tool_executor=self.execute_tool,
            tools=tools_list,
            model=worker_model,
        )

        if not work["success"]:
            self._log_reasoning("Worker", "error", "Execution failed.")
            return {
                "success": False,
                "error": f"Execution Failure: {work.get('error')}",
            }

        results = work["response"]
        self.logger.info("PHASE 2 (EXECUTE) COMPLETE: Labor delivered.")
        self._log_reasoning("Worker", "deliberation", f"Work delivered: {results[:100]}...")

        # PHASE 3: JUDGE (Satisficer)
        self._log_reasoning("Satisficer", "thought", "Auditing labor against specification.")
        audit = await self.reasoning.satisficer_judge(
            prompt=vibe,
            spec=spec,
            results=results,
            model=foreman_model,  # Use foreman/high-intel for judging
        )

        verdict = "PASS" if audit.get("passed") else "FAIL"
        self._log_reasoning(
            "Satisficer",
            "consensus",
            f"Verdict: {verdict} | Critique: {audit.get('critique', '')[:100]}...",
        )

        # PHAST 4: DTU COMMIT (if approved)
        if audit.get("passed"):
            self.logger.info("Satisficer PASSED. Committing DTU shadow to production...")
            # For this MVP, we assume dev repos root; ideally this is passed in vibe/spec
            repo_target = os.environ.get("ROBOFANG_REPOS_ROOT", "D:/Dev/repos")
            commit_result = self.dtu.commit_all(repo_target)
            if commit_result["ok"]:
                self.logger.info(f"DTU COMMIT SUCCESS: {len(commit_result['files'])} files updated.")
                self._log_reasoning("DTU", "commit", f"Atomic commit successful: {len(commit_result['files'])} files.")
            else:
                self.logger.error(f"DTU COMMIT FAILED: {commit_result['reason']}")
                self._log_reasoning("DTU", "error", f"Commit failed: {commit_result['reason']}")
        else:
            self.logger.warning("Satisficer FAILED. Staged files in DTU shadow will not be committed.")
            self._log_reasoning("DTU", "rollback", "Shadow staging abandoned due to audit failure.")

        response = {
            "success": True,
            "vibe": vibe,
            "spec": spec,
            "results": results,
            "audit": audit,
        }

        # PHASE 5: PERSIST (MemOps)
        if self.journal_bridge and audit.get("passed"):
            self.logger.info("Promoting mission outcome to MemOps knowledge graph...")
            await self.journal_bridge.promote_to_adn(
                {
                    "content": f"Mission: {vibe}\nResults: {results[:500]}",
                    "tags": ["mission_success", "council_decision"],
                }
            )

        return response

    async def speak(self, text: str) -> bool:
        """Unified TTS output for the orchestrator."""
        if self.speech_handler:
            return await self.speech_handler.speak(text)
        return False

    async def update_routing(self, channel: str, agent: str) -> bool:
        """Updates the routing topology in memory and persists to federation_map.json."""
        if "routing" not in self.topology:
            self.topology["routing"] = {}
        self.topology["routing"][channel] = agent
        return self._save_topology()

    def _save_topology(self) -> bool:
        """Persists the current in-memory topology to federation_map.json."""
        try:
            with open(self.fleet_config_path, "w", encoding="utf-8") as f:
                json.dump(self.topology, f, indent=4)
            self.logger.info(f"Topology persisted to {self.fleet_config_path}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to persist topology: {e}")
            return False

    def update_topology(self, updates: dict[str, Any]) -> bool:
        """Merges updates into the topology and persists to disk.

        Supports updating 'nodes', 'connectors', 'domains', etc.
        """
        for key, value in updates.items():
            if isinstance(value, dict) and key in self.topology and isinstance(self.topology[key], dict):
                self.topology[key].update(value)
            else:
                self.topology[key] = value

        success = self._save_topology()
        if success:
            # Re-initialize connectors to handle any new ones
            self._init_connectors()
            # Re-build tool bridge
            self._build_tool_bridge()
        return success

    # --- Routines (scheduled actions: dawn patrol, etc.) ---

    def list_routines(self) -> list[dict[str, Any]]:
        return _list_routines(self.storage)

    def get_routine(self, routine_id: str) -> dict[str, Any] | None:
        return _get_routine(self.storage, routine_id)

    def create_routine(
        self,
        name: str,
        time_local: str,
        recurrence: str,
        action_type: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return _create_routine(self.storage, name, time_local, recurrence, action_type, params)

    def routine_should_run_now(self, routine: dict[str, Any]) -> bool:
        return _routine_should_run_now(routine)

    async def run_routine(self, routine_id: str) -> dict[str, Any]:
        """Execute a routine by id. Dispatches by action_type (e.g. dawn_patrol)."""
        routines = _list_routines(self.storage)
        routine = next((r for r in routines if r.get("id") == routine_id), None)
        if not routine:
            return {"success": False, "error": f"Routine {routine_id} not found"}
        action_type = routine.get("action_type", "")
        if action_type == "dawn_patrol":
            result = await self._run_dawn_patrol(routine)
        else:
            result = {"success": False, "error": f"Unknown action_type: {action_type}"}
        if result.get("success"):
            _mark_routine_run(self.storage, routine_id)
        return result

    def update_routine(
        self,
        routine_id: str,
        *,
        name: str | None = None,
        time_local: str | None = None,
        recurrence: str | None = None,
        action_type: str | None = None,
        params: dict[str, Any] | None = None,
        enabled: bool | None = None,
    ) -> dict[str, Any] | None:
        return _update_routine(
            self.storage,
            routine_id,
            name=name,
            time_local=time_local,
            recurrence=recurrence,
            action_type=action_type,
            params=params,
            enabled=enabled,
        )

    def delete_routine(self, routine_id: str) -> bool:
        return _delete_routine(self.storage, routine_id)

    async def _run_dawn_patrol(self, routine: dict[str, Any]) -> dict[str, Any]:
        """
        Yahboom robocar patrol with video, analyze for unusual activity, email report.
        Requires _connector_invoker and _email_sender to be set by the bridge.
        """
        from datetime import datetime

        params = routine.get("params") or {}
        report_email = params.get("report_email") or self.storage.get_secret("comms_report_email")
        started = datetime.utcnow().isoformat() + "Z"

        # 1. Invoke yahboom patrol (with record); connector may expose patrol + record
        video_path: str | None = None
        patrol_out: dict[str, Any] = {}
        if self._connector_invoker:
            try:
                patrol_out = await self._connector_invoker(
                    "yahboom",
                    "patrol_with_recording",
                    {"duration_sec": params.get("duration_sec", 120)},
                )
                if isinstance(patrol_out, dict):
                    video_path = patrol_out.get("video_path") or patrol_out.get("video_url")
            except Exception as e:
                self.logger.warning("Yahboom patrol invoker failed: %s", e)
                patrol_out = {"error": str(e)}
        else:
            patrol_out = {"skipped": "no connector invoker configured"}

        # 2. Analyze video for unusual activity (stub or vision LLM)
        unusual = False
        analysis_summary = "No analysis available (vision not run)."
        if video_path and self.reasoning:
            try:
                analysis_summary = await self._analyze_patrol_video(video_path)
                unusual = "unusual" in analysis_summary.lower() or "anomaly" in analysis_summary.lower()
            except Exception as e:
                analysis_summary = f"Analysis error: {e}"
        elif not video_path:
            analysis_summary = "No video path returned from patrol. Run with connector invoker and yahboom backend."

        # 3. Build report
        report_lines = [
            "Dawn Patrol Report",
            f"Started: {started}",
            f"Routine: {routine.get('name', 'dawn_patrol')}",
            "",
            "Patrol: " + (json.dumps(patrol_out) if patrol_out else "not run"),
            "",
            "Analysis: " + analysis_summary,
            "",
            f"Unusual activity: {'Yes' if unusual else 'No'}",
        ]
        report_body = "\n".join(report_lines)

        # 4. Send email if sender configured
        if self._email_sender and report_email:
            try:
                await self._email_sender(
                    to=report_email,
                    subject=f"Dawn Patrol Report {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    body=report_body,
                )
            except Exception as e:
                self.logger.warning("Email send failed: %s", e)
                report_body += f"\n\n(Email send failed: {e})"
        else:
            self.logger.info("Dawn patrol report (no email): %s", report_body[:200])

        return {
            "success": True,
            "started": started,
            "patrol": patrol_out,
            "analysis": analysis_summary,
            "unusual": unusual,
            "report_sent": bool(self._email_sender and report_email),
        }

    async def _analyze_patrol_video(self, video_path: str) -> str:
        """Stub: in production call vision model or motion detector. Returns summary."""
        # Placeholder: could POST frames to Ollama vision or run opencv motion check
        return "Video analysis placeholder. Integrate vision model or motion detector for production."
