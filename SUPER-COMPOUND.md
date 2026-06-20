# Super Compound Operating Contract

Super Compound is a disciplined operating layer for AI-assisted engineering. It keeps work small, evidence-driven, and durable.

## Core Principles

- Plan before code when the work is non-trivial.
- Evidence before claims: run or name the verification that proves the result.
- Test-first by default for behavior changes.
- Prefer simple, local, reversible changes.
- Keep durable context on disk, not only in conversation memory.
- Turn reusable solutions into documentation through `/compound`.
- Do not preserve stale workflow aliases unless they are part of the current public interface.

## Public Workflows

Use these workflow names only:

| Workflow | Purpose |
|---|---|
| `/init` | Initialize or reload project/framework context |
| `/status` | Inspect state and choose the next route |
| `/explore` | Shape fuzzy ideas, domain questions, strategy, and prototype decisions |
| `/research` | Gather evidence before a decision |
| `/prd` | Write product requirements |
| `/plan` | Write implementation plans |
| `/eval` | Define or run evaluation criteria |
| `/work` | Execute a plan |
| `/debug` | Diagnose and fix root causes |
| `/review` | Review changed code/docs |
| `/audit` | Audit security, compatibility, compliance, agent surface, and readiness |
| `/compound` | Capture reusable knowledge |
| `/pause` | Save handoff state |
| `/launch` | Start a focused project or feature lifecycle |
| `/ui` | Build or refine frontend interfaces with `interface-design` |

## Routing

- Fuzzy idea, domain language, strategy, or prototype question: `/explore`
- Product requirements: `/prd`
- Issue/task shaping or technical breakdown: `/plan`
- Implementation, looped work, or safe parallel execution: `/work`
- Failure or unexpected behavior: `/debug`
- Changed files need critique: `/review`
- Security, compatibility, dependency, MCP, agent config, compliance, or release readiness: `/audit`
- Frontend UI: `/ui`
- Need to stop and continue later: `/pause`, then `/status` in the next session

## Skill Loading

Load skills only when their detailed procedure is relevant. Announce the skill and follow its `SKILL.md`.

Common routes:

- `/explore` -> `brainstorming`
- `/prd` -> `prd-generator`
- `/plan` -> `writing-plans`, plus risk skills when needed
- `/work` -> `executing-plans`, `test-driven-development`, `verification-before-completion`
- `/debug` -> `systematic-debugging`
- `/review` -> `code-review`
- `/audit` -> `security-audit`, `compatibility-check`, `data-privacy`, `threat-modeling`, `secure-code-patterns`
- `/ui` -> `interface-design`
- `/pause` and `/status` -> `state-management`, `context-engineering`

## Execution Rules

Before editing:

- Read the relevant workflow, skill, and nearby project instructions.
- Inspect existing code/docs before introducing a new pattern.
- Check git status before large edits.
- Preserve user changes and unrelated dirty work.

During work:

- Keep edits scoped to the request.
- Prefer existing helpers, conventions, and tests.
- Avoid broad rewrites unless the task explicitly asks for cleanup.
- Add abstractions only when they reduce real complexity.
- Validate inputs at boundaries and avoid leaking secrets or internals.

Before completion:

- Run targeted verification first, then broader checks when risk warrants.
- Report verification results and limitations.
- Update docs when setup, workflow, behavior, architecture, or commands changed.
- Review for stale references to removed workflows/skills.

## State And Handoff

Use:

- `docs/STATE.md` for current position, decisions, blockers, completed work, and next action
- `.continue-here.md` for `/pause` handoff
- `docs/progress.md` for chronological progress and codebase patterns
- `docs/solutions/` for reusable solved problems

The next session should be able to run `/status` and continue from disk.

## UI Work

Use `/ui` and `interface-design` for frontend work.

Command examples:

```bash
python .agent/skills/interface-design/scripts/search.py "mobile touch target" --domain app
python .agent/skills/interface-design/scripts/search.py "preconnect cdn" --domain web
python .agent/skills/interface-design/scripts/search.py "performance trackBy" --stack angular
```

Use the current `interface-design` skill name in active docs and workflows.

## Breaking Compatibility Notes

This framework intentionally removed alias and thin workflows from the 2026-06-20 import.

Current replacements:

- Brainstorm/discuss/domain/strategy/prototype intent -> `/explore`
- Issue/task shaping -> `/plan`
- Loop/handoff/parallel execution -> `/work`
- Security/compatibility/MCP/compliance/release readiness -> `/audit`
- Progress or continuation state -> `/status`
- Reload -> `/init reload`
- UI work -> `/ui`

## Quality Bar

The work is done when:

- The requested change is implemented or the blocker is explicit.
- The smallest meaningful verification has been run.
- User-facing docs and rules agree with the current public interface.
- No secrets, cache files, stale aliases, or malformed data were introduced.
- The final response names the changed areas and verification evidence.
