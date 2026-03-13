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


def _get_smtp_config() -> dict:
    """SMTP config from storage then env. Keys: host, port, user, password, from_addr."""
    out = {}
    if _comms_storage:
        for k in ("host", "port", "user", "password", "from_addr"):
            v = _comms_storage.get_secret(f"comms_smtp_{k}")
            if v:
                out[k] = v
    for k, env in (
        ("host", "ROBOFANG_SMTP_HOST"),
        ("port", "ROBOFANG_SMTP_PORT"),
        ("user", "ROBOFANG_SMTP_USER"),
        ("password", "ROBOFANG_SMTP_PASSWORD"),
        ("from_addr", "ROBOFANG_SMTP_FROM"),
    ):
        if k not in out and os.getenv(env):
            out[k] = os.getenv(env)
    if out.get("port"):
        out["port"] = int(out["port"])
    return out


def _get_imap_config() -> dict:
    """IMAP config from storage then env. Keys: host, port, user, password, folder."""
    out = {}
    if _comms_storage:
        for k in ("host", "port", "user", "password", "folder"):
            v = _comms_storage.get_secret(f"comms_imap_{k}")
            if v:
                out[k] = v
    for k, env in (
        ("host", "ROBOFANG_IMAP_HOST"),
        ("port", "ROBOFANG_IMAP_PORT"),
        ("user", "ROBOFANG_IMAP_USER"),
        ("password", "ROBOFANG_IMAP_PASSWORD"),
        ("folder", "ROBOFANG_IMAP_FOLDER"),
    ):
        if k not in out and os.getenv(env):
            out[k] = os.getenv(env)
    if out.get("port"):
        out["port"] = int(out["port"])
    if "folder" not in out or not out["folder"]:
        out["folder"] = "INBOX"
    return out


def is_email_comms_configured() -> tuple[bool, bool]:
    """Return (smtp_ok, imap_ok) for reply and poll."""
    smtp = _get_smtp_config()
    imap = _get_imap_config()
    return (
        bool(smtp.get("host") and smtp.get("user")),
        bool(imap.get("host") and imap.get("user")),
    )


def fetch_unseen_emails() -> list[dict]:
    """
    Sync IMAP fetch: connect, get UNSEEN, return list of {from_addr, subject, body, uid}.
    Returns [] if not configured or on error. Caller must mark seen after processing.
    """
    import email
    import imaplib

    cfg = _get_imap_config()
    if not cfg.get("host") or not cfg.get("user"):
        return []
    port = int(cfg.get("port") or 993)
    folder = cfg.get("folder", "INBOX")
    out = []
    try:
        with imaplib.IMAP4_SSL(cfg["host"], port=port) as imap:
            imap.login(cfg["user"], cfg.get("password") or "")
            imap.select(folder, readonly=False)
            _, nums = imap.search(None, "UNSEEN")
            if not nums[0]:
                return []
            for uid in nums[0].split():
                uid = uid.decode() if isinstance(uid, bytes) else uid
                _, data = imap.fetch(uid, "(RFC822)")
                if not data or data[0] is None:
                    continue
                raw = data[0][1]
                msg = (
                    email.message_from_bytes(raw)
                    if isinstance(raw, bytes)
                    else email.message_from_string(raw)
                )
                from_addr = msg.get("From", "")
                if "<" in from_addr and ">" in from_addr:
                    from_addr = from_addr.split("<")[1].split(">")[0].strip()
                subject = msg.get("Subject", "") or ""
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True)
                            if body:
                                body = body.decode(errors="replace")
                            break
                else:
                    body = msg.get_payload(decode=True)
                    if body:
                        body = body.decode(errors="replace")
                body = (body or "").strip()
                if body:
                    out.append(
                        {"from_addr": from_addr, "subject": subject, "body": body, "uid": uid}
                    )
    except Exception as e:
        logger.warning("IMAP fetch failed: %s", e)
    return out


def mark_imap_seen(uid_list: list[str]) -> None:
    """Mark messages as seen. uid_list from fetch_unseen_emails. No-op if not configured."""
    import imaplib

    if not uid_list:
        return
    cfg = _get_imap_config()
    if not cfg.get("host") or not cfg.get("user"):
        return
    port = int(cfg.get("port") or 993)
    folder = cfg.get("folder", "INBOX")
    try:
        with imaplib.IMAP4_SSL(cfg["host"], port=port) as imap:
            imap.login(cfg["user"], cfg.get("password") or "")
            imap.select(folder, readonly=False)
            for uid in uid_list:
                imap.store(uid, "+FLAGS", "\\Seen")
    except Exception as e:
        logger.warning("IMAP mark seen failed: %s", e)


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
        """Sends a message to the configured default Telegram chat."""
        chat_id = _get_telegram_chat_id()
        if not chat_id:
            logger.warning("Telegram chat_id not configured.")
            return False
        return await self.send_telegram_to(chat_id, text)

    async def send_telegram_to(self, chat_id: str, text: str) -> bool:
        """Sends a message to a specific Telegram chat (e.g. for inbound reply)."""
        telegram_token = _get_telegram_token()
        if not telegram_token:
            logger.warning("Telegram token not configured.")
            return False
        url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                }
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                return True
            except Exception as e:
                logger.error("Failed to send Telegram to %s: %s", chat_id, e)
                return False

    async def send_email(self, to: str, subject: str, body: str) -> bool:
        """Send email via SMTP. Config: storage comms_smtp_* or ROBOFANG_SMTP_* env."""
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        cfg = _get_smtp_config()
        if not cfg.get("host") or not cfg.get("user"):
            logger.warning("SMTP not configured (host/user).")
            return False
        from_addr = cfg.get("from_addr") or cfg.get("user")
        port = cfg.get("port", 587)
        msg = MIMEMultipart()
        msg["From"] = from_addr
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))
        try:
            import asyncio

            def _send():
                with smtplib.SMTP(cfg["host"], port) as s:
                    s.starttls()
                    if cfg.get("password"):
                        s.login(cfg["user"], cfg["password"])
                    s.sendmail(from_addr, [to], msg.as_string())

            await asyncio.get_running_loop().run_in_executor(None, _send)
            return True
        except Exception as e:
            logger.error("SMTP send failed: %s", e)
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


async def reply_to(channel: str, text: str, **kwargs) -> bool:
    """Send text to a single channel (telegram, discord, or email). Used for command replies."""
    if channel == "telegram":
        return await _bridge.send_telegram(text)
    if channel == "discord":
        return await _bridge.send_discord(text)
    if channel == "email":
        to_addr = kwargs.get("to")
        subject = kwargs.get("subject", "Re: RoboFang")
        if to_addr:
            return await _bridge.send_email(to_addr, subject, text)
    return False


async def reply_to_email(to_addr: str, subject: str, body: str) -> bool:
    """Send reply by email. Used for inbound email command replies."""
    return await _bridge.send_email(to_addr, subject, body)


async def reply_to_telegram_chat(chat_id: str, text: str) -> bool:
    """Send text to a specific Telegram chat (e.g. reply to inbound webhook)."""
    return await _bridge.send_telegram_to(chat_id, text)
