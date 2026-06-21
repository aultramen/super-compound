# Super Compound Operating Contract

Super Compound is a disciplined operating layer for AI-assisted engineering. It keeps work small, evidence-driven, and durable.

## Core Principles

- Plan before code when the work is non-trivial.
- Evidence before claims: run or name the verification that proves the result.
- Test-first by default for behavior changes.
- Prefer simple, local, reversible changes.
- Keep durable context on disk, not only in conversation memory.
- Turn reusable solutions into documentation through `/sc-compound`.
- Do not preserve stale workflow aliases unless they are part of the current public interface.

## Public Workflows

Use these workflow names only. The `/sc-*` prefix is mandatory so Super Compound commands do not collide with native Claude Code planning and review commands.

| Workflow | Purpose |
|---|---|
| `/sc-init` | Initialize or reload project/framework context |
| `/sc-status` | Inspect state and choose the next route |
| `/sc-explore` | Shape fuzzy ideas, domain questions, strategy, and prototype decisions |
| `/sc-research` | Gather evidence before a decision |
| `/sc-prd` | Write product requirements |
| `/sc-plan` | Write implementation plans and issue-ready Journey boards |
| `/sc-eval` | Define or run evaluation criteria |
| `/sc-work` | Execute a plan |
| `/sc-debug` | Diagnose and fix root causes |
| `/sc-review` | Review changed code/docs |
| `/sc-audit` | Audit security, compatibility, compliance, agent surface, and readiness |
| `/sc-compound` | Capture reusable knowledge |
| `/sc-pause` | Save handoff state |
| `/sc-launch` | Start a focused project or feature lifecycle |
| `/sc-ui` | Build or refine frontend interfaces with `interface-design` |

## Routing

- Fuzzy idea, domain language, strategy, or prototype question: `/sc-explore`
- Product requirements: `/sc-prd`
- Issue/task shaping, triage, Kanban, Journey, or technical breakdown: `/sc-plan`
- Implementation, looped work, or safe parallel execution: `/sc-work`
- Failure or unexpected behavior: `/sc-debug`
- Changed files need critique: `/sc-review`
- Security, compatibility, dependency, MCP, agent config, compliance, or release readiness: `/sc-audit`
- Frontend UI: `/sc-ui`
- Need to stop and continue later: `/sc-pause`, then `/sc-status` in the next session

## Skill Loading

Load skills only when their detailed procedure is relevant. Announce the skill and follow its `SKILL.md`.

Common routes:

- `/sc-explore` -> `brainstorming`, plus `domain-modeling`, `codebase-design`, or `prototyping` when needed
- `/sc-prd` -> `prd-generator`, plus `domain-modeling` and `codebase-design` when needed
- `/sc-plan` -> `writing-plans`, `issue-workflow` or `triage-workflow` when requested, plus risk skills when needed
- `/sc-work` -> `executing-plans`, `test-driven-development`, `verification-before-completion`
- `/sc-debug` -> `systematic-debugging`
- `/sc-review` -> `code-review`
- `/sc-audit` -> `security-audit`, `compatibility-check`, `data-privacy`, `threat-modeling`, `secure-code-patterns`
- `/sc-ui` -> `interface-design`
- `/sc-pause` and `/sc-status` -> `state-management`, `context-engineering`

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
- `.continue-here.md` for `/sc-pause` handoff
- `docs/progress.md` for chronological progress and codebase patterns
- `.scratch/<feature>/issues/*.md` for local Journey boards and agent-ready issue slices
- `docs/solutions/` for reusable solved problems

The next session should be able to run `/sc-status` and continue from disk.

## UI Work

Use `/sc-ui` and `interface-design` for frontend work.

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

- Brainstorm/discuss/domain/strategy/prototype intent -> `/sc-explore`
- Issue/task shaping, triage, Kanban, Journey -> `/sc-plan`
- Loop/handoff/parallel execution -> `/sc-work`
- Security/compatibility/MCP/compliance/release readiness -> `/sc-audit`
- Progress or continuation state -> `/sc-status`
- Reload -> `/sc-init reload`
- UI work -> `/sc-ui`

## Quality Bar

The work is done when:

- The requested change is implemented or the blocker is explicit.
- The smallest meaningful verification has been run.
- User-facing docs and rules agree with the current public interface.
- No secrets, cache files, stale aliases, or malformed data were introduced.
- The final response names the changed areas and verification evidence.
