# Token Budget Gates

Budgets use `.agent/tools/token-benchmark.mjs` with `deterministic_estimated_tokens_v1`.

| Scenario | Gate | Runtime rule |
|---|---:|---|
| legacy eager preload | <= 10% of baseline | regression-only anti-pattern; never describe it as real startup |
| Codex repository startup | <= 2,000 tokens | `AGENTS.md` only; task-specific assets stay on demand |
| Claude repository startup | <= 3,000 tokens | `CLAUDE.md`, its `AGENTS.md` import, and worst-case path rules |
| Antigravity always-on rules | <= 2,750 tokens | all `.agent/rules/*.md`; these cannot be routed away |
| Native skill discovery | <= 2,500 tokens | count repository skill `name` + `description`; bodies stay on demand |
| sc-init | <= 217 tokens | route contract first |
| sc-status | <= 274 tokens | route contract first |
| sc-geniusloop | <= 512 tokens | load route contract and scoped evidence before Brain |
| sc-explore | <= 806 tokens | route contract first |
| sc-research | <= 269 tokens | route contract first |
| sc-prd | <= 837 tokens | route contract first |
| sc-plan | <= 2,893 tokens | use route contract and skeletons before full skills/templates |
| sc-eval | <= 225 tokens | route contract first |
| sc-go | <= 599 tokens | use route contract and Git helper previews before full skill |
| sc-work | <= 1,207 tokens | load issue pointer, referenced FSD sections, target files, tests |
| sc-debug | <= 288 tokens | route contract first |
| sc-review | <= 261 tokens | route contract first |
| sc-audit | <= 335 tokens | route contract first |
| sc-compound | <= 266 tokens | route contract first |
| sc-evolve | <= 234 tokens | route contract first |
| sc-pause | <= 249 tokens | route contract first |
| sc-launch | <= 1,154 tokens | route contract first |
| sc-ui | <= 2,149 tokens | run interface search; never preload CSV data |
| artifacts | <= 10% of baseline | skeleton first, full section on demand |
| related hotspots | <= 10% of baseline | use compact skill/template/hook/agent/rule/workflow indexes |

A route gate is an absolute after-token budget over the route contract plus
`.codex/SKILL.md`: measured after-tokens plus 40 headroom, re-adopted whenever a
deliberate contract change lands (one number in `token-benchmark.mjs`). The
route's reduction against the frozen baseline is reported per run but does not
gate. If a route exceeds its budget, stop expanding context and switch to a
narrower artifact section, search result, or issue pointer. Do not remove
authority checks, OPEN detection, or verification mapping to reduce tokens.

Static measurements cover repository-owned files only. Parent/system/user instructions,
tool schemas, conversation history, and model-specific billing tokens require runtime
telemetry and must not be inferred from the legacy eager-preload reduction.

The benchmark's 18 x 3 matrix proves static route coverage: modeled context
entry, process wiring/authority, and output sink/budget/next owner. It does not
measure hidden reasoning or generated output. Runtime session totals are
collected locally at SessionEnd into a runtime usage log under `.agent/.compact-state/`
(`npm run usage`), counted once per `message.id`; per-route attribution comes
from the same log's `assetReads` histogram (Read and framework-tool Bash calls
on `.agent/` contracts, workflows, skills, and tools), the activation evidence
the static matrix cannot supply.

## Orchestrator Return Envelopes

The chat return carries the outcome, the artifact path, the verification result,
blockers or required decisions, and the next owner; `sc-review` and `sc-audit`
also return every P0/P1 finding. Full evidence lives in the route's artifact
(`docs/geniusloop/YYYY-MM-DD-<scope>.md`, `.agent/evals/<feature>.md`,
`docs/debug/YYYY-MM-DD-<slug>.md`, `docs/reviews/YYYY-MM-DD-<scope>.md`, or
`docs/audits/YYYY-MM-DD-<scope>.md` when no normal artifact exists) and follows
`.agent/context/output-style.md` plus the advisory caps in
`.agent/context/doc-budgets.json`. Expand inline only when the user asks for
detail; never omit blockers, failed gates, required decisions, or findings to
shorten a return. Subagents return the same items; detailed evidence stays on disk.
`.agent/context/output-budgets.json` is tooling configuration read by
`framework-audit.mjs` and `token-benchmark.mjs`, not a rule for the model;
session usage and the `assetReads` histogram are collected locally at
SessionEnd into the runtime usage log (`npm run usage` aggregates both).
