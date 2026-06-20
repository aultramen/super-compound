# AGENTS.md

Shared operating instructions for Codex, Claude Code, Gemini, Cursor, Windsurf, and other coding agents working in the `super-compound` repository.

## Purpose

Super Compound is an AI-assisted development framework for Antigravity IDE and Claude Code. It packages rules, workflows, agents, hooks, and skills under `.agent/` so they can be copied into other projects.

Keep this file concise. It is startup context for many agents. Long-form standards belong in `docs/engineering-standards.md` and detailed Super Compound behavior belongs in `SUPER-COMPOUND.md` plus `.agent/`.

## Repository Map

- `.agent/rules/`: Antigravity workspace rules. Keep each rule file small enough for Antigravity's rule-size constraints.
- `.agent/workflows/`: command-style workflows such as explore, plan, work, review, audit, status, and pause.
- `.agent/skills/`: progressive instruction packs. Each skill owns its detailed procedure in `SKILL.md`.
- `.agent/agents/`: dedicated agent prompts for architecture, review, E2E, docs, and build fixes.
- `.agent/hooks/`: deterministic hook configuration and scripts.
- `SUPER-COMPOUND.md`: concise root rules for Claude-style usage.
- `README.md`: installation, features, compatibility, and user-facing setup.
- `WALKTHROUGH.md`: extended walkthrough and examples.
- `docs/engineering-standards.md`: long software engineering standards reference; read on demand, do not import into startup files.
- `.claude/rules/`: Claude Code path-scoped rules for this repo.

## Instruction Precedence

- Follow system, developer, and user instructions first.
- Then follow the nearest applicable `AGENTS.md`, `CLAUDE.md`, `.claude/rules/*.md`, `SUPER-COMPOUND.md`, `.agent/rules/*.md`, and subproject docs.
- If instructions conflict, prefer the more specific file for the files being edited and mention the conflict in the final summary.
- Do not turn reference material into hard policy unless the repository or user explicitly requires it.

## Memory And Context Layout

- `AGENTS.md` is the shared cross-agent startup file.
- `CLAUDE.md` imports `AGENTS.md` and adds Claude Code memory rules.
- `CLAUDE.local.md` is for private local preferences and must not be committed.
- `.claude/rules/*.md` is for Claude Code instructions that should load only for matching paths.
- `docs/engineering-standards.md` preserves the long engineering reference from the old monolithic `CLAUDE.md`; read it only when broad standards guidance is needed.
- Use skills, workflows, and normal docs for long procedures instead of expanding startup memory.

## Working Agreement

- Inspect the relevant `.agent/` rule, workflow, skill, or agent file before changing it.
- Preserve the framework's core promise: plan before code, evidence before claims, test-first by default, knowledge compounds, and verification gates.
- Keep edits scoped. Avoid broad rewrites, formatting churn, or renaming established workflows unless the user asks.
- Preserve the documented public workflow names. Compatibility aliases may be removed when a breaking cleanup explicitly approves it.
- Do not overwrite user changes or generated local state such as `.debug/`, `docs/progress.md`, `docs/STATE.md`, or `.continue-here.md`.
- Ask only when a missing product or compatibility decision blocks safe progress.

## Super Compound Conventions

- Rules in `.agent/rules/` are high-level and always-on for Antigravity; keep them focused.
- Skills in `.agent/skills/*/SKILL.md` hold detailed, task-specific procedures and may be longer.
- Workflows in `.agent/workflows/` should route work clearly and avoid thin aliases unless they are explicitly part of the public interface.
- Agent prompts in `.agent/agents/` should remain role-specific and compatible with the model notes already present.
- Hooks in `.agent/hooks/` must stay deterministic, local-first, and safe to run repeatedly.
- Documentation changes should keep `README.md`, `SUPER-COMPOUND.md`, `WALKTHROUGH.md`, and `.agent/` references consistent.

## Engineering Standards

- Favor simple, readable designs. Apply DRY, KISS, YAGNI, SOLID, separation of concerns, high cohesion, and low coupling pragmatically.
- Keep dependencies explicit and local to the feature that needs them.
- Validate inputs at boundaries and encode domain invariants close to their owner.
- Avoid silent failures. Add context, log safely, or rethrow.
- Preserve backward compatibility for public commands, workflow names, and installation paths unless the user explicitly approves a breaking change.

## Security And Privacy

- Never commit secrets, tokens, credentials, private keys, or real customer data.
- Never concatenate untrusted input into SQL, shell commands, HTML, URLs, or file paths.
- Avoid leaking stack traces, internal paths, secrets, or implementation details to end users.
- Treat `.agent/hooks/*.js` as security-sensitive because hooks execute commands.
- For security, privacy, or auth-related guidance, read the relevant skills first: `security-audit`, `secure-code-patterns`, `threat-modeling`, and `data-privacy`.

## Testing And Verification

- Use evidence-based completion: identify the command or inspection that proves the change, run it when available, and report the result.
- For docs-only changes, verify file contents, links/paths, line counts, and consistency across referenced docs.
- For hook or script changes, run the smallest safe command that exercises the script.
- For skill/workflow changes, check the affected file plus any README or rule references that mention it.
- If verification cannot run, state the reason and the residual risk.

## Git And Delivery

- Check git status before substantial edits.
- Do not run destructive git commands unless the user explicitly asks.
- Do not commit, tag, push, publish, or deploy unless the user explicitly asks.
- Final summaries should name changed files and verification performed.

## Quality Bar

Before finishing, confirm the clean memory layout still holds: startup files stay short, long standards stay in docs, Claude-specific rules stay in Claude files, and shared cross-agent guidance stays here.
