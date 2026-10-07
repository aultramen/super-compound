---
description: "Create an FSD from an approved PRD, then slice FSD goals into lightweight issue files."
---

# Plan Workflow

## Summary


Use this when approved product requirements are ready to become a technical implementation contract. The FSD is the primary output and implementation authority.

Planning writes authority artifacts only: FSD, accepted ADR, eval definition,
and issue pointers. It never edits product code; implementation belongs to an
approved `/sc-work` goal. `/sc-plan` is the entry of the `full` delivery tier
(`skills/agentic-delivery/references/workflow-integration.md`, triggers T1-T5).

Apply `.agent/context/checkpoint.contract.md` for input, blockers and handoffs.
Check evidence dependencies for self-produced entry requirements. Missing
qualification assets/actions need a bounded approved enabler under the canonical
UI readiness reference; never start a blocked product goal to evade its gate.


## Example

Input: `/sc-plan docs/prd/prd-analytics.md`.
Prerequisite: Approved PRD and required experience evidence.
Result and next action: FSD, goals and mapped verification; reuse valid scope/acceptance and execution authority, with separate FSD approval/execution checkpoints only in configured stage mode.

## Steps

1. Load `skills/agentic-delivery/SKILL.md` and `skills/writing-plans/SKILL.md` when following the full planning procedure.
2. Read the approved PRD, upstream BRD references, advisory research notes, exploration notes, codebase conventions, and existing tests. Research recommendations are evidence only; translate accepted conclusions into FSD `TDEC-*`, constraints, or an accepted ADR before they become implementation authority.
3. Run `node .agent/tools/knowledge-search.mjs "<feature area>"` and cite applicable knowledge IDs as evidence; observed lessons are advisory until adopted into an accepted decision.
4. Use `.agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md` first; expand full template sections only when needed.
5. For UI work, load `skills/interface-design/SKILL.md`.
   Load `skills/agentic-delivery/references/ui-contract-readiness.md` only for
   UI-bearing scope. FSD Section 8 is the Screen & Interaction Contract.
6. Resolve a narrow API/version lookup inline. Route through `sc-research.md` only when a broader, conflicting, or reusable evidence gap could materially change the FSD; then resume planning. For selected dependencies or version-sensitive APIs, still run formal compatibility and official-doc pre-flight checks.
7. Load `skills/domain-modeling/SKILL.md` or `skills/codebase-design/SKILL.md` when vocabulary, seams, or architecture are still shaping the FSD.
8. Stop with `OPEN-*` when product authority, security/privacy obligations,
   data/API/auth/workflow/state detail, or verification authority is missing.
9. Decide ADR applicability:
   - default to FSD `TDEC-*` for local technical decisions;
   - link only `ACCEPTED` ADRs from `docs/solutions/adr-####-<slug>.md` when an ADR is justified;
   - block affected goals if a required ADR is missing or not accepted.
10. Save the FSD to `docs/fsd/fsd-<feature>.md`, using the FSD template only as a reference.
11. Load `skills/issue-workflow/SKILL.md` for goal issue files under `.scratch/<feature>/issues/`.
12. Load `skills/triage-workflow/SKILL.md` when shaping incoming, stale, or raw issues into agent-ready work.
13. Shape FSD `GOAL-*` packets into vertical, independently verifiable issue pointers without copying BRD/PRD/FSD/ADR prose.
14. Include suggested branch names per GOAL and identify optional worktree candidates for independent parallel goals; do not checkout or mutate Git state during planning.
15. Include blocker relationships, qualified refs, verification refs, and stop
    conditions. Derive the completion contract from authoritative requirements
    and all acceptance criteria before results are recorded; map each expected
    outcome to task-appropriate actual checks. Include a final combined-outcome
    contract when coordinating multiple goals. The contract is a pinned snapshot,
    not an alternate requirement authority or a report-selected subset.
16. For UI-bearing scope, run `node .agent/tools/readiness-gate.mjs --fsd <fsd> --prd <prd> --issues-dir <dir>` and enforce every hard gate.
    `ui_contract_readiness = READY_FOR_SLICE` is required before a UI-integrated
    goal can be ready, except for the bounded `CONTRACT_ENABLER` described next.
    `/sc-plan` writes only the FSD and issue pointers; it does not create
    OpenAPI/schema, mock, fixture, generated client, or app code.
17. If machine assets are missing, create a `CONTRACT_ENABLER`. Then create
    exactly one blocked `FIRST_VERTICAL_SLICE` pointer for the critical/highest-risk
    flow. The FSD may be approved with `DRAFT/BLOCKED` readiness only to release
    the bounded enabler. After it is verified, the active controller updates the
    FSD index through planning-owned deterministic promotion, reruns the gate,
    and auto-promotes unchanged semantics without planning re-entry solely for
    metadata. Material deltas return to `/sc-plan` and their decision owner;
    `READY_FOR_SLICE` then releases the first slice.
    Every `SCALE_OUT_SLICE` records `required_gate =
    FIRST_VERTICAL_SLICE_VERIFIED` and depends on the first-slice issue. These
    truths live only in the FSD or issue pointer, not a new authority.
18. For networked UI requiring merged/cross-slice verification, create exactly one
    `HARDENING` goal. It depends on all
    applicable UI delivery slices and owns merged integration, responsive,
    accessibility, E2E, visual-regression, and conditional Business Owner UAT
    evidence. LOCAL_ONLY verification remains in its bounded goal; no synthetic
    separate hardening goal. UAT applies only to explicit acceptance or unresolved
    material human judgment.
19. Use `skills/plan-verification/SKILL.md` and its ten dimensions before execution.
20. Checkpoint automatically and continue authorized work; use `/sc-pause` only when actually stopping.

## Output

- FSD technical contract.
- `.scratch/<feature>/issues/*.md` goal issue pointers when work will be delegated or executed incrementally.
- Verification plan.
- Suggested Git branch names and optional worktree candidates when useful.
- Risks, assumptions, and out-of-scope notes.
- Every durable artifact follows `.agent/context/output-style.md`.

UI topology, affected proof, and conditional UAT follow the canonical UI readiness reference.

Stage approvals and execution authority: agentic-delivery/references/workflow-integration.md.

Stage mode: Consume an approved PRD; present FSD, goals, and verification for FSD approval, then request separate execution authorization. Derived pointers and board fixes need no repeated approval. Preserve existing project approval preferences on update.
