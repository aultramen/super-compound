# Findings and Self-Review

Load when turning review evidence into feedback or reviewing your own change.

## Severity

| Level | Meaning | Action |
|---|---|---|
| P1 Critical | Bug, exploitable security issue, data loss, broken architecture/contract | Must fix before merge |
| P2 Important | Material design, edge-case, reliability, or performance issue | Should fix; disposition explicitly |
| P3 Suggestion | Minor maintainability, naming, or style improvement | Optional |

## Finding Format

Each finding includes:

- tight `file:line` location,
- violated requirement or invariant,
- concrete failure/impact and conditions that trigger it,
- evidence or trace establishing it,
- focused corrective direction.

Group findings by severity and related root cause. Do not inflate counts by splitting one issue across symptoms. Lead with a brief, specific strengths section before issues, then present findings by severity without obscuring defects.

```markdown
## Review Summary
**Scope:** [diff/artifacts]
**Verdict:** APPROVE / CHANGES REQUESTED / NEEDS DISCUSSION

### Strengths
- [specific strength]

### P1 Critical
1. `path/file.ts:42` — [issue, impact, evidence, correction]

### P2 Important
...

### P3 Suggestions
...

### Residual Risk
- [untested/uninspected area]
```

## Common Red Flags

Investigate empty catches, magic values, copy-paste, deep nesting, god functions/files, untracked TODO/FIXME, console output, disabled tests, business logic in transport/UI, wrong dependency direction, and missing callers or migrations.

## Self-Review

Wait two minutes or switch context, read every changed line as another author, inspect the full unstaged and staged diff as applicable, run relevant tests, and ask whether the evidence would justify approval in someone else's PR. Never assume self-authorship lowers review rigor.
