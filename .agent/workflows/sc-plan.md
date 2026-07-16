---
description: "Create an FSD from an approved PRD, then slice FSD goals into lightweight issue files."
---

# Plan Workflow

Use this when approved product requirements are ready to become a technical implementation contract. The FSD is the primary output and implementation authority.

## Steps

1. Load `skills/agentic-delivery/SKILL.md` and `skills/writing-plans/SKILL.md` when following the full planning procedure.
2. Read the approved PRD, upstream BRD references, advisory research notes, exploration notes, codebase conventions, and existing tests. Research recommendations are evidence only; translate accepted conclusions into FSD `TDEC-*`, constraints, or an accepted ADR before they become implementation authority.
3. Use `.agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md` first; expand full template sections only when needed.
4. For UI work, load `skills/interface-design/SKILL.md`.
   Load `skills/agentic-delivery/references/ui-contract-readiness.md` only for
   UI-bearing scope. FSD Section 8 is the Screen & Interaction Contract.
5. Resolve a narrow API/version lookup inline. Route through `sc-research.md` only when a broader, conflicting, or reusable evidence gap could materially change the FSD; then resume planning. For selected dependencies or version-sensitive APIs, still run formal compatibility and official-doc pre-flight checks.
6. Load `skills/domain-modeling/SKILL.md` or `skills/codebase-design/SKILL.md` when vocabulary, seams, or architecture are still shaping the FSD.
7. Stop with `OPEN-*` when product authority, security/privacy obligations,
   data/API/auth/workflow/state detail, or verification authority is missing.
8. Decide ADR applicability:
   - default to FSD `TDEC-*` for local technical decisions;
   - link only `ACCEPTED` ADRs from `docs/solutions/adr-####-<slug>.md` when an ADR is justified;
   - block affected goals if a required ADR is missing or not accepted.
9. Save the FSD to `docs/fsd/fsd-<feature>.md`, using the FSD template only as a reference.
10. Load `skills/issue-workflow/SKILL.md` for goal issue files under `.scratch/<feature>/issues/`.
11. Load `skills/triage-workflow/SKILL.md` when shaping incoming, stale, or raw issues into agent-ready work.
12. Shape FSD `GOAL-*` packets into vertical, independently verifiable issue pointers without copying BRD/PRD/FSD/ADR prose.
13. Include suggested branch names per GOAL and identify optional worktree candidates for independent parallel goals; do not checkout or mutate Git state during planning.
14. Include blocker relationships, qualified refs, verification refs, and stop conditions.
15. For UI-bearing scope, calculate readiness and enforce every hard gate.
    `ui_contract_readiness = READY_FOR_SLICE` is required before a UI-integrated
    goal can be ready, except for the bounded `CONTRACT_ENABLER` described next.
    `/sc-plan` writes only the FSD and issue pointers; it does not create
    OpenAPI/schema, mock, fixture, generated client, or app code.
16. If machine assets are missing, create a `CONTRACT_ENABLER`. Then create
    exactly one blocked `FIRST_VERTICAL_SLICE` pointer for the critical/highest-risk
    flow. The FSD may be approved with `DRAFT/BLOCKED` readiness only to release
    the bounded enabler. After it is verified, return to `/sc-plan`, update the
    FSD index, rerun readiness, and obtain Technical Manager re-approval;
    `READY_FOR_SLICE` then releases the first slice.
    Every `SCALE_OUT_SLICE` records `required_gate =
    FIRST_VERTICAL_SLICE_VERIFIED` and depends on the first-slice issue. These
    truths live only in the FSD or issue pointer, not a new authority.
17. Create exactly one `HARDENING` goal for UI-bearing scope. It depends on all
    applicable UI delivery slices and owns merged integration, responsive,
    accessibility, E2E, visual-regression, and Business Owner UAT evidence.
18. Use `skills/plan-verification/SKILL.md` and its ten dimensions before execution.

## Output

- FSD technical contract.
- `.scratch/<feature>/issues/*.md` goal issue pointers when work will be delegated or executed incrementally.
- Verification plan.
- Suggested Git branch names and optional worktree candidates when useful.
- Risks, assumptions, and out-of-scope notes.
