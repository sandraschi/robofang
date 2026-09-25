"""
Unit tests for HandInstaller: manifest read/write and install flow.
Uses tmp_path; install() uses mocked subprocess so no real git or network.
"""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml

from robofang.core.installer import (
    HandInstaller,
    HandManifestItem,
    _github_owner_repo,
    _hand_venv_python,
    _install_deps,
)


@pytest.fixture
def manifest_path(tmp_path):
    return tmp_path / "fleet_manifest.yaml"


@pytest.fixture
def hands_base(tmp_path):
    d = tmp_path / "hands"
    d.mkdir(parents=True, exist_ok=True)
    return d


@pytest.fixture
def installer(manifest_path, hands_base):
    return HandInstaller(manifest_path=manifest_path, hands_base_dir=hands_base)


def test_get_manifest_missing_file_returns_empty(installer):
    assert installer.get_manifest() == []


def test_get_manifest_empty_hands_returns_empty(installer, manifest_path):
    manifest_path.write_text(yaml.safe_dump({"hands": []}), encoding="utf-8")
    assert installer.get_manifest() == []


def test_get_manifest_parses_hands(installer, manifest_path):
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "test-mcp",
                        "name": "Test MCP",
                        "category": "Other",
                        "description": "A test",
                        "repo_url": "https://github.com/owner/test-mcp",
                        "install_script": "start.ps1",
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    items = installer.get_manifest()
    assert len(items) == 1
    assert items[0].id == "test-mcp"
    assert items[0].repo_url == "https://github.com/owner/test-mcp"


def test_add_hand_to_manifest_creates_file_and_dir(installer, manifest_path):
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    item = HandManifestItem(
        id="new-hand",
        name="New Hand",
        category="Other",
        description="From GitHub",
        repo_url="https://github.com/owner/new-hand",
        install_script="start.ps1",
        tags=["catalog"],
    )
    installer.add_hand_to_manifest(item)
    assert manifest_path.exists()
    data = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    assert data.get("hands") == [item.model_dump()]
    assert installer.get_manifest()[0].id == "new-hand"


def test_add_hand_to_manifest_appends(installer, manifest_path):
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "first",
                        "name": "First",
                        "category": "Other",
                        "description": "",
                        "repo_url": "https://github.com/owner/first",
                        "install_script": None,
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    item = HandManifestItem(
        id="second",
        name="Second",
        category="Other",
        description="",
        repo_url="https://github.com/owner/second",
        install_script="start.ps1",
        tags=[],
    )
    installer.add_hand_to_manifest(item)
    items = installer.get_manifest()
    assert len(items) == 2
    assert [i.id for i in items] == ["first", "second"]


def test_add_hand_to_manifest_duplicate_raises(installer, manifest_path):
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "dup",
                        "name": "Dup",
                        "category": "Other",
                        "description": "",
                        "repo_url": "https://github.com/owner/dup",
                        "install_script": None,
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    item = HandManifestItem(
        id="dup",
        name="Dup Again",
        category="Other",
        description="",
        repo_url="https://github.com/owner/dup",
        install_script=None,
        tags=[],
    )
    with pytest.raises(ValueError, match="already in manifest"):
        installer.add_hand_to_manifest(item)


def test_install_hand_not_in_manifest_returns_error(installer):
    out = installer.install("nonexistent")
    assert out.get("success") is False
    assert "not found in manifest" in (out.get("error") or "")


def test_install_already_installed_returns_success(installer, manifest_path, hands_base):
    (hands_base / "my-mcp").mkdir(parents=True)
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "my-mcp",
                        "name": "My MCP",
                        "category": "Other",
                        "description": "",
                        "repo_url": "https://github.com/owner/my-mcp",
                        "install_script": None,
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    out = installer.install("my-mcp")
    assert out.get("success") is True
    assert "already installed" in (out.get("message") or "").lower()


