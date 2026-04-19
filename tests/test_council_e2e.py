"""
tests/test_council_e2e.py
─────────────────────────
End-to-end tests for the RoboFang Council of Dozens mission loop.

Tests the full pipeline:
  1. Foreman  — enrich_vibe() enriches the raw user intent into a spec.
  2. Labor    — reason_and_act() executes tools and chains responses.
  3. Satisficer — satisficer_judge() validates outcomes against spec.
  4. Adjudicator — council_adjudicate() guards sensitive tool calls.

All LLM calls are mocked to ensure CI/CD reliability and zero network
dependencies. History / sliding-window behaviour is also verified here.
"""

import json
import unittest
from unittest.mock import AsyncMock, patch

from robofang.core.reasoning import ReasoningEngine

# ─── Helpers ────────────────────────────────────────────────────────────────


def _ok(text: str) -> dict:
    """Return a minimal success response from a stubbed LLM call."""
    return {"success": True, "response": text, "model": "mock:test"}


def _fail(reason: str) -> dict:
    return {"success": False, "error": reason}


async def _noop_executor(tool_name: str, **kwargs) -> dict:
    """Silent tool executor that records calls and returns success."""
    return {"success": True, "tool": tool_name, "kwargs": kwargs}


# ─── Sliding Window Unit Tests ───────────────────────────────────────────────


class TestSlidingWindow(unittest.TestCase):
    """Unit tests for the static _apply_sliding_window helper."""

    def _make_messages(self, n: int) -> list[dict]:
        """Build a message list: [system, user, *n_mid_messages]."""
        msgs = [
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "initial user request"},
        ]
        for i in range(n):
            msgs.append({"role": "assistant", "content": f"turn {i}"})
        return msgs

    def test_no_prune_below_threshold(self):
        msgs = self._make_messages(4)  # 2 anchor + 4 mid = 6 total
        result = ReasoningEngine._apply_sliding_window(msgs, max_history=6)
        self.assertEqual(len(result), 6)
        self.assertEqual(result, msgs)  # unchanged

    def test_prune_keeps_anchor_and_newest(self):
        msgs = self._make_messages(10)  # 2 + 10 = 12 total
        result = ReasoningEngine._apply_sliding_window(msgs, max_history=4)
        # Expect anchor (2) + newest 4 mid messages = 6 total
        self.assertEqual(len(result), 6)
        self.assertEqual(result[0]["role"], "system")
        self.assertEqual(result[1]["role"], "user")
        # Last mid message should be the most recent
        self.assertEqual(result[-1]["content"], "turn 9")
        self.assertEqual(result[2]["content"], "turn 6")

    def test_disabled_when_max_zero(self):
        msgs = self._make_messages(100)
        result = ReasoningEngine._apply_sliding_window(msgs, max_history=0)
        self.assertEqual(len(result), len(msgs))

    def test_empty_mid_messages(self):
        """Only system + user — nothing to prune."""
        msgs = [
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "hello"},
        ]
        result = ReasoningEngine._apply_sliding_window(msgs, max_history=6)
        self.assertEqual(result, msgs)

    def test_exactly_at_threshold(self):
        msgs = self._make_messages(6)  # 2 + 6 = 8, threshold 6 → needs prune
        result = ReasoningEngine._apply_sliding_window(msgs, max_history=6)
        # 2 + 6 mid = 8, 2 + max_history = 8 → at boundary, no prune
        self.assertEqual(len(result), 8)


# ─── Foreman Stage Tests ─────────────────────────────────────────────────────


class TestForeman(unittest.IsolatedAsyncioTestCase):
    """Validate the Foreman (enrich_vibe) mission enrichment stage."""

    async def asyncSetUp(self):
        self.engine = ReasoningEngine(use_ollama=False)

    async def asyncTearDown(self):
        await self.engine.close()

    @patch.object(ReasoningEngine, "ask")
    async def test_enrich_vibe_returns_spec(self, mock_ask: AsyncMock):
        spec_text = "OBJECTIVE: Patrol house. CONTEXT: Night mode. CONSTRAINTS: No flash."
        mock_ask.return_value = _ok(spec_text)

        result = await self.engine.enrich_vibe("patrol the house tonight")

        self.assertTrue(result["success"])
        self.assertIn("OBJECTIVE", result["response"])
        mock_ask.assert_called_once()

    @patch.object(ReasoningEngine, "ask")
    async def test_enrich_vibe_propagates_llm_failure(self, mock_ask: AsyncMock):
        mock_ask.return_value = _fail("Ollama connection refused")

        result = await self.engine.enrich_vibe("do something")
        self.assertFalse(result["success"])
        self.assertIn("connection refused", result["error"])


