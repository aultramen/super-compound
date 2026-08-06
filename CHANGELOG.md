# Changelog

All notable changes to the Super Compound framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version entries follow the repository's delivery history. Dates use `YYYY-MM-DD`.

## [Unreleased] - Gap-Analysis Enhancements

### Added

- New public workflow route `/sc-evolve` (route 18): clusters 3+ repeated Observed/Confirmed learnings from `docs/ERROR_LOG.md`, `docs/LEARNED_KNOWLEDGE.md`, and `docs/solutions/` into DRAFT framework proposals under `docs/proposals/` for explicit human approval. The route writes proposal drafts only and grants no implementation, source-write, Git, external-write, or release authority.
- Route enumerations, workflow invariants, output budgets, event/receipt/pattern schemas, benchmark scenarios, and the static evidence matrix updated consistently from 17 routes (51 cells) to 18 routes (54 cells).
- Seeded durable memory layer: `docs/STATE.md`, `docs/progress.md`, `.continue-here.md`, `docs/ERROR_LOG.md` and `docs/LEARNED_KNOWLEDGE.md` (IF-THEN prevention rules, confidence ladder, Quick Reference tables, archive-never-delete caps), evidence sinks `docs/geniusloop/`, `docs/research/`, `docs/debug/`, `docs/proposals/`, and canonical templates in `.agent/templates/state/`.
- Knowledge tooling: `.agent/tools/knowledge-search.mjs` (BM25 over `docs/solutions/` and `docs/learnings/`, top-3 bounded output), `.agent/tools/validate-doc-claims.mjs` (mechanical grounding validator), new `knowledge-refresh` skill (Keep/Update/Consolidate/Replace/Delete audit), dedupe-on-write and discoverability check in `knowledge-compounding`.
- Workflow tooling: `.agent/tools/goal-waves.mjs` (dependency-graph wave planner with `docs/STATE.md.lock` O_EXCL helpers) and `.agent/tools/verified-promise.mjs` (machine-checked completion predicate over the work-package ledger), wired into `/sc-work` and `parallel-execution`.
- Host wiring: `.claude/settings.json` (hooks active with `SC_DISABLED_HOOKS` kill switch), `.mcp.json` (Context7), `package.json` test/bench/audit scripts, CI workflow, POSIX installer `.codex/install-super-compound.sh` (parity with the PowerShell installer).
- `context-monitor` PostToolUse hook: agent-facing warnings at <=35% remaining context (wrap up) and <=25% (stop and save state), once per session per level.
- Subagent orchestration: 5-round fix loop with model escalation and round-5 adjudication circuit breaker, ledger grammar with post-compaction recovery rule, extraction/generation/ceiling model tiers (`references/orchestration-loop.md`), UI gates reference; phase-boundary decision tree in `context-engineering` (`references/phase-boundaries.md`).
- `compactLearningRecords`/`retrieveVerifiedPatterns` caps are now caller-configurable options (defaults unchanged at 8/3).

### Changed

- BRD, PRD, and ADR reusable templates translated from Indonesian to English (structure byte-identical).
- `.claude/rules/agent-framework.md` no longer claims workflow aliases are preserved; removed workflows are intentionally not aliases.
- `.gitignore` now ignores `.tmp/`.

## [Unreleased] - Loop Runtime v2

Work delivered on `feature/ui-aware-delivery` after the 2026-07-16 evidence refresh. Status: GOAL-001 through GOAL-018 verified; GOAL-019 pre-canary evidence complete with verdict `APPROVAL_REQUIRED`. The project runtime operates in `OBSERVE` mode; `ENFORCE` remains gated behind a live bounded-ENFORCE canary, host capability attestation, and an owner-approved mode transition.

### Added

- Loop Runtime v2 fail-closed execution boundary with `DISABLED`, `OBSERVE`, `ENFORCE`, and `HALTED` operating modes; machine authority lives in `.agent/context/project-config.json` (`project_config_v2`, contract `2.0.0`).
- Full authority package under versioned artifact contracts: `docs/brd/brd-loop-runtime-v2.md`, `docs/prd/prd-loop-runtime-v2.md`, `docs/fsd/fsd-loop-runtime-v2.md` (v1.1.0, 19-goal dependency DAG), and `docs/solutions/adr-0001-loop-run-controller-v2.md`.
- 19 strict JSON Schema 2020-12 contracts in `.agent/context/schemas/` covering run contracts, events, state, config, budgets, work packages, telemetry receipts, host capability, and adaptive-learning projections.
- 30 deterministic runtime tools in `.agent/tools/` with 39 matching test suites, including the Loop Run controller (`loop-run.mjs`), pure run model, schema validator, Budget & Stop Wizard (`budget-wizard.mjs`), migration (`migrate-loop-v2.mjs`), telemetry store, workflow admission, background execution, external-effect adapter, and release cutover verifier (`release-cutover.mjs`).
- Budget & Stop Wizard: human-confirmed `max_iterations` (required) plus optional runtime, no-progress, token, and cost caps before every protected `START`, `RESUME`, background claim, implementation write, and external mutation.
- GOAL-015 Adaptive Runtime Learning: bounded per-iteration learning intents, GeniusLoop outcome closure, and human-promoted verified patterns projected from the hash-linked event log (never a second lifecycle ledger).
- WSL2 host enforcement path: read-only sandboxed untrusted commands, single-use opaque source-write capabilities, CAS/fsync/atomic-replace write broker, and a 60-minute host capability evidence window.
- Runtime gating fields (`loopRuntimeRole`, `writeClasses`, `wizardPolicy`, `requiredOperationGate`, `loopStateAccess`) for all 17 public workflow routes in `.agent/context/workflow-invariants.json`.
- Public operating guide `docs/loop-runtime-v2.md` plus doc-conformance tests (`public-docs-loop-runtime.test.mjs`) that pin README, walkthrough, and guide claims to proven behavior.
- Release cutover verifier evidence: three clean-reset full-suite passes (501 tests each), 124 fault/recovery checks per attempt, paired OBSERVE traces for all 17 routes, 10 background pilots, 6 fake external fault points, and token benchmark reduction >= 90.05% (98.95% total).

