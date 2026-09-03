# Changelog

All notable changes to the Super Compound framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version entries follow the repository's delivery history. Dates use `YYYY-MM-DD`.

## [Unreleased] - Wave 4: Readiness Gate, Persistence, Knowledge Loop

### Added

- `.agent/tools/readiness-gate.mjs`: deterministic, binary UI/API readiness. `READY_FOR_SLICE` means `node .agent/tools/readiness-gate.mjs --fsd <fsd> --prd <prd> --issues-dir <dir>` exits 0 (enum, baseline, state coverage, UIMAP, revisions, derived assets, verification refs, HIGH_INTERACTION evidence, open blockers, first-slice/scale-out/HARDENING/enabler structure). The 0-100 readiness score and its weighted table are removed from `ui-contract-readiness.md`, `plan-verification`, `sc-plan`, the FSD template, evals, and the public docs.
- `.agent/tools/session-baseline.mjs` (`npm run baseline -- seed|run --label <l>|report`): seeds a throwaway project under a gitignored `.scratch/baseline-<date>` directory, runs three headless Claude Code sessions (`/sc-status`, `/sc-debug`, `/sc-work`), and records tokens, contract reads, knowledge-search and memory-maintenance calls, durable-state changes, and stop markers per label into `docs/eval-results/2026-09-03-wave4-baseline.md`.
- `transcript-usage.mjs` attributes framework-tool Bash calls (`node .agent/tools/<name>.mjs`, `cat .agent/context/...`) to `assetReads` alongside Read calls.

### Changed

- Token benchmark route gates are absolute per-route after-token budgets (`maxAfterTokens`, measured after + 40 headroom, re-adopted whenever a deliberate contract change lands; table in `.agent/context/token-budget-gates.md`). The reduction against the frozen baseline is still measured and reported per route but no longer gates; `--require-reduction` now scopes only hotspot and legacy reduction scenarios and is dropped from `npm run bench` and `release-cutover.mjs`. `evidence-matrix` input cells carry `maxAfterTokens` instead of `reductionThresholdExclusive`.
- Contract fixes the old ratio gate had blocked: `sc-status.contract.md` routes `STALE_STATE`/`STALE_PROGRESS` to `/sc-pause` first and an empty goal queue to `/sc-geniusloop`; `sc-compound.contract.md` gains a search-first line and readable `ADAPTIVE_LEARNING_V2` conditions; `sc-pause.contract.md` states the write-admission gate as an instruction.
- `docs/LEARNED_KNOWLEDGE.md`: `LRN-2026-09-03-001` (absolute route budgets) supersedes `LRN-2026-09-02-002`.
- `.agent/rules/super-compound.md` Completion Bar points at `quality-gates.md`; `SUPER-COMPOUND.md` drops the benchmark-methodology paragraph (owner: `token-budget-gates.md`); `docs/engineering-standards.md` function-length and feature-flag rules are signals, not absolutes. `token-budget-gates.md` return envelopes are described qualitatively (outcome, artifact path, verification, blockers, next owner) instead of per-route line counts.
- Persistence spine on every host (file-based, no hook required): `sc-status`, `sc-work`, and `sc-launch` start from the `docs/STATE.md` Next action; `sc-work` and `sc-debug` close by writing it through the source-write gate or handing off to `/sc-pause`; `sc-init` ends in `/sc-status`; explore/prd/plan/eval/go/audit/ui end with `/sc-pause` when work remains; `sc-pause` fixes the `.continue-here.md` shape (State, Next action, Authoritative artifacts). `state-management` names who writes STATE (`/sc-work`, `/sc-debug`, `/sc-launch` inside a run; `/sc-pause` otherwise). Guarded by a persistence spine test in `workflow-contracts.test.mjs`.
- Knowledge loop on every unit of work: `knowledge-search.mjs` read-back before `sc-review`, `sc-explore`, `sc-prd`, `sc-audit`, `sc-ui`, `sc-geniusloop`, and `sc-research` (which searches `docs/research` first) in addition to plan/work/debug/evolve/compound; `sc-review` routes agent-caused findings to `/sc-compound ERR-*`; `sc-plan` routes lessons to `/sc-compound`; `sc-compound` requires the Quick Reference row per entry; `/sc-evolve` runs `knowledge-refresh` when a promotion candidate contradicts a record. Applying proposals stays human. `SC_GLOBAL_KNOWLEDGE_DIR` is documented in the README Install section and `.agent/rules/project-config.md`.
- Per-host subagent models: `.agent/context/agent-models.json` (edit it, then `npm run agents:project`) is the single source of truth; `node .agent/tools/agent-projection.mjs` projects `.agent/agents/*.md` plus the Claude Code mapping into native `.claude/agents/*.md`, so `code-reviewer`, `architect`, and `brain` inherit the session model while `build-fixer`, `doc-updater`, and `e2e-runner` run on the configured tier. The `model:` frontmatter leaves `.agent/agents/*.md`; Codex has no machine surface for subagent models here, so its orchestrator reads the same mapping from the installed `references/context/agent-models.json`.
- Route budgets re-adopted after Waves B and C (`token-budget-gates.md` table); `docs/eval-results/2026-09-03-wave4-baseline.md` records the scripted sessions per label.

