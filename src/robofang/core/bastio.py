"""
Bastio Security Gateway for RoboFang.

Provides a security layer for all external LLM traffic, ensuring it passes
through the Bastio filter for threat scoring and safety validation.
"""

import logging
from typing import Any, Dict, Optional

import aiohttp

logger = logging.getLogger(__name__)


class BastioGateway:
    """
    Gateway to Bastio security services.
    Enforces security headers and captures threat scores from external requests.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.bastio.com",
        timeout: int = 30,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.logger = logging.getLogger("robofang.security.bastio")

    async def proxy_request(
        self, endpoint: str, payload: Dict[str, Any], source_agent: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Proxy an LLM request through the Bastio security layer.

        Args:
            endpoint: The target API endpoint
            payload: Request body
            source_agent: Name of the agent making the request

        Returns:
            API response with added security metadata
        """
        if not self.api_key:
            self.logger.warning("Bastio API Key missing - security filtering unavailable")
            return {
                "success": False,
                "error": "BASTIO_NOT_CONFIGURED",
                "security_metadata": {
                    "gateway": "none",
                    "validated": False,
                    "threat_score": None,
                },
            }

        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "X-RoboFang-Agent": source_agent,
                    "X-RoboFang-Security-Mode": "Strict",
                    "Content-Type": "application/json",
                }

                # In a real scenario, this would be a real POST to bastio.com
                # For Phase 4 development, we simulate the security wrap
                url = f"{self.base_url}/{endpoint.lstrip('/')}"

                self.logger.info(f"Routing request from '{source_agent}' via Bastio Gateway...")

                async with session.post(url, json=payload, headers=headers) as resp:
                    result = await resp.json()
                    threat_score = resp.headers.get("X-Bastio-Threat-Score", "0.0")

                    self.logger.info(
                        f"Security Pulse: Agent={source_agent} ThreatScore={threat_score}"
                    )

                    return {
                        **result,
                        "security_metadata": {
                            "gateway": "bastio",
                            "threat_score": float(threat_score),
                            "validated": True,
                        },
                    }
        except aiohttp.ClientError as e:
            self.logger.warning(f"Bastio connection failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": payload,
                "security_metadata": {
                    "gateway": "bastio",
                    "threat_score": None,
                    "validated": False,
                },
            }
        except Exception as e:
            self.logger.error(f"Bastio Gateway Critical Failure: {e}")
            return {"success": False, "error": str(e)}

    def get_security_status(self) -> Dict[str, Any]:
        """Check the status of the Bastio integration."""
        return {
            "enabled": self.api_key is not None,
            "gateway_url": self.base_url,
            "mode": "Proxy",
        }
