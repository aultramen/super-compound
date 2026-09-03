# Project State
Last updated: 2026-09-03 12:00

## Current Position
- Workflow: none
- Active task: none
- Next action: run `/sc-status`; Wave 3, the 2026-09-02 prompt audit, and Wave 4 are uncommitted on the current branch and need an owner decision to commit
- Branch/workspace: feature/gap-enhancements-wave2

## Active Loop Run
- run_id: none
- run head digest: none
- non-authoritative status snapshot: none
- last evidence: none
- pause/terminal reason: none
- next transition: none

## Decisions
- 2026-08-06: Seeded durable memory layer (STATE, progress, sinks) from `.agent/templates/state/`; contract in `.agent/skills/state-management/references/file-contracts.md`.
- 2026-08-06: Adaptive learning stays auto-propose/human-approve; `/sc-evolve` writes DRAFT proposals only (constitutional guardrail preserved).
- 2026-09-02: Parallel streams keep strict worktree isolation; the shared-workspace wave contract is deferred.
- 2026-09-02: Global knowledge store is opt-in through `SC_GLOBAL_KNOWLEDGE_DIR`; no implicit default.
- 2026-09-02: A workspace-root `.claude/settings.json` (outside this repository) wires these hooks for sessions started from the parent workspace.
- 2026-09-03: Route benchmark gates are absolute after-token budgets (measured after + 40, re-adopted per deliberate contract change); the 90% ratio is reported only. UI readiness is binary via `readiness-gate.mjs`. Learning stays capture-automatic, apply-human. Per-host subagent models live in `.agent/context/agent-models.json`.

## Blockers
- none

## Completed Work
- 2026-08-06: Memory layer seeded; gap-analysis enhancement wave (CHANGELOG Unreleased).
- 2026-08-20: Cross-framework activation wave (CHANGELOG 2026-08-20).
- 2026-09-02: Wave 3 contract spine and truthful telemetry (CHANGELOG 2026-09-02; `docs/audits/2026-09-02-cross-framework-gap-analysis-wave3.md`). Evidence: `npm test`, `npm run test:python`, `npm run bench` 18/18, `npm run audit` PASS.
- 2026-09-03: Wave 4 (CHANGELOG Unreleased - Wave 4): absolute route budgets, `readiness-gate.mjs`, persistence and knowledge spine in all route contracts, per-host agent models, measured baseline in `docs/eval-results/2026-09-03-wave4-baseline.md`.

## Deferred Ideas
- Shared-workspace wave contract (compound-engineering CONCEPTS `Wave contract`).
- interface-design upstream refresh: pin 2026-07-10, upstream 11 commits ahead.
- Claude Code transcripts carry no `reasoning_tokens`, so `transcript-usage.mjs` reports UNMEASURED for that host; decide whether absence counts as measured-zero.


---
<!-- sc:last-compaction:start -->
## Last Compaction

**When:** 2026-09-02 10:59
**Note:** Context was compacted. STATE.md, .continue-here.md, and docs/ are preserved on disk.
**After compaction:** Run /sc-init reload, then /sc-status to restore context.
<!-- sc:last-compaction:end -->
