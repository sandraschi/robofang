# RoboFang: Sandbox Isolation Specification

The **Sandbox Strategy** is the project's secondary defense for any agentic task that involves modifying the local filesystem, executing untrustworthy code, or interacting with a "Tainted" environment.

---

## 1. The Isolation Mandate

Any "Labor" agent tasked with writing files, installing dependencies, or running scripts must be isolated from the host environment. The RoboFang Bridge manages the lifecycle of these isolated environments.

### Isolation Tiers

| Tier | Isolation Type | Rationale |
|------|----------------|-----------|
| **Tier 1 (Shadow)** | Copy-on-Write (CoW) | Minor file edits in the `D:/Dev/repos` fleet. |
| **Tier 2 (Hyper-V)** | Windows Sandbox (`.wsb`) | Complex code execution or repository-wide modifications. |
| **Tier 3 (Airgapped)** | Offline VM | High-risk autonomous research tasks on unknown data. |

---

## 2. Windows Sandbox Integration (`.wsb`)

RoboFang leverages the native Windows Sandbox for Tier 2 isolation. The **Sandbox Bridge** uses a configured `.wsb` file to spawn a fresh, disposable environment for each high-risk task.

- **Mapped Folders**: Only the specific repository being modified is mapped (Read-Only) to the sandbox.
- **Log Collection**: Stderr and Stdout are streamed back to the RoboFang Supervisor for real-time monitoring.
- **Artifact Retrieval**: Modified files are retrieved from the sandbox's virtual drive and presented as a **Pending Diff** to the human operator.

---

## 3. The Shadow Filesystem Protocol

For internal fleet modifications (e.g., updating an MCP server's `mcp_config.json`), RoboFang uses a **Shadow Filesystem**.

1. **Clone**: The agent creates a temporary clone of the target file in the `/tmp/shadow/` directory.
2. **Modify**: The agent performs its edits on the shadow file.
3. **Verify**: The **Satisficer** agent audits the shadow file for syntax errors and Taboo violations.
4. **Present**: The Sovereign Dashboard displays a "Side-by-Side Diff" of the original vs. the shadow file.
5. **Commit**: Only after the human operator clicks "Approve & Commit" is the shadow file moved to its live location.

---

## 4. Mitigation of "Destructive Overwrites"

The **Sandbox Spec** prevents an agent from "blanking" or "corrupting" a file in the live environment.

- **Checkpoints**: Every commit to the live environment is preceded by a `.bak` file creation.
- **Rollback**: The Sovereign Dashboard provides a one-click rollback to the last known-good state.
- **Atomic Commits**: RoboFang ensures that all file modifications are atomic. A partial write during a system crash will not leave the fleet in a corrupted state.

---

## 5. Security Gates for the Sandbox

- **Networking**: Windows Sandbox is configured with `<Networking>Disable</Networking>` by default for all Labor tasks, preventing exfiltration.
- **ClipBoard**: Clipboard sharing is disabled in the `.wsb` manifest.
- **User Interface**: The sandbox runs in the background; the human operator only sees the results via the Dashboard.
