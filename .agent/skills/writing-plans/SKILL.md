---
name: writing-plans
description: "Use when an approved PRD needs an FSD before code is written. Produces the technical contract, goal slices, risk checks, verification commands, and optional task ledgers."
---

# Writing Plans

## Purpose

Turn an approved PRD into an FSD that is specific enough to implement and verify. The FSD is the primary technical contract for `/sc-work`.

Announce: "I'm using the writing-plans skill to create the FSD and goal slices."

Save FSDs to `docs/fsd/fsd-<feature-name>.md`. Use `.agent/templates/agentic-delivery/FSD-Agentic-AI-Ready-Template.md` as the full reference template.

A short companion plan under `docs/plans/` is optional. It must never become the implementation authority over the FSD.

## Inputs

Read the most relevant sources before writing:

- User request and current conversation context
- approved `docs/prd/`, upstream `docs/brd/`, `docs/fsd/`, `.scratch/`, `docs/STATE.md`, and `docs/progress.md` when present
- Recent `docs/brainstorms/` files when the plan follows exploration
- `SUPER-COMPOUND.md`, `.agent/rules/super-compound.md`, and project-specific guidance
- Existing code, tests, package metadata, and similar implementations
- accepted ADRs and related solutions under `docs/solutions/`, `docs/ERROR_LOG.md`, and `docs/LEARNED_KNOWLEDGE.md` when present

Do not create an FSD from memory when local evidence exists.

## Pre-Flight Checks

Run only the checks that match the work.

| Signal | What To Do |
|---|---|
| New dependency, runtime, vendor, or major version change | Use `compatibility-check`; verify source legitimacy, lockfiles, version support, and rollback path |
| Framework or API behavior is uncertain | Use `context7-docs` first; browse only when local and primary docs are insufficient |
| Auth, authorization, crypto, uploads, webhooks, payments, or sensitive operations | Use `threat-modeling`, `security-audit`, and `secure-code-patterns` |
| PII, consent, retention, deletion, export, or data sharing | Use `data-privacy`; add privacy acceptance criteria |
| Compliance, audit evidence, AI governance, or regulated workflows | Add explicit evidence, owner, and retention requirements in the plan |
| Frontend UI, dashboard, landing page, or component work | Use `interface-design`; generate or reuse a design-system artifact |
| Multi-agent or long-running work | Add durable state updates and handoff notes using `state-management` |
| Issues, Journey, Kanban, PRD-to-FSD-goals, or agent-ready slices | Use `issue-workflow`; create `.scratch/<feature>/issues/*.md` from FSD `GOAL-*` packets after review |
| Incoming bugs, raw requests, stale issues, or label/state decisions | Use `triage-workflow`; classify before planning implementation |
| Domain terms, roles, or glossary conflicts | Use `domain-modeling`; update `CONTEXT.md`; create ADR only when `agentic-delivery` ADR criteria are met |
| Test seams, module interfaces, or architecture shape | Use `codebase-design`; prefer deep modules and high public seams |
| Unclear product, domain, architecture, or UX decision | Route back through `/sc-explore` or `/sc-prd`, or record an explicit `OPEN-*` blocker |

Frontend design search:

```bash
python .agent/skills/interface-design/scripts/search.py "<product type> <industry>" --design-system -p "<Project>"
```

## Plan Depth

Choose the smallest depth that handles the risk.

| Depth | Use When | Plan Contains |
|---|---|---|
| Quick | Small bug, minor cleanup, obvious change | Goal, acceptance criteria, short task list, verification |
| Standard | Normal feature, refactor, API/UI change | Background, file paths, task sequence, risk checks, tests |
| Comprehensive | Architecture, data migration, security-sensitive, multi-agent, or release-bound work | Alternatives, rollout, compatibility, observability, rollback, documentation |

Ask one concise question only if the scope or acceptance criteria cannot be inferred safely.

## Required FSD Shape

Every FSD must include or explicitly mark not applicable:

```markdown
# <Feature> Functional Specification Document

**Source BRD:** <qualified refs>
**Source PRD:** <qualified refs>
**Status:** DRAFT | APPROVED | BLOCKED
**adr_applicability:** NOT_REQUIRED | LINKED | BLOCKED_BY_POLICY

---
```

Then include the sections that apply:

- Product-to-implementation alignment with qualified BRD and PRD references
- Technical Decision Register with approved `TDEC-*` records or linked accepted ADRs
- Domain, data, API, UI, job, integration, security, privacy, observability, delivery, rollback, and testing contracts
- `GOAL-*` packets for atomic, independently verifiable outcomes
- `OPEN-*` blockers only for unresolved decisions that block safe execution
- Verification commands, expected evidence, and release gates

