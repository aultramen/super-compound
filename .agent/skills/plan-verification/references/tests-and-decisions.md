### 8. Test Coverage

For each critical path:

- Is there a verification step that covers it?
- Are edge cases identified?
- Is error handling tested?
- If missing, flag: `Critical path <X> has no verification`.

### 9. Decision Coverage

For every approved `TDEC-*` and every applicable obligation from a linked
`ACCEPTED` ADR:

- Does at least one `GOAL-*` reference the exact decision ID?
- Does at least one `TEST-*` verify the obligation or its observable effect?
- Do blocked or superseded decisions stay out of executable goals?

Missing exact-ID coverage blocks execution. Fuzzy text similarity may warn after
implementation, but it must never create a false blocking match.

### 10. UI/API Integration Readiness

For UI-bearing scope, load the canonical
`agentic-delivery/references/ui-contract-readiness.md` policy and verify:

- The PRD experience baseline and FSD Screen & Interaction Contract are current.
- `node .agent/tools/readiness-gate.mjs` exits 0: every hard gate passes; `N/A` has reason/approver.
- Every visible/editable datum and network action maps through `UIMAP-*` to an
  operation, schema, outcome/error, named state, deterministic fixture, and test.
- Schema, fixture, mock, and typed-consumer revisions are pinned and consistent.
- Provider/consumer, responsive, accessibility, QA, and real-integration refs exist.
- One `FIRST_VERTICAL_SLICE` follows any `CONTRACT_ENABLER`; every
  `SCALE_OUT_SLICE` depends on `FIRST_VERTICAL_SLICE_VERIFIED`.
- Parallel scale-out also requires the PRD baseline to be `VALIDATED`; an
  `EXCEPTION_APPROVED` baseline releases only the first slice.
- Exactly one `HARDENING` goal depends on all applicable UI delivery slices and
  owns merged integration, responsive, accessibility, E2E, visual, and UAT refs.
- Brownfield scope has current-state/compatibility evidence.

Any missing hard-gate evidence is Critical. Mock-only evidence is not real
integration and cannot make scale-out ready.

The only pre-readiness execution verdict is `PASS WITH NOTES - ENABLER_ONLY` for
one bounded `CONTRACT_ENABLER` while readiness is `DRAFT/BLOCKED`. It requires
complete semantic authority and deterministic verification; all first-slice and
scale-out pointers stay blocked. Re-enter `/sc-plan` after the enabler is
verified and rerun dimension 10 before releasing the first slice.
The refreshed FSD/contract index needs Technical Manager approval before that
first-slice pointer becomes ready.
