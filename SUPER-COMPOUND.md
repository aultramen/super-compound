# Super Compound Operating Contract

## Summary

Super Compound is a disciplined operating layer for AI-assisted engineering. Discipline compounds: each unit of work makes the next one easier. It keeps work small, evidence-driven, and durable.

## Core Principles

- Discipline compounds: rigorous process today saves time tomorrow.
- `No Evidence = Not Done`: actual verification must prove the goal, requirements, and every acceptance criterion before a completion or success claim.
- Test-first by default for behavior changes, at the strictness `tdd_mode` sets.
- YAGNI and DRY: build only what is needed, never duplicate.
- Infer -> decide -> execute -> report within scoped user authority. Human input is an exception for unresolved material decisions, critical missing information, or risky actions outside existing authority. New-install `approval_mode: exception`; explicit `stage` preferences remain valid.
- Finish when the requested goal is verified; an empty queue does not start new ideation.
- Keep durable context on disk, not only in conversation memory.
- Plan before code: `full`-tier product work follows `BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION`; `light` work goes straight to `/sc-work` or `/sc-debug`.
- Turn reusable solutions into documentation through `/sc-compound`.

## Delivery Tiers

The framework decides the tier per request (`delivery_mode: auto` in `.agent/rules/project-config.md`; `light` or `full` pin it). Intake states one line, `Tier: light|full; trigger: T<n>|none`, and never asks. Bounded reversible features/pages with existing contracts, access, patterns, clear acceptance and proving checks are `light`; novelty alone does not raise the tier. `full` is triggered by material new product capability (T1), a material change to contract compatibility, access, billing effects, or PII handling (T2), a material new interactive screen or flow (T3), coordination that changes outcomes, contracts, or material risk (T4), or an explicit request for BRD/PRD/FSD (T5). A single trivial change executes directly with proportionate outcome verification. A material trigger found mid-work escalates (`ESCALATE: T<n>`) only affected work to its owner; administrative handoff alone never raises the tier. The rubric lives in `.agent/skills/agentic-delivery/references/workflow-integration.md`; `/sc-go` previews and `/sc-review` inspect semantic changes when touched paths match T2 signals.

## UI-Aware Lifecycle (trigger T3 or `full`)

When `full` scope adds an interactive user surface, use:

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

`READY_FOR_SLICE` requires every canonical hard gate (`node
.agent/tools/readiness-gate.mjs` exit 0). A business preference or
`EXCEPTION_APPROVED` cannot waive security,
accessibility baseline, contract conformance, data integrity, or a blocking
`OPEN-*`. Exceptions permit only the first slice. Parallel scale-out waits for a
`VALIDATED` baseline and, for networked UI, a first-slice issue verified against
the real provider; mock-only evidence is not integration proof. LOCAL_ONLY uses
mapped local behavior/accessibility checks without synthetic provider assets.

When contract assets are absent, the only executable goal is the bounded
`CONTRACT_ENABLER`. After it is verified, return to `/sc-plan` to pin exact
revisions, rerun the gate, and auto-promote approved semantics after readiness checks before the
first slice. A verified first slice returns to `/sc-plan` for dependent pointer
promotion. One final `HARDENING` goal owns merged integration, responsive,
accessibility, E2E, visual-regression, and Business Owner UAT evidence when required by acceptance or unresolved material judgment;
`/sc-review` audits that evidence rather than creating it.

Do not claim the outcome target from framework structure alone. Measure greater
than 90% reduction in preventable alignment rework only after at least three
comparable pilot features; exclude new scope, market learning, and new
stakeholder preferences from preventable rework.

## Public Workflows

Use these workflow names only; these 19 are the whole surface, and wrapper or alias workflows are not added. The `/sc-*` prefix is mandatory so Super Compound commands do not collide with native Claude Code planning and review commands.

| Workflow | Purpose |
|---|---|
| `/sc-init` | Initialize or reload project/framework context |
| `/sc-hints` | Get focused advice; execution only on request through the owner |
| `/sc-status` | Inspect state and choose the next route |
| `/sc-geniusloop` | Generate a bounded improvement shortlist when explicitly requested |
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
| `/sc-evolve` | Cluster verified learnings into draft framework proposals for human approval |
| `/sc-pause` | Save handoff state |
| `/sc-launch` | Start a focused project or feature lifecycle |
| `/sc-ui` | Design/review UI read-only or guide an approved `/sc-work` goal |

