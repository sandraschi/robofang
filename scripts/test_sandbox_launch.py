import asyncio
import logging
import sys
from pathlib import Path

# Add repo root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.sandbox_dispatcher import SandboxDispatcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_sandbox")


async def test_launch():
    repo_root = Path(__file__).parent.parent
    dispatcher = SandboxDispatcher(root_dir=str(repo_root))

    test_script = """
print("Hello from inside Windows Sandbox!")
import os
print(f"Current Directory: {os.getcwd()}")
"""

    logger.info("Dispatching test task to WSB...")
    try:
        task_id = dispatcher.dispatch_task(
            task_name="verify_sandbox", script_content=test_script, provider="wsb"
        )
        logger.info(f"Task dispatched with ID: {task_id}")

        # Poll for results
        logger.info("Waiting for sandbox results (this may take a minute)...")
        result = dispatcher.poll_result(task_id, timeout=120)

        if result.get("status") == "COMPLETED":
            logger.info("Sandbox Execution SUCCESSFUL!")
            logger.info(f"Stdout: {result.get('stdout')}")
        else:
            logger.error(
                f"Sandbox Execution FAILED or Timed Out: {result.get('error')}"
            )

    except Exception as e:
        logger.error(f"Sandbox test failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_launch())
