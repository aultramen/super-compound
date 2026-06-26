# Token Hotspot Scan

Metric: `deterministic_estimated_tokens_v1`.

The scan ranks framework surfaces that are expensive when preloaded. Each surface has a compact replacement and is included in the comprehensive 3x benchmark saved at `token-benchmark.after.json`.

| Surface | Before tokens | Compact after tokens | Reduction | Compact path |
|---|---:|---:|---:|---|
| interface-design CSV data | 353236 | 151 | 99.96% | `.agent/context/skills/interface-design.contract.md` |
| full agentic templates | 95066 | 1188 | 98.75% | `.agent/context/template-index.md`, skeletons |
| all skills | 53489 | 483 | 99.10% | `.agent/context/skill-index.md` |
| interface-design scripts | 19013 | 151 | 99.21% | `.agent/context/skills/interface-design.contract.md` |
| risk/audit skills | 11572 | 64 | 99.45% | `.agent/context/skills/risk-audit.contract.md` |
| delivery/planning skills | 7795 | 74 | 99.05% | `.agent/context/skills/delivery-planning.contract.md` |
| execution/verification skills | 6897 | 58 | 99.16% | `.agent/context/skills/execution-verification.contract.md` |
| agent prompts | 5912 | 99 | 98.33% | `.agent/context/agent-index.md` |
| hooks | 4559 | 97 | 97.87% | `.agent/context/hook-index.md` |
| all workflows | 5938 | 141 | 97.63% | `.agent/context/workflow-dispatch.md` |
| all rules | 2197 | 94 | 95.72% | `.agent/context/rule-index.md` |

## Rule

Do not delete capability to save tokens. Keep full skills, templates, hooks, agents, workflows, and data files in place, then route through compact contracts and load detailed files only on demand.
