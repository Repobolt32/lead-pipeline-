# Install and Configure Guidelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy the Karpathy and Ponytail guidelines locally to `.opencode/skills` and configure them in a root `CLAUDE.md` file.

**Architecture:** Create local copy of skills in `.opencode/skills/` and create `CLAUDE.md` to reference them.

**Tech Stack:** OpenCode, Markdown.

## Global Constraints

- Skills are installed locally in `.opencode/skills/`
- CLAUDE.md is located at the root of `e:\desktop\lead-pipeline`

---

### Task 1: Install Karpathy Guidelines local skill

**Files:**
- Create: `.opencode/skills/karpathy-guidelines/SKILL.md`

**Interfaces:**
- Consumes: None
- Produces: Local skill `karpathy-guidelines`

- [ ] **Step 1: Create directory `.opencode/skills/karpathy-guidelines`**
Run: `powershell -Command "New-Item -ItemType Directory -Force -Path e:\desktop\lead-pipeline\.opencode\skills\karpathy-guidelines"`
Expected: Directory created successfully.

- [ ] **Step 2: Copy SKILL.md from scratch to local skill folder**
Run: `powershell -Command "Copy-Item -Path C:\Users\iamku\.gemini\antigravity-ide\scratch\andrej-karpathy-skills\skills\karpathy-guidelines\SKILL.md -Destination e:\desktop\lead-pipeline\.opencode\skills\karpathy-guidelines\SKILL.md"`
Expected: SKILL.md copied successfully.

- [ ] **Step 3: Verify the file exists and check its contents**
Run: `powershell -Command "Get-Content -Path e:\desktop\lead-pipeline\.opencode\skills\karpathy-guidelines\SKILL.md -TotalCount 10"`
Expected: Output showing the yaml frontmatter of `karpathy-guidelines`.

---

### Task 2: Install Ponytail local skills

**Files:**
- Create: `.opencode/skills/ponytail/SKILL.md`
- Create: `.opencode/skills/ponytail-review/SKILL.md`
- Create: `.opencode/skills/ponytail-audit/SKILL.md`
- Create: `.opencode/skills/ponytail-debt/SKILL.md`
- Create: `.opencode/skills/ponytail-gain/SKILL.md`
- Create: `.opencode/skills/ponytail-help/SKILL.md`

**Interfaces:**
- Consumes: None
- Produces: Local ponytail skills

- [ ] **Step 1: Copy ponytail skill folders**
Run: `powershell -Command "Copy-Item -Path C:\Users\iamku\.gemini\config\plugins\ponytail\skills\* -Destination e:\desktop\lead-pipeline\.opencode\skills -Recurse -Force"`
Expected: Files copied successfully.

- [ ] **Step 2: Verify the skill files exist**
Run: `powershell -Command "Get-ChildItem -Path e:\desktop\lead-pipeline\.opencode\skills\ponytail* -Filter SKILL.md -Recurse"`
Expected: Output showing SKILL.md inside ponytail, ponytail-review, ponytail-audit, ponytail-debt, ponytail-gain, ponytail-help.

---

### Task 3: Create and Configure `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: None
- Produces: Root `CLAUDE.md` with guidelines.

- [ ] **Step 1: Create `CLAUDE.md` at root**
Write to `e:\desktop\lead-pipeline\CLAUDE.md` with the following content:
```markdown
# CLAUDE.md for Lead Pipeline CRM

Guidelines, build commands, and rules for agents working on this project.

## Build and Development Commands

* **Install dependencies:** `npm install`
* **Run development server:** `npm run dev`
* **Production Build:** `npm run build`
* **Start Production Server:** `npm start`
* **Run Linting:** `npm run lint`

---

## Coding Guidelines

### 1. General Rules
* **Next.js 14 App Router:** Only use the app router, no pages router.
* **Styling:** Only use Vanilla CSS (no Tailwind, no CSS-in-JS unless explicitly asked).
* **Self-Contained Files:** Keep components focused and small.

### 2. Think Before Coding (Karpathy Guidelines)
Before implementing any task:
* State assumptions explicitly. If uncertain, ask the user.
* Present multiple options if they exist instead of choosing silently.
* Choose the simplest approach first.
* Define clear, verifiable success criteria before editing code.

### 3. Simplicity First (Ponytail Guidelines)
Before writing code, stop at the first ladder rung that holds:
1. Does this need to be built at all? (YAGNI)
2. Does it already exist in the codebase? Reuse it.
3. Does the standard library do this? Use it.
4. Does a native platform feature cover it? Use it (e.g. `<input type="date">`).
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

### 4. Surgical Changes
* Touch only what you must. Do not refactor adjacent code that is not broken.
* Match the existing style in the codebase.
* Remove any unused imports/variables/functions created by your changes.

---

## Ponytail Commands
You can call the following commands / skills when needed:
* `ponytail-review` (or `/ponytail-review`): Run this to review your current diff for over-engineering and get a list of deletions/simplifications before completing a task.
* `ponytail-audit` (or `/ponytail-audit`): Run this to audit the entire repository for over-engineering.
* `ponytail` (or `/ponytail`): Report or change the intensity level (`lite` / `full` / `ultra` / `off`).
```
Expected: File written successfully.

- [ ] **Step 2: Verify `CLAUDE.md` exists and contains correct content**
Run: `powershell -Command "Get-Content -Path e:\desktop\lead-pipeline\CLAUDE.md -TotalCount 15"`
Expected: Output showing the start of `CLAUDE.md`.
