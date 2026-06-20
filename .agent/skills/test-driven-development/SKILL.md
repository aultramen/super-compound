---
name: test-driven-development
description: "Use when implementing any feature or bugfix. Write the test first, watch it fail, write minimal code to pass. Adapts strictness based on project TDD mode."
---

# Test-Driven Development (TDD)

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Behavior principle:** Tests verify behavior through public interfaces, not implementation details. The interface is the test surface.

## TDD Modes

Check `tdd_mode` in SUPER-COMPOUND.md project config:

| Mode | Behavior | When |
|------|----------|------|
| **strict** | ALWAYS write test first, no exceptions | Production features, critical bugfixes |
| **balanced** | Test-first for features/bugfixes, relaxed for prototyping | Default — most projects |
| **relaxed** | Tests encouraged but not enforced | Prototyping, sandbox, throwaway code |

**Current mode defaults to `balanced` unless overridden.**

## The Iron Law (strict + balanced modes)

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? **Delete it. Start over.**

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

## Red-Green-Refactor Cycle

### RED — Write Failing Test

Write ONE minimal test showing what should happen.

**Requirements:**
- One behavior per test
- Clear, descriptive name
- Real code (no mocks unless unavoidable)
- Use the highest public interface that reaches the behavior
- Describe what the system does, not how internals collaborate

```
Good: test('rejects empty email', ...)  → Tests actual behavior
Bad:  test('test1', ...)                → Vague, meaningless name
```

### Anti-Pattern: Horizontal Slices

Do not write all tests first and then all implementation. That locks in imagined behavior before the code teaches you anything.

Correct loop:

```text
RED -> GREEN: one behavior
RED -> GREEN: next behavior
RED -> GREEN: next behavior
REFACTOR: only after green
```

Each test is a tracer bullet: a narrow path that proves one observable behavior.

### Verify RED — Watch It Fail

**MANDATORY. Never skip.**

Run the test and confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature is missing (not typos)

**Test passes immediately?** You're testing existing behavior. Fix the test.

### GREEN — Write Minimal Code

Write the **simplest code** to pass the test.

**Don't:**
- Add features beyond what the test requires
- Refactor other code
- "Improve" beyond the test

### Verify GREEN — Watch It Pass

**MANDATORY.**

Run the test and confirm:
- New test passes
- All other tests still pass
- Output is clean (no errors, warnings)

**Test fails?** Fix the code, not the test.

### REFACTOR — Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers
- Deepen shallow modules when tests reveal too much setup
- Move logic toward the interface or data that owns it
- Delete obsolete tests that only covered old shallow internals

**Keep tests green. Don't add behavior.**

### Repeat

Next failing test for next feature.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask for help. |
| Test too complicated | Design too complicated. Use `architecture-enforcement` to simplify the interface. |
| Must mock everything | Code too coupled. Mock only system boundaries; inject dependencies. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Just this once" | No exceptions without user's explicit permission. |
| "TDD slows me down" | TDD is faster than debugging. |
| "Manual test faster" | Manual doesn't prove edge cases. |
| "Need to explore first" | Fine. Throw away exploration, then start with TDD. |

## Testing Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Testing mock behavior** | Tests verify mocks return what you told them to, not real behavior | Test with real implementations; mock only external services |
| **Test-only methods** | Adding public methods only for testing exposes internals | Test through public API; if untestable, redesign the interface |
| **Incomplete mocks** | Mock returns hardcoded data, misses real error paths | Create realistic test fixtures; test error cases explicitly |
| **Testing implementation** | Tests break when refactoring even though behavior hasn't changed | Assert outcomes and behavior, not internal steps |
| **Gate function skipping** | Not running full verification before claiming "done" | Always run the full test command; partial verification proves nothing |

## Mocking Rule

Mock only at system boundaries: external APIs, time/randomness, file systems, and sometimes databases. Do not mock your own modules to force tests through a brittle internal shape.

Prefer local substitutes when they exist: test databases, in-memory adapters, local filesystems, fake clocks, and SDK-style adapters with specific operations.

## Red Flags — STOP and Start Over

- Code written before test
- Test passes immediately
- Can't explain why test failed
- Rationalizing "just this once"
- "I already manually tested it"

**All of these in strict/balanced mode mean: Delete code. Start over with TDD.**

## Balanced Mode Exceptions

In balanced mode, these are acceptable WITHOUT test-first:
- Pure configuration files (JSON, YAML, env)
- Static content (READMEs, docs, comments)
- Throwaway prototypes (user explicitly says "prototype")
- Generated/scaffolded code

**Everything else follows the Iron Law.**

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle. Test proves fix and prevents regression.

**Never fix bugs without a test** (in strict/balanced mode).

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output clean (no errors, warnings)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## Integration

**Used by:**
- **executing-plans** — Each task follows TDD cycle
- **systematic-debugging** — Phase 4 creates failing test

**This skill pairs with:**
- **verification-before-completion** — Verify tests actually pass before claiming done
- **architecture-enforcement** — Improve seams and interfaces when tests are hard to write
- **state-management** — Keep behavior names aligned with project language
