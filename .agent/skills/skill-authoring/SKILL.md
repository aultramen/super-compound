---
name: skill-authoring
description: "Use when creating, editing, or verifying a skill before deployment."
---

# Skill Authoring

Treat process documentation as code: create pressure tests, observe failure, teach the minimum behavior, then close demonstrated loopholes. Announce use before authoring.

## When to Use

Use for every new skill, behavioral change to an existing skill, invocation redesign, or pre-deployment verification. Do not assume a skill is clear because it reads clearly to its author.

## Route

- Before editing behavior, load [pressure testing](references/pressure-testing.md) and execute the RED → GREEN → REFACTOR loop.
- When designing metadata, invocation, body organization, pruning, or final quality, load [structure and quality](references/structure-and-quality.md).
- Load both only when creating a skill end to end.

## Invariants

- RED: run a realistic baseline scenario without the proposed guidance and capture exact decisions and rationalizations.
- GREEN: add the smallest instruction that corrects observed failures, then rerun the same scenario with the skill.
- REFACTOR: add counters only for loopholes actually exposed and rerun all pressure scenarios.
- Combine at least three pressure sources when testing discipline: time, sunk cost, authority, exhaustion, or “pragmatic” exception claims.
- The frontmatter description starts with `Use when` and states triggering conditions, not a workflow summary. Choose model- versus user-invocation deliberately.
- Keep most `SKILL.md` routers below 500 whitespace words. Move branch-specific detail behind explicit reference links and load only the selected branch.
- Preserve evidence of RED and GREEN; prose review alone is not verification.

## Red Flags

- “It is obviously clear,” “testing is overkill,” “we can test later,” or “this is too simple to fail.”
- Rules added for imagined problems, generic advice that changes no behavior, repeated policy, stale sediment, or references loaded unconditionally.
- A description that lets the agent infer the workflow without opening the skill.
- Pressure tests weakened until the existing text passes.

## Integration

Use before deploying any skill consumed by workflows, agents, or other skills. Pair with `test-driven-development` for the discipline and `verification-before-completion` for fresh final evidence. Feed recurring failures into `knowledge-compounding` only after the corrected behavior is proven.
