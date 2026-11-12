# Structure and Quality

## Summary

Use this reference for skill metadata, structure, changed-skill maintenance and pruning. Preserve required behavior and verify changes through the skill's existing pressure tests.

## Frontmatter and invocation

```yaml
---
name: skill-name-with-hyphens
description: "Use when <observable triggering conditions>"
---
```

Names use letters, numbers, and hyphens. Descriptions are at most 1024 characters, use third person where applicable, and explain when to load the skill—not what steps it performs.

Choose model-invoked when the agent should discover the skill automatically or another skill depends on it. Choose user-invoked when only deliberate human activation is appropriate. If user-invoked choices proliferate, create a router rather than making every skill automatic.

## Body shape

1. Overview: behavioral principle in one or two sentences
2. When to Use: observable triggers and exclusions
3. Route or Process: decision points and branch links
4. Invariants: rules shared by every branch
5. Red Flags: tested rationalizations and counters
6. Integration: inputs, outputs, and neighboring skills

Keep the router compact. Put templates, long examples, and branch-only procedures in `references/`; link them at the decision that requires them.

## Changed-skill stocktake

Use this branch for changed-skill maintenance within the task's authorized scope.

1. Declare the repository and baseline (Git ref or captured state) or current diff being reviewed. Account for staged, unstaged and untracked task-owned changes; separate unrelated dirty work. Prove an empty diff against that declared comparison before reporting no changes.
2. Map every changed skill-owned `SKILL.md`, reference, script, data file and test to its owning skill, including deletions and renames with both old and new paths. Inspect directly affected skill, workflow, agent and compact-contract consumers; expand only for demonstrated overlap or contradiction.
3. In the existing evaluation/change report, record each skill path and changed members, disposition (`keep`, `improve`, `merge`, `retire`), concrete reason and evidence. Check scope, overlap and technical currency using the relevant checks here. Treat absent usage evidence as **unmeasured**, never as grounds to retire.

## Pruning test

Before cutting, search protecting tests, incidents/learnings, history and owning consumers for a rule's provenance. Identify the behavior or decision it protects and which model or harness needs it.

Retain required gates and timing, non-derivable WHY and model/harness insurance unless behavioral evidence proves an equivalent authorized successor owner or decider preserves them for affected consumers. Required gates remain mandatory under their existing authority; model discretion cannot replace their enforcement. Unknown provenance means retain the rule pending a behavior test, not permission to cut.

Every line must change behavior versus the relevant model/harness default. After the provenance check, remove demonstrated:

- no-ops: generic advice the model already follows;
- duplication: the same rule in several places;
- sediment: obsolete rules from prior versions;
- sprawl: branch-specific detail left in the router.

Prefer memorable, precise leading terms over repeated explanations. Use imperative language for genuine invariants, not theatrical emphasis. Avoid persuasion based on liking or reciprocity; it encourages sycophancy or manipulation.

Preserve applicable license notices, parser-required fields and anchors, historical records and raw evidence under the [output standard](../../../context/output-style.md#authoring-and-review). Record any successor and proving checks in the same report before removal.

## Release checklist

- Trigger-only `Use when...` description and intentional invocation mode
- Baseline failed without guidance (RED)
- Minimum guidance corrected the failure (GREEN)
- Demonstrated loopholes closed (REFACTOR)
- Red flags match observed rationalizations
- Relevant integration is explicit
- Router stays navigable; conditional detail is linked by relevance
- No-op, duplication, sediment, and unconditional reference loading removed
- Fresh tests verify behavior, links, and structural constraints
