import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from robofang.core.orchestrator import OrchestrationClient
from robofang.core.reasoning import ReasoningEngine


class TestAgenticWorkflow(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.orch = OrchestrationClient()
        # Mock connectors to avoid network calls
        self.orch.connectors = {"mock_social": MagicMock()}
        self.orch.connectors["mock_social"].send_message = AsyncMock(return_value=True)
        self.orch._build_tool_bridge()

    async def asyncTearDown(self):
        await self.orch.stop()

    @patch("robofang.core.reasoning.ReasoningEngine.ask")
    async def test_react_loop_success(self, mock_ask):
        """Verify the ReAct loop handles reasoning and tool calls correctly."""

        # Turn 1: Thought + Tool Call
        mock_ask.side_effect = [
            {
                "success": True,
                "response": "<thought>I need to check the status and then send a message.</thought><call name='connector_mock_social'>target='user', content='Hello'</call>",
            },
            # Turn 2: Final Answer
            {"success": True, "response": "I have successfully sent the message."},
        ]

        # Use a mock tool executor that just returns success
        async def mock_executor(name, **kwargs):
            return {"success": True, "executed": name}

        engine = ReasoningEngine()
        result = await engine.reason_and_act(
            prompt="Send a message to user",
            tool_executor=mock_executor,
            tools=[{"name": "connector_mock_social", "description": "test"}],
        )

        self.assertTrue(result["success"])
        self.assertIn("successfully sent", result["response"])
        self.assertEqual(len(result["trail"]), 2)

    async def test_orchestrator_tool_bridge(self):
        """Verify the orchestrator correctly executes tools via the bridge."""
        # Test executing a connector tool (non-sensitive or bridge bypassed)
        result = await self.orch.execute_tool(
            "connector_mock_social", approval_gate=False, target="nexus", content="Ping"
        )
        self.assertTrue(result["success"])
        self.orch.connectors["mock_social"].send_message.assert_called_once_with(
            "nexus", "Ping"
        )

    @patch("robofang.core.reasoning.ReasoningEngine.council_adjudicate")
    async def test_approval_gate_rejection(self, mock_adjudicate):
        """Verify the Council Approval Gate can reject sensitive actions."""
        # Simulate rejection
        mock_adjudicate.return_value = {
            "success": True,
            "approved": False,
            "rationale": "Action is deemed risky.",
        }

        # 'connector_discord' is in SENSITIVE_TOOLS
        self.orch._tool_registry["connector_discord"] = {
            "type": "connector",
            "instance": MagicMock(),
            "description": "test",
        }

        result = await self.orch.execute_tool(
            "connector_discord", target="nexus", content="Delete"
        )

        self.assertFalse(result["success"])
        self.assertIn("ADJUDICIAL_REJECTION", result["error"])
        mock_adjudicate.assert_called_once()

    @patch("robofang.core.reasoning.ReasoningEngine.council_adjudicate")
    async def test_approval_gate_success(self, mock_adjudicate):
        """Verify the Council Approval Gate allows approved sensitive actions."""
        # Simulate approval
        mock_adjudicate.return_value = {
            "success": True,
            "approved": True,
            "rationale": "Action aligned with intent.",
        }

        mock_connector = MagicMock()
        mock_connector.send_message = AsyncMock(return_value=True)
        self.orch._tool_registry["connector_discord"] = {
            "type": "connector",
            "instance": mock_connector,
            "description": "test",
        }

        result = await self.orch.execute_tool(
            "connector_discord", target="nexus", content="Hello"
        )

        self.assertTrue(result["success"])
        mock_adjudicate.assert_called_once()


if __name__ == "__main__":
    unittest.main()
