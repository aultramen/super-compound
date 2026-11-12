# Project State
Last updated: 2026-11-07

## Current Position
- Workflow: none
- Active task: Python manifest flake investigation; Needs Validation; cause UNKNOWN
- Next action: capture a native failure or recover original child diagnostics to prove the Python manifest cause; a fix is authorized if evidence justifies it; no commit or push requested
- Branch/workspace: feature/framework-gap-adoption-20261106

## Decisions
- 2026-08-06: Seeded durable memory layer (STATE, progress, sinks) from `.agent/templates/state/`; contract in `.agent/skills/state-management/references/file-contracts.md`.
- 2026-08-06: Adaptive learning stays auto-propose/human-approve; `/sc-evolve` writes DRAFT proposals only (constitutional guardrail preserved).
- 2026-09-02: Parallel streams keep strict worktree isolation; the shared-workspace wave contract is deferred.
- 2026-09-02: Global knowledge store is opt-in through `SC_GLOBAL_KNOWLEDGE_DIR`; no implicit default.
- 2026-09-02: A workspace-root `.claude/settings.json` (outside this repository) wires these hooks for sessions started from the parent workspace.
- 2026-09-03: Route benchmark gates are absolute after-token budgets (measured after + 40, re-adopted per deliberate contract change); the 90% ratio is reported only. UI readiness is binary via `readiness-gate.mjs`. Learning stays capture-automatic, apply-human. Per-host subagent models live in `.agent/context/agent-models.json`.

- 2026-09-20: Loop Runtime v2 removed from the repository (archive tag archive/loop-runtime-v2); the shipped OBSERVE mode forbade source writes and ENFORCE required WSL2 + ext4 + bwrap.
- 2026-09-20: Delivery tier is decided per request (`delivery_mode: auto`, triggers T1-T5); the UI-aware lifecycle applies only under T3 or `full`.
- 2026-09-20: Route token gates are the 10% ratio again with the Codex stub measured once at startup; `npm run audit` runs the benchmark first; audit fails on P0/P1 only.

## Blockers
- none

## Completed Work
- 2026-08-06: Memory layer seeded; gap-analysis enhancement wave (CHANGELOG Unreleased).
- 2026-08-20: Cross-framework activation wave (CHANGELOG 2026-08-20).
- 2026-09-02: Wave 3 contract spine and truthful telemetry (CHANGELOG 2026-09-02; `docs/audits/2026-09-02-cross-framework-gap-analysis-wave3.md`). Evidence: `npm test`, `npm run test:python`, `npm run bench` 18/18, `npm run audit` PASS.
- 2026-09-03: Wave 4 (CHANGELOG Unreleased - Wave 4): absolute route budgets, `readiness-gate.mjs`, persistence and knowledge spine in all route contracts, per-host agent models, measured baseline in `docs/eval-results/2026-09-03-wave4-baseline.md`.

- 2026-09-20: Simplify Wave (CHANGELOG 2026-09-20; `docs/audits/2026-09-20-simplify-wave.md`). Evidence: `npm test` 227 + 20 + hooks, `npm run test:python`, `npm run bench` 18/18, `npm run audit` PASS.
- 2026-11-06: [Framework adoption](eval-results/framework-adoption-20261106.md) and [R-01 interface catalog/RTL refresh](eval-results/interface-catalog-refresh-20261106.md). R-01 evidence: 35 refreshed CSVs, 106 preserved local cells, 96 Python tests, original 90-case relevance gates, 588/588 tool tests with concurrency 4, 28 skill tests, hooks and router checks, zero-finding audit. Default parallel failure and verification limits remain recorded in the report.
- 2026-11-06: [R-02 isolated design comparison](eval-results/design-comparison-20261106.md): optional existing-owner protocol, 47 related regression tests, 28 skill tests, two fresh-context candidates plus blind judge, six-test selected-result retest and rejected incompatible graft. Procedural isolation and unmeasured runtime/bias limits remain explicit.
- 2026-11-06: [R-03 real-artifact gate qualification](eval-results/real-artifact-gates-20261106.md): existing-owner procedure and intended-reason controls, DAG unsupported-blocker fix, real artifact outcomes bound to current bytes. Rejected legacy targets remain unqualified; final verification scope is recorded in the report.

- 2026-11-06 R-04 evidence: [MCP diagnostics](eval-results/mcp-diagnostics-20261106.md) extends existing integration/verification owners. Verification: 605/605 tools, 10/10 local MOCK cases, 8/8 manual guide cases and 28/28 skills. Modern runtime/OAuth provider certification and root-channel recovery are not claimed.

