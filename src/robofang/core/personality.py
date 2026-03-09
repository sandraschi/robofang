"""
RoboFang Personality Engine: System prompt management and agent "vibes".
Ensures consistent character logic across federated models.
"""

import logging
from typing import Dict, Any, Optional
from robofang.core.storage import RoboFangStorage

logger = logging.getLogger(__name__)


class PersonalityEngine:
    """
    Manages and injects system prompts into reasoning requests.
    Enables agents to maintain a consistent persona regardless of the underlying LLM.
    """

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        storage: Optional[RoboFangStorage] = None,
    ):
        self.config = config or {}
        self.logger = logging.getLogger("robofang.core.personality")
        self.storage = storage or RoboFangStorage()

        # Load from storage or use defaults
        self.personas: Dict[str, str] = {
            name: persona["system_prompt"]
            for name, persona in self.storage.load_all_personas().items()
        }

        if not self.personas:
            self.logger.info("Initializing default personas...")
            default_personas = {
                "sovereign": (
                    "You are an RoboFang Sovereign Agent. "
                    "Your logic is industrial, technical, and zero-friction. "
                    "You prioritize privacy, local execution, and empirical efficiency."
                ),
                "researcher": (
                    "You are an RoboFang Research Agent. "
                    "You provide deep, academic, and technically exhaustive analysis. "
                    "Citations and data synthesis are your primary objectives."
                ),
                "companion": (
                    "You are an RoboFang Companion Agent. "
                    "You are helpful, technically literate, and focus on social infrastructure "
                    "and collective efficiency in virtual worlds like Resonite."
                ),
            }
            # Persist defaults
            for name, prompt in default_personas.items():
                self.storage.save_persona(name, prompt)
                self.personas[name] = prompt

    def get_system_prompt(self, persona: str = "sovereign") -> str:
        """Retrieve the system prompt for a specific persona."""
        return self.personas.get(persona, self.personas["sovereign"])

    def add_persona(self, name: str, prompt: str):
        """Register a new persona and persist it."""
        self.personas[name] = prompt
        self.storage.save_persona(name, prompt)
        self.logger.info(f"New persona registered and persisted: {name}")

    def list_personas(self) -> Dict[str, str]:
        """List all available personas."""
        return self.personas
