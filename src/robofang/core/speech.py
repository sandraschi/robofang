"""
SpeechHandler: Unified text-to-speech interface for RoboFang.
Supports speech-mcp (Edge-TTS/Kokoro) and kyutai-mcp (Moshi).
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


class SpeechHandler:
    """
    Handles speech synthesis by delegating to the available speech connector.
    """

    def __init__(self, speech_connector: Any = None):
        self.connector = speech_connector

    async def speak(self, text: str) -> bool:
        """
        Synthesize speech from text.
        Tries speech-mcp 'tts' tool first, falls back to kyutai-mcp style 'robofang_voice'.
        """
        if not self.connector:
            logger.warning("No speech connector available. Text: %s", text)
            return False

        if not hasattr(self.connector, "call_tool") or not callable(self.connector.call_tool):
            logger.error("Speech connector does not support call_tool.")
            return False

        # Attempt 1: speech-mcp standard (tts)
        try:
            # We assume speech-mcp provides a 'tts' tool
            # Parameters for speech-mcp usually include 'text'
            result = await self.connector.call_tool("tts", {"text": text})
            if result and (isinstance(result, dict) and result.get("success", True)):
                logger.info("Speech synthesized via speech-mcp (tts).")
                return True
        except Exception as e:
            logger.debug("speech-mcp 'tts' tool failed or not found: %s", e)

        # Attempt 2: voice_bridge style (robofang_voice / turn)
        try:
            # kyutai-mcp or similar bridge
            result = await self.connector.call_tool("robofang_voice", {"operation": "turn", "utterance": text})
            if result and (isinstance(result, dict) and result.get("success", True)):
                logger.info("Speech synthesized via voice bridge.")
                return True
        except Exception as e:
            logger.debug("voice bridge tool failed: %s", e)

        logger.warning("All speech synthesis attempts failed for: %s", text)
        return False