- 2026-11-06 R-05 evidence: [Skill maintenance and execution prechecks](eval-results/skill-maintenance-20261106.md): changed-skill inventory, provenance-protected pruning, selective fresh-builder ambiguity and verified no-edit/partial paths through existing owners. Five paths/four owners; final affected suite103/103, skills28/28; correct baseline parity, no model reliability claim. A seemingly duplicate search guard was retained after loading-boundary review.

- 2026-11-07 R-06 evidence: [Business evidence and statement fidelity](eval-results/business-evidence-20261107.md): underlying source origins, precise claim support and bidirectional correction/commitment fidelity through existing research/authoring owners. Manual controls15/15, current affected tests109/109 and skills28/28; baseline parity, no measured model improvement. Historical runtime/approval limits remain explicit.

- 2026-11-07 R-07: [Bounded formal checking](eval-results/bounded-formal-checking-20261107.md) through the existing verification owner, with a test-local Node pilot for `withLedgerLock`. Target model PASS: two actors x two calls, 1,625 states / 1,854 transitions / 304 terminals; intended mutant failures and four model-validated source-copy replay paths. Shortest abstract counterexamples were not exactly replayed; realizable same-violation witnesses are retained separately. Verification: 149 Node tests, 28 skill tests, Python router and syntax checks, six-host installation/doctor (49 byte checks, nine links) and three deterministic benchmark runs passed. Final acceptance receipts and limits are in the report; cross-process locking, filesystem durability and unbounded liveness are outside the pilot.

- 2026-11-07 R-08: [Requested and observed execution identity](eval-results/model-receipts-20261107.md) through the existing completion-inbox owner and additive metadata for existing Codex pilot/session-baseline eval receipts. Legacy requested `model`, inherit/overrides and 19 workflows preserved. Verification passed 75 related Node tests, 28 skill tests, syntax and configuration-only projection checks, isolated Codex/Claude installation/doctor (13 byte checks, five links), and three deterministic benchmark runs. Runtime/manual controls used MOCK evidence; baseline/guided decision parity is not a reliability gain. Live serving identity and effective capabilities remain unverified; final acceptance receipts and trust limits are in the report. No new provider/controller/parser/schema/gate.

- 2026-11-07 Final R-01 through R-08 review: [combined evidence](reviews/2026-11-07-r01-r08-final-review.md) records four resolved findings covering migration destinations, installed links, current status and Python diagnostics. Frozen verification passed 631/631 Node tool tests including installers, 28/28 skill tests, 99 Python tests and 90 frozen relevance cases; isolated installation/doctor covered 6 adapters, 130 byte comparisons and 111 link/anchor checks. Historical R-01 through R-08 results remain unchanged; the original manifest-flake cause remains unproved and its TODO stays open. Review the uncommitted diff; no commit or push requested.

## Investigation in Progress

- 2026-11-07: [Python manifest flake investigation](eval-results/python-manifest-flake-20261107.md) is Needs Validation, cause UNKNOWN. Current traced/bare default runs passed 631/631 each; 69 focused native comment cases passed. The partial 50-file reconstruction passed 595/595, and four observation controls passed. No native failure was reproduced; original child metadata remains missing. These passes do not prove a historical cause or justify a runtime fix. The existing TODO remains pending; historical completed-work entries stay unchanged.

## Deferred Ideas
- [Legacy plan gate inputs](todos/2026-11-06-legacy-plan-gate-inputs.md): factual N/A reason and unsupported issue blockers need owner review; no approved artifact was rewritten or target released.
- Local `.scratch/loop-*` runtime state is still on disk (gitignored); delete by hand.
- `threat-modeling/references/stride.md` names loop-runtime state files in one hash-pinned row.
- Shared-workspace wave contract (compound-engineering CONCEPTS `Wave contract`).
- [Python manifest fixture under the default parallel runner](todos/2026-11-06-python-manifest-parallel-fixture.md): one failed default run; isolated and complete concurrency-4 reruns passed. Root cause remains unproved.
- Claude Code transcripts carry no `reasoning_tokens`, so `transcript-usage.mjs` reports UNMEASURED for that host; decide whether absence counts as measured-zero.


---
<!-- sc:last-compaction:start -->
## Last Compaction

**When:** 2026-09-03 05:55
**Note:** Context was compacted. STATE.md, .continue-here.md, and docs/ are preserved on disk.
**After compaction:** Run /sc-init reload, then /sc-status to restore context.
<!-- sc:last-compaction:end -->
