# Modes and Exceptions

Load before choosing anything other than the default balanced test-first path.

## Modes

Read `tdd_mode` from the `SUPER-COMPOUND.md` project configuration.

| Mode | Rule |
|---|---|
| strict | Test-first for every production behavior; no exceptions without explicit user authority. |
| balanced | Test-first for features and bugfixes; documented non-behavior exceptions below. Default. |
| relaxed | Tests encouraged but not enforced for sandbox/prototyping work. |

## Balanced Non-Behavior Exceptions

Test-first is not required for pure configuration (JSON/YAML/env), static documentation/comments, generated/scaffolded output, or a throwaway prototype explicitly requested as such. If a configuration change controls runtime behavior and a deterministic test seam exists, prefer a test.

Exploration may precede TDD only when its output is discarded. Do not polish, retain, or adapt exploratory production code; restart from a failing test.

## Rationalization Counters

| Excuse | Reality |
|---|---|
| "Too simple" | Small behavior still regresses. |
| "Tests later" | Immediate green cannot prove detection. |
| "Just once" | Requires explicit user permission outside documented exceptions. |
| "TDD is slower" | Debugging unproven code is slower. |
| "Manual is faster" | Manual checks are not repeatable regression evidence. |

## Completion Checklist

- Every new behavior, and each new function/method carrying it, has a test at an appropriate seam.
- Each new test was observed RED for the expected reason.
- Minimal implementation made it GREEN.
- Relevant existing tests remain green with clean output.
- Specified edge and error cases are covered.
- Refactoring occurred only while green.

If an applicable item is unchecked, report incomplete TDD evidence; do not claim the behavior finished.