If a companion implementation note is useful, keep it short and include:

- `## Context` with paths and findings that shaped the FSD
- `## Decisions` for assumptions already resolved
- `## Open Questions` only for `OPEN-*` blockers or genuine uncertainty
- `## Compatibility And Risk` for dependencies, migrations, contracts, security, privacy, or release concerns
- `## Design System` for frontend work, including source CSV/search result when used
- `## Goals` with ordered, checkable `GOAL-*` references
- `## Issue Board` with `.scratch/<feature>/issues/*.md` links when `issue-workflow` is used
- `## Verification` with exact commands and expected outcomes
- `## Rollback` for database, deployment, external service, or risky behavior changes
- `## Documentation` when setup, user behavior, API contracts, or operations change

## Goal Discipline

FSD goals should be independently verifiable. Prefer thin vertical slices over broad layer-only chunks.

A vertical slice may cross database, API, UI, and tests when that is the smallest complete path for one behavior. Do not split a tracer bullet into horizontal layer tasks unless the slice is too large or incoherent.

Good goal examples:

- Add one migration and its rollback check
- Update one endpoint and its tests
- Add one UI state and browser verification
- Refactor one module boundary and update callers
- Add one audit/logging behavior with assertions
- Add one end-to-end issue slice with schema, handler, UI state, and verification when the behavior needs all layers

Split goals when:

- The change touches unrelated domains
- The task cannot be described in two or three sentences
- The verification would only happen after several later tasks
- Multiple agents would edit the same files
- A goal feels larger than one focused session

## Optional Task Ledger

Use a JSON task ledger only when it helps operation, not by default.

Use when:

- The FSD spans many sessions
- Multiple agents will execute independent slices
- A user needs machine-readable progress tracking

Save to `docs/tasks/tasks-<feature>.json` and keep it synchronized with the Markdown plan.

Minimal shape:

```json
{
  "feature": "Feature name",
  "created": "YYYY-MM-DD",
  "status": "planned",
  "tasks": [
    {
      "id": "GOAL-001",
      "title": "Short task title",
      "status": "pending",
      "parent": "docs/fsd/fsd-feature.md",
      "blocked_by": [],
      "upstream_refs": ["PRD-<PROJECT>#FR-001"],
      "issue_path": ".scratch/feature/issues/01-short-task.md",
      "files": [],
      "verification": []
    }
  ]
}
```

## Acceptance Criteria

Each FSD must make completion testable:

- User-visible behavior is stated plainly
- Edge cases and failure modes are named
- Tests or checks map to each risky behavior
- UI work includes accessibility and responsive verification
- Security/privacy work includes negative cases
- Data changes include migration, rollback, and compatibility notes

## Handoff

After saving the FSD, offer operational choices:

1. Execute sequentially with `/sc-work`
2. Execute independent slices with parallel agents when safe
3. Create or review a local issue board with `issue-workflow`
4. Review and refine the FSD
5. Stop with the FSD saved

Do not add legacy workflow aliases to the plan. Route by current workflows: `/sc-explore`, `/sc-prd`, `/sc-plan`, `/sc-work`, `/sc-review`, `/sc-audit`, `/sc-ui`.

## Red Flags

| Thought | Better Response |
|---|---|
| "The FSD is obvious" | Write the exact contracts, commands, goals, and criteria |
| "Tests can wait" | Put verification beside the task that needs it |
| "One big task is simpler" | Split into verifiable slices |
| "We can add the package later" | Check compatibility and supply-chain risk before committing to it |
| "The UI copy can be generic" | Use `interface-design` and domain-specific product language |

## Related Skills

- `brainstorming` and `prd-generator` provide upstream product context
- `agentic-delivery` defines artifact authority, ADR policy, and zero context bloat rules
- `issue-workflow` turns FSD goals into local Markdown issue pointers
- `triage-workflow` shapes incoming work into agent-ready issues
- `domain-modeling` and `codebase-design` sharpen vocabulary and seams
- `executing-plans` consumes the FSD or issue pointer
- `test-driven-development` shapes task-level implementation
- `interface-design` supports frontend and design-system planning
- `compatibility-check`, `security-audit`, `threat-modeling`, and `data-privacy` cover risk pre-flight
- `state-management` keeps long work durable
- `verification-before-completion` defines the completion bar
