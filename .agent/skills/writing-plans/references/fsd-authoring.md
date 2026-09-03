# FSD Authoring Reference

Load this reference when creating or reviewing the FSD contract. Do not load it merely to route a task.

## Evidence Inputs

Start with the approved PRD and qualified BRD references. Add only evidence needed by the planned behavior:

- Current user request and approved `docs/prd/`, upstream `docs/brd/`, existing `docs/fsd/`, active issue pointer, `docs/STATE.md`, or `docs/progress.md`.
- Existing code, tests, package metadata, similar implementations, and repository instructions.
- Accepted ADRs and relevant `docs/solutions/`, error logs, or learned conventions.
- Recent brainstorm only when it contains an approved decision not yet represented upstream.

Never create an FSD from conversation memory when current repository evidence exists.

## Risk Routing

Run only branches supported by a signal:

| Signal | Required branch |
|---|---|
| New dependency, runtime, vendor, or major version | `compatibility-check`: legitimacy, supported versions, lockfile, rollback |
| Uncertain framework/API behavior | Primary/current documentation through `context7-docs` |
| Auth, permissions, crypto, uploads, webhooks, payments | `threat-modeling`, `security-audit`, `secure-code-patterns` |
| PII, consent, retention, deletion, export, sharing | `data-privacy` and negative acceptance cases |
| Compliance or AI governance | Evidence path, owner, retention, review gate |
| Frontend/UI | Existing design system or targeted `interface-design` retrieval |
| UI-bearing delivery | `agentic-delivery/references/ui-contract-readiness.md`; PRD baseline, Section 8 contract, readiness hard gates (`readiness-gate.mjs`) |
| Domain or module-seam ambiguity | `domain-modeling` or `codebase-design` |
| Missing product/architecture authority | Return to `/sc-explore` or `/sc-prd`, or record a blocking `OPEN-*` |

## Depth

- **Quick:** obvious bounded correction; goal, criteria, tasks, verification.
- **Standard:** normal feature/refactor/API/UI; context, paths, sequence, risks, tests.
- **Comprehensive:** architecture, migration, security, release, or independent multi-agent slices; alternatives, observability, rollout, rollback, documentation.

Ask one concise question only when scope or acceptance cannot be inferred safely.

## FSD Contract

Save to `docs/fsd/fsd-<feature>.md`. Use the full agentic FSD template section-by-section when the compact shape is insufficient.

Every FSD includes or marks not applicable:

- Metadata, qualified BRD/PRD sources, `DRAFT|APPROVED|BLOCKED`, and ADR applicability.
- Product-to-implementation alignment.
- Approved `TDEC-*` records or linked accepted ADR obligations.
- Applicable domain, data, API, UI, job, integration, security, privacy, observability, delivery, and rollback contracts.
- Atomic `GOAL-*` packets and their affected paths.
- Only genuine blocking `OPEN-*` records.
- Deterministic verification commands, expected evidence, and release gates.
- For UI-bearing work: versioned `UI-STATE-*`/`UIMAP-*`/`SCHEMA-*`/`CONTRACT-*`
  mappings, deterministic fixtures, derived consumer refs, contract tests, goal
  roles, and the first-real-slice barrier.

An optional `docs/plans/` note may summarize context, resolved decisions, risks, design-system evidence, goal/issue links, verification, rollback, and docs. It never replaces or overrides the FSD.

## Single Projection

Author every goal/ID fact exactly once:

- `GOAL-*` packets are the only hand-authored serialization of the goal/ID graph.
- Generate the dependency graph with `node .agent/tools/goal-waves.mjs --issues-dir <dir>`; never hand-draw it a second time.
- End-to-End Traceability and Requirement-to-Test matrices are derived views; omit them from authored FSDs unless a reviewer requests them. Per-goal Verification refs are the source.
- Specify each `TDEC-*` once in the decision register; goals cite decision IDs only, and feature sections reference goal IDs without restating packet content.
- Use sequential IDs in range notation (for example `GOAL-001..GOAL-005`).

## Acceptance And Handoff

Confirm user-visible behavior, edge/failure cases, and tests at the highest practical public seam. UI includes accessibility/responsiveness; security/privacy includes negative cases; data changes include compatibility, migration, and rollback.

Then offer: review the FSD, execute sequentially with `/sc-work`, create/review an issue board, safely parallelize independent slices, or stop with the approved artifact saved. Use only current `/sc-*` workflow names.
