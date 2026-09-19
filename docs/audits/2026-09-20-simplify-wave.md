# Simplify Wave - Loop Runtime v2 Removed, Adaptive Delivery Restored

- Date: 2026-09-20
- Scope: `super-compound/` at `f23deeb`; archive tag archive/loop-runtime-v2 (git tag) on that commit.
- Trigger: the owner reported that the workflow blocked ordinary work, that Windows and WSL users hit an ext4 lock, and that hardcoded budgets could not adapt.

## Diagnosis

| Signal | Measured |
|---|---|
| `.agent/tools` | 73,098 lines in 90 files; Loop Runtime v2 was 78% of non-test code and 30k lines of tests |
| Shipped runtime mode | `OBSERVE`, which the contracts read as "permits no source write" |
| Only permissive mode | `ENFORCE`: WSL2 kernel, native ext4 mount, root-owned `/usr/bin/bwrap`; never reached (GOAL-019 canary stayed `APPROVAL_REQUIRED` since 2026-07-16) |
| Windows/WSL failure | host probe read `/proc/self/mountinfo` on every config load; directory fsync tolerance keyed on `process.platform !== "linux"`, so WSL on `/mnt/c` threw from every atomic write and left owner locks that `reclaimStaleLock` could not rename away |
| `/sc-go` | `commit`, `push`, `pr` absent from `allowlisted_operations`; the contract returned `OPEN-RELEASE-GATE` for every mutation |
| `/sc-pause` | STATE write required an active run gate; pause exists for the state where no run is active |
| Enforcement reality | one advisory `PreToolUse` hook, `workflow-admission.mjs` without a CLI, `git-workflow.mjs` without a gate: every gate was prose the model either obeyed and blocked on, or ignored and paid tokens for |
| Budgets | 18 route budgets as source literals, re-adopted by hand; `BENCHMARK_EVIDENCE_STALE` after any one-token edit; audit failed on any P3; 100% class coverage made the audit unusable outside this repo |
| Original promise (2026-02-11) | "Discipline compounds", adaptive TDD, adaptive Git, "single trivial change: just do it directly"; the last clause had been deleted and never replaced |

## Decisions (owner, 2026-09-20)

1. Remove Loop Runtime v2 from the repository; keep the archive tag.
2. Let the framework decide the delivery tier per request instead of a static default.
3. Make maintainer gates adaptive.
4. Apply the UI-aware lifecycle only when the same tier rubric triggers it.

## Delivered

- Removed 84 runtime files, the runtime schemas, config, evals, and authority docs; `.agent/tools` is 15,970 lines in 38 files. `workflow-invariants.json` keeps quality invariants only.
- `file-state.mjs` is 194 lines: path confinement, bounded read, atomic write with best-effort directory fsync and a busy-rename fallback, CAS helper, CRLF-normalizing reader. No locks, no sandbox, no platform branches.
- All 18 contracts and workflows rewritten without runtime ceremony; a negative test guards against its return. `/sc-go` commits on preview plus confirmation; `/sc-pause` writes STATE freely.
- Delivery tiers: `delivery_mode: auto | light | full`, rubric T1-T5 in `workflow-integration.md`, tier line at intake, `ESCALATE: T<n>` mid-work, `detectScopeTriggers` warning in `/sc-go` previews and `/sc-review`.
- Gates: routes back on the 10% ratio gate with the Codex stub measured once at startup; `npm run audit` runs the benchmark first; audit fails on P0/P1 only and classifies unknown paths as `project`.
- Docs: README, SUPER-COMPOUND (Core Principles restored), AGENTS, WALKTHROUGH, rules, state-management, hooks README, CHANGELOG.

## Verification

`npm test` 227 tool tests, 20 skill tests, hook suite; `npm run test:python` 29 plus 1; `npm run bench` 18 of 18 routes above 90% (weakest 90.83%), startup budgets held; `npm run audit` PASS; `memory-maintenance check` ok; banned-term grep over live surfaces returns only folder-name false positives; no `bwrap`, `/proc/`, `ext4`, or lock primitive remains in tools or hooks.

## Acceptance

A `light` request reaches its first edit with zero confirmations and one tier line; a `full` request is routed by trigger, not by ceremony. The framework runs on WSL `/mnt/c` and native Windows because nothing in it locks, probes, or fsyncs directories as a requirement. If tier lines stop appearing in real sessions, the contract path needs instrumentation before any gate is added back.
