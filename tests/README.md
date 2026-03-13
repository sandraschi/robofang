# robofang Test Suite

This directory contains unit, integration, and E2E tests for the orchestration hub.

## Running Tests

Default (unit + bridge tests; no network):

```powershell
pytest
```

Skip integration / GitHub-clone tests (no network, no git):

```powershell
pytest -m "not github"
pytest -m "not integration"
```

Run only MCP server install-from-GitHub integration tests (requires network and git):

```powershell
pytest tests/integration/test_install_from_github.py -m github
```

Run only installer unit tests:

```powershell
pytest tests/core/test_installer.py -v
```

## Test layout

- **tests/conftest.py** – Pytest fixtures; mock orchestrator for bridge API tests.
- **tests/test_bridge_fleet.py** – Fleet and install API (onboard, onboard-from-github, discover, register).
- **tests/core/test_installer.py** – HandInstaller: manifest read/write, install with mocked subprocess (no git).
- **tests/integration/test_install_from_github.py** – Real git clone from GitHub (marked `github`, `integration`; run with `-m github`).
