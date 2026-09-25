"""Safety tests for the AED EmergencyResponder: it must never place an unverified or unapproved call."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from robofang.core.responder import EmergencyResponder


def _orchestrator():
    orch = MagicMock()
    orch.config = {}
    orch.hands.call_tool = AsyncMock(return_value="ok")
    return orch


def _called_tools(orch) -> list[tuple[str, str]]:
    return [(c.args[0], c.args[1]) for c in orch.hands.call_tool.call_args_list]


@pytest.mark.asyncio
async def test_alert_fails_closed_without_vision_verification(monkeypatch):
    monkeypatch.setenv("ROBOFANG_AED_LIVE_DISPATCH", "1")
    monkeypatch.setenv("ROBOFANG_AED_LOCATION", "Teststrasse 1")
    orch = _orchestrator()
    responder = EmergencyResponder(orch)

    await responder.handle_environmental_alert("station-1", 200.0, 180.0)

    assert ("telephony", "place_call") not in _called_tools(orch)
    assert ("yahboom", "yahboom_agentic_workflow") in _called_tools(orch)
    assert responder.active_emergencies == set()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("live", "location"),
    [(None, "Teststrasse 1"), ("1", None), ("0", "Teststrasse 1")],
)
async def test_dispatch_is_dry_run_unless_live_and_location(monkeypatch, live, location):
    for name, value in (("ROBOFANG_AED_LIVE_DISPATCH", live), ("ROBOFANG_AED_LOCATION", location)):
        if value is None:
            monkeypatch.delenv(name, raising=False)
        else:
            monkeypatch.setenv(name, value)
    orch = _orchestrator()

    await EmergencyResponder(orch)._initiate_public_dispatch("station-1", 200.0)

    orch.hands.call_tool.assert_not_called()


@pytest.mark.asyncio
async def test_dispatch_places_call_only_when_live_and_location(monkeypatch):
    monkeypatch.setenv("ROBOFANG_AED_LIVE_DISPATCH", "1")
    monkeypatch.setenv("ROBOFANG_AED_LOCATION", "Teststrasse 1")
    orch = _orchestrator()

    await EmergencyResponder(orch)._initiate_public_dispatch("station-1", 200.0)

    assert ("telephony", "place_call") in _called_tools(orch)


@pytest.mark.asyncio
async def test_notification_failure_does_not_leak_active_emergency():
    orch = _orchestrator()
    orch.hands.call_tool = AsyncMock(side_effect=RuntimeError("unreachable"))
    responder = EmergencyResponder(orch)

    await responder.handle_environmental_alert("station-1", 200.0, 180.0)

    assert responder.active_emergencies == set()
