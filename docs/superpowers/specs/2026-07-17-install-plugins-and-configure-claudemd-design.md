# Design Document: Install and Configure Karpathy Guidelines & Ponytail

This document details the design and implementation plan to install the `andrej-karpathy-skills` and `ponytail` guidelines in the `lead-pipeline` workspace, and configure them using a `CLAUDE.md` file.

## Goal

Provide clear, automatic guidance for AI coding agents working on the `lead-pipeline` repository to ensure:
1. Adherence to **Andrej Karpathy's guidelines** (avoiding over-engineering, thinking before coding, surgical edits, goal-driven execution).
2. Adherence to **Ponytail's guidelines** (YAGNI, minimal code footprint, reusing existing helpers, and performing automated code reviews for over-engineering prior to final delivery).

---

## Proposed Components

### 1. `CLAUDE.md` (Project Root)
A `CLAUDE.md` file will be created at the root of `e:\desktop\lead-pipeline\CLAUDE.md`. It will act as the source of truth for agent behavior and include:
* **Build & Dev commands**: `npm run dev`, `npm run build`.
* **Verification commands**: `npm run lint` (when added to the project).
* **Behavioral guidelines**: Consolidation of Karpathy's guidelines.
* **Ponytail Integration**: Specific trigger instructions directing the agent to:
  * Apply the ponytail ladder before writing any code.
  * Run the `ponytail-review` command (or follow its review guidelines) on any changes before presenting them to the user.

### 2. Local Skill Directory
We will copy the skill definitions directly into the project's local `.opencode/skills/` directory:
* **Karpathy Guidelines**: `.opencode/skills/karpathy-guidelines/SKILL.md` (copied from `andrej-karpathy-skills`).
* **Ponytail Skills**: Copied from global `C:\Users\iamku\.gemini\config\plugins\ponytail\skills\` to `.opencode/skills/`:
  * `.opencode/skills/ponytail/`
  * `.opencode/skills/ponytail-review/`
  * `.opencode/skills/ponytail-audit/`
  * `.opencode/skills/ponytail-gain/`
  * `.opencode/skills/ponytail-help/`

---

## Verification Plan

### Manual Verification
1. Ensure the `CLAUDE.md` file exists at the root of `lead-pipeline`.
2. Verify all local skill files are copied correctly to `.opencode/skills/`.
3. Confirm that the `CLAUDE.md` contains proper formatting and references the local and global tools correctly.