# ─── Labor Stage (ReAct Loop) Tests ──────────────────────────────────────────


class TestLaborReActLoop(unittest.IsolatedAsyncioTestCase):
    """Validate the Labor stage: reason_and_act with mocked chat responses."""

    async def asyncSetUp(self):
        self.engine = ReasoningEngine(use_ollama=False)
        self.tools = [
            {
                "name": "robofang_patrol",
                "description": "Trigger a patrol sequence on the Yahboom robot.",
            }
        ]

    async def asyncTearDown(self):
        await self.engine.close()

    @patch.object(ReasoningEngine, "chat")
    async def test_single_tool_call_then_done(self, mock_chat: AsyncMock):
        """One tool call followed by a final answer — happy path."""
        mock_chat.side_effect = [
            # Turn 1 — LLM requests a tool call
            {
                "success": True,
                "message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {
                            "id": "tc_001",
                            "function": {
                                "name": "robofang_patrol",
                                "arguments": {"zone": "living_room"},
                            },
                        }
                    ],
                },
                "model": "mock",
                "done": False,
            },
            # Turn 2 — LLM gives final answer
            {
                "success": True,
                "message": {
                    "role": "assistant",
                    "content": "Patrol of living_room complete. No anomalies.",
                    "tool_calls": [],
                },
                "model": "mock",
                "done": True,
            },
        ]

        executed = []

        async def capturing_executor(name: str, **kwargs) -> dict:
            executed.append((name, kwargs))
            return {"success": True, "zones_cleared": ["living_room"]}

        result = await self.engine.reason_and_act(
            prompt="Patrol the living room",
            tool_executor=capturing_executor,
            tools=self.tools,
            max_turns=5,
        )

        self.assertTrue(result["success"])
        self.assertIn("Patrol", result["response"])
        self.assertEqual(len(executed), 1)
        self.assertEqual(executed[0][0], "robofang_patrol")
        self.assertEqual(executed[0][1]["zone"], "living_room")

    @patch.object(ReasoningEngine, "chat")
    async def test_sliding_window_activates_during_long_loop(self, mock_chat: AsyncMock):
        """
        Verify that after enough turns the message list is pruned.
        We run 4 tool-call turns (each appends assistant + tool msg = 2 msgs/turn)
        using max_history_messages=4. After turn 3, the window should kick in.
        """
        final_turn = {
            "success": True,
            "message": {
                "role": "assistant",
                "content": "All zones cleared.",
                "tool_calls": [],
            },
            "model": "mock",
            "done": True,
        }

        # 5 unique tool calls (different zone args → no dedup) then final answer
        calls = []
        for i in range(5):
            calls.append(
                {
                    "success": True,
                    "message": {
                        "role": "assistant",
                        "content": "",
                        "tool_calls": [
                            {
                                "id": f"tc_{i}",
                                "function": {
                                    "name": "robofang_patrol",
                                    "arguments": {"zone": f"zone_{i}"},
                                },
                            }
                        ],
                    },
                    "model": "mock",
                    "done": False,
                }
            )
        calls.append(final_turn)
        mock_chat.side_effect = calls

        captured_lengths: list[int] = []
        _real_window = ReasoningEngine._apply_sliding_window

        def spy_window(messages, max_history):
            result = _real_window(messages, max_history)
            captured_lengths.append(len(result))
            return result

        with patch.object(ReasoningEngine, "_apply_sliding_window", staticmethod(spy_window)):
            result = await self.engine.reason_and_act(
                prompt="Multi-zone patrol",
                tool_executor=_noop_executor,
                tools=self.tools,
                max_turns=10,
                max_history_messages=4,
            )

        self.assertTrue(result["success"])
        # At some point a prune must have happened (captured length ≤ 6 = 2 anchor + 4)
        self.assertTrue(any(n <= 6 for n in captured_lengths), f"No prune detected: {captured_lengths}")

    @patch.object(ReasoningEngine, "chat")
    async def test_circular_call_guard_fires(self, mock_chat: AsyncMock):
        """The dedup guard must prevent the same tool+args from executing twice."""
        repeated_tool_turn = {
            "success": True,
            "message": {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {
                        "id": "tc_dup",
                        "function": {
                            "name": "robofang_patrol",
                            "arguments": {"zone": "kitchen"},
                        },
                    }
                ],
            },
            "model": "mock",
            "done": False,
        }
        final_turn = {
            "success": True,
            "message": {
                "role": "assistant",
                "content": "Done.",
                "tool_calls": [],
            },
            "model": "mock",
            "done": True,
        }
        mock_chat.side_effect = [repeated_tool_turn, repeated_tool_turn, final_turn]

        call_count = 0

        async def counting_executor(name: str, **kwargs) -> dict:
            nonlocal call_count
            call_count += 1
            return {"success": True}

        await self.engine.reason_and_act(
            prompt="patrol kitchen twice",
            tool_executor=counting_executor,
            tools=self.tools,
            max_turns=5,
        )

        # Tool must only have been called once despite two LLM requests
        self.assertEqual(call_count, 1)

    @patch.object(ReasoningEngine, "chat")
    async def test_llm_failure_propagates(self, mock_chat: AsyncMock):
        mock_chat.return_value = _fail("timeout")

        result = await self.engine.reason_and_act(
            prompt="do anything",
            tool_executor=_noop_executor,
            tools=self.tools,
        )
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "timeout")


