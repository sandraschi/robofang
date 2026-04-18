"""
RoboFang Security Manager: Granular Role-Based Access Control (RBAC).
Provides a sovereign gating layer for agentic actions and resource access.
"""

import logging
import os
from typing import Any

from robofang.core.bastio import BastioGateway
from robofang.core.storage import RoboFangStorage

logger = logging.getLogger(__name__)


class SecurityManager:
    """
    Enforces security policies across the RoboFang fleet.
    Defines permissions for agents, users, and external integrations.
    """

    def __init__(
        self,
        config: dict[str, Any] | None = None,
        storage: RoboFangStorage | None = None,
    ):
        self.config = config or {}
        self.logger = logging.getLogger("robofang.core.security")
        self.storage = storage or RoboFangStorage()
        self.bastio = BastioGateway(api_key=os.getenv("ROBOFANG_BASTIO_API_KEY"))

        # Load policies from storage or use defaults
        self.registry: dict[str, dict[str, Any]] = self.storage.load_all_security_policies()

        if not self.registry:
            self.logger.info("Initializing default security policies...")
            self.registry = {
                "orchestrator:root": {"role": "admin", "permissions": {"*"}},
                "agent:cortex": {
                    "role": "agent",
                    "permissions": {
                        "reasoning:ask",
                        "skills:list",
                        "skills:run",
                        "knowledge:search",
                    },
                },
                "guest": {
                    "role": "readonly",
                    "permissions": {"reasoning:ask", "knowledge:search"},
                },
            }
            # Persist defaults
            for sub, policy in self.registry.items():
                self.storage.save_security_policy(sub, policy["role"], list(policy["permissions"]))

    async def is_authorized(self, subject: str, action: str, resource: str | None = None) -> bool:
        """
        Check if a subject (agent or user) is authorized to perform an action.

        Args:
            subject: The identifier of the agent or user
            action: The action string (e.g., "reasoning:ask")
            resource: Optional resource targeted by the action

        Returns:
            bool: True if authorized, False otherwise
        """
        policy = self.registry.get(subject)
        if not policy:
            self.logger.warning(f"Access Denied: Subject '{subject}' not found in registry.")
            return False

        permissions = policy.get("permissions", set())

        # Check for administrative override
        if "*" in permissions:
            return True

        # Check for specific action permission
        if action in permissions:
            self.logger.info(f"Access Granted: {subject} -> {action} ({resource or ''})")
            return True

        self.logger.warning(f"Access Denied: {subject} lacks permission '{action}'")
        return False

    def get_subject_policy(self, subject: str) -> dict[str, Any] | None:
        """Retrieve the policy for a specific subject."""
        return self.registry.get(subject)

    def define_policy(self, subject: str, role: str, permissions: list[str]):
        """Define or update a security policy and persist it."""
        self.registry[subject] = {"role": role, "permissions": set(permissions)}
        self.storage.save_security_policy(subject, role, permissions)
        self.logger.info(f"Security Policy Updated & Persisted: {subject} ({role})")

    async def validate_prompt(self, prompt: str, orchestrator: Any) -> bool:
        """
        Check for prompt injection or malicious intent using Bastio.
        """
        bastio = orchestrator.connectors.get("bastio")
        if not bastio:
            self.logger.debug("Bastio security layer not found; skipping input validation.")
            return True

        self.logger.info("Bastio: Scanning input for injection vectors...")
        try:
            # SOTA API for Bastio MCP: 'filter_prompt'
            result = await bastio.call_tool("filter_prompt", {"prompt": prompt})
            if result and isinstance(result, dict):
                is_safe = result.get("safe", True)
                if not is_safe:
                    self.logger.warning(f"Bastio REJECTION: {result.get('reason', 'Potential injection detected')}")
                return is_safe
            return True
        except Exception as e:
            self.logger.error(f"Bastio validation failed: {e}")
            return True  # Fail-open for input to avoid blocking UX

    async def validate_action(self, action: str, params: Any, orchestrator: Any) -> bool:
        """
        Validate a proposed tool action using DefenseClaw sandboxing.
        """
        defenseclaw = orchestrator.connectors.get("defenseclaw")
        if not defenseclaw:
            self.logger.debug("DefenseClaw layer not found; skipping action validation.")
            return True

        self.logger.info(f"DefenseClaw: Validating action '{action}' in sandbox...")
        try:
            # SOTA API for DefenseClaw MCP: 'validate_action'
            # We pass action name and JSON-stringified params for deep inspection
            import json

            result = await defenseclaw.call_tool("validate_action", {"action": action, "params": json.dumps(params)})
            if result and isinstance(result, dict):
                is_approved = result.get("approved", True)
                if not is_approved:
                    self.logger.error(f"DefenseClaw REJECTION: {result.get('reason', 'Policy violation')}")
                return is_approved
            return True
        except Exception as e:
            self.logger.error(f"DefenseClaw validation failed: {e}")
            return False  # Fail-closed for actions for maximum safety