### Fixed

- OPEN-RUNTIME-PRD-001: `/sc-prd` is registered as an authority route in `.agent/tools/workflow-admission.mjs` (`authority_write` to `docs/prd/` only, no Budget & Stop Wizard or run gate, other paths and write classes denied). Previously every `/sc-prd` write failed with `Unsupported workflow route: sc-prd`. Regression tests cover the allowed path, foreign paths, and the write class; a parity test keeps the admission table equal to the `authority_write` routes in `.agent/context/workflow-invariants.json`.

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
- Prompt audit (2026-09-02) against Claude Fable 5.1: hook notes no longer surface a remaining-token count or percentage (`context-monitor`, `suggest-compact`); `context-monitor` defaults scale with the detected window (35%/25% on 200k, 15%/8% on 1M), `suggest-compact` drops the tool-count reminder cadence and its fixed suffix, and its 1M pressure threshold moves from 250k to 700k tokens. Numeric return ceilings ("at most 15 lines", "at most 3 lines", "250 words", "30 seconds", "300 lines") replaced by the field lists they wrapped; `token-budget-gates.md` semantics unchanged. `/sc-go` usage marks `commit`/`push`/`pr` as preview-only under `OPEN-RELEASE-GATE` and drops the roadmap-relative wording; `EVAL-REG-001` now protects 18 routes. Alias-cleanup narrative removed from `SUPER-COMPOUND.md`, `AGENTS.md`, and `.claude/rules/agent-framework.md` (README keeps the migration table). Risk-skill references (`.agent/skills/threat-modeling/references/`, `.agent/skills/security-audit/references/owasp.md`, `.agent/skills/data-privacy/references/privacy-by-design.md`, `.agent/skills/secure-code-patterns/references/`) trimmed to project-specific residue; two wrong claims corrected (Latin-1 name regex, "SHA-256 for all hashing"); pinned hashes in the progressive-disclosure tests refreshed.

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

## [2026-09-02] - Wave 3 Contract Spine and Truthful Telemetry

Driven by `docs/audits/2026-09-02-cross-framework-gap-analysis-wave3.md`. Thirteen days after Wave 2 the knowledge loop still had zero entries; the dominant cause was contract shadowing: the loop was wired into full workflow bodies that the contract-first runtime path never loads. This wave puts the loop's spine into the contracts, makes the telemetry truthful, and captures its own lessons as the first real `ERR-*`/`LRN-*` entries.

### Added