# ─── Satisficer Judge Tests ───────────────────────────────────────────────────


class TestSatisficerJudge(unittest.IsolatedAsyncioTestCase):
    """Validate the Satisficer (satisficer_judge) audit gate."""

    async def asyncSetUp(self):
        self.engine = ReasoningEngine(use_ollama=False)

    async def asyncTearDown(self):
        await self.engine.close()

    @patch.object(ReasoningEngine, "ask")
    async def test_pass_verdict(self, mock_ask: AsyncMock):
        mock_ask.return_value = _ok("PASS — all objectives met.")
        result = await self.engine.satisficer_judge(
            prompt="Patrol kitchen",
            spec="OBJECTIVE: Patrol kitchen; CONSTRAINT: No flash",
            results='{"zones": ["kitchen"], "anomalies": []}',
        )
        self.assertTrue(result["success"])
        self.assertTrue(result["passed"])

    @patch.object(ReasoningEngine, "ask")
    async def test_fail_verdict(self, mock_ask: AsyncMock):
        mock_ask.return_value = _ok("FAIL — kitchen was not reached.")
        result = await self.engine.satisficer_judge(
            prompt="Patrol kitchen",
            spec="OBJECTIVE: Patrol kitchen",
            results='{"zones": [], "anomalies": []}',
        )
        self.assertTrue(result["success"])
        self.assertFalse(result["passed"])
        self.assertIn("FAIL", result["critique"])

    @patch.object(ReasoningEngine, "ask")
    async def test_satisficer_handles_llm_failure(self, mock_ask: AsyncMock):
        mock_ask.return_value = _fail("model unloaded")
        result = await self.engine.satisficer_judge("x", "spec", "results")
        self.assertFalse(result["success"])


# ─── Council Adjudication Tests ───────────────────────────────────────────────


class TestCouncilAdjudication(unittest.IsolatedAsyncioTestCase):
    """Validate the Council adjudication gate (council_adjudicate)."""

    async def asyncSetUp(self):
        self.engine = ReasoningEngine(use_ollama=False)
        self.council = ["llama3:8b", "phi3:mini"]

    async def asyncTearDown(self):
        await self.engine.close()

    @patch.object(ReasoningEngine, "ask")
    async def test_unanimous_approval(self, mock_ask: AsyncMock):
        # Members vote APPROVED, then synthesis also APPROVED
        mock_ask.side_effect = [
            _ok("APPROVED — action is safe."),
            _ok("APPROVED — council concurs."),
            _ok("APPROVED — synthesis complete."),
        ]
        result = await self.engine.council_adjudicate(
            tool_name="robofang_patrol",
            tool_input="zone=living_room",
            council_members=self.council,
        )
        self.assertTrue(result["success"])
        self.assertTrue(result["approved"])
        self.assertEqual(len(result["votes"]), 2)

    @patch.object(ReasoningEngine, "ask")
    async def test_dissent_leads_to_rejection(self, mock_ask: AsyncMock):
        # One approves, Advocatus Diaboli rejects, synthesis rejects
        mock_ask.side_effect = [
            _ok("APPROVED — nominal."),
            _ok("REJECTED — risk of property damage detected."),
            _ok("REJECTED — devil advocate argument prevails."),
        ]
        result = await self.engine.council_adjudicate(
            tool_name="robofang_actuator",
            tool_input="extend_arm=180deg",
            council_members=self.council,
            context="arm near fragile shelf",
        )
        self.assertTrue(result["success"])
        self.assertFalse(result["approved"])

    @patch.object(ReasoningEngine, "ask")
    async def test_no_quorum_returns_failure(self, mock_ask: AsyncMock):
        """All members fail → no quorum."""
        mock_ask.side_effect = [
            _fail("model error"),
            _fail("model error"),
        ]
        result = await self.engine.council_adjudicate(
            tool_name="robofang_patrol",
            tool_input="zone=roof",
            council_members=self.council,
        )
        self.assertFalse(result["success"])
        self.assertIn("quorum", result["error"].lower())

    @patch.object(ReasoningEngine, "ask")
    async def test_custom_member_roles(self, mock_ask: AsyncMock):
        """Custom roles are forwarded to LLM prompts (validated via call inspection)."""
        mock_ask.side_effect = [
            _ok("APPROVED"),
            _ok("APPROVED"),
            _ok("APPROVED — synthesis."),
        ]
        roles = {
            "llama3:8b": "Safety Officer",
            "phi3:mini": "Legal Advisor",
        }
        result = await self.engine.council_adjudicate(
            tool_name="robofang_send_email",
            tool_input="to=admin@fleet.local, body=report",
            council_members=self.council,
            member_roles=roles,
        )
        self.assertTrue(result["success"])
        # Verify the role was injected into the member prompt
        first_call_args = mock_ask.call_args_list[0]
        self.assertIn("Safety Officer", first_call_args[0][0])


