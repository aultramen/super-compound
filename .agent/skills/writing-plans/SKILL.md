---
name: writing-plans
description: "Use when an approved PRD needs an implementation-authoritative FSD before code is written."
---

# Writing Plans

## Summary

Apply this procedure within its authorized scope and use `.agent/context/output-style.md` for every documentation file created or updated: summary first, relevant HLD, preserved evidence and parser fields.

Turn an approved PRD into the FSD authority consumed by `/sc-work`.

## When to Use

Use for full-tier scope after required business/product authority exists and
before implementation; concrete light requests do not require a new FSD.
Do not plan from memory, invent missing product policy, or proceed while an
`OPEN-*` blocker prevents a safe technical contract. Apply the configured
exception or opted-in stage policy, not extra approvals from this skill.

Bounded draft packages: [approval policy](../agentic-delivery/references/workflow-integration.md).

## Route

1. Search before loading: locate the approved PRD, qualified BRD refs, existing FSD/state, accepted ADRs, nearby code/tests, and relevant solution notes.
2. Load [FSD authoring](references/fsd-authoring.md) for evidence selection, risk branches, contract shape, acceptance, and handoff.
3. After the contract is stable, load [goal slicing](references/goal-slicing.md) only when defining `GOAL-*` packets, a task ledger, or a measured wide refactor.
4. Read only the needed sections of the full FSD template; never preload it merely to orient.

For product AI runtime, use [AI context and output](../prd-generator/references/ai-context-and-output.md) and expand only FSD Section 11.

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

Resolve missing planning decisions through [brainstorming rounds](../brainstorming/references/questions-and-options.md); preserve the owning authority and skip settled scope.

## Integration

Inputs: `agentic-delivery`, `prd-generator`, domain/codebase evidence. Risk branches: `compatibility-check`, `threat-modeling`, `data-privacy`, `interface-design`. Outputs: `plan-verification`, `issue-workflow`, `executing-plans`, and `verification-before-completion`.
