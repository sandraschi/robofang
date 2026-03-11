"""HTTP client for Moltbook API (moltbook.com)."""

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

MOLTBOOK_BASE = "https://www.moltbook.com/api/v1"


def _dialogic_success(message: str, data: Any = None) -> Dict[str, Any]:
    """Return dialogic success response."""
    result: Dict[str, Any] = {"success": True, "message": message}
    if data is not None:
        result["data"] = data
    return result


def _dialogic_error(message: str, error: str | None = None) -> Dict[str, Any]:
    """Return dialogic error response."""
    result: Dict[str, Any] = {"success": False, "message": message}
    if error:
        result["error"] = error
    return result


class MoltbookClient:
    """Client for Moltbook REST API."""

    def __init__(self, api_key: Optional[str] = None, base_url: str = MOLTBOOK_BASE) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self._client: Optional[httpx.AsyncClient] = None

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self._headers(),
                timeout=30.0,
            )
        return self._client

    async def get(self, path: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """GET request to Moltbook API."""
        try:
            client = await self._get_client()
            resp = await client.get(path, params=params)
            resp.raise_for_status()
            return _dialogic_success("OK", resp.json())
        except httpx.HTTPStatusError as e:
            logger.exception("Moltbook HTTP error: %s", e)
            return _dialogic_error(f"Moltbook returned {e.response.status_code}", error=str(e))
        except httpx.RequestError as e:
            logger.exception("Moltbook request error: %s", e)
            return _dialogic_error("Moltbook request failed", error=str(e))

    async def post(self, path: str, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """POST request to Moltbook API."""
        try:
            client = await self._get_client()
            resp = await client.post(path, json=json_data or {})
            resp.raise_for_status()
            data = resp.json() if resp.content else {}
            return _dialogic_success("OK", data)
        except httpx.HTTPStatusError as e:
            logger.error(
                "Moltbook HTTP error: %s",
                e,
                exc_info=True,
            )
            return _dialogic_error(f"Moltbook returned {e.response.status_code}", error=str(e))
        except httpx.RequestError as e:
            logger.error(
                "Moltbook request error: %s",
                e,
                exc_info=True,
            )
            return _dialogic_error("Moltbook request failed", error=str(e))

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
