# Grilling and SDLC adoption verification

Date: 2026-10-03. Source: current dirty worktree at revision
`337630cdd25883a907e2bc7501626828fffc0b40`. Existing local changes were retained;
no commit, push, deployment, new public workflow, or runtime product API was added.

## Delivered scope

| Plan requirement | Implemented owner / evidence |
|---|---|
| Whole frontier, recommendation/reason/trade-off, partial answers and correction descendants | [Brainstorming protocol](../../.agent/skills/brainstorming/references/questions-and-options.md), compact/full explore and clarifying skill callers |
| Facts before questions, independent progress, authority capture and read-only handling | Same protocol, capture/domain guidance; canonical BRD/PRD/FSD gates retained |
| Both-tier preflight and authority-preserving alternatives | [Execution preflight](../../.agent/skills/executing-plans/references/authority-and-workspace.md), compact/full work |
| Safe input/selection recovery and retry deduplication | Interface implementation reference and integration checking |
| Conditional actor/source, chronology, selection/truncation, language and output policy | [AI authoring reference](../../.agent/skills/prd-generator/references/ai-context-and-output.md), compact and full PRD/FSD |
| Existing browser sessions/harness, fresh checkpoints and evidence provenance | [Live verification](../../.agent/skills/verification-before-completion/references/live-verification.md), integration skill and E2E adapter |
| Provenance and license | Matt Pocock 1.2.3 exact local commit in protocol; adjacent MIT notice |
| Surface and budgets | Existing 18-route/adapter tests and separate token benchmark |

## Staged checks

- Baseline workflow/artifact/agent contracts: 41 passed.
- New structural RED: 4 failed, 1 passed before guidance edits.
- Stage 1: explore frontier test and all three pinned progressive-router tests passed.
- Stage 2: selected preflight/AI/router checks passed; 37 existing workflow,
  artifact and progressive-router checks passed before Stage 3.
- Stage 3/final: all five new contracts passed; final combined workflow,
  artifact, agent, command-surface and router checks: 51 passed. Documentation
  and new contracts: 13 passed. `rtk npm run test:python`: 31 Python tests and
  the progressive-router contract passed.
- Token benchmark: 37 scenarios, three deterministic runs, all gates passed.
  Separate output: `.agent/benchmarks/grilling-sdlc-token.after.json`.
  `/sc-work` remains above 90% reduction after prose compression; startup and
  artifact budgets remain unchanged. These are static estimates, not runtime
  billing or host behavior measurements.

## Actual behavioral evaluation

The same informed agent chose responses under deadline, sunk-cost and senior
pressure using the unchanged fixture. RED exposed one failure and one partial
failure. GREEN and final REFACTOR each passed nine scenario-response criteria.
The connected partial-answer/correction sequence leaves affected storage open,
without treating a recommendation as approval.

[RED](../../.agent/evals/grilling-sdlc-red.md),
[GREEN](../../.agent/evals/grilling-sdlc-green.md), and
[REFACTOR](../../.agent/evals/grilling-sdlc-refactor.md) link preserved JSON
responses and the shared hashed fixture. This non-blinded fixture evaluation
supports the recorded choices only; it does not prove statistical reliability,
live product mutations, authenticated browser flows, or probabilistic AI output.

## Full-suite and audit provenance

Initial `rtk npm test` in the original worktree reported 254/257 tool checks
passing. Two Codex hash failures came from editing source while its slow
installation test was running; the all-file audit read the preserved historical
benchmark and reported stale evidence. No assertions were weakened.

The audit tool reads `.agent/benchmarks/token-benchmark.after.json` directly.
To honor the requirement to preserve existing evidence, verification uses a
local temporary Git clone overlaid with the current tracked/untracked files.
Only in that copy, the new benchmark replaces the old benchmark input. The
separate identical benchmark output is omitted from the copy to avoid auditing
the same evidence twice. Source files and assertions are unchanged. Generated
reports are saved separately in the original worktree.

Stable-copy `rtk npm test` tool results: 256/257 passed, including every Codex
install/hash/drift test. The one failure was the audit spotting a report link to
the intentionally omitted duplicate benchmark sidecar. Changed that report
locator to plain text and reran the entire audit test file: 11/11 passed,
including the all-file audit assertion, with zero audit findings. No runtime or
instruction code changed during this correction; no suite assertion was skipped.
`rtk npm run test:skills`: 20/20 passed. `rtk npm run test:hooks`: passed.
Thus every tool/skill/hook check has passing evidence, but the full chained
`npm test` invocation itself exited 1 before the audit-only correction.
Final stable-copy audit: PASS, zero findings; all 431 manifest entries accounted
(430 byte-read, one generated-output exclusion). Run and verify command:

```text
cd /tmp/sc-grilling-final-8jd_4gxv/repo
rtk node .agent/tools/framework-audit.mjs --output .agent/benchmarks/framework-audit.after.json
rtk node .agent/tools/framework-audit.mjs --verify-existing .agent/benchmarks/framework-audit.after.json
```

The saved separate audit describes that verification copy, not the original
worktree with historical benchmark input. All 351 canonical runtime assets
across context/workflows/skills/templates/rules/agents/evals/hooks/tools match
source bytes. Their sorted path/SHA-256 fingerprint is
`e7785ed8ed5cda62983d34bc33960df528ebbe12abdcb805c23bdbb6bca483a5`.
The original historical benchmark/audit remain untouched and therefore are not
fresh evidence for this change. Running the default audit there will continue
to identify their staleness until their owner refreshes them.
