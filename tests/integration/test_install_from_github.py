"""
Integration tests for MCP server install from GitHub.
Requires network and gh CLI. Run with: pytest tests/integration/test_install_from_github.py -m github
Skip by default: pytest -m "not github"
"""

import pytest
import yaml

from robofang.core.installer import HandInstaller, HandManifestItem

# Small public repo with no start.ps1 so install script step is skipped
HELLO_WORLD_REPO = "https://github.com/octocat/Hello-World.git"
# Real MCP server repo: clone + deps (uv sync / pip install -e .)
GIMP_MCP_REPO = "https://github.com/sandraschi/gimp-mcp"


@pytest.mark.github
@pytest.mark.integration
def test_install_from_github_real_clone(tmp_path):
    """Clone a real public repo into hands dir; verify directory exists and has .git."""
    manifest_path = tmp_path / "fleet_manifest.yaml"
    hands_base = tmp_path / "hands"
    hands_base.mkdir(parents=True, exist_ok=True)
    installer = HandInstaller(manifest_path=manifest_path, hands_base_dir=hands_base)

    hand_id = "Hello-World"
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": hand_id,
                        "name": "Hello World",
                        "category": "Other",
                        "description": "GitHub octocat/Hello-World",
                        "repo_url": HELLO_WORLD_REPO,
                        "install_script": None,
                        "tags": ["integration-test"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    result = installer.install(hand_id)
    assert result.get("success") is True, result.get("error") or result.get("message")
    target = hands_base / hand_id
    assert target.exists() and target.is_dir()
    assert (target / ".git").exists()


@pytest.mark.github
@pytest.mark.integration
def test_add_to_manifest_then_install_from_github(tmp_path):
    """Add a hand from catalog (manifest write) then install via clone."""
    manifest_path = tmp_path / "fleet_manifest.yaml"
    hands_base = tmp_path / "hands"
    hands_base.mkdir(parents=True, exist_ok=True)
    installer = HandInstaller(manifest_path=manifest_path, hands_base_dir=hands_base)

    item = HandManifestItem(
        id="Hello-World",
        name="Hello World",
        category="Other",
        description="Added then installed",
        repo_url=HELLO_WORLD_REPO,
        install_script=None,
        tags=["catalog"],
    )
    installer.add_hand_to_manifest(item)
    assert len(installer.get_manifest()) == 1
    result = installer.install("Hello-World")
    assert result.get("success") is True, result.get("error") or result.get("message")
    assert (hands_base / "Hello-World" / ".git").exists()


@pytest.mark.github
@pytest.mark.integration
def test_install_gimp_mcp_real_clone_and_deps(tmp_path):
    """Clone gimp-mcp and run deps (uv sync or pip install -e .). No install_script."""
    manifest_path = tmp_path / "fleet_manifest.yaml"
    hands_base = tmp_path / "hands"
    hands_base.mkdir(parents=True, exist_ok=True)
    installer = HandInstaller(manifest_path=manifest_path, hands_base_dir=hands_base)

    hand_id = "gimp-mcp"
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": hand_id,
                        "name": "GIMP MCP",
                        "category": "Creative",
                        "description": "Image editing MCP server",
                        "repo_url": GIMP_MCP_REPO,
                        "install_script": None,
                        "tags": ["integration-test"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    result = installer.install(hand_id)
    assert result.get("success") is True, result.get("error") or result.get("message")
    target = hands_base / hand_id
    assert target.exists() and target.is_dir()
    assert (target / ".git").exists()
    assert (target / "pyproject.toml").exists()
