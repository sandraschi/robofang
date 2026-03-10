# Sending commands to RoboFang via email or Telegram

## What exists now

- **Command webhook**: `POST http://localhost:10871/hooks/command`  
  Body (JSON): `{ "message": "your natural language command", "reply_to": "telegram" | "discord" | null }`  
  The bridge runs `orchestrator.ask(message)`. If `reply_to` is `"telegram"` or `"discord"`, the reply is sent to that channel.

- **Outbound messaging**: Set Telegram/Discord via the dashboard **Onboarding** page (stored in bridge storage) or env vars `ROBOFANG_TELEGRAM_TOKEN`, `ROBOFANG_TELEGRAM_CHAT_ID`, `ROBOFANG_DISCORD_WEBHOOK`. The bridge reads storage first, then env.

- **Inbound**: There is no built-in “email listener” or “Telegram bot” inside RoboFang. You need a small adapter that turns email or Telegram into HTTP POSTs to the command webhook.

---

## Option 1: Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather), get the token. Set credentials either via the dashboard **Onboarding** page or env vars `ROBOFANG_TELEGRAM_TOKEN` and `ROBOFANG_TELEGRAM_CHAT_ID` (the chat where you want replies).
2. Run a small Telegram bot (on your machine or a server) that:
   - Receives messages (long-poll `getUpdates` or webhook).
   - For each message from your chat:  
     `POST http://localhost:10871/hooks/command` with  
     `{ "message": "<user text>", "reply_to": "telegram" }`.
   - The bridge runs the command and sends the reply via `send_telegram`, so the reply appears in Telegram.

Example (Python, long-poll) using `httpx` and `python-telegram-bot` or raw `getUpdates`: get updates, for each `message.text` POST to `http://localhost:10871/hooks/command` with `{"message": message.text, "reply_to": "telegram"}`. No need to send the reply yourself; the bridge does it when `reply_to` is `"telegram"`.

---

## Option 2: Email (email-MCP; no external services)

RoboFang does not read your mailbox itself. Use an “email → HTTP” bridge that POSTs to the command webhook:

1. **Email-MCP (recommended; no Zapier/Make)**  
   Run the email-MCP server (e.g. `http://localhost:10813`). Use a small bridge that calls email-MCP tools (list inbox / get messages), then for each new message:
   - `POST http://localhost:10871/hooks/command`  
   - Body: `{ "message": "<email body or subject>", "reply_to": null }`  
   - Optionally use a separate channel (e.g. “discord”) if you want replies somewhere else.

2. **Custom script**: Use IMAP (e.g. with the same credentials as EmailConnector) to poll inbox, detect new messages, POST `message` to `/hooks/command`, then mark as read or move. No `reply_to` unless you implement “send reply by email” yourself.


---

## Security

- The command webhook has no auth. If the bridge is reachable from the internet, put it behind a reverse proxy and add auth (e.g. API key header or secret in the webhook body) and/or restrict by IP.
- For Telegram, only your bot token and chat ID should be used; the bot should ignore or restrict which users/chats can trigger commands.

---

## Summary

| Channel   | How to send a command | Reply |
|----------|------------------------|-------|
| Telegram | Bot receives message → POST `/hooks/command` with `message` + `reply_to: "telegram"` | Bridge sends reply via Telegram (credentials from Onboarding or env). |
| Email    | email-MCP bridge (or IMAP script) POSTs body/subject to `/hooks/command` | Set `reply_to: "discord"` or `"telegram"` to get reply there; no built-in “reply by email”. |