def test_github_owner_repo():
    assert _github_owner_repo("https://github.com/owner/repo") == ("owner", "repo")
    assert _github_owner_repo("https://github.com/owner/repo.git") == ("owner", "repo")
    assert _github_owner_repo("git@github.com:owner/repo.git") == ("owner", "repo")
    assert _github_owner_repo("https://gitlab.com/other/repo") is None
    assert _github_owner_repo("") is None


@patch("robofang.core.installer.subprocess.run")
def test_install_deps_pip_fallback_never_uses_robofang_interpreter(mock_run, tmp_path):
    """uv sync fails -> pip fallback must target the hand's own .venv, not sys.executable's env."""
    (tmp_path / "pyproject.toml").write_text("[project]\nname='x'\n", encoding="utf-8")
    venv_py = _hand_venv_python(tmp_path)

    def fake_run(cmd, **kwargs):
        assert "VIRTUAL_ENV" not in kwargs.get("env", {})
        if cmd[:2] == ["uv", "sync"]:
            return type("R", (), {"returncode": 1, "stderr": "unsatisfiable", "stdout": ""})()
        if cmd[1:3] == ["-m", "venv"]:
            venv_py.parent.mkdir(parents=True)
            venv_py.write_text("", encoding="utf-8")
        return type("R", (), {"returncode": 0, "stderr": "", "stdout": ""})()

    mock_run.side_effect = fake_run
    assert _install_deps(tmp_path) is None
    pip_call = mock_run.call_args_list[-1].args[0]
    assert pip_call[0] == str(venv_py)
    assert pip_call[0] != sys.executable
    assert pip_call[1:] == ["-m", "pip", "install", "-e", "."]


@patch("robofang.core.installer.subprocess.run")
def test_install_clone_success(mock_run, installer, manifest_path, hands_base):
    mock_run.return_value = type("R", (), {"returncode": 0, "stdout": "", "stderr": ""})()
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "clone-me",
                        "name": "Clone Me",
                        "category": "Other",
                        "description": "",
                        "repo_url": "https://github.com/owner/clone-me",
                        "install_script": None,
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    out = installer.install("clone-me")
    assert out.get("success") is True
    mock_run.assert_called_once()
    args = mock_run.call_args[0][0]
    assert args[:3] == ["gh", "repo", "clone"]
    assert args[3] == "owner/clone-me"
    assert Path(args[4]).name == "clone-me"


@patch("robofang.core.installer.subprocess.run")
def test_install_clone_failure_returns_error(mock_run, installer, manifest_path):
    mock_run.return_value = type("R", (), {"returncode": 1, "stdout": "", "stderr": "fatal: repository not found"})()
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "bad-repo",
                        "name": "Bad",
                        "category": "Other",
                        "description": "",
                        "repo_url": "https://github.com/owner/bad-repo",
                        "install_script": None,
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    out = installer.install("bad-repo")
    assert out.get("success") is False
    assert "gh repo clone failed" in (out.get("error") or "")


def test_install_non_github_url_returns_error(installer, manifest_path):
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "gitlab-repo",
                        "name": "GitLab Repo",
                        "category": "Other",
                        "description": "",
                        "repo_url": "https://gitlab.com/owner/repo",
                        "install_script": None,
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    out = installer.install("gitlab-repo")
    assert out.get("success") is False
    assert "Only GitHub" in (out.get("error") or "")
    assert "gh" in (out.get("error") or "").lower()


@patch("robofang.core.installer.subprocess.run")
def test_install_gh_not_in_path_returns_error(mock_run, installer, manifest_path):
    mock_run.side_effect = FileNotFoundError()
    manifest_path.write_text(
        yaml.safe_dump(
            {
                "hands": [
                    {
                        "id": "gh-repo",
                        "name": "GH Repo",
                        "category": "Other",
                        "description": "",
                        "repo_url": "https://github.com/owner/gh-repo",
                        "install_script": None,
                        "tags": [],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    out = installer.install("gh-repo")
    assert out.get("success") is False
    assert "gh" in (out.get("error") or "").lower()
    assert "not found" in (out.get("error") or "").lower()
