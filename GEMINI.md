# Project Context: Lead Pipeline CRM

A personal CRM built for cold-calling restaurant owners sourced from Google Maps (via Apify exports), designed for solo use.

## Tech Stack & Architecture
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Vanilla CSS (no Tailwind)
- **Deployment:** Vercel
- **Authentication:** None (solo use)

## Development Commands
- **Install dependencies:** `npm install`
- **Run development server:** `npm run dev`
- **Production Build:** `npm run build`
- **Start Production Server:** `npm start`
- **Run Linting:** `npm run lint`

## Response Protocol & Style
- **Listen Mode:** Under Planning Mode, do not write code. Analyze, research, and output an implementation plan first.
- **Tone:** Technical, precise, and concise. Avoid conversational filler or apologies.
- **Verification:** Always create or update a checklist in `task.md` before execution.

## Safety & Execution Rules
- **Command Runs:** Ask for explicit user confirmation before running destructive actions (e.g., `git reset`, `rm`).
- **Surgical Code Edits:** Only edit lines related to the task. Do not rewrite or style adjacent functions unless asked.
- **Abstractions:** Do not create speculative utilities, configs, or helper modules. Keep code simple.

## Workspace Conventions
- Workspace-level agent rules are located in `.agents/rules/`.
- Workspace-level agent skills are located in `.agents/skills/`.
- Project specs and documentation reside in `docs/`.
