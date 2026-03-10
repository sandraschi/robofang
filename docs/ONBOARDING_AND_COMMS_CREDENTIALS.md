# Onboarding and comms credentials

## Onboarding page

**Route:** `/onboarding` (sidebar: Onboarding).

The onboarding page lets you set Telegram and Discord credentials in the UI. Values are stored in the bridge storage (secrets) and used immediately for command replies and notifications. Leave a field empty to keep the current value (env or previously saved).

- **Telegram**: Bot token (from @BotFather), Chat ID (e.g. from @userinfobot).
- **Discord**: Webhook URL (Server Settings → Integrations → Webhooks).

Backend: `GET /api/settings/comms` (returns `telegram_configured`, `discord_configured`), `POST /api/settings/comms` (body: `telegram_token?`, `telegram_chat_id?`, `discord_webhook?`). Only non-empty fields are saved.

## Where credentials live

- **Onboarding / Settings UI**: Telegram and Discord can be set on the **Onboarding** page. Stored in bridge storage (secrets). The messaging bridge reads storage first, then env.
- **Settings page** (`/settings`): Personas, Security policies, Bridge status. No comms credentials there (use Onboarding).
- **Env (alternative)**: `ROBOFANG_TELEGRAM_TOKEN`, `ROBOFANG_TELEGRAM_CHAT_ID`, `ROBOFANG_DISCORD_WEBHOOK` — used if not set via Onboarding.
- **Email (built-in EmailConnector)**: IMAP/SMTP in connector config (e.g. `federation_map.json`). Not in Onboarding.
- **Email via email-MCP**: Managed inside the email-MCP server (see [COMMAND_VIA_EMAIL_TELEGRAM.md](COMMAND_VIA_EMAIL_TELEGRAM.md)).

For sending commands to RoboFang via Telegram or email and how replies work, see [COMMAND_VIA_EMAIL_TELEGRAM.md](COMMAND_VIA_EMAIL_TELEGRAM.md).
