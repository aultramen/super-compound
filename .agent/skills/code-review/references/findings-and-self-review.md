# Findings and Self-Review

Load when turning review evidence into feedback or reviewing your own change.

## Severity

| Level | Meaning | Action |
|---|---|---|
| P1 Critical | Bug, exploitable security issue, data loss, broken architecture/contract | Must fix before merge |
| P2 Important | Material design, edge-case, reliability, or performance issue | Should fix; disposition explicitly |
| P3 Suggestion | Minor maintainability, naming, or style improvement | Optional |

## Finding Format

Each finding is one line: tight `file:line` location, then the violated requirement or invariant, concrete impact and trigger conditions, the evidence establishing it, and a focused fix.

Group findings by severity and related root cause; omit empty severity tiers. Do not inflate counts by splitting one issue across symptoms. Add a Strengths line only when it informs the merge decision. The verdict states the decision only and never restates findings. Include Residual Risk only when it is non-empty.

```markdown
## Review Summary
**Scope:** [diff/artifacts]
**Authority:** [spec, plan, or FSD governing the change]
**Verdict:** APPROVE / CHANGES REQUESTED / NEEDS DISCUSSION

### P1 Critical
1. `path/file.ts:42` — [issue, impact, evidence, fix]

### Residual Risk
- [untested/uninspected area, only when non-empty]
```

## Common Red Flags

Investigate empty catches, magic values, copy-paste, deep nesting, god functions/files, untracked TODO/FIXME, console output, disabled tests, business logic in transport/UI, wrong dependency direction, and missing callers or migrations.

## Self-Review

Inspect the full unstaged and staged diff, run the relevant tests, and ask whether the evidence would justify approval in someone else's PR. Never assume self-authorship lowers review rigor.
