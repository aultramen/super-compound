# Questions and Hints Evaluation — 2026-10-05

## Summary

The shared checkpoint now shows the complete ready list for active work, with
stable IDs, concrete recommendations, existing absolute clickable review paths,
pending dependencies and bulk/exception reply examples. All 18 compact/full
workflow routes reach that format. Approval remains scoped by target, revision
and stage and does not create facts, test evidence or access readiness.

This report records one informed in-thread response-content evaluation, not
independent host reliability. The baseline replay is authored against archived
HEAD guidance after source inspection; it is not a blind pre-change agent trial.
Exact responses, input prompts and source hashes are in
[the response record](../../.agent/evals/questions-and-hints.responses.json).
The existing [H01–H12 eval](../../.agent/evals/hitl-checkpoints.md) remains intact
and is re-reviewed before its source digests are refreshed.

## Flow and scope

```mermaid
flowchart LR
    A[Active needs and existing authority] --> B[All ready IDs plus pending dependencies]
    B --> C[Recommendations and verified review paths]
    C --> D[Bulk or partial user reply]
    D --> E[Reconcile only supplied answers and scoped approvals]
    E --> F[Owner artifacts and existing STATE refs]
    F --> G[Resume authorized work]
```

No project product code, secret, real host session or external action is exercised.
Saved framework references stay repository-relative; absolute paths belong to
the captured runtime response and are mapped back to fixture-relative files by
the grader for cross-platform test execution.

## Response-content assessment

| Scenarios | Observed response behavior | Content verdict |
| --- | --- | --- |
| A01 baseline | Three ready items shown; Q4/Q5 hidden by count, relative paths, no two reply examples | FAIL under new acceptance criteria |
| A01 changed guidance | Q1–Q5 visible, every required field concrete, files/sections exist; Q6 depends on Q2; text retains full list despite three-item dialog | PASS |
| A02–A05 | Bulk actions retain missing data/tests/access; custom exception replaces Q2; bare exception leaves Q2 open; partial reply resolves Q1/Q3 only | PASS |
| A06–A07, A11 | Clear answers retained; unknown/conflicting portions clarified; unknown bulk exception prevents inferred blanket scope | PASS |
| A08 | Correction to Q2 reopens Q6; unrelated Q1/Q3 retained | PASS |
| A09–A10 | Prototype r1 acceptance does not supply provider/release/execution proof; old FSD revision grant does not approve new delta | PASS |

Observed baseline rationalization: the old brainstorming reference explicitly
allowed 1–3 questions and deferral by cognitive load. Its central package showed
one question, with no required absolute path or bulk examples. The new reference
uses the full ready frontier and delegates display/resolution to the central
contract. The replay's deliberately missing fields fail the new content grader.
This is sensitivity evidence for the authored fixture, not measured model efficacy.

H01/H02/H04/H06/H09–H12 preserve their existing action order and outcomes: unchanged
approval, agent-owned research, independent work, entry/completion separation,
read-only boundaries and failed-check retention. H03 now renders the complete Q1
review with an absolute locator; H05 renders Q1/Q2 independently in one package;
H07 provides the bounded delta and pending prerequisite; H08 asks only the
unresolved scopes with clear IDs. Each includes both reply examples. Historical
responses and digests are retained separately before updated digests are pinned.

## Live qualification delta fixture

This section is review material for H07 only, not an actual execution grant or
product FSD. The fixture proposes a bounded synthetic-input experiment on a
user-selected disposable test VM, with a test-only native window; no production
account or customer data. Target VM/window and OS access are not supplied yet.
Prior offline prototype authority excludes new live OS effects. Recommendation:
agree with the bounded qualification scope, then supply VM/window identifiers
and access readiness before requesting any exact executable action. Consequence:
extra setup and security/access entry checks; staying offline leaves native proof
unresolved. Recovery: close the test window, revoke test access and restore the
disposable VM snapshot. Verify permission denial and synthetic success/failure,
binding evidence to revision/environment/steps/result. Product execution remains
blocked until the owning approved enabler and entry gates exist.

## Verification and limits

Baseline: `node --test .agent/tools/hitl-checkpoints.test.mjs
.agent/tools/grilling-sdlc-contracts.test.mjs` — 20/20 passed before edits.
The expanded reachability test failed on sc-audit before route updates; the source
pin check failed on changed guidance until response-content re-evaluation.
The new content grader initially rejected the valid short section name `Overview`;
section validation now checks nonempty text and actual heading existence.

Fresh final verification: 144 related tests passed, zero failures/skips. Content
inspection covers A01–A11 and H01–H12; unsafe state mutations and missing-display
controls were rejected. No `pass@3` or `pass^3` claim follows from authored fixtures or static
checks. Host loading, long-conversation state retention, dialog rendering and
actual provider/browser/UAT reliability remain unmeasured. No additional user
approval gate is introduced for framework verification.

| Check | Result |
| --- | --- |
| `node --test .agent/tools/hitl-checkpoints.test.mjs .agent/tools/questions-and-hints.test.mjs .agent/tools/grilling-sdlc-contracts.test.mjs .agent/tools/workflow-contracts.test.mjs` | 59/59 passed; full/compact reachability for all 18 routes |
| `node --test .agent/tools/setup.test.mjs .agent/tools/codex-install.test.mjs .agent/tools/token-benchmark.test.mjs .agent/tools/readiness-gate.test.mjs` | 65/65 passed; hashed distribution, six adapters, native skill discovery and gate regression |
| `npm run test:skills` | 20/20 passed; progressive reference digest updated after content review; same-owner grouping marker retained |
| `node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --repeat 1 --output .agent/benchmarks/questions-and-hints-20261005.json` | Every static gate passed; Antigravity 2,748/2,750, Codex 1,543/2,000, Claude 2,415/3,000, skill metadata 1,081/2,500 estimated tokens |
| `doc-lint.mjs <detailed changed docs> --advisory`; report also `--requires-hld` | No structural findings; nine detailed files plus report HLD checked |
| Changed Markdown link inspection | 63 relative links resolve; runtime response absolute paths and named sections independently checked by eval grader |
| `git diff --check` | Passed after EOF/newline normalization |

The first skills run caught the old reference digest and missing exact grouping
marker. The first budget run caught an overlong Antigravity rule (2,801 tokens)
and a disallowed output destination outside `.agent/benchmarks/`. The rule now
points to the central contract without duplicating its procedure, and the final
benchmark uses the allowed destination. Failed runs were retained in this report,
not counted as independent reliability attempts. Static benchmark detail is in
[the saved result](../../.agent/benchmarks/questions-and-hints-20261005.json).

Startup memory layout remains intact: AGENTS/CLAUDE unchanged, host-specific
rules untouched, long procedures in skills/contracts, public route names and
installation paths preserved. All changes are on `feat/questions-and-hints`;
pre-existing untracked work remains untouched. No commit or publishing performed.
