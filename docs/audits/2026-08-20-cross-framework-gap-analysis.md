# Cross-Framework Gap Analysis — Super-Compound vs 9 Sibling Frameworks

- Date: 2026-08-20
- Scope: skills and workflows across `superpowers`, `compound-engineering`, `everything-claude-code`, `ui-ux-pro-max-skill`, `gsd-core-next`, `isms-public`, `gao-agent`, `mattpocock-skills-main`, `ralph` (all updated to upstream HEAD on 2026-08-20), compared against super-compound at commit `73ac871`.
- Target dimensions: workflow performance, token-consumption efficiency, persistent knowledge, adaptive learning.
- Method: parallel inventory agents per framework, two independent design passes (ambitious vs minimalist), synthesis grounded in file-level verification.

## Executive Summary

Super-compound is not missing mechanism categories. Every capability class found in the sibling frameworks (memory sinks, learning promotion, retrieval, wave orchestration, token budgets, telemetry) already exists here in some form. The dominant gap is **activation**: several mechanisms have readers, schemas, caps, and tests but no producer or trigger, so they have never fired in real use. The highest-leverage enhancements wire existing mechanisms together; only two genuinely new artifacts are justified (a memory-maintenance tool and a Claude Code command surface), and both stay off the startup token budget.

## Diagnosis: mechanisms that never fire (verified)

| Mechanism | State | Root cause |
|---|---|---|
| `docs/ERROR_LOG.md`, `docs/LEARNED_KNOWLEDGE.md` | zero entries ever | No workflow, skill step, or hook writes them. Only the format table (`.agent/skills/state-management/references/file-contracts.md`), a read in `.agent/skills/brainstorming/references/local-context.md`, and the reader `/sc-evolve` reference them. `/sc-compound` routes only to `docs/solutions/` + `docs/progress.md`. |
| `/sc-evolve` → `docs/proposals/` | empty | Trigger condition is "3+ accumulated entries" in the two files above — input that can never arrive from empty upstream files. Dead route by construction. |
| `docs/learnings/` | absent from disk | Referenced by `AGENTS.md` and hardcoded as a default search dir in `.agent/tools/knowledge-search.mjs`; the search tool degrades silently. |
| Compounding nudge | never reaches the agent | `session-end.js` prints `/sc-compound` suggestions to stderr at SessionEnd — after the model has stopped. |
| Runtime token telemetry | permanently `null` | `.agent/tools/transcript-usage.mjs` (complete, tested) is invoked by nothing; `project-config.json` has telemetry disabled; benchmark honestly records `runtimePass: null`. |
| Declared routing edges | not rendered | `workflow-invariants.json` declares `sc-compound` as `nextOwner` of `sc-work`/`sc-debug`, but `sc-work.md` prose contains no compound step. |

Contrast: sinks that are named as explicit workflow output steps (`docs/solutions/`, `docs/progress.md`) do have entries. The previous gap wave (2026-08-06) added mechanisms; two weeks later none had produced output. Adding more unwired mechanism repeats a falsified approach.

## Token budget reality (from `.agent/benchmarks/token-benchmark.after.json`)

- Antigravity always-on rules: 2,611 / 2,750 — **139 tokens headroom**.
- Claude startup: 2,542 / 3,000 — 458 tokens headroom.
- Tightest route contracts: `sc-review` 90.06% vs the 90.00% gate — ~1–2 token margin; `npm run bench` fails if that contract grows by a sentence.

Consequence: enhancements must live in on-demand files (workflow bodies, skill references, tools, commands), never in startup-resident text.

## Capability matrix (siblings, post-update)

