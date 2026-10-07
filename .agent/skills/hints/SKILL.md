---
name: hints
description: "Use when /sc-hints is invoked or the user clearly asks for consultation about a next step, engineering obstacle, or phase/context decision."
---

# Hints

## Overview

Recommend one practical next step from inspected evidence. Consultation is
read-only and does not grant implementation authority.

## When to Use

Load for an explicit `/sc-hints` call or clear consultation intent. Do not add
hints to every response. Clear execution, debugging, review and resume requests
select their owning workflow directly.

## Route

1. Use the question or active work context. If absent, show usage examples and
   ask what help is needed. Do not infer a project or create STATE.
2. Inspect targeted artifacts, code/tests and knowledge. Separate facts,
   assumptions and unknowns. Sources must be openable; verify cited sections.
3. For choosing an owner, authority gaps, light/full or FSD conflicts, load
   [route selection](references/route-selection.md).
4. For a concrete explanation or response shape, load
   [examples](references/examples.md).
5. For phase boundaries, continuation, handoff, subagents or compact, load
   [context-engineering](../context-engineering/SKILL.md) and only its relevant
   reference. Do not replicate thresholds or handoff procedures here.
6. Before human input or owner handoff use
   `../../context/checkpoint.contract.md`: prioritized actionable questions,
   stable IDs, all material blocks and complete ready/pending inventory,
   recommendations/consequences and verified review links/sections. Bulk replies
   resolve displayed items only. Keep standalone needs in expandable chat detail.

## Invariants

- No writes during standalone consultation: no STATE, reports, branches,
  product code, or tests/tools that generate files. The owning workflow records
  approved decisions and performs execution after an explicit execution request.
- “Setuju rekomendasinya” accepts advice only. Check existing authorization and
  remaining owner gates when asked to execute; do not reopen unchanged approvals.
- Give current condition, main recommendation, reason/consequences, sources,
  exact next command, prerequisites and expected result. Alternatives require
  a material trade-off. Insufficient facts require an evidence action, not invention.
- Advice cannot override approved FSD or verify unobserved tests/access.

## Integration

`sc-status` owns orientation/resume; `sc-geniusloop` owns improvement inventory;
`sc-explore`, `sc-prd` and `sc-plan` own their artifacts; `sc-research` owns
factual spikes; `sc-debug`, `sc-review` and `sc-work` own execution/review.
See [attribution](references/attribution.md) for the adapted routing pattern and
MIT notice. No persona or new agent is added.
