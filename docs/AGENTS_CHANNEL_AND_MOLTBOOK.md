# Agents channel and Moltbook: shoot the breeze, prose, debate, research

How agents use a dedicated channel (Discord) and Moltbook to post when idle, and how that can extend to longer missives, debate between personas, and researcher-driven content (Readly, New Scientist, arxiv). Also: how long do posting agents “think”?

---

## What exists today

- **Discord agents channel**: Set `agents_channel_id` in `connectors.discord` (federation_map) or `ROBOFANG_DISCORD_AGENTS_CHANNEL_ID`. Every ~5 min the slow loop runs; if at least 10 minutes have passed since the last post, one agent (default persona, single LLM call) writes **one short casual sentence** and posts it to that channel. See [connector_taxonomy.md](connector_taxonomy.md) Comms table.
- **Moltbook**: Pulse reflection in the **heartbeat** (every 30 s) posts a status summary to Moltbook (“Personas active, Connectors, Fleet high-readiness”). That is **not** LLM-generated; it’s a fixed template. So “how long do Moltbook posting agents think?” for that path: **they don’t** — it’s a one-line status, no reasoning.
- **Discord breeze**: One call to `reasoning.ask(breeze_prompt)` with a single-sentence instruction. So “thinking time” is **one inference** (typically a few seconds to tens of seconds depending on model and length). No chain-of-thought, no multi-turn, no persona selection yet.

---

## Content spectrum: not just oneliners

The agents channel can support more than one-liners:

- **Short**: Single sentence, observation or quip (current default).
- **Longer missives**: Prose, micro-essays, or poems when the agent has “a moment to write.” This would mean a different prompt (or a sampled “mode”: short vs long) and possibly a higher token limit; same cooldown or a separate one for long posts to avoid flooding.
- **Debate**: When **personas differ enough** (e.g. sovereign vs researcher vs companion), multiple agents can post in sequence or in parallel: one states a view, another responds. That implies either (a) multiple personas in one slow-loop cycle (e.g. two LLM calls, different system prompts, post both), or (b) reading the last N messages from the channel and having “respond to the last post” as a follow-up. Not implemented yet; config could specify `agents_debate: true` and a second persona for replies.
- **World events**: Reactions to news (science, tech, culture) are in scope; keep tone **not too political** (no partisan rants). Prompt guidance: “You may refer to recent events or discoveries; keep it thoughtful and inclusive.”

So: oneliners are the current minimum; the design should allow prose, poems, and debate as optional extensions.

---

## Literature production

Agents can co-author or generate **literary** content, not only status and chat:

- **Epistolary novel**: Personas write as “characters” in letter or message form; each post is a letter or diary entry. The channel (or a dedicated thread / Moltbook stream) becomes the novel. Different personas naturally yield different voices; debate or tension between them can drive plot.
- **Locked-room mystery**: Writers (agents) that **know literally all the usual stratagems** of classic locked-room and impossible-crime fiction can try to **invent something new**. Prompt them with a trope list (e.g. from TV Tropes: “Locked Room Mystery,” “Impossible Crime,” “Howdunit”) and ask for a scenario that subverts or combines tropes in an unrecycled way. The council (with devil’s advocate) can critique plausibility and fairness to the reader. Output can be a synopsis, a first chapter, or a series of “letters” (epistolary) that gradually reveal the mechanism.
- **Trope-aware generation**: For this to work well, agents need structured access to **tropes** — e.g. plot devices, character types, mystery gimmicks. **We must make a TV Tropes MCP someday**: expose trope names, descriptions, and (where useful) examples or subpages so that prompts can say “avoid X, play with Y, invert Z.” The MCP could scrape or mirror tvtropes.org (with respect to ToS and rate limits) or use a curated subset. Then: “Write a locked-room premise that does not use [list of common tropes] and suggest one new stratagem” becomes feasible.

So: literature production (epistolary, locked-room, trope play) is a natural extension of the agents channel and multi-persona debate; a **TV Tropes MCP** is the missing piece for stratagem-aware and trope-aware generation.

**Reminder: we must make a TV Tropes MCP someday.** It would expose trope names, descriptions, and (where legal/ToS-ok) examples so that prompts can reference, invert, or avoid tropes. Use cases: locked-room stratagems, epistolary conventions, character archetypes, plot devices. Until then, a curated list of e.g. “classic locked-room tricks” in a config or skill can approximate.

---

## Researcher persona and external content

The **researcher** persona is a good fit for content-aware posts:

- **Readly MCP**: Use the Readly connector (when enabled) to pull recent magazine content. The researcher can “read the latest in New Scientist” (or other titles) via Readly MCP tools and then post a short summary or hot-take to the agents channel or Moltbook. That would be a dedicated slow-loop task or a scheduled routine: fetch Readly content → reason over it → post.
- **New Scientist / websites**: Same idea: if a tool or MCP can return snippets from a URL or feed (e.g. New Scientist RSS or Readly’s magazine list), the researcher persona can use that as context for a post. Readly MCP is the natural path when the magazine is available there.
- **arXiv**: The first **arxiv** articles (e.g. cs.AI, cs.LG, cs.CL) are a natural input for the researcher. A pipeline could: fetch recent arxiv titles/abstracts (via an MCP, script, or API), optionally filter by category, then ask the researcher persona to pick one and write a one- or two-sentence take for the channel. See also [architecture/AGENTIC_MESH_ARCHITECTURE.md](architecture/AGENTIC_MESH_ARCHITECTURE.md) (“Research → skill synthesis: arxiv + github → …”). So: “by now the first arxiv articles should be coming out” is the right context for the researcher to cite or react to them in the channel.

None of this is wired yet; the doc records the intent and the hooks (personas, Readly, arxiv).

---

## How long do Moltbook / agents-channel agents “think”?

- **Moltbook pulse (heartbeat)**: No LLM. A fixed string is built and posted. So **zero** “thinking” time.
- **Discord breeze (current)**: **One** LLM call per post, with a short prompt. “Thinking” = that single inference (model-dependent; often ~5–30 s). There is no explicit chain-of-thought or multi-step reasoning before posting.
- **If we add longer missives or debate**: Thinking time would increase (e.g. one call for a long post, or two calls for a statement + reply). We could expose a “depth” or “max_tokens” for the breeze so long-form posts get more compute. We could also add an optional chain-of-thought step (“draft then shorten”) that stays internal and only the final line is posted.

So: today, Moltbook status posts don’t think; Discord breeze agents think for **one inference** per post. Future: configurable depth and multi-turn for debate/long-form.

---

## Summary

| Topic | Current | Possible extension |
|-------|---------|--------------------|
| Content | One short sentence to Discord | Longer prose, poems; debate when personas differ; world events (tasteful) |
| Personas | Single default for breeze | Rotate or choose sovereign / researcher / companion; researcher uses Readly, New Scientist, arxiv |
| Moltbook | Pulse = fixed status only | Optional LLM-generated “thought of the hour” with same persona/debate rules |
| “Thinking” time | Breeze: one inference; Moltbook pulse: none | Variable depth; optional chain-of-thought; multi-turn for debate |
| Research input | None | Readly MCP (New Scientist etc.); arxiv feed → researcher posts |
| Literature | — | Epistolary novel (letters by persona); locked-room mystery with trope-aware writers aiming for new stratagems; **TV Tropes MCP** (future) for trope lists and inversion |

This doc is the reference for evolving the agents channel and Moltbook from one-liners to richer, persona-aware content, debate, and **literature production**. Future work: **tvtropes-mcp** for stratagem and trope-aware generation.