| Repo | Skills/Cmds/Agents | Token efficiency | Persistent memory | Adaptive learning | Orchestration |
|---|---|---|---|---|---|
| superpowers | 14/0/0 | weak | none | none | strong (subagent-driven-development) |
| compound-engineering | 32/~1/40 | strong (new upstream wave: SKILL.md bodies cut 32–90%, references carry the rest) | strong (solutions/, CONCEPTS.md, ce-compound) | strong (ce-retune, ce-optimize) | strong (lfg) |
| everything-claude-code | 281/94/67 | strongest (context-budget, strategic-compact, config-gc) | strong (unified-memory, memory-persistence hooks) | strongest (continuous-learning-v2 instincts) | strongest (orch-*, multi-*) |
| ui-ux-pro-max | 7/~2/0 | strong (CSV data externalization) | none | none | none |
| gsd-core-next | 71/71/34 | strong (context guards, gsd-surface) | strongest (MemPalace KG, threads, predicate CONTEXT.md) | strong (extract-learnings, drift) | strongest (wave parallelization) |
| isms-public | 0 agentic (40 policy docs) | — | — | — | — |
| gao-agent | 381/19/0 | medium (memory-pruning rule) | strong (ACTIVE_TASK, AGENT_LOCK, ERROR_LOG, LEARNED_KNOWLEDGE) | strong (self-learning, error-memory) | medium |
| mattpocock-skills | 35/0/7 | medium (writing-for-agents) | medium (CONTEXT.md, ADRs) | none | medium (wayfinder) |
| ralph | 2/4/0 | strong (clean-context iterations) | medium (progress.txt, prd.json, specs/) | none | strong-narrow (bounded loop + quality gate) |

Post-update deltas worth noting:
- compound-engineering upstream just executed a large progressive-disclosure wave ("N% smaller SKILL.md, references carry the rest") — independent confirmation of the contract-first direction super-compound already uses.
- everything-claude-code fixed a bug in `continuous-learning-v2` warning "when the observer never survives a hook invocation" — their learning loop had the same never-fires failure class diagnosed here.
- mattpocock-skills standardized cross-skill invocation discipline and stopped skills calling user-invoked skills.

## Recommendations (ranked)

Adapt-first policy: adaptation of an existing super-compound artifact unless explicitly marked NEW.

### Wave A — activate the memory loop (P0)

- **E1 — Give ERROR_LOG/LEARNED_KNOWLEDGE producers** (adapt; source: gao-agent `error-memory.md` trigger table). Routing step in `sc-compound.md` across four sinks; third capture branch in `knowledge-compounding` (new reference file `memory-capture.md`); mandatory ERR capture in `sc-debug.md` when the bug came from an agent mistake; ERR/LRN capture in `sc-work.md` summary and `sc-pause.md`; agent-visible nudge via `stop-check.js`; mechanical evolve trigger in `sc-status.md` (count entries, 3+ recurrence → recommend `/sc-evolve`).
- **E2 — Read learning back at decision time** (adapt; source: compound-engineering `learnings-researcher`). `knowledge-search.mjs` query as an early step of `sc-plan`, `sc-work`, `sc-debug`; matching ERR/LRN prevention rules are binding until superseded.
- **E3 — Entry-granular retrieval + fix ghost dir** (adapt). `knowledge-search.mjs` corpus adds ERROR_LOG/LEARNED_KNOWLEDGE/progress Codebase Patterns with per-entry splitting and stable IDs; output stays top-3 bounded. Create `docs/learnings/` on disk.

### Wave B — measurement and maintenance (P1)

- **E4 — Wire runtime token telemetry** (adapt). `session-end.js` invokes `transcript-usage.mjs` when the host provides `transcript_path`, appending one JSONL line to a runtime usage log under `.agent/.compact-state/` (audit-invisible by design); `--report` aggregate mode; `npm run usage`. Route attribution deferred.
- **E6 — `memory-maintenance.mjs`** (NEW tool — justified: nothing parses the Quick Reference tables, enforces the 30/50-entry caps, or mechanically evaluates the 3+ recurrence promotion rule). Subcommands `check`, `report`, `archive --dry-run` only; applies remain human-approved. `/sc-evolve` step 1 runs `report`.

