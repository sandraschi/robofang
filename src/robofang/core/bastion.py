"""
Local Bastion Manager for RoboFang.

Provides resource monitoring and quota enforcement for local fleet processes,
ensuring CPU and RAM usage stay within defined safety limits.
"""

import logging
from typing import Any

import psutil

logger = logging.getLogger(__name__)


class LocalBastionManager:
    """
    Manages resource quotas and monitoring for local sandboxed environments.
    Tracks CPU and RAM consumption across the fleet.
    """

    def __init__(
        self,
        cpu_quota: float = 80.0,
        ram_quota: float = 80.0,
        monitor_interval: int = 5,
    ):
        """
        Initialize the Bastion manager.

        Args:
            cpu_quota: Maximum allowed total CPU percentage
            ram_quota: Maximum allowed total RAM percentage
            monitor_interval: Seconds between automated checks
        """
        self.cpu_quota = cpu_quota
        self.ram_quota = ram_quota
        self.monitor_interval = monitor_interval
        self.logger = logging.getLogger("robofang.security.bastion")
        self.tracked_pids: list[int] = []

    def register_process(self, pid: int):
        """Add a process ID to the tracked list."""
        if pid not in self.tracked_pids:
            self.tracked_pids.append(pid)
            self.logger.info(f"Bastion: Now tracking PID {pid}")

    def unregister_process(self, pid: int):
        """Remove a process ID from tracking."""
        if pid in self.tracked_pids:
            self.tracked_pids.remove(pid)
            self.logger.info(f"Bastion: Stopped tracking PID {pid}")

    def check_health(self) -> dict[str, Any]:
        """
        Perform a comprehensive system health check relative to quotas.

        Returns:
            Dictionary with resource metrics and status
        """
        try:
            # System-wide metrics
            cpu_usage = psutil.cpu_percent(interval=1)
            ram_usage = psutil.virtual_memory().percent

            # Aggregate stats for tracked fleet processes
            fleet_cpu = 0.0
            fleet_ram_bytes = 0

            for pid in self.tracked_pids[:]:
                try:
                    proc = psutil.Process(pid)
                    if proc.is_running():
                        fleet_cpu += proc.cpu_percent(interval=0.1)
                        fleet_ram_bytes += proc.memory_info().rss
                    else:
                        self.unregister_process(pid)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    self.unregister_process(pid)

            fleet_ram_percent = (fleet_ram_bytes / psutil.virtual_memory().total) * 100

            # Status determination
            status = "HEALTHY"
            violations = []

            if cpu_usage > self.cpu_quota:
                status = "CRITICAL" if cpu_usage > 95 else "WARNING"
                violations.append(f"System CPU ({cpu_usage}%) exceeds quota ({self.cpu_quota}%)")

            if ram_usage > self.ram_quota:
                status = "CRITICAL" if ram_usage > 95 else "WARNING"
                violations.append(f"System RAM ({ram_usage}%) exceeds quota ({self.ram_quota}%)")

            if violations:
                for v in violations:
                    self.logger.warning(f"Bastion Violation: {v}")

            return {
                "status": status,
                "metrics": {
                    "system": {"cpu": cpu_usage, "ram": ram_usage},
                    "fleet": {
                        "cpu": round(fleet_cpu, 2),
                        "ram_percent": round(fleet_ram_percent, 2),
                        "ram_bytes": fleet_ram_bytes,
                        "active_processes": len(self.tracked_pids),
                    },
                },
                "quotas": {"cpu": self.cpu_quota, "ram": self.ram_quota},
                "violations": violations,
            }

        except Exception as e:
            self.logger.error(f"Bastion Monitor Failure: {e}")
            return {"status": "ERROR", "error": str(e)}

    def enforce_quotas(self) -> bool:
        """
        Enforce quotas by terminating the single most memory-heavy tracked process
        when status is CRITICAL. Returns True if no action needed or action succeeded.
        """
        health = self.check_health()
        if health.get("status") != "CRITICAL":
            return True
        self.logger.critical("RESOURCE CRITICAL: Bastion enforcing quotas.")
        pids = list(self.tracked_pids)
        if not pids:
            return False
        worst_pid = None
        worst_rss = 0
        for pid in pids:
            try:
                proc = psutil.Process(pid)
                if proc.is_running():
                    rss = proc.memory_info().rss
                    if rss > worst_rss:
                        worst_rss = rss
                        worst_pid = pid
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                self.unregister_process(pid)
        if worst_pid is not None:
            try:
                proc = psutil.Process(worst_pid)
                self.logger.warning(
                    "Bastion: terminating highest-RSS tracked process pid=%s (rss=%s)",
                    worst_pid,
                    worst_rss,
                )
                proc.terminate()
                proc.wait(timeout=5)
                self.unregister_process(worst_pid)
                return True
            except (
                psutil.NoSuchProcess,
                psutil.AccessDenied,
                psutil.TimeoutExpired,
            ) as e:
                self.logger.error("Bastion enforce_quotas failed for pid %s: %s", worst_pid, e)
                return False
        return False
