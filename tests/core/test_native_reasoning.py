import asyncio
import logging
import os
import sys

# Add src to path if needed
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../src")))

from robofang.core.reasoning import ReasoningEngine


# Mock tool executor
async def mock_tool_executor(tool_name, **kwargs):
    print(f"\n[TOOL_MOCK] {tool_name} | Args: {kwargs}")
    if tool_name == "get_weather":
        return {"temp": 22, "condition": "sunny", "unit": "Celsius"}
    if tool_name == "get_time":
        return {"time": "14:30", "timezone": "CET"}
    return {"error": "tool not found"}


async def test_native_calls():
    logging.basicConfig(level=logging.DEBUG)

    # Setup
    engine = ReasoningEngine(ollama_url="http://localhost:11434")

    # Test models: llama3.1 has strong native tool support in Ollama
    test_model = "llama3.1:latest"

    tools = [
        {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "input_schema": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "City name"}},
                "required": ["city"],
            },
        },
        {
            "name": "get_time",
            "description": "Get current local time",
            "input_schema": {"type": "object", "properties": {}, "required": []},
        },
    ]

    prompt = "Check the weather in Vienna and the current time. Then give me a summary."

    print(f"\n--- INITIATING NATIVE TOOL-CALL TEST ({test_model}) ---")
    print(f"PROMPT: {prompt}")

    try:
        result = await engine.reason_and_act(
            prompt=prompt,
            tool_executor=mock_tool_executor,
            tools=tools,
            model=test_model,
            use_native_tools=True,
            max_turns=3,
        )

        print("\n--- TEST COMPLETE ---")
        if result.get("success"):
            print("SUCCESS: True")
            print(f"RESPONSE: {result.get('response')}")

            # Verify trail
            trail = result.get("trail", [])
            print(f"Turns taken: {len(trail)}")
            for t in trail:
                tc = t.get("tool_calls", [])
                if tc:
                    print(f" - Turn {t['turn']} called: {[c['function']['name'] for c in tc]}")
        else:
            print(f"FAILURE: {result.get('error')}")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
    finally:
        await engine.close()


if __name__ == "__main__":
    asyncio.run(test_native_calls())
