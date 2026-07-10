# Structure and Quality

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

## Pruning test

Every line must change behavior versus the default. Remove:

- no-ops: generic advice the model already follows;
- duplication: the same rule in several places;
- sediment: obsolete rules from prior versions;
- sprawl: branch-specific detail left in the router.

Prefer memorable, precise leading terms over repeated explanations. Use imperative language for genuine invariants, not theatrical emphasis. Avoid persuasion based on liking or reciprocity; it encourages sycophancy or manipulation.

## Release checklist

- Trigger-only `Use when...` description and intentional invocation mode
- Baseline failed without guidance (RED)
- Minimum guidance corrected the failure (GREEN)
- Demonstrated loopholes closed (REFACTOR)
- Red flags match observed rationalizations
- Relevant integration is explicit
- Router remains below 500 words; conditional detail is linked
- No-op, duplication, sediment, and unconditional reference loading removed
- Fresh tests verify behavior, links, and structural constraints
