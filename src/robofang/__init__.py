# RoboFang package
"""RoboFang: MCP & robotics orchestration hub."""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("robofang")
except PackageNotFoundError:  # running from source without an install
    __version__ = "0.0.0+source"

__all__ = ["__version__"]
