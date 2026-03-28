"""Email Connector."""

import asyncio
import email as email_lib
import imaplib
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List

from .base import BaseConnector, _decode_mime_header

logger = logging.getLogger(__name__)


class EmailConnector(BaseConnector):
    """Connector for email via SMTP (send) + IMAP (read).

    Uses stdlib smtplib/imaplib via run_in_executor — no extra deps.
    Mirrors the implementation pattern from email-mcp/src/email_mcp/server.py.

    config:
      smtp_host, smtp_port (default 587), smtp_user, smtp_password, smtp_from
      imap_host, imap_port (default 993), imap_user, imap_password
    """

    connector_type = "email"

    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.smtp_host = config.get("smtp_host", "")
        self.smtp_port = int(config.get("smtp_port", 587))
        self.smtp_user = config.get("smtp_user") or config.get("username", "")
        self.smtp_password = config.get("smtp_password") or config.get("password", "")
        self.smtp_from = config.get("smtp_from") or self.smtp_user
        self.imap_host = config.get("imap_host", "")
        self.imap_port = int(config.get("imap_port", 993))
        self.imap_user = config.get("imap_user") or self.smtp_user
        self.imap_password = config.get("imap_password") or self.smtp_password

    async def connect(self) -> bool:
        if not self.imap_host:
            self.logger.error("EmailConnector: imap_host not configured.")
            return False
        loop = asyncio.get_running_loop()

        def _check():
            m = imaplib.IMAP4_SSL(self.imap_host, self.imap_port)
            m.login(self.imap_user, self.imap_password)
            m.logout()
            return True

        try:
            await loop.run_in_executor(None, _check)
            self.active = True
            self.logger.info(f"IMAP connected: {self.imap_host}:{self.imap_port}")
            return True
        except Exception as e:
            self.logger.error(f"IMAP connection failed: {e}")
            return False

    async def disconnect(self) -> bool:
        self.active = False
        return True

    async def send_message(self, target: str, content: str, **kwargs) -> bool:
        """Send email. target=recipient, kwargs: subject, html, cc, bcc."""
        if not self.smtp_host:
            self.logger.error("EmailConnector: smtp_host not configured.")
            return False
        subject = kwargs.get("subject", "RoboFang Notification")
        html = kwargs.get("html")
        cc = kwargs.get("cc", [])
        bcc = kwargs.get("bcc", [])
        loop = asyncio.get_running_loop()

        def _send():
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.smtp_from
            msg["To"] = target
            if cc:
                msg["Cc"] = ", ".join(cc) if isinstance(cc, list) else cc
            msg.attach(MIMEText(content, "plain"))
            if html:
                msg.attach(MIMEText(html, "html"))
            recipients = (
                [target]
                + (cc if isinstance(cc, list) else [])
                + (bcc if isinstance(bcc, list) else [])
            )
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as s:
                s.starttls()
                s.login(self.smtp_user, self.smtp_password)
                s.sendmail(self.smtp_from, recipients, msg.as_string())

        try:
            await loop.run_in_executor(None, _send)
            self.logger.info(f"Email sent to {target}: {subject}")
            return True
        except Exception as e:
            self.logger.error(f"SMTP send failed: {e}")
            return False

    async def get_messages(
        self, limit: int = 10, folder: str = "INBOX", unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Fetch emails from IMAP folder."""
        if not self.imap_host:
            return []
        loop = asyncio.get_running_loop()

        def _fetch():
            mail = imaplib.IMAP4_SSL(self.imap_host, self.imap_port)
            mail.login(self.imap_user, self.imap_password)
            mail.select(folder)
            criteria = "UNSEEN" if unread_only else "ALL"
            _, ids = mail.search(None, criteria)
            email_ids = ids[0].split()[-limit:]
            results = []
            for eid in reversed(email_ids):
                _, data = mail.fetch(eid, "(RFC822)")
                if data[0] is None:
                    continue
                msg = email_lib.message_from_bytes(data[0][1])
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                            break
                else:
                    body = msg.get_payload(decode=True).decode("utf-8", errors="replace")
                results.append(
                    {
                        "id": eid.decode(),
                        "subject": _decode_mime_header(msg.get("Subject", "(No Subject)")),
                        "from": _decode_mime_header(msg.get("From", "Unknown")),
                        "date": msg.get("Date", ""),
                        "body_preview": body[:300],
                    }
                )
            mail.close()
            mail.logout()
            return results

        try:
            return await loop.run_in_executor(None, _fetch)
        except Exception as e:
            self.logger.error(f"IMAP fetch failed: {e}")
            return []
