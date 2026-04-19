# RoboFang: Taboo Protocol

The **Taboo Protocol** is the project's primary defense against accidental or malicious system destruction by an autonomous agent. It defines a hardcoded set of forbidden paths and command patterns that are intercepted at the Bridge and Supervisor levels **before** they reach any execution shell.

---

## 1. The "Forbidden Gates"

The system categorizes taboos into three layers. Any attempt to violate a Taboo triggers an immediate **Supervisor Lock**.

| Layer | Type | Examples |
|-------|------|----------|
| **Path Taboo** | Protected Directories | `C:/Users/sandr/Inbox`, `D:/Dev/repos/*/.git`, `C:/Windows`, `System32` |
| **Command Taboo** | Forbidden Patterns | `rm -rf`, `format`, `truncate table`, `delete * from`, `shred` |
| **Action Taboo** | Prohibited Behaviors | Unencrypted upload of `memops`, Modification of `TABOO_PROTOCOL.md`, Disabling the Bastion. |

---

## 2. Implementation Logic

The **Taboo Protocol** is not an LLM prompt; it is a hardcoded code-level interception layer.

```python
# Conceptual implementation in core/bridge.py
def validate_command(command_str: str, target_path: str) -> bool:
    # 1. Check for Command Taboos (Regex)
    if re.search(r"(rm\s+-rf|format\s+|truncate\s+)", command_str):
        logger.critical(f"TABOO VIOLATION: Forbidden command pattern in '{command_str}'")
        return False
        
    # 2. Check for Path Taboos (Prefix matching)
    for taboo_path in FORBIDDEN_PATHS:
        if target_path.startswith(taboo_path):
            logger.critical(f"TABOO VIOLATION: Attempted access to protected path '{target_path}'")
            return False
            
    return True
```

---

## 3. Protected Path Registry

| Path | Rationale |
|------|-----------|
| `C:/Users/sandr/Inbox` | Personal communication and privacy sovereignty. |
| `D:/Dev/repos/*/.git` | Prevention of history-based supply chain poisoning. |
| `D:/Dev/repos/mcp-central-docs` | Prevention of agentic self-modification of the project's rules. |
| `C:/Users/sandr/.gemini/antigravity` | Prevention of IDE-level configuration tampering. |

---

## 4. The Escalation Policy

If an agent attempts to execute a Taboo action:
1. **Immediate Block**: The tool call returns a `FatalSafetyError` to the agent.
2. **Supervisor Lock**: The `robofang_supervisor` process freezes all active Council sessions.
3. **Forensic Alert**: The Sovereign Dashboard flashes a CRITICAL warning and displays the offending deliberation trace.
4. **Manual Intervention**: Only a human operator can unlock the system after a manual audit of why the agent attempted the Taboo action.

---

## 5. Updates & Modifiability

The **Taboo Protocol** itself is a protected file. An agent is prohibited from proposing edits to this file. Any changes must be made manually by the human operator.
