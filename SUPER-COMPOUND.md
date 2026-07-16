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

## Default UI-Aware Lifecycle

When the scope has an interactive user surface, use:

```text
BRD -> PRD draft -> /sc-ui validation -> approved PRD
    -> FSD Screen/Interaction + delegated wire contract
    -> optional CONTRACT_ENABLER -> FIRST_VERTICAL_SLICE
    -> controlled SCALE_OUT_SLICE work -> verification/UAT
```

Set `ui_delivery_profile` to `NOT_APPLICABLE`, `STANDARD`, or
`HIGH_INTERACTION`. An unclassified interactive surface defaults to `STANDARD`.
PRD owns observable experience behavior; FSD Section 8 owns semantic UI/API
mappings; OpenAPI/JSON Schema/approved equivalent owns exact wire shape. Goal
issues remain pointers to these authorities.

`READY_FOR_SLICE` requires score >=90 and every canonical hard gate. A score,
business preference, or `EXCEPTION_APPROVED` cannot waive security,
accessibility baseline, contract conformance, data integrity, or a blocking
`OPEN-*`. Exceptions permit only the first slice. Parallel scale-out waits for a
`VALIDATED` baseline and a first-slice issue verified against the real provider;
mock-only evidence is not integration proof.

When contract assets are absent, the only executable goal is the bounded
`CONTRACT_ENABLER`. After it is verified, return to `/sc-plan` to pin exact
revisions, rerun the gate, and obtain Technical Manager re-approval before the
first slice. A verified first slice returns to `/sc-plan` for dependent pointer
promotion. One final `HARDENING` goal owns merged integration, responsive,
accessibility, E2E, visual-regression, and Business Owner UAT evidence;
`/sc-review` audits that evidence rather than creating it.

Do not claim the outcome target from framework structure alone. Measure greater
than 90% reduction in preventable alignment rework only after at least three
comparable pilot features; exclude new scope, market learning, and new
stakeholder preferences from preventable rework.

## Public Workflows

Use these workflow names only. The `/sc-*` prefix is mandatory so Super Compound commands do not collide with native Claude Code planning and review commands.

| Workflow | Purpose |
|---|---|
| `/sc-init` | Initialize or reload project/framework context |
| `/sc-status` | Inspect state and choose the next route |
| `/sc-geniusloop` | Generate and filter proactive improvement ideas when goal queues are empty |
| `/sc-explore` | Shape fuzzy ideas into a BRD with business objectives, constraints, and acceptance |
| `/sc-research` | Resolve a named factual or technical gap with advisory evidence |
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
| `/sc-ui` | Design/review UI read-only or guide an approved `/sc-work` goal |

## Routing

- Fuzzy idea, domain language, strategy, or prototype question: `/sc-explore` to produce a BRD
- Named factual, current-doc, version-support, or option-feasibility gap that could change a decision: `/sc-research`, then return to the workflow that owns that decision
- Empty goal queue with no active handoff, blocker, or failing verification: `/sc-geniusloop`
- Product requirements from an approved BRD: `/sc-prd`; UI-bearing drafts route
  through read-only `/sc-ui` before PRD approval
- FSD creation, ADR applicability, goal slicing, triage, Kanban, Journey, or technical breakdown: `/sc-plan`
- Git branch, worktree, commit, push, or Pull Request operation: `/sc-go`
- Implementation or controlled parallel execution from an approved FSD goal:
  `/sc-work`; first prove a real vertical slice and the pinned contract
- Failure or unexpected behavior: `/sc-debug`
- Changed files need critique: `/sc-review`
- Security, current-stack compatibility/dependency posture, MCP, agent config, compliance, or release readiness: `/sc-audit`
- Frontend UI design/review: `/sc-ui`; implementation: `/sc-work <approved-goal>` with UI guidance
- Need to stop and continue later: `/sc-pause`, then `/sc-status` in the next session

## Explore vs Research

| Dominant question | Workflow | Output and authority |
|---|---|---|
| What should we build, why, for whom, and under which policy? | `/sc-explore` | BRD; business authority after approval |
| What is factually true, current, supported, or feasible for a named decision? | `/sc-research` | Advisory research note; never decision authority |
| How will approved product behavior be implemented? | `/sc-plan` | FSD/TDEC and optional accepted ADR; implementation authority |
| What security, compatibility, compliance, or readiness risks exist? | `/sc-audit` | Severity findings and risk gates |

Research is a conditional sidecar, not a mandatory lifecycle stage. Use it only when the evidence gap is material enough to change a downstream decision or needs durable review. Resolve small lookups inline. Accepted findings must be translated into the BRD, PRD, FSD/TDEC, accepted ADR, or audit record that owns the decision.

## Skill Loading

Use `.agent/context/` as the compact runtime layer before full workflow/skill/template reads. Load a full `SKILL.md` only when its procedure is active or being edited/reviewed. When that entrypoint routes to `references/`, load only the branch needed for the current decision; never preload the whole reference directory.

