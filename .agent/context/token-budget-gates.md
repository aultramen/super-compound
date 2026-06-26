# Token Budget Gates

Budgets use `.agent/tools/token-benchmark.mjs` with `deterministic_estimated_tokens_v1`.

| Scenario | Baseline gate | Runtime rule |
|---|---:|---|
| full-framework-load | <= 10% of baseline | load rules plus compact indexes |
| sc-geniusloop | <= 10% of baseline | load route contract and scoped evidence before Brain |
| sc-plan | <= 10% of baseline | use route contract and skeletons before full skills/templates |
| sc-go | <= 10% of baseline | use route contract and Git helper previews before full skill |
| sc-work | <= 10% of baseline | load issue pointer, referenced FSD sections, target files, tests |
| sc-ui | <= 10% of baseline | run interface search; never preload CSV data |
| artifacts | <= 10% of baseline | skeleton first, full section on demand |
| related hotspots | <= 10% of baseline | use compact skill/template/hook/agent/rule/workflow indexes |

If a route exceeds budget, stop expanding context and switch to a narrower artifact section, search result, or issue pointer. Do not remove authority checks, OPEN detection, or verification mapping to reduce tokens.
