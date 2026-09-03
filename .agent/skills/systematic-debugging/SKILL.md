---
name: systematic-debugging
description: "Use when encountering a bug, test failure, unexpected behavior, intermittent result, or error."
---

# Systematic Debugging

## Overview

Announce: "I'm using the systematic-debugging skill to diagnose this issue."

Find the root cause before changing production behavior. A fast, deterministic, red-capable reproduction is the primary debugging tool.

## When to Use

Use for every defect or unexplained failure, including flaky, environment-specific, multi-component, and performance-dependent symptoms.

- Start with [Investigation and Hypotheses](references/investigation-and-hypotheses.md). It covers reproduction, boundary tracing, evidence, and falsifiable hypotheses.
- After evidence confirms a cause, load [Fix and Regression](references/fix-and-regression.md) before implementing the failing test and root-cause fix.
- Load [Advanced Techniques](references/advanced-techniques.md) only for regression localization, deep upstream tracing, recurring defect classes, async waits, or 3+ unsuccessful fix attempts.

## Core Loop

Do not attempt a fix until Phase 1 has a reproducible symptom and evidence of where it originates; a fix without that is a guess.

1. Reproduce the exact symptom with one agent-runnable command or structured HITL check.
2. Read the complete error and inspect recent changes.
3. Trace inputs and outputs until correct data becomes incorrect.
4. Rank the candidate causes; each must make a falsifiable prediction.
5. Test one variable at a time. If the top three fail, revisit assumptions.
6. Write a failing test, implement the smallest root-cause fix, and prove RED-GREEN regression behavior.
7. Remove probes, rerun the original reproduction and relevant suite, then use `verification-before-completion`.

If reproduction is impossible, gather more data and report uncertainty.

## Red Flags

| Thought | Required response |
|---|---|
| "Let me try this quick fix" | Return to reproduction and boundary evidence. |
| "I know the cause" | State and test its prediction. |
| "I cannot reproduce it, but..." | Instrument or collect data; do not patch. |
| "A try/catch will handle it" | Explain and fix the originating invalid state. |
| "Another tweak might work" after repeated attempts | Stop after 3+ attempts and question architecture. |

## Integration

- `executing-plans` routes implementation failures here.
- `test-driven-development` governs the regression cycle.
- `verification-before-completion` gates the final fix claim.
- `architecture-enforcement` helps when no clean test seam exists.
- `knowledge-compounding` captures the confirmed cause and reusable solution.
