"""Test scaffold for EmailConnector.

Uses stdlib smtplib + imaplib (same pattern as email-mcp).
No aioimaplib dependency needed.

Configure via env vars or edit the config dict below.
Reasonable defaults for Gmail — adjust for your provider.

Run: python tests/connectors/test_email.py
"""

import asyncio
import logging
import os
import sys

sys.path.insert(0, "src")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# Fill these in or set env vars
EMAIL_CONFIG = {
    "smtp_host": os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com"),
    "smtp_port": int(os.getenv("EMAIL_SMTP_PORT", "587")),
    "smtp_user": os.getenv("EMAIL_USER", ""),
    "smtp_password": os.getenv("EMAIL_PASSWORD", ""),
    "smtp_from": os.getenv("EMAIL_FROM", ""),
    "imap_host": os.getenv("EMAIL_IMAP_HOST", "imap.gmail.com"),
    "imap_port": int(os.getenv("EMAIL_IMAP_PORT", "993")),
}
TEST_RECIPIENT = os.getenv("EMAIL_TEST_TO", EMAIL_CONFIG["smtp_user"])


def _skip_if_unconfigured():
    if not EMAIL_CONFIG["smtp_user"] or not EMAIL_CONFIG["smtp_password"]:
        print("SKIP: set EMAIL_USER and EMAIL_PASSWORD env vars to enable this test.")
        return True
    return False


async def test_connect():
    print("\n=== test_connect (IMAP) ===")
    if _skip_if_unconfigured():
        return
    from robofang.core.connectors import EmailConnector

    conn = EmailConnector("email", EMAIL_CONFIG)
    ok = await conn.connect()
    print(f"connect() -> {ok}, active={conn.active}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: IMAP login failed — check credentials")


async def test_get_messages():
    print("\n=== test_get_messages (recent INBOX) ===")
    if _skip_if_unconfigured():
        return
    from robofang.core.connectors import EmailConnector

    conn = EmailConnector("email", EMAIL_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP: not connected")
        return
    msgs = await conn.get_messages(limit=5)
    for m in msgs:
        print(f"  [{m['date'][:20]}] From: {m['from'][:40]} | {m['subject'][:50]}")
    await conn.disconnect()
    assert isinstance(msgs, list)
    print(f"PASS — {len(msgs)} messages returned")


async def test_get_unread():
    print("\n=== test_get_messages unread_only ===")
    if _skip_if_unconfigured():
        return
    from robofang.core.connectors import EmailConnector

    conn = EmailConnector("email", EMAIL_CONFIG)
    await conn.connect()
    if not conn.active:
        print("SKIP")
        return
    msgs = await conn.get_messages(limit=10, unread_only=True)
    print(f"  {len(msgs)} unread messages")
    await conn.disconnect()
    print("PASS")


async def test_send_message():
    print(f"\n=== test_send_message -> {TEST_RECIPIENT} ===")
    if _skip_if_unconfigured():
        return
    from robofang.core.connectors import EmailConnector

    conn = EmailConnector("email", EMAIL_CONFIG)
    await conn.connect()
    ok = await conn.send_message(
        TEST_RECIPIENT,
        "robofang EmailConnector test — stdlib smtplib path. If you see this, it works.",
        subject="[robofang test] EmailConnector scaffold",
    )
    print(f"send_message() -> {ok}")
    await conn.disconnect()
    print("PASS" if ok else "WARN: SMTP send failed")


async def main():
    await test_connect()
    await test_get_messages()
    await test_get_unread()
    await test_send_message()
    print("\nAll Email tests complete.")


if __name__ == "__main__":
    asyncio.run(main())
