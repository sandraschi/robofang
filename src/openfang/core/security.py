"""
OpenFang Security Manager: Granular Role-Based Access Control (RBAC).
Provides a sovereign gating layer for agentic actions and resource access.
"""

import logging
from typing import Dict, Any, List, Optional
from openfang.core.storage import OpenFangStorage

logger = logging.getLogger(__name__)


class SecurityManager:
    """
    Enforces security policies across the OpenFang fleet.
    Defines permissions for agents, users, and external integrations.
    """

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        storage: Optional[OpenFangStorage] = None,
    ):
        self.config = config or {}
        self.logger = logging.getLogger("openfang.core.security")
        self.storage = storage or OpenFangStorage()

        # Load policies from storage or use defaults
        self.registry: Dict[str, Dict[str, Any]] = (
            self.storage.load_all_security_policies()
        )

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
                self.storage.save_security_policy(
                    sub, policy["role"], list(policy["permissions"])
                )

    async def is_authorized(
        self, subject: str, action: str, resource: Optional[str] = None
    ) -> bool:
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
            self.logger.warning(
                f"Access Denied: Subject '{subject}' not found in registry."
            )
            return False

        permissions = policy.get("permissions", set())

        # Check for administrative override
        if "*" in permissions:
            return True

        # Check for specific action permission
        if action in permissions:
            self.logger.info(
                f"Access Granted: {subject} -> {action} ({resource or ''})"
            )
            return True

        self.logger.warning(f"Access Denied: {subject} lacks permission '{action}'")
        return False

    def get_subject_policy(self, subject: str) -> Optional[Dict[str, Any]]:
        """Retrieve the policy for a specific subject."""
        return self.registry.get(subject)

    def define_policy(self, subject: str, role: str, permissions: List[str]):
        """Define or update a security policy and persist it."""
        self.registry[subject] = {"role": role, "permissions": set(permissions)}
        self.storage.save_security_policy(subject, role, permissions)
        self.logger.info(f"Security Policy Updated & Persisted: {subject} ({role})")
