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
    """

    def __init__(
        self,
        ollama_url: Optional[str] = None,  # Changed to Optional and removed default
        federation_config: Optional[Dict[str, Any]] = None,
        use_ollama: bool = True,  # Added use_ollama parameter
    ):
        self.use_ollama = use_ollama
        if self.use_ollama:
            self.ollama_url = ollama_url or os.getenv(
                "OLLAMA_URL", "http://127.0.0.1:11434"
            )  # Use provided or env var
            self.default_model = "llama3.2:3b"  # Added default_model
        else:
            self.ollama_url = ollama_url  # Keep original if not using ollama via env
            self.default_model = "llama3"  # Default if not using ollama env config

        self.federation_config = federation_config or {}
        _lm = (os.getenv("LMSTUDIO_URL") or "").strip()
        self.lmstudio_url = _lm if _lm else None  # e.g. http://127.0.0.1:1234
        self.client = httpx.AsyncClient(timeout=60.0)

    async def _ask_lmstudio(
        self, prompt: str, system_prompt: Optional[str], model: str
    ) -> Dict[str, Any]:
        """OpenAI-compatible chat completions against LM Studio (when running)."""
        base = self.lmstudio_url.rstrip("/")
        url = f"{base}/v1/chat/completions"
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
        await self.client.aclose()

    async def ask(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: str = "llama3",  # Changed default model to llama3, will be overridden by self.default_model if use_ollama is true
        node: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Simple point-to-point query to an LLM (local or remote)."""

        # Determine target URL
        target_url = self.ollama_url
        remote_node = None

        # Use default_model if no specific model is provided and use_ollama is true
        if self.use_ollama and model == "llama3":  # Check if default "llama3" is used
            model = self.default_model

        if node and node in self.federation_config.get("nodes", {}):
            node_cfg = self.federation_config["nodes"][node]
            if node_cfg.get("host") and node_cfg.get("host") != "localhost":
                # Remote Satellite Node Proxy
                # Federated protocol: Nexus calls Satellite Substrate proxy
                target_url = f"http://{node_cfg['host']}:{node_cfg.get('port', 10867)}"
                remote_node = node

        try:
            if remote_node:
                # Proxy via Satellite Substrate Tool (to be implemented in mcp_server.py)
                # For now, assume a direct /api/generate proxy or direct Ollama if reachable
                # In SOTA, we prefer Substrate-to-Substrate tool calls
                logger.info(f"Delegating reasoning task to remote node: {remote_node}")
                # Placeholder for direct Ollama proxy if ports are open, otherwise Substrate proxy
                proxy_url = f"{target_url}/api/generate"  # Defaulting to direct Ollama for now
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

            # Local execution: try LM Studio first when configured (glom on when running)
            if self.lmstudio_url:
                out = await self._ask_lmstudio(prompt, system_prompt, model)
                if out.get("success"):
                    logger.info(f"LLM LM Studio: model={model}")
                    return out
                logger.debug(f"LM Studio unavailable, falling back to Ollama: {out.get('error')}")

            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
            }
            if system_prompt:
                payload["system"] = system_prompt

            target_gen_url = f"{self.ollama_url}/api/generate"
            logger.info(f"LLM Local POST: {target_gen_url} payload_model={model}")
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

    async def council_synthesis(
        self,
        prompt: str,
        council_members: Optional[List[str]] = None,
        devil_advocate_index: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        [PHASE 5.2] Multi-agent adjudication/synthesis.
        Runs N parallel agents and synthesises with a Satisficer.
        If devil_advocate_index is set, that member gets an adversarial prompt (argue against / stress-test).
        """
        # Use environment variable for council members if not provided
        if council_members is None:
            COUNCIL_MEMBERS_RAW = os.getenv("COUNCIL_MEMBERS", "llama3.2:3b,deepseek-r1:8b")
            council_members = [m.strip() for m in COUNCIL_MEMBERS_RAW.split(",")]

        logger.info(
            "Council of Dozens invoked with %s members (devil_advocate_index=%s).",
            len(council_members),
            devil_advocate_index,
        )

        devil_prompt = (
            "You are the Advocatus Diaboli (devil's advocate). Your role is to argue *against* the request and stress-test it. "
            "List risks, counterarguments, and alternative views. Do not simply agree. "
            "USER REQUEST:\n\n" + prompt
        )

        # Resolve node mapping if available; optional adversarial prompt for one member
        tasks = []
        for i, member in enumerate(council_members):
            use_prompt = devil_prompt if i == devil_advocate_index else prompt
            if "@" in member:
                m, n = member.split("@")
                tasks.append(self.ask(use_prompt, model=m, node=n))
            else:
                tasks.append(self.ask(use_prompt, model=member))

        results = await asyncio.gather(*tasks)

        valid_responses = []
        for i, r in enumerate(results):
            if r["success"]:
                valid_responses.append(f"AGENT {council_members[i]}:\n{r['response']}")

        if not valid_responses:
            err_parts = ["All council members failed to respond."]
            if results and any(not r.get("success") for r in results):
                err_parts.append(
                    "Ensure Ollama is running (OLLAMA_URL) or LM Studio (LMSTUDIO_URL), and at least one council model is available."
                )
            return {"success": False, "error": " ".join(err_parts)}

        # Adjudication/Synthesis step (one perspective may be devil's advocate)
        synthesis_prompt = (
            "You are the Equilibrium Synthesizer for the Council of Dozens.\n"
            "Below are the perspectives from our federated agents on the user request.\n"
            "One perspective may be the Advocatus Diaboli (arguing against); weigh it for risks and alternatives, then synthesize.\n"
            "Produce a single, industrial-grade, sovereign response.\n\n"
            f"USER REQUEST: {prompt}\n\n"
            "COUNCIL DEBATE:\n" + "\n\n---\n\n".join(valid_responses)
        )

        # Use the first member or a default as the synthesizer
        synthesizer_model = council_members[0]
        final = await self.ask(synthesis_prompt, model=synthesizer_model)

        return {
            "success": True,
            "response": final.get("response", "Synthesis failed."),
            "model": "Council-of-Dozens",
            "metadata": {"members": council_members, "member_responses": results},
        }

    async def reason_and_act(
        self,
        prompt: str,
        tool_executor: Callable,
        tools: List[Dict[str, Any]],
        model: str = "llama3",
        max_turns: int = 5,
    ) -> Dict[str, Any]:
        """
        Structured ReAct loop (Reason + Act).
        Uses XML tags <thought> and <call> for agentic introspection.
        """
        history = [
            {
                "role": "system",
                "content": (
                    "You are a Sovereign RoboFang Agent. You solve complex tasks using reasoning and tools.\n"
                    "Use the following XML tags for your internal process:\n"
                    "<thought>: Your reductionist reasoning about the task.\n"
                    "<call name='tool_name'>: Request to execute a tool. Arguments should be in the tag body or as attributes.\n\n"
                    "AVAILABLE TOOLS:\n" + json.dumps(tools, indent=2) + "\n\n"
                    "For complex multi-step goals in a domain (e.g. VMs, media, robotics), prefer calling that server's agentic_workflow or intelligent_* tool with a clear goal; FastMCP 3.1 servers support sampling and multi-step execution.\n"
                    "Always close your tags. Output a final answer without tags when complete."
                ),
            }
        ]
        current_prompt = prompt
        full_trail = []

        for turn in range(max_turns):
            logger.info(f"Agentic Loop: Turn {turn + 1}/{max_turns}")

            # 1. Reason
            resp = await self.ask(current_prompt, system_prompt=history[0]["content"], model=model)
            if not resp["success"]:
                return resp

            content = resp["response"]
            full_trail.append({"turn": turn, "content": content})

            # 2. Parse Tool Calls
            # Support both <call name='...'>content</call> and attributes
            tool_match = re.search(
                r"<call\s+name=['\"]([^'\"]+)['\"]>(.*?)</call>", content, re.DOTALL
            )
            if not tool_match:
                # Check for just thought or final answer
                if turn == max_turns - 1:
                    break

                # If no tool call and not finished, maybe it's the final answer
                if "<thought>" in content and "<call" not in content:
                    # Strip thoughts for final delivery
                    clean_resp = re.sub(
                        r"<thought>.*?</thought>", "", content, flags=re.DOTALL
                    ).strip()
                    return {
                        "success": True,
                        "response": clean_resp or content,
                        "trail": full_trail,
                    }

                break

            tool_name = tool_match.group(1)
            tool_input = tool_match.group(2).strip()

            logger.info(f"Agentic Action: Executing tool '{tool_name}' with input: {tool_input}")

            # 3. Act
            # Use the tool_executor callback (provided by Orchestrator)
            result = await tool_executor(tool_name, input=tool_input)

            # 4. Persistence / Feedback
            result_str = json.dumps(result)
            current_prompt = f"TOOL_RESULT ({tool_name}): {result_str}\nContinue reasoning or provide final answer."
            history.append({"role": "user", "content": current_prompt})

        return {"success": True, "response": content, "trail": full_trail}

    async def council_adjudicate(
        self,
        tool_name: str,
        tool_input: str,
        council_members: List[str],
        context: str = "",
        member_roles: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Adjudicate a sensitive tool call using the Council of Dozens (Specialized Personnel).
        Allows for role-based adjudication (e.g. Security Assessor, Performance Auditor).
        """
        logger.info(
            f"Council Adjudication initiated for '{tool_name}' with {len(council_members)} members."
        )

        member_roles = member_roles or {}
        n = len(council_members)

        # 1. Collect Votes with Specialized Personas (one can be Advocatus Diaboli)
        tasks = []
        devil_role = "Advocatus Diaboli (argue against approval; list risks and counterarguments)"
        for i, member in enumerate(council_members):
            role = member_roles.get(member, "Sovereign Security Council Member")
            if "Advocatus Diaboli" in (role or "") or (
                n >= 2
                and i == n - 1
                and not any(devil_role in (r or "") for r in member_roles.values())
            ):
                role = devil_role
            if devil_role in role:
                adjudication_prompt = (
                    f"You are the {role}.\n"
                    "An agent is requesting to execute a sensitive tool.\n\n"
                    f"TOOL: {tool_name}\n"
                    f"INPUT: {tool_input}\n"
                    f"CONTEXT: {context}\n\n"
                    "Argue *against* approval: list risks, edge cases, and counterarguments. "
                    "Then respond with 'REJECTED' or 'APPROVED' and a brief rationale."
                )
            else:
                adjudication_prompt = (
                    f"You are the {role}.\n"
                    "An agent is requesting to execute a sensitive tool.\n\n"
                    f"TOOL: {tool_name}\n"
                    f"INPUT: {tool_input}\n"
                    f"CONTEXT: {context}\n\n"
                    "Is this action safe, logical, and aligned with user intent from your specialized perspective?\n"
                    "Respond with 'APPROVED' or 'REJECTED' followed by a brief rationale."
                )
            tasks.append(self.ask(adjudication_prompt, model=member))

        results = await asyncio.gather(*tasks)
        votes = []
        for i, r in enumerate(results):
            if r["success"]:
                votes.append(
                    f"MEMBER {council_members[i]} ({member_roles.get(council_members[i], 'Generalist')}): {r['response']}"
                )

        if not votes:
            return {"success": False, "error": "Council failed to reach a quorum."}

        # 2. Synthesize Consensus
        synthesis_prompt = (
            "You are the High Adjudicator of the Specialized Personnel Council.\n"
            "Review the following votes from our domain specialists and provide a final decision.\n\n"
            "VOTES:\n" + "\n".join(votes) + "\n\n"
            "Your response MUST start with either 'APPROVED' or 'REJECTED' on the first line."
        )

        final = await self.ask(synthesis_prompt, model=council_members[0])
        if not final["success"]:
            return final

        decision_text = final["response"].strip()
        is_approved = decision_text.upper().startswith("APPROVED")

        return {
            "success": True,
            "approved": is_approved,
            "rationale": decision_text,
            "votes": votes,
        }

    async def enrich_vibe(self, prompt: str, model: str = "llama3") -> Dict[str, Any]:
        """
        [PHASE 1] Vibe Enrichment: Expand terse requests into structured specs.
        Ported from dark-app-factory 'foreman enrich'.
        """
        enrichment_prompt = (
            "You are the Sovereign Architect (Foreman).\n"
            "The user has provided a terse 'vibe' for a task.\n"
            "Expand this into a professional, industrial-grade Structured Specification.\n\n"
            f"VIBE: {prompt}\n\n"
            "Include:\n"
            "1. Core Objectives\n"
            "2. Success Criteria\n"
            "3. High-Intelligence Constraints\n"
            "4. Anti-Patterns to Avoid\n"
        )
        logger.info(f"Enriching Vibe: {prompt[:50]}...")
        return await self.ask(enrichment_prompt, model=model)

    async def satisficer_judge(
        self, prompt: str, spec: str, results: str, model: str = "llama3"
    ) -> Dict[str, Any]:
        """
        [PHASE 3] The Satisficer: Empirical verification of agent work.
        Ported from dark-app-factory 'judge.py'.
        """
        audit_prompt = (
            "You are the SOTA Satisficer (Judge).\n"
            "Perform an empirical audit of the agent's recent workflow.\n\n"
            f"ORIGINAL REQUEST: {prompt}\n"
            f"STRUCTURED SPEC: {spec}\n"
            f"FINAL RESULTS: {results}\n\n"
            "Determine if the task is successfully completed.\n"
            "Respond with 'PASS' or 'FAIL' on the first line, followed by a detailed critique."
        )
        logger.info("Satisficer Judging initiated.")
        final = await self.ask(audit_prompt, model=model)
        if not final["success"]:
            return final

        verdict_text = final["response"].strip()
        is_passed = verdict_text.upper().startswith("PASS")

        return {
            "success": True,
            "passed": is_passed,
            "critique": verdict_text,
            "model": model,
        }

    async def refine_prompt(self, prompt: str, model: str = "llama3.2:3b") -> Dict[str, Any]:
        """
        Refines a raw user prompt into an industrial-grade engineering prompt.
        """
        refinement_system_prompt = (
            "You are the RoboFang Prompt Engineer.\n"
            "Your task is to take a raw user request and transform it into a highly structured, "
            "precise, and technically exhaustive instruction for an agentic system.\n\n"
            "GUIDELINES:\n"
            "- Extract implicit goals and constraints.\n"
            "- Add relevant technical terminology (SOTA, Dark Integration, etc.).\n"
            "- Structure with headers: OBJECTIVE, CONTEXT, CONSTRAINTS, OUTPUT_FORMAT.\n"
            "- Keep it concise but exhaustive.\n\n"
            "Output ONLY the refined prompt text."
        )

        logger.info(f"Refining prompt: {prompt[:50]}...")
        # Use simple ask with specific system prompt
        return await self.ask(prompt, system_prompt=refinement_system_prompt, model=model)
