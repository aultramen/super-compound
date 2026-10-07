---
name: test-driven-development
description: "Use when implementing a feature, behavior change, or bugfix that requires production code."
---

# Test-Driven Development

## Overview

Tests specify observable behavior through public interfaces. If a test never failed for the intended reason, it has not proved that it detects missing behavior.

## When to Use

Use before production implementation in strict or balanced mode; balanced is the default.

- For each behavior, load [RED-GREEN-REFACTOR](references/red-green-refactor.md) and complete one vertical tracer bullet before starting the next.
- If the test is difficult, mock-heavy, flaky, or coupled to internals, load [Test Design](references/test-design.md).
- If mode, exceptions, exploration, or completion eligibility is unclear, load [Modes and Exceptions](references/modes-and-exceptions.md) before writing code.

## Iron Law

```text
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Strict/balanced remain test-first. Preserve original RED/GREEN evidence when
adequate; do not repeat a sensitivity cycle already proved for the same behavior
and revision. If implementation already exists, preserve user work and scoped
results. Add behavioral tests and use a safe baseline or isolated fix toggle only
when original RED is missing or inadequate, then GREEN and relevant verification.
Record any sequencing deviation; never delete working code merely to recreate the sequence.

Core cycle:

1. **RED:** write one minimal behavioral test at the highest useful public seam.
2. Run it; confirm it fails, not errors, for the missing behavior.
3. **GREEN:** write only enough production code to pass.
4. Run the focused test and relevant existing tests; fix code, never weaken the requirement.
5. **REFACTOR:** improve design only while green; add no behavior.
6. Repeat for the next behavior.

Do not write all tests and then all implementation. Each RED-GREEN pair must cross the system vertically and teach the next interface decision.

## Red Flags

| Thought | Required response |
|---|---|
| "The test passes immediately" | Correct the test until it proves missing behavior. |
| "I manually tested it" | Manual checks do not replace RED. |
| "It is too simple" | Write the small test. |
| "I need the implementation as reference" | Preserve work and adequate original RED; use a baseline/toggle only if that proof is missing or inadequate. |
| "Everything must be mocked" | Improve the seam; mock only system boundaries. |
| "Prototype first" | Throw exploration away, then restart test-first. |

## Integration

- `executing-plans` applies this cycle per goal.
- `systematic-debugging` supplies reproducible regression cases.
- `architecture-enforcement` improves hard-to-test seams and module boundaries.
- `verification-before-completion` requires fresh RED/GREEN and suite evidence.
- `state-management` keeps behavior names aligned with durable project language.

- Verified lessons reuse checks before additive regressions: [prevention checks](../knowledge-compounding/references/prevention-checks.md).
