import os
from typing import Any, Dict, List, Optional

import tomli
from pydantic import BaseModel, Field


class HandRequirementInstall(BaseModel):
    macos: Optional[str] = None
    windows: Optional[str] = None
    linux_apt: Optional[str] = None
    linux_dnf: Optional[str] = None
    linux_pacman: Optional[str] = None
    pip: Optional[str] = None
    signup_url: Optional[str] = None
    docs_url: Optional[str] = None
    env_example: Optional[str] = None
    manual_url: Optional[str] = None
    estimated_time: Optional[str] = None
    steps: List[str] = Field(default_factory=list)


class HandRequirement(BaseModel):
    key: str
    label: str
    requirement_type: str
    check_value: str
    description: Optional[str] = None
    install: Optional[HandRequirementInstall] = None


class HandSettingOption(BaseModel):
    value: str
    label: str
    provider_env: Optional[str] = None
    binary: Optional[str] = None


class HandSetting(BaseModel):
    key: str
    label: str
    description: str = ""
    setting_type: str
    default: str = ""
    options: List[HandSettingOption] = Field(default_factory=list)
    env_var: Optional[str] = None


class HandMetric(BaseModel):
    label: str
    memory_key: str
    format: str = "number"


class HandDashboard(BaseModel):
    metrics: List[HandMetric] = Field(default_factory=list)


class HandAgentConfig(BaseModel):
    name: str
    description: str
    module: str = "builtin:chat"
    provider: str = "default"
    model: str = "default"
    api_key_env: Optional[str] = None
    base_url: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.7
    system_prompt: str
    max_iterations: Optional[int] = None


class HandDefinition(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str = ""
    tools: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    mcp_servers: List[str] = Field(default_factory=list)
    requires: List[HandRequirement] = Field(default_factory=list)
    settings: List[HandSetting] = Field(default_factory=list)
    agent: HandAgentConfig
    dashboard: HandDashboard = Field(default_factory=HandDashboard)


def load_hand_definition(path: str) -> HandDefinition:
    """Load and parse a HAND.toml file."""
    with open(path, "rb") as f:
        data = tomli.load(f)
    return HandDefinition(**data)


def resolve_hand_settings(settings: List[HandSetting], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resolve user-provided settings against the hand definition.
    Returns prompt_block and env_vars.
    """
    lines = []
    env_vars = {}

    for setting in settings:
        value = config.get(setting.key, setting.default)

        if setting.setting_type == "select":
            matched = next((o for o in setting.options if o.value == str(value)), None)
            display = matched.label if matched else str(value)
            lines.append(f"- {setting.label}: {display} ({value})")
            if matched and matched.provider_env:
                env_vars[matched.provider_env] = os.getenv(matched.provider_env, "")

        elif setting.setting_type == "toggle":
            enabled = str(value).lower() in ("true", "1", "yes")
            lines.append(f"- {setting.label}: {'Enabled' if enabled else 'Disabled'}")

        elif setting.setting_type == "text":
            if value:
                lines.append(f"- {setting.label}: {value}")
                if setting.env_var:
                    env_vars[setting.env_var] = str(value)

    prompt_block = ""
    if lines:
        prompt_block = "## User Configuration\n\n" + "\n".join(lines)

    return {"prompt_block": prompt_block, "env_vars": env_vars}
