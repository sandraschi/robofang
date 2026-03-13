"""Import all dependency-heavy modules so CI fails if pyproject.toml is missing a dep. No silent missing deps."""


def test_hand_manifest_import():
    """Requires: tomli."""
    from robofang.core.hand_manifest import HandAgentConfig, HandDefinition

    assert HandDefinition is not None and HandAgentConfig is not None


def test_installer_import():
    """Requires: pyyaml."""
    from robofang.core.installer import HandInstaller, HandManifestItem  # noqa: F401

    assert HandInstaller is not None


def test_skills_import():
    """Requires: pyyaml."""
    from robofang.core.skills import SkillManager

    assert SkillManager is not None


def test_repo_watcher_import():
    """Requires: requests, structlog, watchdog."""
    from robofang.repo_watcher import DebouncingRepoHandler

    assert DebouncingRepoHandler is not None
