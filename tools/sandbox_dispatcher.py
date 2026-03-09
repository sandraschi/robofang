import os
import json
import logging
import time
import sys
from typing import Dict, Any
from pathlib import Path

# Add src to path so RoboFang.core is importable when run standalone
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    from robofang.core.bastion import LocalBastionManager
    from robofang.core.bastio import BastioGateway
except ImportError:
    LocalBastionManager = None  # type: ignore
    BastioGateway = None  # type: ignore

logger = logging.getLogger(__name__)


class SandboxDispatcher:
    """
    RoboFang Sandbox Dispatcher.
    Orchestrates task execution within isolated Windows Sandbox environments.
    """

    def __init__(self, root_dir: str, use_dtu: bool = True):
        self.root = Path(root_dir)
        self.exchange_dir = self.root / "exchange" / "sandbox"
        self.exchange_dir.mkdir(parents=True, exist_ok=True)
        self.wsb_template = self.root / "containers" / "agent_template.wsb"
        self.use_dtu = use_dtu
        self.logger = logging.getLogger("RoboFang.sandbox")
        self.dtu_url = os.environ.get("DTU_PROXY_URL", "http://localhost:8001")

        # Security primitives — both are optional
        self.bastion = LocalBastionManager() if LocalBastionManager else None
        self.bastio = (
            BastioGateway(api_key=os.environ.get("BASTIO_API_KEY"))
            if BastioGateway
            else None
        )

    async def prepare_task(
        self, task_data: Dict[str, Any], safety_mode: bool = True
    ) -> Dict[str, Any]:
        """Prepare task metadata for sandboxed execution."""
        task_id = task_data.get("id") or f"task_{int(time.time())}"

        env = {
            "BASTIO_API_KEY": os.environ.get("BASTIO_API_KEY", ""),
            "BASTIO_BASE_URL": os.environ.get(
                "BASTIO_BASE_URL", "https://api.bastio.com"
            ),
            "LOG_LEVEL": "DEBUG" if safety_mode else "INFO",
        }

        if safety_mode:
            self.logger.info(
                f"Task {task_id}: Safety mode — routing to Dark Twin Universe."
            )
            env["DTU_PROXY_URL"] = self.dtu_url
            env["BASTIO_GATEWAY_MODE"] = "Shadow"
        else:
            self.logger.warning(
                f"Task {task_id}: Safety mode DISABLED — live execution."
            )
            env["DTU_PROXY_URL"] = ""
            env["BASTIO_GATEWAY_MODE"] = "Enforce"

        return {
            "task_id": task_id,
            "environment": env,
            "quota": self.bastion.get_default_quota() if self.bastion else {},
            "data": task_data,
        }

    def dispatch_task(
        self, task_name: str, script_content: str, provider: str = "wsb"
    ) -> str:
        """Write script to sandbox exchange dir and trigger the requested provider."""
        # Simplified task_id for debugging
        task_id = f"task_{int(time.time())}"
        task_dir = self.exchange_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)

        # Write script
        script_path = task_dir / "execute_me.py"
        script_path.write_text(script_content, encoding="utf-8")

        # Build env manifest
        env = {
            "BASTIO_API_KEY": os.environ.get("BASTIO_API_KEY", ""),
            "BASTIO_BASE_URL": "https://api.bastio.com",
            "DTU_PROXY_URL": self.dtu_url if self.use_dtu else "",
            "ROBOFANG_SECURITY_LEVEL": "STRICT",
        }

        manifest = {
            "task_id": task_id,
            "name": task_name,
            "provider": provider,
            "status": "QUEUED",
            "start_time": time.ctime(),
            "env": env,
        }
        (task_dir / "task.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )

        self.logger.info(f"Task '{task_name}' dispatched via {provider} → {task_dir}")

        # Trigger provider
        process = None
        if provider == "wsb":
            process = self._launch_wsb(script_path, env)
        elif provider == "sandboxie":
            process = self._launch_sandboxie(script_path)
        else:
            self.logger.warning(
                f"Unknown provider '{provider}' — task queued but not launched."
            )

        # Register with bastion for resource monitoring
        if process and self.bastion:
            self.bastion.register_process(process.pid)
            health = self.bastion.check_health()
            self.logger.info(
                f"Bastion health: {health['status']} "
                f"(CPU: {health['metrics']['system']['cpu']}%)"
            )

        return task_id

    def _launch_wsb(self, script_path: Path, env: Dict[str, str]):
        """
        Launch script inside a Windows Sandbox instance using agent_template.wsb.
        """
        if not self.wsb_template.exists():
            self.logger.warning(
                f"WSB template not found at {self.wsb_template}. Cannot launch sandbox."
            )
            return None

        try:
            import subprocess

            # Use absolute path for the config file
            temp_wsb = script_path.parent.absolute() / "config.wsb"
            self._generate_wsb_config(temp_wsb)

            # Log with repr to catch hidden characters
            self.logger.info(f"Triggering WindowsSandbox with config: {temp_wsb!r}")

            # Direct launch via subprocess list is safer than shell strings
            subprocess.Popen(["WindowsSandbox.exe", str(temp_wsb)], shell=False)
            self.logger.info("WSB instance triggered.")
            return None

        except Exception as e:
            self.logger.error(f"Failed to launch Windows Sandbox: {e}")
            return None

    def _generate_wsb_config(self, output_path: Path):
        """Generates a .wsb file with correct host paths."""
        host_root = str(self.root.absolute())
        wsb_content = rf"""<Configuration>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>{host_root}</HostFolder>
      <SandboxFolder>C:\RoboFang</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>cmd.exe /c "echo Guest Up > C:\RoboFang\exchange\sandbox\guest_up.log"</Command>
  </LogonCommand>
</Configuration>"""
        output_path.write_text(wsb_content, encoding="utf-8")

    def _launch_sandboxie(self, script_path: Path):
        """
        Launch script via Sandboxie-Plus CLI.
        Requires SbieCtrl.exe in PATH.
        """
        self.logger.info(f"Triggering Sandboxie-Plus for {script_path.name}")
        # TODO Phase 5: subprocess call to SbieCtrl.exe
        return None

    def poll_result(self, task_id: str, timeout: int = 300) -> Dict[str, Any]:
        """Poll for task completion (updated by the guest provisioning script)."""
        task_dir = self.exchange_dir / task_id
        manifest_path = task_dir / "task.json"
        deadline = time.time() + timeout

        self.logger.info(
            f"Polling for results of task {task_id} (timeout={timeout}s)..."
        )
        while time.time() < deadline:
            if manifest_path.exists():
                try:
                    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    if manifest.get("status") == "COMPLETED":
                        # Collect results
                        stdout = (
                            (task_dir / "stdout.txt").read_text()
                            if (task_dir / "stdout.txt").exists()
                            else ""
                        )
                        stderr = (
                            (task_dir / "stderr.txt").read_text()
                            if (task_dir / "stderr.txt").exists()
                            else ""
                        )
                        manifest["stdout"] = stdout
                        manifest["stderr"] = stderr
                        return manifest
                except Exception as e:
                    self.logger.debug(f"Error reading manifest: {e}")

            time.sleep(5)

        return {"error": "Timeout", "status": "FAILED", "task_id": task_id}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    dispatcher = SandboxDispatcher("d:/dev/repos/RoboFang")
    sample_script = (
        "import json\n"
        "with open('result.json', 'w') as f:\n"
        "    json.dump({'status': 'SUCCESS', 'output': 'Sandbox Verified'}, f)\n"
    )
    task_id = dispatcher.dispatch_task("Sandbox Health Check", sample_script)
    print(f"Task queued: {task_id}")
