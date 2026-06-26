# Workflow Token Inventory

Metric: `deterministic_estimated_tokens_v1` from `.agent/tools/token-benchmark.mjs`.  
Before tokens are the full-load profile for each workflow. The formal required target baseline is stored in `token-baseline.before.json`; after tokens use the compact contract-first runtime path. The default benchmark suite now covers all 15 workflows plus related token-heavy surfaces.

## Measurements

| Workflow | Before | After | Reduction | Output | Smart-zone risk |
|---|---:|---:|---:|---|---|
| `/sc-init` | 4490 | 57 | 98.73% | stack summary / config suggestions | Low |
| `/sc-status` | 2015 | 79 | 96.08% | session dashboard / next route | Low |
| `/sc-explore` | 32334 | 217 | 99.33% | BRD / BRD summary | Medium |
| `/sc-research` | 2263 | 54 | 97.61% | evidence-backed research summary | Low |
| `/sc-prd` | 23435 | 234 | 99.00% | PRD / acceptance criteria | Medium |
| `/sc-plan` | 59150 | 1373 | 97.68% | FSD + issue pointers | Low |
| `/sc-eval` | 1886 | 55 | 97.08% | eval criteria/report | Low |
| `/sc-work` | 11412 | 453 | 96.03% | implementation + verification | Low |
| `/sc-debug` | 2271 | 51 | 97.75% | root cause + fix evidence | Low |
| `/sc-review` | 1942 | 45 | 97.68% | findings-first review | Low |
| `/sc-audit` | 11903 | 65 | 99.45% | severity-ranked audit findings | Medium |
| `/sc-compound` | 1879 | 53 | 97.18% | solution note | Low |
| `/sc-pause` | 1980 | 59 | 97.02% | `.continue-here.md` | Low |
| `/sc-launch` | 112816 | 983 | 99.13% | staged lifecycle artifacts | Medium |
| `/sc-ui` | 374638 | 1700 | 99.55% | UI changes/search evidence | Low |

## Related Hotspots

| Surface | Before | After | Reduction | Optimization |
|---|---:|---:|---:|---|
| full framework load | 516436 | 1792 | 99.65% | rule index, workflow dispatch, routing/skill/template/budget indexes |
| artifact output BRD/PRD/FSD/issue | 98427 | 1150 | 98.83% | skeleton-first artifact generation |
| all skills | 52186 | 441 | 99.15% | compact skill index |
| delivery/planning skills | 7795 | 74 | 99.05% | delivery-planning contract |
| execution/verification skills | 6800 | 58 | 99.15% | execution-verification contract |
| risk/audit skills | 11572 | 64 | 99.45% | risk-audit contract |
| full agentic templates | 95066 | 1150 | 98.79% | template index plus skeletons |
| interface-design CSV data | 353236 | 151 | 99.96% | search-only interface-design contract |
| interface-design scripts | 19013 | 151 | 99.21% | search-only interface-design contract |
| hooks | 4559 | 97 | 97.87% | hook index |
| agent prompts | 5442 | 85 | 98.44% | agent prompt index |
| all workflows | 4022 | 129 | 96.79% | workflow dispatch |
| all rules | 1925 | 77 | 96.00% | rule index |

## Runtime Inventory

| Workflow | Before load profile | After load profile | Templates/data touched | Smart-zone preservation |
|---|---|---|---|---|
| `/sc-init` | project config, workflow, README, AGENTS | `sc-init.contract.md` | none | config gaps are reported, not guessed |
| `/sc-status` | workflow, `state-management`, `context-engineering` | `sc-status.contract.md` | state/handoff only if present | next route remains explicit |
| `/sc-explore` | workflow, delivery/brainstorm/domain/design/prototype skills, BRD template | `sc-explore.contract.md`, BRD skeleton | BRD skeleton, full sections on demand | `OPEN-*` blockers and BRD authority retained |
| `/sc-research` | workflow, docs/compat skills | `sc-research.contract.md` | official/current docs only when needed | evidence and rejected options retained |
| `/sc-prd` | workflow, delivery/PRD/domain/design skills, PRD template | `sc-prd.contract.md`, PRD skeleton | PRD skeleton, full sections on demand | PRD stays product-only, no internals invented |
| `/sc-plan` | workflow, delivery/planning/issue/triage/verification skills, FSD/ADR templates | workflow, plan contracts, FSD/ADR/issue skeletons | FSD, ADR optional, issue pointer skeletons | ADR applicability, FSD authority, OPEN stops retained |
| `/sc-eval` | workflow, eval skill | `sc-eval.contract.md` | eval definitions/results | pass/fail criteria remain measurable |
| `/sc-work` | rules, workflow, delivery/context/execution/TDD/verification/parallel/integration skills | work contracts, issue pointer skeleton | issue pointer and referenced FSD sections only | authority checks, TDD, verification retained |
| `/sc-debug` | workflow, systematic debugging skill | `sc-debug.contract.md` | failing evidence and regression test when practical | root-cause discipline retained |
| `/sc-review` | workflow, code-review skill | `sc-review.contract.md` | diff/spec context only | findings-first review retained |
| `/sc-audit` | workflow, security/compat/privacy/threat/secure-code skills | `sc-audit.contract.md` | manifests, config, hooks, prompts as needed | read-only severity-ranked audit retained |
| `/sc-compound` | workflow, knowledge skill | `sc-compound.contract.md` | `docs/solutions/<category>/` | evidence required before lessons |
| `/sc-pause` | workflow, state/context skills | `sc-pause.contract.md` | `.continue-here.md`, progress only when useful | handoff remains durable |
| `/sc-launch` | lifecycle workflows, core skills, templates | launch contract, routing/template indexes | staged artifacts, skeletons first | lifecycle order retained without deploy permission |
| `/sc-ui` | workflow, interface skill, scripts, all CSV data | workflow, UI contracts, interface skill | search results only, no CSV preload | design guidance remains data-backed by retrieval |
