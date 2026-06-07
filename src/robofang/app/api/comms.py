"""Comms hooks and legacy /ask endpoint for the hub."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel
from robofang.app.inbox import process_inbox_message
from robofang.core.state import orchestrator
from robofang.messaging import (
    reply_to as messaging_reply_to,
)
from robofang.messaging import (
    reply_to_email as messaging_reply_to_email,
)
from robofang.messaging import (
    reply_to_telegram_chat as messaging_reply_to_telegram_chat,
)

logger = logging.getLogger(__name__)

hooks_router = APIRouter(tags=["Comms"])

ask_router = APIRouter(tags=["Ask"])


class CommandWebhookRequest(BaseModel):
    message: str
    reply_to: str | None = None


class InboxWebhookRequest(BaseModel):
    message: str
    reply_to: str | None = None
    telegram_chat_id: str | None = None
    reply_email: str | None = None


class EmailWebhookRequest(BaseModel):
    from_addr: str
    subject: str | None = None
    body: str


class AskRequest(BaseModel):
    message: str
    persona: str = "sovereign"
    use_rag: bool = True
    use_council: bool = False
    subject: str = "guest"


@hooks_router.post("/hooks/command")
async def hook_command(req: CommandWebhookRequest):
    try:
        reply_text = await process_inbox_message(req.message)
        if req.reply_to and reply_text:
            await messaging_reply_to(req.reply_to, reply_text)
        return {"success": True, "message": reply_text}
    except Exception as e:
        logger.exception("Command webhook failed")
        return {"success": False, "message": str(e)}


@hooks_router.post("/hooks/inbox")
async def hook_inbox(req: InboxWebhookRequest):
    try:
        reply_text = await process_inbox_message(req.message)
        if req.telegram_chat_id and reply_text:
            await messaging_reply_to_telegram_chat(req.telegram_chat_id, reply_text)
        elif req.reply_email and reply_text:
            await messaging_reply_to_email(req.reply_email, "Re: RoboFang", reply_text)
        elif req.reply_to and reply_text:
            await messaging_reply_to(req.reply_to, reply_text)
        return {"success": True, "message": reply_text}
    except Exception as e:
        logger.exception("Inbox webhook failed")
        return {"success": False, "message": str(e)}


@hooks_router.post("/hooks/telegram")
async def hook_telegram(request: Request):
    try:
        body = await request.json()
        message = body.get("message") or body.get("edited_message")
        if not message:
            return {"ok": True}
        text = (message.get("text") or "").strip()
        chat = message.get("chat", {})
        chat_id = chat.get("id")
        if not text or chat_id is None:
            return {"ok": True}
        reply_text = await process_inbox_message(text)
        if reply_text:
            await messaging_reply_to_telegram_chat(str(chat_id), reply_text)
    except Exception:
        logger.exception("Telegram webhook failed")
    return {"ok": True}


@hooks_router.post("/hooks/email")
async def hook_email(req: EmailWebhookRequest):
    try:
        reply_text = await process_inbox_message((req.body or "").strip())
        if reply_text and req.from_addr:
            subject = (req.subject or "Re: RoboFang").strip()
            if not subject.lower().startswith("re:"):
                subject = f"Re: {subject}"
            await messaging_reply_to_email(req.from_addr, subject, reply_text)
        return {"success": True, "message": reply_text or ""}
    except Exception as e:
        logger.exception("Email webhook failed")
        return {"success": False, "message": str(e)}


@ask_router.post("/ask")
async def ask_question(req: AskRequest):
    """Hub Chat: message + optional Council."""
    try:
        result = await orchestrator.ask(
            req.message,
            use_council=req.use_council,
            use_rag=req.use_rag,
            subject=req.subject,
            persona=req.persona,
        )
        if result.get("success"):
            text = result.get("response", "") or ""
            return {
                "success": True,
                "message": text,
                "data": {
                    "model": result.get("model"),
                    "difficulty": result.get("difficulty"),
                },
            }
        return {
            "success": False,
            "message": "Reasoning failed",
            "error": result.get("error"),
        }
    except Exception as e:
        logger.exception("ask failed")
        return {"success": False, "message": str(e), "error": str(e)}
