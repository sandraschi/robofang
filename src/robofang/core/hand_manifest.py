import os
from typing import Any

import tomli
from pydantic import BaseModel, Field


class HandRequirementInstall(BaseModel):
    macos: str | None = None
    windows: str | None = None
    linux_apt: str | None = None
    linux_dnf: str | None = None
    linux_pacman: str | None = None
    pip: str | None = None
    signup_url: str | None = None
    docs_url: str | None = None
    env_example: str | None = None
    manual_url: str | None = None
    estimated_time: str | None = None
    steps: list[str] = Field(default_factory=list)


class HandRequirement(BaseModel):
    key: str
    label: str
    requirement_type: str
    check_value: str
    description: str | None = None
    install: HandRequirementInstall | None = None


class HandSettingOption(BaseModel):
    value: str
    label: str
    provider_env: str | None = None
    binary: str | None = None


class HandSetting(BaseModel):
    key: str
    label: str
    description: str = ""
    setting_type: str
    default: str = ""
    options: list[HandSettingOption] = Field(default_factory=list)
    env_var: str | None = None


class HandMetric(BaseModel):
    label: str
    memory_key: str
    format: str = "number"


class HandDashboard(BaseModel):
    metrics: list[HandMetric] = Field(default_factory=list)


class HandAgentConfig(BaseModel):
    name: str
    description: str
    module: str = "builtin:chat"
    provider: str = "default"
    model: str = "default"
    api_key_env: str | None = None
    base_url: str | None = None
    max_tokens: int = 4096
    temperature: float = 0.7
    system_prompt: str
    max_iterations: int | None = None


class HandDefinition(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str = ""
    tools: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    mcp_servers: list[str] = Field(default_factory=list)
    requires: list[HandRequirement] = Field(default_factory=list)
    settings: list[HandSetting] = Field(default_factory=list)
    agent: HandAgentConfig
    dashboard: HandDashboard = Field(default_factory=HandDashboard)
    # Optional SKILL.md content (OpenFang-compatible); injected into context at runtime
    skill_content: str | None = None


def load_hand_definition(path: str) -> HandDefinition:
    """Load and parse a HAND.toml file."""
    with open(path, "rb") as f:
        data = tomli.load(f)
    return HandDefinition(**data)


def resolve_hand_settings(settings: list[HandSetting], config: dict[str, Any]) -> dict[str, Any]:
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
