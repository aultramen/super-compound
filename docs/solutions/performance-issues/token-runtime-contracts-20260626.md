---
date: 2026-06-26
category: performance-issues
severity: medium
tags: [agent-context, token-budget, super-compound, progressive-disclosure]
---

# Contract-First Runtime Loading for Super Compound

## Symptoms

Full framework and command-specific runtime loads pulled large skills, templates, hooks, agents, and interface-design CSV data into context. Comprehensive baseline evidence in `.agent/benchmarks/token-baseline.before.json` measured:

- full framework load: 516436 tokens
- `/sc-ui`: 374638 tokens
- generated BRD/PRD/FSD/issue surfaces: 98427 tokens
- interface-design CSV data: 353236 tokens
- full agentic templates: 95066 tokens

## Root Cause

The framework already had progressive-disclosure intent, but the runtime surface lacked compact first-hop artifacts. Agents could route by reading full workflows, full skills, full BRD/PRD/FSD/ADR templates, and raw interface-design CSV data before knowing which small section was actually needed.

## Solution

Add a contract-first layer:

- `.agent/context/routing-index.md` for command routing.
- `.agent/context/workflow-dispatch.md` for all-workflow dispatch.
- `.agent/context/rule-index.md` for compact startup rule loading.
- `.agent/context/workflows/*.contract.md` for compact workflow first hops.
- `.agent/context/skills/*.contract.md` and `.agent/context/skill-index.md` for skill-selection summaries.
- `.agent/context/template-index.md` plus `.agent/templates/agentic-delivery/skeletons/*.md` for artifact skeleton-first generation.
- `.agent/context/agent-index.md` and `.agent/context/hook-index.md` for related prompt/hook surfaces.
- `.agent/context/token-budget-gates.md` and `.agent/tools/token-benchmark.mjs` for repeatable measurement.
- Search-only interface-design guidance so agents run `scripts/search.py` instead of preloading CSV data.

## What Didn't Work

Relying on the existing workflow and skill descriptions alone was not enough; it preserved behavior but did not provide a measurable low-token runtime path. The tightest scenario was `/sc-work`, so it needed a route-specific contract instead of a large shared index on every execution.

## Prevention

- Add or update a compact contract when adding a public workflow.
- Keep issue files as qualified-reference pointers, not copied artifact prose.
- Keep large templates as section-on-demand references.
- Run:

```bash
node .agent/tools/token-benchmark.mjs --baseline .agent/benchmarks/token-baseline.before.json --require-reduction 90 --repeat 3
```

## Related

- `.agent/benchmarks/workflow-inventory.md`
- `.agent/benchmarks/hotspot-scan.md`
- `.agent/benchmarks/token-benchmark.after.json`
