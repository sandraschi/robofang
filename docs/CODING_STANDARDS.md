# RoboFang: Coding Standards & SOTA-2026 Patterns

**Document Status**: Baseline Standard (v4.0)  
**Date**: 2026-03-12

---

## 1. UI/UX: The Premium Substrate

Zero-compromise design is a core requirement of the RoboFang project. We do not build "utility tools"; we build premium experiences.

### 1.1 Aesthetics & Blueprint
- **Dark Mode**: Default and mandatory.
- **Glassmorphism**: Use subtle backdrop blurs and semi-opaque containers for depth.
- **Micro-animations**: Every interactive element must provide visual feedback (hover/click) via Framer Motion or Vanilla CSS transitions.
- **Typography**: Standardize on modern fonts (Inter, Outfit, Roboto).
- **Layout**: Use the `AppLayout` component pattern with consistent sidebar navigation.

### 1.2 The "Zero Runt" Policy
UI components must be "dense" and "feature-complete." Avoid large empty spaces or minimalist "placeholder" designs. Use Shadcn components for high-fidelity interactive elements (Tabs, Tooltips, Cards).

## 2. Technical Stack & Integrity

### 2.1 Language & Quality
- **TypeScript**: Strict typing is mandatory for all frontend and bridge code.
- **React (Vite)**: Our primary frontend engine for high-performance dashboards.
- **Tailwind CSS**: Primary utility for styling, avoiding inline styles (`ID-123` lint-compliance).
- **Ruff**: The mandatory linter/formatter for Python-based MCP servers.

### 2.2 Functional Sentience Terminology
We explicitly avoid biological/anthropomorphic terminology unless discussing "Embodied Sentience" as a functional loop.
- **Avoid**: "AI Intelligence," "Bot's Personality," "Brain Generation."
- **Use**: "Council Orchestration," "Agentic Synthesis," "Functional Sentience Loop," "Cognitive Spec."

## 3. Verification & Testing

### 3.1 Empirical Grounding
Before any code change is committed, it must be verified through **Empirical Grounding**:
1. **Linting**: No high-severity lint errors.
2. **Visual Audit**: Components must render correctly across standard viewport sizes.
3. **Logic Check**: Terminal output must confirm "Success" via documented logs.

### 3.2 Documentation First
New features MUST include documentation in the `docs/` folder *before* they are considered complete. If a feature is not documented, it does not exist in the RoboFang substrate.

---
*True engineering is the reduction of technical debt.*