Framework verification records a static 17-route x 3-cell matrix: context-entry
reduction, process authority/wiring, and output sink/budget/next owner. This is
repository evidence, not hidden reasoning or generated-output telemetry; runtime
claims remain unavailable until paired attributable traces exist for all routes.

Load skills only when their detailed procedure is relevant. Announce the skill and follow its `SKILL.md`.

Common routes:

- `/sc-explore` -> `agentic-delivery`, `brainstorming`, plus `domain-modeling`, `codebase-design`, or `prototyping` when needed
- `/sc-research` -> `context7-docs` for current public library/API evidence; use formal compatibility gates in `/sc-plan` or `/sc-audit` as appropriate
- `/sc-geniusloop` -> `brainstorming`, `codebase-design`, and `domain-modeling`
  in advisory/read-only mode, then direct dispatch of the `brain` agent prompt;
  do not load FSD-only `subagent-orchestration`
- `/sc-prd` -> `agentic-delivery`, `prd-generator`, plus `domain-modeling` and `codebase-design` when needed
- `/sc-plan` -> `agentic-delivery`, `writing-plans`, `issue-workflow` or `triage-workflow`, `plan-verification`, plus risk skills when needed
- `/sc-go` -> `git-workflow-operation`
- `/sc-work` -> `agentic-delivery`, `context-engineering`, `executing-plans`, `test-driven-development`, `verification-before-completion`
- `/sc-debug` -> `systematic-debugging`
- `/sc-review` -> `code-review`
- `/sc-audit` -> select only the matching submode branch: `security-audit` for
  security/agent-surface findings, `compatibility-check` for compatibility,
  `data-privacy` for privacy, and `threat-modeling` or `secure-code-patterns`
  only when that deeper analysis is required; never preload every audit skill
- `/sc-ui` -> `interface-design`; fuzzy UI returns to `/sc-explore`, an approved
  BRD without PRD to `/sc-prd`, an approved PRD without FSD to `/sc-plan`, and
  implementation runs only from an approved goal under `/sc-work`; design and
  quality review remain read-only
- `/sc-pause` and `/sc-status` -> load `state-management` or
  `context-engineering` only when reconciling durable state or a complex handoff;
  their compact contracts are otherwise self-contained

## Execution Rules

Before editing:

- Read the relevant workflow, skill, and nearby project instructions.
- Search symbols, paths, tests, and nearby implementations before introducing a new pattern or declaring a capability absent.
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
- Treat research notes as advisory evidence; do not let them silently override BRD, PRD, FSD, accepted ADR, or audit authority.
- Keep `/sc-review` and `/sc-audit` strictly read-only. Approval selects an
  owning remediation workflow; it never authorizes fixes inside review/audit.
- Keep `.scratch/<feature>/issues/*.md` lightweight: use qualified refs, not copied BRD/PRD/FSD/ADR prose.
- Classify changes before editing authority: scope/policy -> `/sc-explore`;
  observable behavior/AC -> `/sc-prd`; data/API/schema -> `/sc-plan`;
  implementation divergence -> owning `/sc-work`; new preference -> backlog.
- For independent multi-agent goals, exchange file-backed packages under `.scratch/work-packages/`; keep chat handoffs to paths and short verdicts, and serialize shared-file validation.

Before completion:

- Run targeted verification first, then broader checks when risk warrants.
- Before commit, push, or PR creation, review `git status`, `git diff`, and sensitive-file warnings.
- Report verification results and limitations.
- Keep the response inside the route's output envelope; write full evidence to disk and return paths plus decisive findings.
- Update docs when setup, workflow, behavior, architecture, or commands changed.
- Review for stale references to removed workflows/skills.

## State And Handoff

Use:

- `docs/STATE.md` as the canonical current position, decisions, blockers, completed work, and next action
- `.continue-here.md` as a short `/sc-pause` pointer to state and the active artifact, never a second state database
- `docs/progress.md` for chronological progress and codebase patterns
- `docs/brd/`, `docs/prd/`, and `docs/fsd/` for durable delivery artifacts
- `.scratch/<feature>/issues/*.md` for local FSD goal issue pointers
- `docs/solutions/` for reusable solved problems and optional linked accepted ADRs

The next session should be able to run `/sc-status` and continue from disk.

## UI Work

Use `/sc-ui` and `interface-design` for read-only frontend design/review. Apply
that guidance to source only inside `/sc-work <approved-goal>`.

`/sc-ui` returns exactly one read-only classification: `EVIDENCE`,
`PRD_CHANGE_REQUIRED`, `FSD_CHANGE_REQUIRED`, or `VERIFICATION_FINDING`.
Accepted evidence is absorbed into the owning PRD/FSD. Prototypes remain
throwaway decision evidence and are never production seeds.

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
- UI design/review -> `/sc-ui`; approved UI implementation -> `/sc-work <approved-goal>` with interface guidance

## Quality Bar

The work is done when:

- The requested change is implemented or the blocker is explicit.
- The smallest meaningful verification has been run.
- User-facing docs and rules agree with the current public interface.
- No secrets, cache files, stale aliases, or malformed data were introduced.
- The final response names the changed areas and verification evidence.
