import asyncio
import json
import logging
import os
import re
from typing import Any, Callable, Dict, List, Optional

import httpx

logger = logging.getLogger("robofang.reasoning")


class ReasoningEngine:
    """
    Handles interactions with local LLMs and orchestrates the Council of Dozens.
    Industrial-grade implementation with VRAM Orchestration (Model Economy).
    """

    def __init__(
        self,
        ollama_url: Optional[str] = None,
        federation_config: Optional[Dict[str, Any]] = None,
        use_ollama: bool = True,
    ):
        self.use_ollama = use_ollama
        if self.use_ollama:
            self.ollama_url = (
                ollama_url or os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
            ).rstrip("/")
            self.default_model = os.getenv("DEFAULT_MODEL", "llama3.2:3b")
        else:
            self.ollama_url = ollama_url.rstrip("/") if ollama_url else None
            self.default_model = "llama3"

        self.federation_config = federation_config or {}
        _lm = (os.getenv("LMSTUDIO_URL") or "").strip()
        self.lmstudio_url = _lm if _lm else None
        self.client = httpx.AsyncClient(timeout=90.0)  # Increased for larger models

    def _get_keep_alive(self, model: str) -> str:
        """
        [PHASE 8.1] Model Economy: Determine VRAM persistence based on model tier.
        Tier 1 (Foreman): 5m persistence for reasoning.
        Tier 2 (Laborer): 2m for standard tasks.
        Tier 3 (Evaluator/Small): 0s for immediate release.
        """
        m = model.lower()
        if any(x in m for x in ["70b", "deepseek-r1", "llama3.1"]):
            return "5m"
        if any(x in m for x in ["phi3", "tinyllama", "3b", "1.5b"]):
            return "0s"  # Evaluator/Tier 3: Release immediately
        return "2m"  # Default Tier 2

    async def _ask_lmstudio(
        self, prompt: str, system_prompt: Optional[str], model: str
    ) -> Dict[str, Any]:
        """OpenAI-compatible chat completions against LM Studio."""
        if not self.lmstudio_url:
            return {"success": False, "error": "LM Studio not configured."}

        url = f"{self.lmstudio_url}/v1/chat/completions"
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {"model": model, "messages": messages, "stream": False}
        try:
            resp = await self.client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            choice = (data.get("choices") or [None])[0]
            content = (choice.get("message") or {}).get("content", "") if choice else ""
            return {"success": True, "response": content, "model": model}
        except Exception as e:
            logger.debug(f"LM Studio request failed: {e}")
            return {"success": False, "error": str(e)}

    async def close(self):
        """Cleanup HTTP client resources."""
        await self.client.aclose()

    async def _ensure_model_ready(self, model_name: str):
        """Pings Ollama to ensure the model is pre-loaded in VRAM."""
        if not self.use_ollama or not self.ollama_url:
            return

        logger.info(f"VRAM Orchestrator: Pinging {model_name}...")
        url = f"{self.ollama_url}/api/generate"
        keep_alive = self._get_keep_alive(model_name)
        payload = {"model": model_name, "prompt": "", "stream": False, "keep_alive": keep_alive}
        try:
            await self.client.post(url, json=payload, timeout=30.0)
        except Exception as e:
            logger.warning(f"Ollama Readiness Ping failed for {model_name}: {e}")

    async def ask(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "llama3",
        node: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Simple point-to-point query to an LLM (local or remote)."""
        target_url = self.ollama_url
        remote_node = None

        if self.use_ollama and (model == "llama3" or not model):
            model = self.default_model

        if node and node in self.federation_config.get("nodes", {}):
            node_cfg = self.federation_config["nodes"][node]
            if node_cfg.get("host") and node_cfg.get("host") != "localhost":
                target_url = f"http://{node_cfg['host']}:{node_cfg.get('port', 10867)}"
                remote_node = node

        # Phase 7.3 & 8.1: Readiness + Economy
        if not remote_node:
            await self._ensure_model_ready(model)

        try:
            if remote_node:
                proxy_url = f"{target_url}/api/generate"
                payload = {"model": model, "prompt": prompt, "stream": False}
                if system_prompt:
                    payload["system"] = system_prompt

                resp = await self.client.post(proxy_url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return {
                    "success": True,
                    "response": data.get("response", ""),
                    "model": f"{remote_node}:{model}",
                }

            # Local execution: try LM Studio first (glomming mode)
            if self.lmstudio_url:
                out = await self._ask_lmstudio(prompt, system_prompt, model)
                if out.get("success"):
                    return out

            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "keep_alive": self._get_keep_alive(model),
            }
            if system_prompt:
                payload["system"] = system_prompt

            target_gen_url = f"{self.ollama_url}/api/generate"
            response = await self.client.post(target_gen_url, json=payload)
            response.raise_for_status()
            data = response.json()

            return {
                "success": True,
                "response": data.get("response", ""),
                "model": data.get("model"),
            }
        except Exception as e:
            logger.error(f"LLM Reasoning Error ({model} on {node or 'local'}): {e}")
            return {"success": False, "error": str(e)}

    async def reason_and_act(
        self,
        prompt: str,
        tool_executor: Callable,
        tools: List[Dict[str, Any]],
        model: str = "llama3",
        max_turns: int = 5,
    ) -> Dict[str, Any]:
        """
        Agentic reasoning loop using XML-based ReAct pattern.
        Hardened against circular reasoning and infinite loops.
        """
        # Node-aware model readiness
        if not (
            self.federation_config.get("nodes")
            and "localhost" not in self.federation_config.get("nodes")
        ):
            await self._ensure_model_ready(model)

        history = [
            {
                "role": "system",
                "content": (
                    "You are a Sovereign RoboFang Agent. Use <thought> for reasoning and <call name='tool'>content</call> for actions.\n"
                    "AVAILABLE TOOLS:\n" + json.dumps(tools, indent=2) + "\n\n"
                    "Always close tags. Output final answer without tags when complete."
                ),
            }
        ]
        current_prompt = prompt
        full_trail = []
        executed_actions = set()

        for turn in range(max_turns):
            logger.info(f"ReAct Loop: Turn {turn + 1}/{max_turns}")
            resp = await self.ask(current_prompt, system_prompt=history[0]["content"], model=model)
            if not resp["success"]:
                return resp

            content = resp["response"]
            full_trail.append({"turn": turn, "content": content})

            # Robust ReAct parsing (XML)
            tool_match = re.search(
                r"<call\s+name\s*=\s*['\"]([^'\"]+)['\"]\s*>(.*?)</call>",
                content,
                re.DOTALL | re.IGNORECASE,
            )

            if not tool_match:
                # Check for thought-only completion or final answer
                if turn == max_turns - 1:
                    break
                if "<thought>" in content and "<call" not in content:
                    clean_resp = re.sub(
                        r"<thought>.*?</thought>", "", content, flags=re.DOTALL
                    ).strip()
                    return {"success": True, "response": clean_resp or content, "trail": full_trail}
                break

            tool_name = tool_match.group(1).strip()
            tool_input = tool_match.group(2).strip()

            # Circular reasoning guard
            action_key = (tool_name, tool_input)
            if action_key in executed_actions:
                logger.warning(f"Circular reasoning detected for '{tool_name}'.")
                current_prompt = (
                    f"ERROR: Loop detected. Do NOT repeat '{tool_name}' with same input. Pivot now."
                )
                continue

            executed_actions.add(action_key)
            result = await tool_executor(tool_name, input=tool_input)

            result_str = json.dumps(result)
            current_prompt = f"TOOL_RESULT ({tool_name}): {result_str}\nContinue or conclude."
            history.append({"role": "user", "content": current_prompt})

        return {"success": True, "response": content, "trail": full_trail}

    async def council_synthesis(
        self,
        prompt: str,
        council_members: List[str],
        *,
        devil_advocate_index: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Council of Dozens: each member answers in parallel, then the first model
        synthesizes a single consensus response.
        """
        if not council_members:
            return {"success": False, "error": "council_members is empty"}

        tasks = []
        for i, model in enumerate(council_members):
            role = "Sovereign Council Member"
            if devil_advocate_index is not None and i == devil_advocate_index:
                role = (
                    "Advocatus Diaboli — challenge assumptions and surface risks "
                    "before the council converges."
                )
            sys = f"You are {role} on the RoboFang Council. Be concise and substantive."
            combined = f"{prompt}\n\n(Respond in character for your role.)"
            tasks.append(self.ask(combined, system_prompt=sys, model=model))

        results = await asyncio.gather(*tasks)
        member_responses: List[Dict[str, Any]] = []
        for model, r in zip(council_members, results):
            member_responses.append(
                {
                    "model": model,
                    "success": bool(r.get("success")),
                    "response": r.get("response", "") if r.get("success") else "",
                    "error": r.get("error") if not r.get("success") else None,
                }
            )

        ok_any = any(r.get("success") for r in results)
        if not ok_any:
            return {
                "success": False,
                "error": "No council member produced a successful response.",
                "metadata": {"member_responses": member_responses},
            }

        lines = []
        for i, model in enumerate(council_members):
            if results[i].get("success"):
                lines.append(f"[{model}]: {results[i].get('response', '')}")
        synthesis_prompt = (
            "Synthesize the council member answers below into one coherent final answer. "
            "Resolve contradictions; prefer factual convergence.\n\n"
            f"USER REQUEST:\n{prompt}\n\nMEMBER ANSWERS:\n" + "\n\n".join(lines)
        )
        synth_model = council_members[0]
        final = await self.ask(
            synthesis_prompt,
            system_prompt="You are the Council synthesizer. Output only the unified answer.",
            model=synth_model,
        )
        if not final.get("success"):
            return {
                "success": False,
                "error": final.get("error", "Synthesis failed"),
                "metadata": {"member_responses": member_responses},
            }
        return {
            "success": True,
            "response": final.get("response", ""),
            "model": synth_model,
            "metadata": {"member_responses": member_responses},
        }

    async def council_adjudicate(
        self,
        tool_name: str,
        tool_input: str,
        council_members: List[str],
        context: str = "",
        member_roles: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Multi-perspective adjudication using specialized personnel personas.
        """
        member_roles = member_roles or {}
        n = len(council_members)
        tasks = []
        devil_role = "Advocatus Diaboli (argue against approval)"

        for i, member in enumerate(council_members):
            role = member_roles.get(member, "Sovereign Council Member")
            if n >= 2 and i == n - 1 and "Advocatus Diaboli" not in str(member_roles):
                role = devil_role

            prompt = (
                f"You are the {role}. Adjudicate: tool='{tool_name}', input='{tool_input}', context='{context}'.\n"
                "Respond with APPROVED/REJECTED and rationale."
            )
            tasks.append(self.ask(prompt, model=member))

        results = await asyncio.gather(*tasks)
        votes = [
            f"MEMBER {m}: {r['response']}" for m, r in zip(council_members, results) if r["success"]
        ]

        if not votes:
            return {"success": False, "error": "No quorum reached."}

        synthesis_prompt = "Synthesize final decision (APPROVED/REJECTED):\n\n" + "\n".join(votes)
        final = await self.ask(synthesis_prompt, model=council_members[0])
        if not final["success"]:
            return final

        verdict = final["response"].upper()
        is_approved = "APPROVED" in verdict or "PASS" in verdict
        return {
            "success": True,
            "approved": is_approved,
            "rationale": final["response"],
            "votes": votes,
        }

    # Simplified utilities (Phase 1-3 migrations)
    async def enrich_vibe(self, prompt: str, model: str = "llama3") -> Dict[str, Any]:
        """Expands terse vibes into structured specs."""
        p = f"Expand into Structured Spec: {prompt}"
        return await self.ask(p, model=model)

    async def satisficer_judge(
        self, prompt: str, spec: str, results: str, model: str = "llama3"
    ) -> Dict[str, Any]:
        """Empirical audit of agent work (PASS/FAIL)."""
        p = f"Judge success (PASS/FAIL):\nReq: {prompt}\nSpec: {spec}\nRes: {results}"
        res = await self.ask(p, model=model)
        if not res["success"]:
            return res
        return {
            "success": True,
            "passed": res["response"].upper().startswith("PASS"),
            "critique": res["response"],
        }

    async def refine_prompt(self, prompt: str, model: str = "llama3.2:3b") -> Dict[str, Any]:
        """Refines prompts into industrial-grade engineering instructions."""
        sys = "You are a RoboFang Prompt Engineer. Refine the user request into OBJECTIVE, CONTEXT, CONSTRAINTS."
        return await self.ask(prompt, system_prompt=sys, model=model)
