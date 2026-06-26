# Super Compound Operating Contract

Super Compound is a disciplined operating layer for AI-assisted engineering. It keeps work small, evidence-driven, and durable.

## Core Principles

- Plan before code when the work is non-trivial.
- Evidence before claims: run or name the verification that proves the result.
- Test-first by default for behavior changes.
- Prefer simple, local, reversible changes.
- Keep durable context on disk, not only in conversation memory.
- Use the canonical delivery path for product work: `BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION`.
- Turn reusable solutions into documentation through `/sc-compound`.
- Do not preserve stale workflow aliases unless they are part of the current public interface.

## Public Workflows

Use these workflow names only. The `/sc-*` prefix is mandatory so Super Compound commands do not collide with native Claude Code planning and review commands.

| Workflow | Purpose |
|---|---|
| `/sc-init` | Initialize or reload project/framework context |
| `/sc-status` | Inspect state and choose the next route |
| `/sc-explore` | Shape fuzzy ideas into a BRD with business objectives, constraints, and acceptance |
| `/sc-research` | Gather evidence before a decision |
| `/sc-prd` | Write PRD product requirements from an approved BRD |
| `/sc-plan` | Write the FSD, decide ADR applicability, and create goal issue pointers |
| `/sc-eval` | Define or run evaluation criteria |
| `/sc-go` | Preview and run safe Git branch, worktree, commit, push, and PR operations |
| `/sc-work` | Execute an approved FSD goal or issue pointer |
| `/sc-debug` | Diagnose and fix root causes |
| `/sc-review` | Review changed code/docs |
| `/sc-audit` | Audit security, compatibility, compliance, agent surface, and readiness |
| `/sc-compound` | Capture reusable knowledge |
| `/sc-pause` | Save handoff state |
| `/sc-launch` | Start a focused project or feature lifecycle |
| `/sc-ui` | Build or refine frontend interfaces with `interface-design` |

## Routing

- Fuzzy idea, domain language, strategy, or prototype question: `/sc-explore` to produce a BRD
- Product requirements from an approved BRD: `/sc-prd`
- FSD creation, ADR applicability, goal slicing, triage, Kanban, Journey, or technical breakdown: `/sc-plan`
- Git branch, worktree, commit, push, or Pull Request operation: `/sc-go`
- Implementation, looped work, or safe parallel execution from an approved FSD goal: `/sc-work`
- Failure or unexpected behavior: `/sc-debug`
- Changed files need critique: `/sc-review`
- Security, compatibility, dependency, MCP, agent config, compliance, or release readiness: `/sc-audit`
- Frontend UI: `/sc-ui`
- Need to stop and continue later: `/sc-pause`, then `/sc-status` in the next session

## Skill Loading

Use `.agent/context/` as the compact runtime layer before full workflow/skill/template reads. Load full `SKILL.md` files only when their detailed procedure is active, when editing/reviewing the skill, or when compact contracts are insufficient.

Load skills only when their detailed procedure is relevant. Announce the skill and follow its `SKILL.md`.

Common routes:

- `/sc-explore` -> `agentic-delivery`, `brainstorming`, plus `domain-modeling`, `codebase-design`, or `prototyping` when needed
- `/sc-prd` -> `agentic-delivery`, `prd-generator`, plus `domain-modeling` and `codebase-design` when needed
- `/sc-plan` -> `agentic-delivery`, `writing-plans`, `issue-workflow` or `triage-workflow`, `plan-verification`, plus risk skills when needed
- `/sc-go` -> `git-workflow-operation`
- `/sc-work` -> `agentic-delivery`, `context-engineering`, `executing-plans`, `test-driven-development`, `verification-before-completion`
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
- Use `/sc-go` and `git-workflow-operation` for branch, worktree, commit, push, and Pull Request operations.
- Preserve user changes and unrelated dirty work.
- For product work, read only the necessary BRD, PRD, FSD, goal issue, and accepted ADR references before editing.
- For framework work, prefer `.agent/context/routing-index.md`, route contracts, skill contracts, and template skeletons before full skills/templates.

During work:

- Keep edits scoped to the request.
- Prefer existing helpers, conventions, and tests.
- Avoid broad rewrites unless the task explicitly asks for cleanup.
- Add abstractions only when they reduce real complexity.
- Validate inputs at boundaries and avoid leaking secrets or internals.
- Do not invent schema, APIs, authorization, workflows, roles, state transitions, or UI behavior outside the approved FSD and linked accepted ADRs.
- Keep `.scratch/<feature>/issues/*.md` lightweight: use qualified refs, not copied BRD/PRD/FSD/ADR prose.

Before completion:

- Run targeted verification first, then broader checks when risk warrants.
- Before commit, push, or PR creation, review `git status`, `git diff`, and sensitive-file warnings.
- Report verification results and limitations.
- Update docs when setup, workflow, behavior, architecture, or commands changed.
- Review for stale references to removed workflows/skills.

## State And Handoff

Use:

- `docs/STATE.md` for current position, decisions, blockers, completed work, and next action
- `.continue-here.md` for `/sc-pause` handoff
- `docs/progress.md` for chronological progress and codebase patterns
- `docs/brd/`, `docs/prd/`, and `docs/fsd/` for durable delivery artifacts
- `.scratch/<feature>/issues/*.md` for local FSD goal issue pointers
- `docs/solutions/` for reusable solved problems and optional linked accepted ADRs

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

Interface-design data must be retrieved through `scripts/search.py`; do not preload CSV files into model context.

## Breaking Compatibility Notes

This framework intentionally removed alias and thin workflows from the 2026-06-20 import.

Current replacements:

- Brainstorm/discuss/domain/strategy/prototype intent -> `/sc-explore`
- Issue/task shaping, triage, Kanban, Journey -> `/sc-plan`
- Loop/handoff/parallel execution -> `/sc-work`
- Branch, worktree, commit, push, or PR -> `/sc-go`
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