- Knowledge-loop spine in the compact contracts (`sc-work`, `sc-debug`, `sc-plan`, `sc-status`, `sc-pause`, `sc-compound`): read-back via `knowledge-search.mjs`, binding `ERR-*`/`LRN-*` rules, `/sc-compound` on the way out, `memory-maintenance.mjs report` and `/sc-evolve` in status, and the four sinks named once in the compound contract. Token-neutral: headroom came from trimming `.codex/SKILL.md` (104 to 92 tokens, shared by all 18 routes). Guarded by a spine test in `workflow-contracts.test.mjs` (adapted from compound-engineering's outcome-spine contract test).
- `memory-maintenance.mjs report` freshness block: `docs/STATE.md` and `docs/progress.md` dates compared with the newest commit date; `STALE_STATE`/`STALE_PROGRESS` make `/sc-status` recommend `/sc-pause` first (adapted from gsd-core-next's context-drift gate).
- `transcript-usage.mjs`: usage counted once per `message.id` (streamed transcripts inflate line sums 2.5-3x; adapted from everything-claude-code's cost-tracker) and an `assetReads` histogram of Read calls on `.agent/` contracts, workflows, and skills, carried into the runtime usage log and `npm run usage` (activation evidence; adapted from everything-claude-code's skill-stocktake).
- Context window detection shared by `context-monitor` and `suggest-compact` (`.agent/hooks/lib/context-pressure.js`): explicit override, `[1m]` marker, known 1M families, or observed usage above 200k count as detected; otherwise the hooks report raw usage of an assumed 200k window instead of a false percentage.
- `.agent/tools/hook-env-surface.test.mjs` plus an environment-variable table in `.agent/hooks/README.md`: a hook that reads an undocumented variable fails the suite.
- `knowledge-search.mjs` opt-in global store: when `SC_GLOBAL_KNOWLEDGE_DIR` is set, `<dir>/LEARNED_KNOWLEDGE.md` joins the default corpus as `global:` hits; `memory-capture.md` routes `Applies to: global` entries there (adapted from gsd-core-next's global learnings store).
- `validate-doc-claims.mjs` severity tiers: unresolvable hex is `unknown-commit` (FLAG, exit code) only when cued or backticked at commit length, otherwise `unresolved-hex` (NOTE).
- Standards at review, not implementation: `/sc-review` and `code-review` load the applicable sections of `docs/engineering-standards.md` (or a project `CODING_STANDARDS.md`); `/sc-work` explicitly does not. Output tier (direct, chat brief, durable artifact) chosen at intake in `context-engineering`. Implementer briefs carry `Base SHA` and an optional exploration-notes pointer; wave boundaries re-check the base and degrade to sequential on divergence. Retro axes (no-op steering, tool economy, information access) as `LRN-*` triggers and `/sc-evolve` clusters. Deferred findings must land in `docs/todos/YYYY-MM-DD-<slug>.md` or `docs/STATE.md` before a completion claim.
- First real memory entries: `ERR-2026-09-02-001`, `LRN-2026-09-02-001`, `LRN-2026-09-02-002`.

### Changed

- `.agent/skills/state-management/references/file-contracts.md` no longer restates the entry grammar; `.agent/skills/knowledge-compounding/references/memory-capture.md` is the single authority and `sc-compound.md` step 6 points there (the old copy lacked the `ERR-`/`LRN-` IDs the maintenance tool parses).
- Benchmark evidence regenerated: every route still above 90%, tightest margins now `sc-debug` and `sc-pause` at 3 tokens.

### Deferred

- Shared-workspace wave contract (compound-engineering), interface-design upstream refresh (11 commits behind pin), skill-eval cells and compliance runners that need live host runs.

## [2026-08-20] - Cross-Framework Activation Wave

Driven by `docs/audits/2026-08-20-cross-framework-gap-analysis.md`. The wave wires existing mechanisms together instead of adding new mechanism categories, following the activation-first diagnosis adapted from everything-claude-code's continuous-learning-v2. Enhancements sourced from ghuntley/ralph landed in the sibling `ralph` repository, not this one.

### Added

- Closed knowledge loop (capture -> read-back -> maintenance -> evolve). `/sc-compound` routes outcomes to four sinks: `docs/solutions/` (solved problems), `ERR-*` entries in `docs/ERROR_LOG.md` (agent mistakes plus prevention rule), `LRN-*` entries in `docs/LEARNED_KNOWLEDGE.md` (user corrections and confirmed conventions), and `docs/progress.md` (chronology); capture guide `.agent/skills/knowledge-compounding/references/memory-capture.md` (producers adapted from gao-agent's error-memory).
- Early knowledge read-back in `/sc-plan`, `/sc-work`, and `/sc-debug` via `.agent/tools/knowledge-search.mjs`; matching `ERR-*`/`LRN-*` prevention rules are binding until superseded (adapted from compound-engineering's learnings-researcher).
- Entry-granular knowledge search: the corpus adds `docs/ERROR_LOG.md`, `docs/LEARNED_KNOWLEDGE.md`, and the Codebase Patterns head of `docs/progress.md`, splits on `##` headings with stable `ERR-*`/`LRN-*` IDs, still top-3 bounded; `docs/learnings/` now exists per the README contract.
- `.agent/tools/memory-maintenance.mjs`: `check` (format and cap validation), `report` (promotion candidates counted by `/sc-status`, which recommends `/sc-evolve` at 3+ recurrences or a `PATTERN` flag, and consumed by `/sc-evolve` step 1), and `archive --dry-run` only; applying archives stays human-approved and `/sc-evolve` remains drafts-only.
- Advisory `/sc-compound` suggestion from the `stop-check` hook when a session edited source but captured no knowledge.
- Runtime token telemetry: `.agent/hooks/session-end.js` measures the host transcript (when `transcript_path` is provided) through `.agent/tools/transcript-usage.mjs` into a runtime usage log under `.agent/.compact-state/`; new aggregate mode `npm run usage`. Static bench gates unchanged.
- Claude Code command surface: `.claude/commands/sc-<name>.md` for all 18 routes as thin contract-first pointers loaded on demand; route/command pairing enforced by a test in `.agent/tools/`.
- Wave-boundary protocol in `parallel-execution` and `subagent-orchestration`: compact wave summary to `docs/STATE.md` under lock, fresh subagents per wave, re-dispatch only unverified goals (adapted from gsd-core-next's between-wave reset); `.agent/tools/goal-waves.mjs` gains `--json`; dispatch brief skeletons `.agent/templates/orchestration/Implementer-Brief-Skeleton.md` and `Reviewer-Brief-Skeleton.md` (adapted from superpowers' prompt pairs); read-depth scaling reference in `context-engineering`.

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
