---
name: writing-plans
description: "Use when requirements or a PRD need a clear implementation plan before code is written. Produces scoped tasks, risk checks, verification commands, and optional task ledgers."
---

# Writing Plans

## Purpose

Turn a requirement, PRD, issue, or explored idea into an implementation plan that is small enough to execute and specific enough to verify.

Announce: "I'm using the writing-plans skill to create the implementation plan."

Save plans to `docs/plans/YYYY-MM-DD-<feature-name>-plan.md`.

## Inputs

Read the most relevant sources before writing:

- User request and current conversation context
- `docs/prds/`, `docs/plans/`, `docs/STATE.md`, and `docs/progress.md` when present
- Recent `docs/brainstorms/` files when the plan follows exploration
- `SUPER-COMPOUND.md`, `.agent/rules/super-compound.md`, and project-specific guidance
- Existing code, tests, package metadata, and similar implementations
- `docs/solutions/`, `docs/ERROR_LOG.md`, and `docs/LEARNED_KNOWLEDGE.md` when present

Do not create a plan from memory when local evidence exists.

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
| Unclear product, domain, architecture, or UX decision | Route back through `/explore` before planning, or record an explicit open question |

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

## Required Plan Shape

Every plan starts with:

```markdown
# <Feature> Implementation Plan

**Goal:** <one sentence>
**Scope:** <included and excluded work>
**Depth:** quick | standard | comprehensive
**Risk Level:** low | medium | high
**Primary Verification:** <commands or manual checks>

---
```

Then include the sections that apply:

- `## Context` with paths and findings that shaped the plan
- `## Decisions` for assumptions already resolved
- `## Open Questions` only for blockers or genuine uncertainty
- `## Compatibility And Risk` for dependencies, migrations, contracts, security, privacy, or release concerns
- `## Design System` for frontend work, including source CSV/search result when used
- `## Tasks` with ordered, checkable steps
- `## Verification` with exact commands and expected outcomes
- `## Rollback` for database, deployment, external service, or risky behavior changes
- `## Documentation` when setup, user behavior, API contracts, or operations change

## Task Discipline

Tasks should be independently verifiable. Prefer thin vertical slices over broad layer-only chunks.

Good task examples:

- Add one migration and its rollback check
- Update one endpoint and its tests
- Add one UI state and browser verification
- Refactor one module boundary and update callers
- Add one audit/logging behavior with assertions

Split tasks when:

- The change touches unrelated domains
- The task cannot be described in two or three sentences
- The verification would only happen after several later tasks
- Multiple agents would edit the same files
- A task feels larger than one focused session

## Optional Task Ledger

Use a JSON task ledger only when it helps operation, not by default.

Use when:

- The plan spans many sessions
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
      "id": "T001",
      "title": "Short task title",
      "status": "pending",
      "files": [],
      "verification": []
    }
  ]
}
```

## Acceptance Criteria

Each plan must make completion testable:

- User-visible behavior is stated plainly
- Edge cases and failure modes are named
- Tests or checks map to each risky behavior
- UI work includes accessibility and responsive verification
- Security/privacy work includes negative cases
- Data changes include migration, rollback, and compatibility notes

## Handoff

After saving the plan, offer operational choices:

1. Execute sequentially with `/work`
2. Execute independent slices with parallel agents when safe
3. Review and refine the plan
4. Stop with the plan saved

Do not add legacy workflow aliases to the plan. Route by current workflows: `/explore`, `/prd`, `/plan`, `/work`, `/review`, `/audit`, `/ui`.

## Red Flags

| Thought | Better Response |
|---|---|
| "The plan is obvious" | Write the exact files, commands, and criteria |
| "Tests can wait" | Put verification beside the task that needs it |
| "One big task is simpler" | Split into verifiable slices |
| "We can add the package later" | Check compatibility and supply-chain risk before committing to it |
| "The UI copy can be generic" | Use `interface-design` and domain-specific product language |

## Related Skills

- `brainstorming` and `prd-generator` provide upstream product context
- `executing-plans` consumes this plan
- `test-driven-development` shapes task-level implementation
- `interface-design` supports frontend and design-system planning
- `compatibility-check`, `security-audit`, `threat-modeling`, and `data-privacy` cover risk pre-flight
- `state-management` keeps long work durable
- `verification-before-completion` defines the completion bar
