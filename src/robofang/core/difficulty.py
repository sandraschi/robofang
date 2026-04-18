"""
Lightweight difficulty assessment for user requests.
Routes simple tasks (e.g. "write a thank you email to Bob") to single-agent
and ambitious/complex ones (e.g. "accomplish world peace") toward council or agentic workflow.
Fast heuristics only (no LLM call) to avoid latency.
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Keywords that suggest high ambition / multi-step / strategic (council-worthy)
AMBITION_MARKERS = [
    "accomplish",
    "achieve",
    "world",
    "global",
    "strategy",
    "strategic",
    "plan",
    "roadmap",
    "transform",
    "revolution",
    "paradigm",
    "comprehensive",
    "end-to-end",
    "multi-step",
    "coordinate",
    "orchestrate",
    "unify",
    "peace",
    "security",
    "evaluate all",
    "compare everything",
    "decide between",
    "synthesize",
    "long-term",
    "vision",
    "mission",
    "objective",
    "goals",
    "prioritize",
]
# Keywords that suggest simple, single-shot tasks (single-agent fine)
SIMPLE_MARKERS = [
    "write a",
    "draft a",
    "short",
    "brief",
    "one sentence",
    "quick",
    "thank you",
    "email to",
    "message to",
    "reply to",
    "summarize in",
    "list three",
    "list 3",
    "yes or no",
    "single",
    "one paragraph",
]
# Length thresholds (chars)
LONG_PROMPT_THRESHOLD = 400
SHORT_PROMPT_THRESHOLD = 120


def assess_difficulty(prompt: str) -> dict[str, Any]:
    """
    Assess request difficulty from prompt text.
    Returns dict: level (simple|moderate|complex|ambitious), score (1-5), suggest_council (bool), reason (str).
    """
    text = (prompt or "").strip().lower()
    length = len(text)
    score = 3  # default moderate
    reason_parts = []

    # Check ambition markers (boost score)
    ambition_hits = [m for m in AMBITION_MARKERS if m in text]
    if ambition_hits:
        score = min(5, score + len(ambition_hits))
        reason_parts.append(f"ambition markers: {', '.join(ambition_hits[:3])}")

    # Check simple markers (lower score)
    simple_hits = [m for m in SIMPLE_MARKERS if m in text]
    if simple_hits:
        score = max(1, score - len(simple_hits))
        reason_parts.append(f"simple markers: {', '.join(simple_hits[:3])}")

    # Length: very short often = simple; very long often = complex
    if length < SHORT_PROMPT_THRESHOLD and not ambition_hits:
        score = max(1, score - 1)
        reason_parts.append("short prompt")
    elif length > LONG_PROMPT_THRESHOLD:
        score = min(5, score + 1)
        reason_parts.append("long prompt")

    # Question count (many questions → more complex)
    questions = len(re.findall(r"\?+", text))
    if questions > 2:
        score = min(5, score + 1)
        reason_parts.append("multiple questions")

    score = max(1, min(5, score))
    if score <= 2:
        level = "simple"
        suggest_council = False
    elif score == 3:
        level = "moderate"
        suggest_council = False
    elif score == 4:
        level = "complex"
        suggest_council = True
    else:
        level = "ambitious"
        suggest_council = True

    reason = "; ".join(reason_parts) if reason_parts else "heuristic default"
    logger.info(
        "Difficulty assessment: level=%s score=%s suggest_council=%s (%s)",
        level,
        score,
        suggest_council,
        reason,
    )
    return {
        "level": level,
        "score": score,
        "suggest_council": suggest_council,
        "reason": reason,
    }
