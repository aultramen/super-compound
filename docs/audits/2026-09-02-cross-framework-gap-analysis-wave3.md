# Cross-Framework Gap Analysis Wave 3 - Super-Compound vs Updated Siblings

- Date: 2026-09-02
- Scope: skills and workflows in compound-engineering (71 commits since 2026-08-20), everything-claude-code (171), gsd-core-next (202), ui-ux-pro-max-skill (20), mattpocock-skills-main (8); superpowers, gao-agent, ralph unchanged; isms-public non-agentic. Baseline: super-compound at the Wave 2 head (2026-08-20).
- Dimensions: workflow performance, token efficiency, persistent knowledge, adaptive learning.
- Method: three delta-scoped inventory agents, one measured contract-text design pass, file-level verification.

## Executive summary

Wave 2 wired the knowledge loop into the full workflow bodies. Thirteen days later the memory report still read zero entries. The dominant cause is contract shadowing: the runtime path is contract-first (`.claude/commands/` then `.agent/context/workflows/`; the full workflow loads only for a named uncovered detail), and 16 of 18 contracts contained none of knowledge-search, ERR-*, LRN-*, memory-maintenance, /sc-compound, or /sc-evolve. This wave puts the spine into the contracts token-neutrally, makes telemetry truthful, and writes the first entries itself.

## Diagnosis (verified 2026-09-02)

| Signal | Value |
|---|---|
| Memory entries | 0 ERR, 0 LRN, 5 solutions |
| Runtime usage log | absent; hooks scoped to this repo's `.claude/settings.json`, sessions ran from the workspace root |
| `docs/STATE.md`, `docs/progress.md` | last updated 2026-08-06; Wave 2 wrote neither |
| Contracts naming the loop | 2 of 18 |
| Tightest route margins | sc-compound 1 token, sc-review 1, sc-status 2, sc-pause 3 |
| Entry grammar | file-contracts.md lacked the ERR-/LRN- IDs the parser requires |
| transcript-usage.mjs | summed every streamed line; no message.id dedupe |
| context-monitor | assumed 200k for 1M models; warned at 13% real usage |

## Sibling deltas and verdicts

| Source | Mechanism | Verdict |
|---|---|---|
| compound-engineering | Outcome spine plus contract test; standards read at review; output contract chosen at intake; worktree snapshot fidelity; residual durable sink; validate-doc-claims FLAG/NOTE tiers | adapted (W3-01..02, W3-10..12, W3-14..15) |
| compound-engineering | Shared-workspace wave contract | deferred; owner kept strict worktree isolation |
| compound-engineering | Skill-eval cell, cross-model adversarial review, ce-optimize decision tool | deferred; need live host runs or a metric stream |
| everything-claude-code | cost-tracker message.id dedupe; skill-stocktake Read-usage counts; detected-vs-assumed context window; env-surface guard test | adapted (W3-06..09) |
| everything-claude-code | GateGuard fact-force, GAN harness, skill-comply, hook consent, install profiles | rejected; fail-closed gates and bounded discovery exist |
| gsd-core-next | Context-drift gate; global learnings store; between-wave base re-check | adapted (W3-04, W3-12, W3-18) |
| gsd-core-next | Predicate CONTEXT.md, MemPalace, STATE transaction module, exit-code registry, 19-host fixtures | rejected; cut-lines 2 and 5; file-state.mjs owns locking |
| mattpocock-skills | Retro axes (no-op steering, tool economy, information access); exploration notes shared across subagents | adapted (W3-12..13) |
| ui-ux-pro-max | Search relevance overhaul and curated data, 11 commits ahead of the interface-design pin from 2026-07-10 | deferred to a data-refresh wave |

## Delivered

- W3-01..02 Contract spine in sc-work, sc-debug, sc-plan, sc-status, sc-pause, and sc-compound, guarded by a spine test in `.agent/tools/workflow-contracts.test.mjs`. `.codex/SKILL.md` trimmed from 104 to 92 tokens, so every route gained 12. Post-change margins: sc-work 5, sc-debug 3, sc-pause 3, sc-compound 5, sc-status 6, sc-review 13; all 18 routes above 90%.
- W3-03 One entry grammar: memory-capture.md is authoritative; file-contracts.md points to it.
- W3-04 `memory-maintenance.mjs report` freshness block (STALE_STATE, STALE_PROGRESS); /sc-status routes to /sc-pause first. On the real tree it flagged both: state 2026-08-06 versus commit 2026-08-20.
- W3-05 First entries: ERR-2026-09-02-001, LRN-2026-09-02-001, LRN-2026-09-02-002.
- W3-06..07 transcript-usage.mjs counts usage once per message.id (this session: 211 of 241 usage lines were duplicates) and emits an assetReads histogram of Read calls on `.agent/` assets, carried into the usage log and `npm run usage`.
- W3-08 Shared window detection in `.agent/hooks/lib/context-pressure.js`; assumed windows report raw usage, not a percentage.
- W3-09 `.agent/tools/hook-env-surface.test.mjs` and the env table in `.agent/hooks/README.md`.
- W3-10..15 Standards at review only; output tier at intake; Base SHA and exploration pointer in implementer briefs; retro axes as LRN triggers and evolve clusters; deferred findings land in docs/todos or STATE; doc-claims severity tiers.
- W3-16 Workspace-root hook settings (outside this repository) so hooks fire in real sessions; confirmed live this wave.
- W3-18 Opt-in global store through SC_GLOBAL_KNOWLEDGE_DIR.

## Cut-lines (unchanged)

No new /sc-* route. No startup-resident text; contracts changed token-neutrally. Loop Runtime v2 modes untouched. Auto-propose/human-approve kept. No second memory representation.

## Acceptance

The loop is alive when entries accumulate during real sessions and /sc-status surfaces a promotion candidate or a freshness flag unprompted. Wave 3 wrote the first three entries and made failure observable: assetReads shows which contracts a session loaded, and freshness shows when durable state fell behind the commits. If thirty days of real use add no entries, the contract path itself needs instrumentation. Known gap: Claude Code transcripts carry no reasoning_tokens, so transcript-usage reports UNMEASURED for that host (Wave 4 decision).
