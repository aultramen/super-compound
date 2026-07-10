# Token Budget Gates

Budgets use `.agent/tools/token-benchmark.mjs` with `deterministic_estimated_tokens_v1`.

| Scenario | Baseline gate | Runtime rule |
|---|---:|---|
| legacy eager preload | <= 10% of baseline | regression-only anti-pattern; never describe it as real startup |
| Codex repository startup | <= 2,000 tokens | `AGENTS.md` only; task-specific assets stay on demand |
| Claude repository startup | <= 3,000 tokens | `CLAUDE.md`, its `AGENTS.md` import, and worst-case path rules |
| Antigravity always-on rules | <= 2,750 tokens | all `.agent/rules/*.md`; these cannot be routed away |
| Native skill discovery | <= 2,500 tokens | count repository skill `name` + `description`; bodies stay on demand |
| sc-geniusloop | <= 10% of baseline | load route contract and scoped evidence before Brain |
| sc-plan | <= 10% of baseline | use route contract and skeletons before full skills/templates |
| sc-go | <= 10% of baseline | use route contract and Git helper previews before full skill |
| sc-work | <= 10% of baseline | load issue pointer, referenced FSD sections, target files, tests |
| sc-ui | <= 10% of baseline | run interface search; never preload CSV data |
| artifacts | <= 10% of baseline | skeleton first, full section on demand |
| related hotspots | <= 10% of baseline | use compact skill/template/hook/agent/rule/workflow indexes |

If a route exceeds budget, stop expanding context and switch to a narrower artifact section, search result, or issue pointer. Do not remove authority checks, OPEN detection, or verification mapping to reduce tokens.

Static measurements cover repository-owned files only. Parent/system/user instructions,
tool schemas, conversation history, and model-specific billing tokens require runtime
telemetry and must not be inferred from the legacy eager-preload reduction.

## Orchestrator Return Envelopes

These caps apply to the short chat return, not the durable artifact or evidence file.
Expand inline only when the user explicitly requests detail. Never truncate blockers,
failed gates, P0/P1 findings, or required user decisions.

`.agent/context/output-budgets.json` is the machine-readable authority for estimated
token and character caps per route. The line counts below are presentation hints.
Static validation proves coverage and configuration only; actual per-route output
usage remains `unknown` until the host supplies attributable transcript telemetry.

| Routes | Default return cap |
|---|---:|
| `sc-init`, `sc-status`, `sc-research`, `sc-eval` | 10 lines |
| `sc-explore`, `sc-prd`, `sc-plan`, `sc-go`, `sc-work`, `sc-debug`, `sc-launch`, `sc-ui` | 12 lines |
| `sc-review`, `sc-audit` | 20 lines plus all P0/P1 findings |
| `sc-geniusloop` | 12 ranked ideas/lines |
| `sc-compound`, `sc-pause` | 8 lines |

Full reports belong in the route's named artifact. Subagents return only outcome,
artifact path, verification status, and blockers; detailed evidence stays on disk.
