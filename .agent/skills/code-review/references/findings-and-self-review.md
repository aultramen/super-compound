# Findings and Self-Review

## Summary

Use when turning review evidence into feedback or reviewing your own change. Record applicable coverage and verified findings before choosing a verdict.

## Severity

| Level | Meaning | Action |
|---|---|---|
| P1 Critical | Material runtime defect, exploitable security issue, data loss, broken public contract | Must fix before merge |
| P2 Important | Material design, edge-case, reliability, or performance issue | Should fix; disposition explicitly |
| P3 Suggestion | Minor maintainability, naming, or style improvement | Optional |

## Reviewer Economics

Default effort: low for mechanical changes, medium for behavior changes, high for complex or sensitive risks. Preserve explicit model and effort choices; otherwise inherit the session model. Do not bypass applicable SPEC, QUALITY, UI, or security gates.

Read the scope, authority, patch, and report once; reuse resident review evidence and checks. Use scheduler self-review for mechanical low-risk work; request an independent reviewer only when risk warrants it. No nested reviewer fanout. Expand reads or repeat tests only for a named material risk, changed evidence, or missing proof; record the reason and result in the existing review report. Required final acceptance and integration checks still run.

## Review Coverage

Select axes/lenses by scope and risk; mechanical work may use scheduler self-review. In the existing review report, record each applicable axis/lens, whether required, its outcome (`completed`, `failed`, or `skipped`), reason, and evidence reference. An inapplicable or optional lens may be skipped with a factual reason; this does not require every reviewer or lens on every task.

`completed` requires a substantive report of the assessed scope and result. An explicit completed report with zero findings is valid evidence; missing or empty reviewer output is not. Verify findings from completed reviews even when another lens fails.

A required lens that failed, lacks a result, or was skipped without an applicable factual `N/A` leaves review incomplete. Use `NEEDS DISCUSSION`, or `CHANGES REQUESTED` for demonstrated defects; do not claim `APPROVE` or clean coverage. Completed zero-finding reviews permit `APPROVE` only when all other applicable gates pass.

## Finding Format

Each finding explains problem, impact, evidence, and action; use as many sentences as needed. Include `file:line` location, then the violated requirement or invariant, concrete impact and trigger conditions, the evidence establishing it, and a focused fix.

Verify each alleged behavior against code and evidence before grouping by severity and related root cause; retain each finding's originating axis/lens and location. Similar descriptions alone do not establish the same defect. Omit empty severity tiers and do not inflate counts by splitting one issue across symptoms. Add a Strengths line only when it informs the merge decision. The verdict states the decision only and never restates findings. Include Residual Risk only when it is non-empty.

Persist opened findings in the existing `docs/reviews/YYYY-MM-DD-<scope>.md` report, using its existing bullet or table format. Assign a stable finding ID once, based on origin file/symbol and root cause; line offsets are location evidence, not identity. Reuse existing IDs and never renumber after sorting or moving lines.

For each finding, retain severity and rationale, owner, disposition (`open`, `resolved`, `dismissed`, or `deferred`), current revision, relevant source/authority identities, and verification evidence references/results. Resolution or dismissal requires evidence. Deferral needs the existing owner and durable sink; mandatory gate failures cannot become a passing verdict through deferral.

Carry forward unchanged adjudication only when relevant source, authority, evidence, and verification environment remain unchanged. Record the current revision and reuse rationale with a reference to prior proof. When those inputs changed, reassess affected findings under the same ID. Older findings without sufficient identity or proof require verification; preserve historical reports.

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