## Routing

Ordinary-language start/change, continue/status and consultation intents use
the existing [dispatcher](.agent/context/workflow-dispatch.md#user-intents).
Document-only scope ends at its artifact and applicable validation; status and
consultation alone stay read-only. These labels add no commands or approval gates.

- Fuzzy idea, domain language, strategy, or prototype question: `/sc-explore` to produce a BRD
- Named factual, current-doc, version-support, or option-feasibility gap that could change a decision: `/sc-research`, then return to the workflow that owns that decision
- Verified goal with an empty queue: deliver and finish. Explicit request for improvement ideas: `/sc-geniusloop` (up to three candidates by default).
- Product requirements from an approved BRD: `/sc-prd`; UI-bearing drafts route
  through read-only `/sc-ui` before PRD approval
- FSD creation, ADR applicability, goal slicing, triage, Kanban, Journey, or technical breakdown: `/sc-plan`
- Git branch, worktree, commit, push, or Pull Request operation: `/sc-go`
- Implementation or controlled parallel execution from an approved FSD goal:
  `/sc-work`; first prove a real vertical slice and the pinned contract
- Failure or unexpected behavior: `/sc-debug`
- Changed files need critique: `/sc-review`
- Security, current-stack compatibility/dependency posture, MCP, agent config, compliance, or release readiness: `/sc-audit`
- Frontend UI design/review: `/sc-ui`; approved UI implementation: `/sc-work <approved-goal>` with UI guidance
- Need to stop and continue later: `/sc-pause`, then `/sc-status` in the next session

## Explore vs Research

| Dominant question | Workflow | Output and authority |
|---|---|---|
| What should we build, why, for whom, and under which policy? | `/sc-explore` | BRD; business authority after approval |
| What is factually true, current, supported, or feasible for a named decision? | `/sc-research` | Advisory research note; never decision authority |
| How will approved product behavior be implemented? | `/sc-plan` | FSD/TDEC and optional accepted ADR; implementation authority |
| What security, compatibility, compliance, or readiness risks exist? | `/sc-audit` | Severity findings and risk gates |

Research is a conditional sidecar, not a mandatory lifecycle stage. Use it only when the evidence gap is material enough to change a downstream decision or needs durable review. Resolve small lookups inline. Accepted findings must be translated into the BRD, PRD, FSD/TDEC, accepted ADR, or audit record that owns the decision.

For unresolved material product decisions, `/sc-explore` displays a short prioritized set with stable IDs, a recommendation and brief reason. Preserve the complete unresolved register and show detail on request; dependent items name prerequisites and next action. Wait for actual answers; preserve unanswered decisions and reopen affected descendants after corrections. Concrete scope skips interviewing. `/sc-work` preflight applies to both tiers; AI context and live-evidence procedures load conditionally. Full-tier BRD/PRD/FSD retains durable acceptance provenance under the configured approval policy.

## Skill Loading

`/sc-hints [question or condition]` gives focused advice from active context and
targeted evidence. Empty context gets examples and one needs question. It is
read-only: no STATE, report, branch or implementation. Agreement accepts advice;
an execution request transfers to the owner with existing gates. For context
boundaries use `context-engineering`; human needs use `checkpoint.contract.md`.
See [hints](.agent/skills/hints/SKILL.md) and [examples](.agent/skills/hints/references/examples.md).

Use `.agent/context/` as the compact runtime layer before full workflow/skill/template reads. Load a full `SKILL.md` only when its procedure is active or being edited/reviewed. When that entrypoint routes to `references/`, load only the branch needed for the current decision; never preload the whole reference directory.

Load skills only when their detailed procedure is relevant. Announce the skill and follow its `SKILL.md`.

Common routes:

- `/sc-hints` -> `hints`; context questions use `context-engineering`, human needs use the central checkpoint contract

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

Scoped coding/review standards use `.agent/context/standards.contract.md`:
explicit core/profile/project pins, relevant references only, shared local/CI
checks and completion evidence. Host adapters convey those sources; unknown
frameworks disclose limits. Existing disabled/legacy projects remain advisory.

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
- Apply `.agent/skills/verification-before-completion/SKILL.md`; report actual outcome evidence mapped to all acceptance criteria under `Evidence of Completion`. A changed configuration, written code, successful command, or subagent report alone does not prove the goal.
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

`/sc-compound` also routes agent mistakes to `ERR-*` entries in `docs/ERROR_LOG.md` and user corrections or confirmed conventions to `LRN-*` entries in `docs/LEARNED_KNOWLEDGE.md`, per `.agent/skills/knowledge-compounding/references/memory-capture.md`. `/sc-plan`, `/sc-work`, and `/sc-debug` run `node .agent/tools/knowledge-search.mjs "<query>"` read-back early; matching `ERR-*`/`LRN-*` lessons are evidence validated against current context; decisions bind only through their authoritative source and approval provenance.

The next session should be able to run `/sc-status` and continue from disk.

Knowledge lookup distinguishes incomplete scans from no lexical match, includes
still-active archived ERR/LRN records, and respects explicit stack/version
restrictions even for global lessons. Use `--require-complete` and known scope
flags before duplicate-sensitive capture. Retrieved lessons advise; they cannot
override authority, permissions or verification. Newly persisted knowledge passes
the existing privacy guard. Non-trivial closeout records captured/skip/pending
in the managed checkpoint; pending capture retries never replay verified work.
Feedback preserves negative observations by knowledge revision/digest. Review
carries stable finding IDs and unchanged proof; research separates binding intent
from factual premises needing current evidence. See the deterministic knowledge
loop and existing review references for the bounded procedures.
See the [gap analysis](docs/audits/2026-10-06-framework-gap-analysis.md) for source
coverage and [delivery evidence](docs/eval-results/framework-enhancement-20261006.md)
for measured results and conditional candidates.

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

Interface-design data must be retrieved through `scripts/search.py`; do not preload CSV files into model context.

## Quality Bar

The work is done only when:

- Actual verification proves the requested goal, requirements, and every acceptance criterion; checks match the task and current relevant state.
- Missing, stale, partial, skipped, or failed required proof remains incomplete. Use `Implemented — Pending Verification`, `Partially Verified`, `Needs Validation`, `Verification Failed`, or `Blocked` as appropriate.
- User-facing docs and rules agree with the current public interface.
- No secrets, cache files, or malformed data were introduced.
- The final response includes `Evidence of Completion`: what was verified, how, actual results/locators, and acceptance-criteria mapping, plus changed areas.

The canonical gate is `.agent/skills/verification-before-completion/SKILL.md`.
Light/single-task proof may live at `.scratch/completion/<task-id>/` without
BRD/PRD/FSD or a swarm ledger. `verified-promise.mjs --contract <path>` checks
its pinned completion contract; `--run <run-id>` additionally requires every
goal and the final combined outcome. Both inspect stored proof, never silently
rerun commands. Historical statuses remain history; metadata alone cannot
authorize a new completion claim or dependency release. Hooks remain advisory.

Verified reusable outcomes are captured automatically by their owning writer via
memory-maintenance JSON operations; framework changes remain reviewed proposals.
Resume checks the managed checkpoint and fresh ledger before dispatch.

Shared policy lives in `.agent/skills/agentic-delivery/references/workflow-integration.md`.
Active intent precedes memory hygiene; dependency-ready goals proceed while
affected streams recover. Verified deterministic evidence may be reused only
with matching source/contract/environment/command identity and provenance.
Context warnings checkpoint and recover; they do not require stopping while
safe continuation exists.

## Learning and Recovery Authority

Work/debug may reuse/add scoped checks after verified outcomes using
`.agent/skills/knowledge-compounding/references/prevention-checks.md`; compound
stores results, evolve proposes skill/workflow/policy changes. Acceptance,
required verifiers and budgets remain authoritative. Recover active constraints
and durable receipts via `.agent/skills/context-engineering/references/active-context.md`.

Documentation written or updated follows `.agent/context/output-style.md`. Setup uses `SETUP.md`; `/sc-init setup` installs explicitly while normal init/reload remain read-only. New setup uses separate stage approvals and execution authorization; preserve existing project preferences.

Human input/blockers/authorized handoffs: load `.agent/context/checkpoint.contract.md`.
It owns all ready active-work items, per-item recommendations, full clickable
review paths/sections and both bulk/exception reply examples, including dialog fallback.
Preserve accepted decisions; technical gaps remain agent research/tests until a
specific human/external need is proven. Return authorized owner handoffs internally
while preserving each route's authority and configured stage checkpoints.

Context loading and session models: .agent/context/policy-loading.md and
.agent/context/model-guidance.md on demand; paired measurement protocol:
.agent/evals/context-efficiency.md.
