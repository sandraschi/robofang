import sys
import asyncio
import logging
from pathlib import Path

# Add project root to sys.path for direct imports
root_path = Path(__file__).parent.parent
sys.path.insert(0, str(root_path))

from tools.sandbox_dispatcher import SandboxDispatcher


async def test_launch():
    logging.basicConfig(level=logging.INFO)
    dispatcher = SandboxDispatcher(str(root_path))

    script = """
print('Hello from Sandbox')
import os
import datetime
log_path = 'C:/Users/WDAGUtilityAccount/Desktop/exchange/sandbox/inner_test.log'
with open(log_path, 'w') as f:
    f.write(f'Inner test successful at {datetime.datetime.now()}')
"""

    task_id = dispatcher.dispatch_task("Sandbox V2 Verification", script)
    print(f"Task dispatched: {task_id}")
    print("Check d:/Dev/repos/openfang/exchange/sandbox/guest_up.log in a few seconds.")


if __name__ == "__main__":
    asyncio.run(test_launch())
