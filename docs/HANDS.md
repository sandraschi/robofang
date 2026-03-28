# Hands System

Hands are autonomous background agents that execute on a schedule without user intervention.

---

## Concept

A Hand is defined by a `HAND.toml` manifest located in the `hands/` directory. Each Hand has:
- **Identity**: Name, version, and category.
- **Prompt**: A specific system message defining its persistent role.
- **Schedule**: A pulse interval (e.g., every 5 minutes).

---

## Catalog

Current implemented Hands include:
- **Assistant**: Daily briefings and email triage.
- **Collector**: Research and knowledge gathering.
- **Patroller**: Security monitoring via robotics (Yahboom).
- **Housemaker**: Smart home automation and energy optimization.
- **Dancer**: Movement choreography for virtual avatars.

---

## OpenFang Compatibility

RoboFang Hands follow the structural conventions of [OpenFang](https://openfang.dev), allowing for easy porting of community agents between frameworks.
