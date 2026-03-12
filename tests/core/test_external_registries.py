"""Unit tests for external_registries (normalize_github_repo_url, discover_docker)."""

import pytest
from robofang.core.external_registries import discover_docker, normalize_github_repo_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://github.com/owner/repo", "https://github.com/owner/repo"),
        ("https://github.com/owner/repo/", "https://github.com/owner/repo"),
        ("http://github.com/owner/repo", "https://github.com/owner/repo"),
        ("https://www.github.com/owner/repo", "https://github.com/owner/repo"),
        ("https://github.com/owner/repo.git", "https://github.com/owner/repo"),
        ("github.com/owner/repo", "https://github.com/owner/repo"),
    ],
)
def test_normalize_github_repo_url(url, expected):
    assert normalize_github_repo_url(url) == expected


@pytest.mark.parametrize(
    "url",
    ["", "https://gitlab.com/owner/repo", "https://example.com/owner/repo", "not-a-url"],
)
def test_normalize_github_repo_url_invalid(url):
    assert normalize_github_repo_url(url) is None


def test_discover_docker_returns_list():
    result = discover_docker()
    assert isinstance(result, list)
    for item in result:
        assert "id" in item
        assert "name" in item
        assert item.get("source") == "docker"
