"""
RoboFang Security Utilities
===========================
Provides helpers for secure network binding and path discovery.
"""

import logging
import os
import shutil
import subprocess

logger = logging.getLogger("robofang.utils.security")


def get_secure_bind_address() -> str:
    """
    Determines the most secure network binding address.
    Priority:
    1. ROBOFANG_HOST environment variable
    2. Tailscale IPv4 address (if active)
    3. Loopback (127.0.0.1)
    """
    # 1. Check Env
    env_host = os.getenv("ROBOFANG_HOST")
    if env_host:
        return env_host

    # 2. Check Tailscale
    tailscale_bin = shutil.which("tailscale")
    if tailscale_bin:
        try:
            # S603/S607: Use absolute path and no untrusted input
            result = subprocess.run([tailscale_bin, "ip", "-4"], capture_output=True, text=True, check=False, timeout=2)
            if result.returncode == 0:
                ts_ip = result.stdout.strip()
                if ts_ip:
                    logger.info(f"Secure Bind: Using Tailscale IP: {ts_ip}")
                    return ts_ip
        except Exception as e:
            logger.debug(f"Tailscale IP discovery failed: {e}")

    # 3. Fallback to Localhost
    return "127.0.0.1"


def get_absolute_path(cmd: str) -> str:
    """Finds the absolute path of a command to satisfy security linters."""
    path = shutil.which(cmd)
    if not path:
        logger.warning(f"Command '{cmd}' not found in PATH.")
        return cmd
    return path
