### 8. Test Coverage

For each critical path:

- Is there a verification step that covers it?
- Are edge cases identified?
- Is error handling tested?
- If missing, flag: `Critical path <X> has no verification`.

When a goal authors or changes a gate/grader, plan qualification against actual
current target artifacts, expected verdicts, and isolated valid/invalid controls
under [Authored or Changed Gates](../../verification-before-completion/references/claim-evidence.md#authored-or-changed-gates).
Run qualification before downstream reliance, not as a prerequisite to authoring
the verifier itself. Use existing goal verification; this requires neither a new
enabler nor full-tier documents for light work.

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
- `node .agent/tools/readiness-gate.mjs` exits 0: every hard gate passes; `N/A` has factual reason.
- For networked scope, every visible/editable datum and network action maps through `UIMAP-*` to an
  operation, schema, outcome/error, named state, deterministic fixture, and test.
- Schema, fixture, mock, and typed-consumer revisions are pinned and consistent.
- Each UI issue pins its contract version and refs.
- Provider/consumer, responsive, accessibility, QA, and real-integration refs exist.
- One `FIRST_VERTICAL_SLICE` follows any `CONTRACT_ENABLER`; every
  `SCALE_OUT_SLICE` depends on `FIRST_VERTICAL_SLICE_VERIFIED`.
- Parallel scale-out also requires the PRD baseline to be `VALIDATED`; an
  `EXCEPTION_APPROVED` baseline releases only the first slice.
- When networked merged verification obligations remain, one `HARDENING` goal
  depends on all applicable UI delivery slices and owns integration, responsive,
  accessibility, E2E and visual refs. UAT applies only when acceptance/policy or
  unresolved material human judgment requires it.
- Brownfield scope has current-state/compatibility evidence.

Any missing hard-gate evidence is Critical. Mock-only evidence is not real
integration and cannot make scale-out ready.
An exception cannot hide a failed hard gate.

The only pre-readiness execution verdict is `PASS WITH NOTES - ENABLER_ONLY` for
one independently bounded/testable `CONTRACT_ENABLER` while readiness is `DRAFT/BLOCKED`. It requires
complete semantic authority and deterministic verification; all first-slice and
scale-out pointers stay blocked. After the enabler is verified, the active
controller invokes the planning-owned deterministic promotion internally and
reruns dimension 10 before releasing the first slice, without full planning re-entry.
The refreshed index and pointer auto-promote when semantics remain approved
and deterministic gates pass; material changes return to the Technical Manager.

LOCAL_ONLY maps local screen/state/data to behavior and accessibility tests
within its goal; omit synthetic provider/schema/fixture prerequisites and use a
separate hardening goal only for outstanding merged/cross-slice checks.
Applicability and affected proof follow the canonical UI readiness reference.
