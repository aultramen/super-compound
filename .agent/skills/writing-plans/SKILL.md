---
name: writing-plans
description: "Use when an approved PRD needs an implementation-authoritative FSD before code is written."
---

# Writing Plans

Turn an approved PRD into the FSD authority consumed by `/sc-work`. Announce: "I'm using writing-plans to create the FSD and goal slices."

## When to Use

Use after BRD/PRD approval and before implementation. Do not plan from memory, invent missing product policy, or proceed while an `OPEN-*` blocker prevents a safe technical contract.

## Route

1. Search before loading: locate the approved PRD, qualified BRD refs, existing FSD/state, accepted ADRs, nearby code/tests, and relevant solution notes.
2. Load [FSD authoring](references/fsd-authoring.md) for evidence selection, risk branches, contract shape, acceptance, and handoff.
3. After the contract is stable, load [goal slicing](references/goal-slicing.md) only when defining `GOAL-*` packets, a task ledger, or a measured wide refactor.
4. Read only the needed sections of the full FSD template; never preload it merely to orient.

## Invariants

- Save the primary authority to `docs/fsd/fsd-<feature>.md`; a companion plan never outranks it.
- Trace qualified BRD/PRD IDs, approved `TDEC-*`, optional accepted ADRs, tests, and goals. Missing authority becomes an `OPEN-*` blocker.
- State exact contracts, affected paths, failure modes, rollback, verification commands, and expected evidence.
- Prefer a thin vertical slice that delivers one independently verifiable behavior.
- A wide refactor is an exception: name the shared seam, enumerate affected callers, bound the file surface, and provide verification covering every caller plus migration/rollback. “Many files” alone is not justification.
- Never defer compatibility, security, privacy, data, or UI evidence until implementation.
- For UI-bearing scope, use the canonical UI readiness reference, make FSD
  Section 8 the Screen & Interaction Contract, and keep exact wire shape in a
  delegated versioned machine contract.
- Define a contract enabler when executable assets are missing, then exactly one
  first real vertical slice before any dependent scale-out goals.

## Red Flags

| Thought | Response |
|---|---|
| "The FSD is obvious" | Write exact contracts and evidence. |
| "One horizontal layer is cleaner" | Use a vertical slice unless the measured wide-refactor exception applies. |
| "Tests can wait" | Map verification beside each risky goal. |
| "We can choose the package later" | Resolve compatibility and supply-chain risk first. |

## Integration

Inputs: `agentic-delivery`, `prd-generator`, domain/codebase evidence. Risk branches: `compatibility-check`, `threat-modeling`, `data-privacy`, `interface-design`. Outputs: `plan-verification`, `issue-workflow`, `executing-plans`, and `verification-before-completion`.
