# Project State
Last updated: 2026-09-20 18:00

## Current Position
- Workflow: none
- Active task: none
- Next action: run `/sc-status`; the Simplify Wave (Loop Runtime v2 removed, delivery tiers) is uncommitted on the current branch and needs an owner decision to commit
- Branch/workspace: fix/workflow-admission-registry (branch name predates the wave; the admission tool it named is removed)

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

## Deferred Ideas
- Local `.scratch/loop-*` runtime state is still on disk (gitignored); delete by hand.
- `threat-modeling/references/stride.md` names loop-runtime state files in one hash-pinned row.
- Shared-workspace wave contract (compound-engineering CONCEPTS `Wave contract`).
- interface-design upstream refresh: pin 2026-07-10, upstream 11 commits ahead.
- Claude Code transcripts carry no `reasoning_tokens`, so `transcript-usage.mjs` reports UNMEASURED for that host; decide whether absence counts as measured-zero.


---
<!-- sc:last-compaction:start -->
## Last Compaction

**When:** 2026-09-03 05:55
**Note:** Context was compacted. STATE.md, .continue-here.md, and docs/ are preserved on disk.
**After compaction:** Run /sc-init reload, then /sc-status to restore context.
<!-- sc:last-compaction:end -->
