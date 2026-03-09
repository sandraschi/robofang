import json
from pathlib import Path
from typing import Dict


class ContextGenerator:
    """
    RoboFang Context Generator
    Transforms the federation_map.json into LLM-readable tool manifests.
    """

    def __init__(self, root_dir: str):
        self.root = Path(root_dir)
        self.fed_map_path = self.root / "configs" / "federation_map.json"

    def _load_federation_map(self) -> Dict:
        if not self.fed_map_path.exists():
            return {}
        with open(self.fed_map_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def generate_tool_manifest(self, domain_filter: str = None) -> str:
        """
        Generates a Markdown manifest of available MCP servers and their capabilities.
        """
        fed_map = self._load_federation_map()
        if not fed_map:
            return "No federation map found."

        manifest = "## Available Sovereign Fangs (MCP Fleet)\n\n"
        manifest += "| Server | Domain | Capabilities |\n"
        manifest += "| :--- | :--- | :--- |\n"

        domains = fed_map.get("domains", {})
        for domain_name, servers in domains.items():
            if domain_filter and domain_name != domain_filter:
                continue

            for server_name, details in servers.items():
                caps = ", ".join(details.get("capabilities", []))
                manifest += f"| `{server_name}` | {domain_name} | {caps} |\n"

        return manifest


if __name__ == "__main__":
    generator = ContextGenerator("d:/dev/repos/RoboFang")
    print(generator.generate_tool_manifest())
