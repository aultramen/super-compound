---
name: code-review
description: "Use when reviewing code changes for specification compliance, correctness, quality, security, and maintainability."
---

# Code Review

## Overview

Announce: "I'm using the code-review skill to review these changes."

Review in two distinct stages: first the contract, then implementation quality. Standards compliance cannot rescue the wrong behavior.

## When to Use

Use for external reviews, self-review before handoff, and `/sc-review`.

- Load [Spec Compliance](references/spec-compliance.md) first when a plan, issue, FSD, PRD, BRD, `CONTEXT.md`, acceptance criteria, or accepted ADR defines the change.
- Only after Stage 1 passes, load [Quality Axes](references/quality-axes.md) for the relevant code domains. Invoke deeper security/privacy skills when that branch applies.
- Load [Findings and Self-Review](references/findings-and-self-review.md) when classifying results, writing feedback, or reviewing your own diff.

## Two-Stage Gate

1. Understand intended behavior, scope, dependencies, and acceptance evidence.
2. **Stage 1 — Spec compliance:** verify every required behavior and boundary; detect omissions, invention, and scope creep.
3. If Stage 1 fails, **STOP**. Report gaps; do not spend time polishing out-of-contract code.
4. **Stage 2 — Code quality:** inspect correctness, design, architecture, security, performance, readability, and tests.
5. Verify each proposed finding against code and evidence.
6. Classify as `P1` critical, `P2` important, or `P3` suggestion.
7. Report actionable findings using `file:line`, impact, evidence, and a concrete correction. If no findings exist, say so and name residual testing risk.

Severity is driven by impact, not preference. Wrong dependency direction, exploitable security defects, data loss, and contract-breaking behavior are P1.

## Red Flags

| Thought | Required response |
|---|---|
| "The code looks clean" before reading the spec | Complete Stage 1 first. |
| "This extra behavior is useful" | Treat unapproved behavior as scope creep. |
| "Probably vulnerable/buggy" | Trace a concrete path and verify the finding. |
| "Style issue" labeled P1 | Reclassify by user/operational impact. |
| Generic advice without location | Give a tight line range and corrective action. |
| Empty catch, disabled test, debug output, wrong layer | Investigate specifically; do not overlook it. |

## Integration

- `executing-plans` feeds completed implementation into review.
- `/sc-review` orchestrates the full pipeline.
- `verification-before-completion` validates findings and the final verdict.
- `gap-closure` handles P1/P2 remediation.
- `security-audit`, `secure-code-patterns`, and `data-privacy` provide deep specialist review.
- `knowledge-compounding` captures recurring review lessons.
