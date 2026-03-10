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


class MessagingBridge:
    """Sends notifications to external platforms."""

    def __init__(self):
        self.discord_webhook = os.getenv("ROBOFANG_DISCORD_WEBHOOK")
        self.telegram_token = os.getenv("ROBOFANG_TELEGRAM_TOKEN")
        self.telegram_chat_id = os.getenv("ROBOFANG_TELEGRAM_CHAT_ID")

    async def send_discord(self, content: str, username: str = "RoboFang Council"):
        """Sends a message to a Discord webhook."""
        if not self.discord_webhook:
            logger.warning("Discord webhook not configured.")
            return False

        async with httpx.AsyncClient() as client:
            try:
                payload = {"content": content, "username": username}
                resp = await client.post(self.discord_webhook, json=payload)
                resp.raise_for_status()
                return True
            except Exception as e:
                logger.error(f"Failed to send Discord notification: {e}")
                return False

    async def send_telegram(self, text: str):
        """Sends a message to a Telegram chat."""
        if not self.telegram_token or not self.telegram_chat_id:
            logger.warning("Telegram configuration missing.")
            return False

        url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "chat_id": self.telegram_chat_id,
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
        if self.discord_webhook:
            tasks.append(self.send_discord(message))
        if self.telegram_token:
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