### Wave C — command surface (P1)

- **E5 — Claude Code command surface under `.claude/commands/`** (NEW surface — justified: no artifact exposes the 18 routes as Claude Code slash commands). 18 thin pointers (≤5 lines) to the paired contracts; on-demand load, zero startup-budget impact; pairing test 18 commands ⇄ 18 contracts ⇄ 18 workflows.

### Wave D — orchestration hygiene (P2)

- **E7 — Wave-boundary reset** (adapt; source: gsd-core-next between-wave reset; super-compound already owns `goal-waves.mjs`). Wave summary to `docs/STATE.md` under lock; fresh subagents per wave; re-dispatch only non-verified goals; `goal-waves.mjs --json`.
- **E8 — Dispatch brief skeletons** (adapt; source: superpowers implementer/reviewer prompt pairs). New orchestration skeleton templates under `.agent/templates/`, referenced from `subagent-orchestration`.
- **E9 — Read-depth scaling rules** (adapt; source: gsd-core-next context guards). New reference file `read-depth.md` under the `context-engineering` skill.
- **E12 — Worktree hygiene**. `git worktree prune` for stale `.sc-worktrees/` entries; preview-first prune line in `git-workflow-operation`.

### Import verdicts (rejected or already present)

| Candidate | Verdict | Reason |
|---|---|---|
| ECC instinct-based learning | already exists — activate | `LEARNED_KNOWLEDGE.md` already defines the confidence ladder (inferred/observed/confirmed), IF-THEN rules, PATTERN promotion at 3+. It has zero entries because nothing writes it (E1). |
| gsd MemPalace / knowledge graph | reject as bloat | `knowledge-search.mjs` (BM25, bounded) serves a corpus of 3 documents; a graph over 3 nodes is negative value. Revisit past ~50 solution records. |
| gsd wave parallelization | already exists | `goal-waves.mjs` + `parallel-execution` + `sc-work` step 10 mandate dependency waves; only the between-wave reset (E7) is new. |
| ECC context-budget audit skill | tooling exists — wire telemetry (E4) | `token-benchmark.mjs`, budget gates, `context-monitor.js` cover static and runtime sides; the missing piece is invocation, not a 37th skill. |
| gsd predicate CONTEXT.md | reject | Layered contracts + path-scoped rules already fill the role; a new always-loaded convention has no budget (139-token headroom). |
| ECC skill volume (281 skills) | reject | 2,500-token discovery cap ≈ 86 skills at ~29 tokens each; skill count is the metric the gates exist to suppress. |

### Hard cut-lines

1. No new `/sc-*` routes this wave (route 18 has never fired; a route costs 3 benchmark cells + schema/invariant/dispatch/docs fan-out across 10+ files).
2. No startup-resident text additions (`AGENTS.md`, `.agent/rules/`, tight contracts).
3. No touching loop runtime v2 OBSERVE→ENFORCE — five human-owned attestation gates (`docs/solutions/2026-08-06-loop-runtime-v2-cutover-status.md`).
4. No weakening auto-propose/human-approve (decision recorded 2026-08-06 in `docs/STATE.md`).
5. No second memory representation (vector/graph store) until the markdown store outgrows BM25.

### Deferred

- **E10 — generic cross-framework sync tool**: convention suffices (per-skill `UPSTREAM.json` where files are mirrored + CHANGELOG provenance lines).
- **E11 — loop runtime ENFORCE cutover**: operator work behind human gates; out of agent scope.

## Acceptance criterion for this wave

The loop is alive when: ERR/LRN entries accumulate during real sessions → `memory-maintenance.mjs report` flags a 3+ recurrence → `/sc-status` recommends `/sc-evolve` → `/sc-evolve` writes the first DRAFT into `docs/proposals/` → a human approves it. The first proposal file is the success metric. If Wave A produces no entries within a month of real use, the diagnosis was wrong and deeper redesign is justified — not before.
