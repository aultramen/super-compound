# Workflow Token Inventory

Metric: `deterministic_estimated_tokens_v1` from `.agent/tools/token-benchmark.mjs`.
Before tokens are the full-load profile for each workflow. The formal required target baseline is stored in `token-baseline.before.json`; after tokens use the compact contract-first runtime path. The default benchmark suite now covers all 17 workflows plus related token-heavy surfaces.

## Measurements

| Workflow | Before | After | Reduction | Output | Smart-zone risk |
|---|---:|---:|---:|---|---|
| `/sc-init` | 5048 | 57 | 98.87% | stack summary / config suggestions | Low |
| `/sc-status` | 2060 | 114 | 94.47% | session dashboard / next route | Low |
| `/sc-geniusloop` | 4719 | 240 | 94.91% | filtered improvement ideas | Medium |
| `/sc-explore` | 32353 | 217 | 99.33% | BRD / BRD summary | Medium |
| `/sc-research` | 2282 | 54 | 97.63% | evidence-backed research summary | Low |
| `/sc-prd` | 23456 | 234 | 99.00% | PRD / acceptance criteria | Medium |
| `/sc-plan` | 59415 | 1433 | 97.59% | FSD + issue pointers | Low |
| `/sc-eval` | 1907 | 55 | 97.12% | eval criteria/report | Low |
| `/sc-go` | 6743 | 301 | 95.54% | Git preview + PR template | Low |
| `/sc-work` | 11886 | 530 | 95.54% | implementation + verification | Low |
| `/sc-debug` | 2333 | 83 | 96.44% | root cause + fix evidence | Low |
| `/sc-review` | 1986 | 76 | 96.17% | findings-first review | Low |
| `/sc-audit` | 11947 | 93 | 99.22% | severity-ranked audit findings | Medium |
| `/sc-compound` | 1896 | 53 | 97.20% | solution note | Low |
| `/sc-pause` | 1999 | 67 | 96.65% | `.continue-here.md` | Low |
| `/sc-launch` | 114829 | 571 | 99.50% | staged lifecycle artifacts | Medium |
| `/sc-ui` | 374829 | 1741 | 99.54% | UI changes/search evidence | Low |

## Related Hotspots

| Surface | Before | After | Reduction | Optimization |
|---|---:|---:|---:|---|
| full framework load | 520501 | 2012 | 99.61% | rule index, workflow dispatch, routing/skill/template/budget indexes |
| artifact output BRD/PRD/FSD/issue | 98427 | 1188 | 98.79% | skeleton-first artifact generation |
| all skills | 53489 | 483 | 99.10% | compact skill index |
| delivery/planning skills | 7795 | 74 | 99.05% | delivery-planning contract |
| execution/verification skills | 6897 | 58 | 99.16% | execution-verification contract |
| risk/audit skills | 11572 | 64 | 99.45% | risk-audit contract |
| full agentic templates | 95066 | 1188 | 98.75% | template index plus skeletons |
| git workflow | 6331 | 301 | 95.25% | git workflow contract |
| interface-design CSV data | 353236 | 151 | 99.96% | search-only interface-design contract |
| interface-design scripts | 19013 | 151 | 99.21% | search-only interface-design contract |
| hooks | 4559 | 97 | 97.87% | hook index |
| agent prompts | 5912 | 99 | 98.33% | agent prompt index |
| all workflows | 5938 | 141 | 97.63% | workflow dispatch |
| all rules | 2197 | 94 | 95.72% | rule index |

## Runtime Inventory

| Workflow | Before load profile | After load profile | Templates/data touched | Smart-zone preservation |
|---|---|---|---|---|
| `/sc-init` | project config, workflow, README, AGENTS | `sc-init.contract.md` | none | config gaps are reported, not guessed |
| `/sc-status` | workflow, `state-management`, `context-engineering` | `sc-status.contract.md` | state/handoff only if present | next route remains explicit |
| `/sc-geniusloop` | workflow, brainstorm/design/domain/subagent skills, Brain prompt | `sc-geniusloop.contract.md`, agent index | scoped benchmark, idea list, Brain matrix | ideation cannot bypass delivery authority |
| `/sc-explore` | workflow, delivery/brainstorm/domain/design/prototype skills, BRD template | `sc-explore.contract.md`, BRD skeleton | BRD skeleton, full sections on demand | `OPEN-*` blockers and BRD authority retained |
| `/sc-research` | workflow, docs/compat skills | `sc-research.contract.md` | official/current docs only when needed | evidence and rejected options retained |
| `/sc-prd` | workflow, delivery/PRD/domain/design skills, PRD template | `sc-prd.contract.md`, PRD skeleton | PRD skeleton, full sections on demand | PRD stays product-only, no internals invented |
| `/sc-plan` | workflow, delivery/planning/issue/triage/verification skills, FSD/ADR templates | workflow, plan contracts, FSD/ADR/issue skeletons | FSD, ADR optional, issue pointer skeletons | ADR applicability, FSD authority, OPEN stops retained |
| `/sc-eval` | workflow, eval skill | `sc-eval.contract.md` | eval definitions/results | pass/fail criteria remain measurable |
| `/sc-go` | workflow, git skill, PR template, helper | git workflow contracts | branch/worktree/commit/PR preview only | Git operations remain preview-first |
| `/sc-work` | rules, workflow, delivery/context/execution/TDD/verification/parallel/integration skills | work contracts, issue pointer skeleton | issue pointer and referenced FSD sections only | authority checks, TDD, verification retained |
| `/sc-debug` | workflow, systematic debugging skill | `sc-debug.contract.md` | failing evidence and regression test when practical | root-cause discipline retained |
| `/sc-review` | workflow, code-review skill | `sc-review.contract.md` | diff/spec context only | findings-first review retained |
| `/sc-audit` | workflow, security/compat/privacy/threat/secure-code skills | `sc-audit.contract.md` | manifests, config, hooks, prompts as needed | read-only severity-ranked audit retained |
| `/sc-compound` | workflow, knowledge skill | `sc-compound.contract.md` | `docs/solutions/<category>/` | evidence required before lessons |
| `/sc-pause` | workflow, state/context skills | `sc-pause.contract.md` | `.continue-here.md`, progress only when useful | handoff remains durable |
| `/sc-launch` | lifecycle workflows, core skills, templates | launch contract, routing/template indexes | staged artifacts, skeletons first | lifecycle order retained without deploy permission |
| `/sc-ui` | workflow, interface skill, scripts, all CSV data | workflow, UI contracts, interface skill | search results only, no CSV preload | design guidance remains data-backed by retrieval |