### Changed

- `README.md`, `SUPER-COMPOUND.md`, `WALKTHROUGH.md`, `AGENTS.md`, `.agent/rules/`, and all 17 full/compact workflow contracts updated to bind the Loop Runtime v2 write gates and wizard policy.
- Project mode transitioned `DISABLED` -> `OBSERVE` by owner action after the pre-canary receipt (config_version 2, mode_version 1).
- FSD amended to v1.1.0 (`AMD-LER2-GOAL-015-001`): GOAL-015 expanded from post-run outcome compounding to bounded adaptive runtime learning; GOAL-001..014 evidence remains bound to the v1.0.0 digest.

### Fixed

- Fail-closed regression in `loop-run.mjs` `transitionMode()`: when a safety-halt recovery was denied after the candidate config had been written (for example `PROJECT_CONFIG_ATTESTATION_REQUIRED` or `OWNER_ATTESTATION_REQUIRED`), the mutated config stayed on disk with no audit record, and the documented owner retry with unchanged `--expected-digest`/`--expected-config-version` became permanently unusable. A denied recovery now restores the exact byte-for-byte pre-image through the same CAS-guarded atomic-replace path used by post-write validation failures, and the transition rethrows the original denial.
- Test-suite determinism: tests that asserted fresh-install `DISABLED` semantics or pinned config digests/versions against the live `.agent/context/project-config.json` now build self-contained canonical `DISABLED` fixtures, so the suite passes regardless of the owner's current runtime mode.
- Codex installer fault-injection test now appends `SUPER_COMPOUND_INSTALL_FAIL_AFTER_STAGE` to `WSLENV`, so the variable actually crosses the WSL-to-Windows boundary and the staged-update failure path is genuinely exercised on WSL2 hosts.
- `CHANGELOG.md` added to the framework audit's documentation class so the all-file audit stays 100% accounted.

### Security

- Fail-closed stop evaluation: safety/policy/corruption gates run before success or exhaustion checks; unknown token or cost attribution recorded as unknown, never zero.
- External write policy ships as `DENY`; ambiguous external outcomes become `UNKNOWN_OUTCOME` and are never automatically retried.
- No raw prompts, chain-of-thought, secrets, PII, or untrusted payloads persisted in run state or telemetry.

## [2026-07-16]

### Added

- UI-aware delivery gates: `ui_delivery_role` classification, UI contract readiness eval (`.agent/evals/ui-contract-readiness.md`), and `/sc-ui` integration with delivery evidence.

### Changed

- Framework evidence refreshed: token benchmarks and framework audit regenerated (`chore: refresh framework evidence`).

## [2026-07-10 - 2026-07-12] (PR #8, #9)

### Changed

- Framework context and delivery safeguards optimized: compact `.agent/context/` contracts became the first runtime layer with full workflows/skills/templates loaded on demand.
- Workflow contracts and evidence optimized for lower token cost without dropping gate coverage.

## [2026-06-26] (PR #5, #6, #7)

### Added

- `/sc-geniusloop` workflow for outcome-driven improvement loops.
- Git Workflow Operation: branch, worktree, commit, push, and Pull Request routing through `/sc-go` and `git-workflow-operation`.
- Contract-first token benchmarks (`.agent/tools/token-benchmark` suite with before/after evidence in `.agent/benchmarks/`).

## [2026-06-21 - 2026-06-22] (PR #1 - #4)

### Added

- Issue workflow parity and the agentic delivery path.

### Changed

- Framework surface simplified; all public workflow commands prefixed `sc-` (17-route public surface established).
- Agent surfaces hardened (`fix: harden super compound agent surfaces`).

## [2026-02-11 - 2026-03-16] Foundation

### Added

- Initial Super Compound framework: rules, workflows, agents, hooks, skills, and templates under `.agent/` for Antigravity IDE and Claude Code.
- Framework adoptions: GSD (2026-02-21), Ralph Wiggum (2026-02-21), everything-claude-code (2026-02-23), Context7 MCP integration (2026-03-05), superpowers 5 skill suite (2026-03-16).
- UI/UX Pro Max skill with data and scripts; `launch`, `brainstorm`, `plan`, and `work` workflows.
- Skills for writing plans, security, quality gates, code review, and tech stack compatibility checking.

### Changed

- `WALKTHROUGH.md` translated from Indonesian to English; installation standardized on Git cloning (2026-02-11).
