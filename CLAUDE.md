@AGENTS.md

# Claude Code Instructions

This file is intentionally small. Shared cross-agent guidance lives in `AGENTS.md`; Claude Code reads it through the import above.

## Memory Model

- Treat `CLAUDE.md`, imported files, `.claude/rules/`, and auto memory as context, not enforcement. Use hooks, tests, CI, or settings for hard gates.
- Keep this file under roughly 200 lines. Do not paste the long engineering standards reference here.
- Use auto memory for repeated corrections, stable preferences, and useful facts discovered while working in this repository.
- Do not store secrets, credentials, customer data, private keys, or one-off task notes in Claude memory.
- Use `/memory` to inspect which `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/`, and auto memory files loaded.

## What Goes Where

- Shared agent instructions: `AGENTS.md`.
- Claude Code-specific behavior: this file.
- Personal local preferences: `CLAUDE.local.md` in this directory.
- Claude path-specific rules: `.claude/rules/*.md`.
- Long engineering standards: `docs/engineering-standards.md`, read on demand.
- Super Compound framework behavior: `SUPER-COMPOUND.md`, `.agent/rules/`, `.agent/workflows/`, `.agent/skills/`, `.agent/templates/`, `.agent/agents/`, and `.agent/hooks/`.

## Claude Workflow

- Start by reading the files relevant to the user's target: `README.md` for installation/docs, `SUPER-COMPOUND.md` for framework rules, or the specific `.agent/` asset being changed.
- When editing `.agent/` files, let `.claude/rules/agent-framework.md` guide the change.
- Prefer path-scoped rules or skills over growing this file.
- If the same correction happens twice, decide whether it belongs in `AGENTS.md`, `.claude/rules/`, auto memory, or normal documentation.
- After edits, report changed files and verification evidence. If verification could not run, say why.

## Maintenance Checklist

- Keep imports intentional. Imports organize content but still load into context.
- Use backticks when mentioning paths that start with `@` so Claude does not treat them as imports.
- Remove stale or conflicting guidance during updates.
- Keep long examples and standards outside startup memory.
