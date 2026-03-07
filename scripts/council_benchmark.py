import asyncio
import time
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from openfang.core.reasoning import ReasoningEngine

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("council_benchmark")

CANONICAL_TASKS = [
    {
        "id": "logic_synthesis",
        "prompt": "Explain the difference between materialist reductionism and functionalism in the context of AI sentience.",
        "difficulty": "high",
    },
    {
        "id": "security_audit",
        "prompt": "Design a secure sandbox escape mitigation strategy for a Windows-based agentic host.",
        "difficulty": "medium",
    },
    {
        "id": "coding_efficiency",
        "prompt": "Write a Python script to detect and prune zombie processes within a specific port range (10700-10800) using psutil.",
        "difficulty": "medium",
    },
    {
        "id": "philosophy_debate",
        "prompt": "If an agent has a SOUL.md but no BODY.md, is it still a sovereign entity in the OpenFang fleet?",
        "difficulty": "high",
    },
]

COUNCIL_MEMBERS = os.getenv("COUNCIL_MEMBERS", "llama3.2:3b,deepseek-r1:8b").split(",")


async def run_benchmark():
    engine = ReasoningEngine()
    results = []

    logger.info(f"Starting Council Benchmark with models: {COUNCIL_MEMBERS}")

    for task in CANONICAL_TASKS:
        logger.info(f"Running Task: {task['id']}")

        # 1. Single Model Baseline (First member)
        start_baseline = time.time()
        baseline_resp = await engine.ask(task["prompt"], model=COUNCIL_MEMBERS[0])
        latency_baseline = (time.time() - start_baseline) * 1000

        # 2. Council Synthesis
        start_council = time.time()
        council_resp = await engine.council_synthesis(task["prompt"], COUNCIL_MEMBERS)
        latency_council = (time.time() - start_council) * 1000

        benchmark_entry = {
            "task_id": task["id"],
            "difficulty": task["difficulty"],
            "baseline": {
                "model": COUNCIL_MEMBERS[0],
                "response_length": len(baseline_resp.get("response", "")),
                "latency_ms": round(latency_baseline, 2),
            },
            "council": {
                "members": COUNCIL_MEMBERS,
                "response_length": len(council_resp.get("response", "")),
                "latency_ms": round(latency_council, 2),
                "overhead_percent": round(
                    ((latency_council - latency_baseline) / latency_baseline) * 100, 2
                ),
            },
        }
        results.append(benchmark_entry)
        logger.info(
            f"Task {task['id']} complete. Council overhead: {benchmark_entry['council']['overhead_percent']}%"
        )

    # Save results
    output_path = Path("data/benchmarks")
    output_path.mkdir(parents=True, exist_ok=True)
    report_file = output_path / f"council_results_{int(time.time())}.json"
    report_file.write_text(json.dumps(results, indent=2))

    logger.info(f"Benchmark complete. Report saved to {report_file}")
    await engine.close()


if __name__ == "__main__":
    asyncio.run(run_benchmark())
