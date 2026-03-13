# Starting Activity via Mail / Message (Inbox)

You can start activity (schedule a routine or run a command) by sending a message to RoboFang's inbox. Supported channels: **webhook**, **Telegram**, and **email** (when the email connector is used with the orchestrator poll).

## How it works

1. A message arrives (POST to webhook, Telegram update, or email poll).
2. **Process inbox**: RoboFang first tries to interpret the message as a **schedule phrase** (e.g. "dawn patrol 7am daily", "bug bash Friday 2pm weekly"). If the LLM extracts a routine, it creates it and replies e.g. "Scheduled: dawn patrol at 07:00 daily."
3. If it is not a schedule, the message is run as a normal **command** (orchestrator ask with RAG). The reply is sent back when a reply channel is configured.

## Endpoints

### POST /hooks/command

- **Body**: `{ "message": "user text", "reply_to": "telegram" | "discord" | null }`
- **Use**: Email-to-webhook gateways or bots that POST the user message here. If `reply_to` is set, the reply is sent to that channel (default Telegram/Discord chat from settings).

### POST /hooks/inbox

- **Body**: `{ "message": "user text", "reply_to": "telegram" | "discord", "telegram_chat_id": "123" }`
- **Use**: Generic inbound. Use `telegram_chat_id` when replying to a specific Telegram chat (e.g. the one that sent the message). Otherwise `reply_to` uses the configured default chat.

### POST /hooks/telegram

- **Body**: Telegram Update JSON (as sent by Telegram to your bot webhook).
- **Use**: Set your Telegram bot's webhook URL to this endpoint (e.g. `https://your-host/hooks/telegram`). RoboFang extracts `message.text` and `message.chat.id`, processes the message, and sends the reply to that chat. Requires Telegram token and webhook set in BotFather / server.

## Email

- If the **email** connector is enabled and has `get_messages`, the orchestrator **slow loop** (every 5 min) fetches new messages and runs them through the same inbox processor. Reply by email is only sent if the connector implements `reply(message_id, body)`.

## Summary

| Channel    | How message arrives     | Reply |
|-----------|--------------------------|--------|
| Webhook   | POST /hooks/command or /hooks/inbox | Set `reply_to` or `telegram_chat_id` |
| Telegram  | POST /hooks/telegram (Telegram webhook) | Automatic to same chat |
| Email     | Orchestrator poll (email connector) | If connector has `reply()` |

Configure Telegram token and chat (or Discord webhook) in Settings / onboarding so that replies work when using `reply_to`.
