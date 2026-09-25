"""_message_text: email body extraction must not crash on parts without a decodable payload."""

from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from robofang.core.connectors.base import _message_text


def test_plain_message():
    msg = EmailMessage()
    msg.set_content("hallo welt")
    assert _message_text(msg).strip() == "hallo welt"


def test_multipart_picks_text_plain():
    msg = MIMEMultipart("alternative")
    msg.attach(MIMEText("<b>html</b>", "html"))
    msg.attach(MIMEText("plain body", "plain", "utf-8"))
    assert _message_text(msg) == "plain body"


def test_multipart_without_text_plain_returns_empty():
    msg = MIMEMultipart()
    msg.attach(MIMEText("<b>only html</b>", "html"))
    assert _message_text(msg) == ""


def test_text_plain_container_without_payload_is_skipped():
    msg = MIMEMultipart()
    empty = MIMEMultipart()  # multipart part: get_payload(decode=True) -> None
    empty.replace_header("Content-Type", "text/plain")
    msg.attach(empty)
    msg.attach(MIMEText("real body", "plain", "utf-8"))
    assert _message_text(msg) == "real body"