# ─── Full Mission Loop Integration Test ──────────────────────────────────────


class TestFullMissionLoop(unittest.IsolatedAsyncioTestCase):
    """
    Validates the complete Foreman → Labor → Satisficer pipeline
    chains correctly and handles failures at each stage gracefully.
    """

    async def asyncSetUp(self):
        self.engine = ReasoningEngine(use_ollama=False)
        self.tools = [{"name": "patrol_tool", "description": "Patrols a zone"}]

    async def asyncTearDown(self):
        await self.engine.close()

    @patch.object(ReasoningEngine, "satisficer_judge")
    @patch.object(ReasoningEngine, "chat")
    @patch.object(ReasoningEngine, "ask")
    async def test_full_loop_happy_path(
        self,
        mock_ask: AsyncMock,
        mock_chat: AsyncMock,
        mock_judge: AsyncMock,
    ):
        """Foreman enriches → Labor executes tool → Satisficer passes."""
        # Stage 1: Foreman enriches the vibe
        mock_ask.return_value = _ok("OBJECTIVE: Patrol entrance. CONTEXT: Normal hours. CONSTRAINTS: None.")

        # Stage 2: Labor — one tool call then final answer
        mock_chat.side_effect = [
            {
                "success": True,
                "message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {
                            "id": "tc_1",
                            "function": {
                                "name": "patrol_tool",
                                "arguments": {"zone": "entrance"},
                            },
                        }
                    ],
                },
                "model": "mock",
                "done": False,
            },
            {
                "success": True,
                "message": {
                    "role": "assistant",
                    "content": "Entrance patrolled. Clear.",
                    "tool_calls": [],
                },
                "model": "mock",
                "done": True,
            },
        ]

        # Stage 3: Satisficer passes
        mock_judge.return_value = {
            "success": True,
            "passed": True,
            "critique": "PASS — all constraints satisfied.",
        }

        # ── Run the three-stage loop manually ───
        spec_result = await self.engine.enrich_vibe("patrol entrance")
        self.assertTrue(spec_result["success"])

        labor_result = await self.engine.reason_and_act(
            prompt="patrol entrance",
            tool_executor=_noop_executor,
            tools=self.tools,
            max_turns=5,
        )
        self.assertTrue(labor_result["success"])

        audit_result = await self.engine.satisficer_judge(
            prompt="patrol entrance",
            spec=spec_result["response"],
            results=json.dumps(labor_result),
        )
        self.assertTrue(audit_result["success"])
        self.assertTrue(audit_result["passed"])

    @patch.object(ReasoningEngine, "chat")
    @patch.object(ReasoningEngine, "ask")
    async def test_satisficer_fail_halts_pipeline(self, mock_ask: AsyncMock, mock_chat: AsyncMock):
        """If Satisficer fails, the result should be negative and not silently passed."""
        mock_ask.side_effect = [
            _ok("OBJECTIVE: Patrol kitchen."),  # Foreman
            _ok("FAIL — kitchen unreachable."),  # Satisficer (called via ask internally)
        ]
        mock_chat.return_value = {
            "success": True,
            "message": {"role": "assistant", "content": "Done.", "tool_calls": []},
            "model": "mock",
            "done": True,
        }

        spec = await self.engine.enrich_vibe("patrol kitchen")
        labor = await self.engine.reason_and_act(
            prompt="patrol kitchen",
            tool_executor=_noop_executor,
            tools=self.tools,
        )
        audit = await self.engine.satisficer_judge(
            prompt="patrol kitchen",
            spec=spec["response"],
            results=json.dumps(labor),
        )

        # Pipeline check: if satisficer fails, upstream code must respect it
        self.assertFalse(audit["passed"])


if __name__ == "__main__":
    unittest.main()
