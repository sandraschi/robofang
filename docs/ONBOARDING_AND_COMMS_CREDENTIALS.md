# Onboarding and comms credentials

## Onboarding page

There is **no** onboarding page in the RoboFang dashboard. The app has no `/onboarding` route (see `dashboard/src/App.tsx`). If you want a single “first-run” or “comms setup” flow, it would need to be added (e.g. as a new route and page).

## Where credentials live today

Comms credentials are **not** entered in the Settings UI. They are configured as follows:

- **Settings page** (`/settings`): Personas (name + system prompt), Security (subject/role/permissions), Bridge status. No username/password or API keys for Telegram, Discord, or email.
- **Telegram / Discord**: Environment variables  
  `ROBOFANG_TELEGRAM_TOKEN`, `ROBOFANG_TELEGRAM_CHAT_ID`, `ROBOFANG_DISCORD_WEBHOOK`  
  (set in the bridge process env, not in the dashboard).
- **Email (built-in EmailConnector)**: IMAP/SMTP settings in connector config (e.g. `federation_map.json` or config passed to the orchestrator): `smtp_host`, `smtp_user`, `smtp_password`, `imap_host`, `imap_user`, `imap_password`. Not in the Settings UI.
- **Email via email-MCP**: Credentials are managed entirely inside the email-MCP server; RoboFang only talks to email-MCP over HTTP (see `docs/COMMAND_VIA_EMAIL_TELEGRAM.md`).

To have “username/password (or API keys) for all comms” in one place, you would need either:

1. An **onboarding** or **Comms credentials** page in the dashboard that writes to config/env or a secrets store the bridge reads, or  
2. Continued use of env + `federation_map.json` (and email-MCP config) as the single source of truth, documented for operators.
