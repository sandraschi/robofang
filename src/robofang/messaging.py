"""
RoboFang/messaging.py
=====================
Signal and notification bridge for the RoboFang fleet.
Provides parity with OpenClaw's channel reach via minimal webhooks.
"""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger("ROBOFANG_messaging")

# Optional storage for UI-configured comms (set by main after orchestrator init)
_comms_storage = None


def set_comms_storage(storage) -> None:
    """Use this storage for comms credentials (secrets) when set via onboarding/settings."""
    global _comms_storage
    _comms_storage = storage


def _get_telegram_token() -> str | None:
    if _comms_storage:
        v = _comms_storage.get_secret("comms_telegram_token")
        if v:
            return v
    return os.getenv("ROBOFANG_TELEGRAM_TOKEN")


def _get_telegram_chat_id() -> str | None:
    if _comms_storage:
        v = _comms_storage.get_secret("comms_telegram_chat_id")
        if v:
            return v
    return os.getenv("ROBOFANG_TELEGRAM_CHAT_ID")


def _get_discord_webhook() -> str | None:
    if _comms_storage:
        v = _comms_storage.get_secret("comms_discord_webhook")
        if v:
            return v
    return os.getenv("ROBOFANG_DISCORD_WEBHOOK")


class MessagingBridge:
    """Sends notifications to external platforms. Reads from storage (onboarding) then env."""

    async def send_discord(self, content: str, username: str = "RoboFang Council"):
        """Sends a message to a Discord webhook."""
        discord_webhook = _get_discord_webhook()
        if not discord_webhook:
            logger.warning("Discord webhook not configured.")
            return False

        async with httpx.AsyncClient() as client:
            try:
                payload = {"content": content, "username": username}
                resp = await client.post(discord_webhook, json=payload)
                resp.raise_for_status()
                return True
            except Exception as e:
                logger.error(f"Failed to send Discord notification: {e}")
                return False

    async def send_telegram(self, text: str):
        """Sends a message to a Telegram chat."""
        telegram_token = _get_telegram_token()
        telegram_chat_id = _get_telegram_chat_id()
        if not telegram_token or not telegram_chat_id:
            logger.warning("Telegram configuration missing.")
            return False

        url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "chat_id": telegram_chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                }
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                return True
            except Exception as e:
                logger.error(f"Failed to send Telegram notification: {e}")
                return False

    async def broadcast(self, message: str):
        """Sends the message to all configured platforms."""
        import asyncio

        tasks = []
        if _get_discord_webhook():
            tasks.append(self.send_discord(message))
        if _get_telegram_token():
            tasks.append(self.send_telegram(message))

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return all(r is True for r in results if not isinstance(r, Exception))
        return False


_bridge = MessagingBridge()


async def notify(message: str):
    """Convenience wrapper for broadcasting notifications."""
    return await _bridge.broadcast(message)


async def reply_to(channel: str, text: str) -> bool:
    """Send text to a single channel (telegram or discord). Used for command replies."""
    if channel == "telegram":
        return await _bridge.send_telegram(text)
    if channel == "discord":
        return await _bridge.send_discord(text)
    return False
