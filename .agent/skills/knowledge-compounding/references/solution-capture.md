# Solution Capture

Use this branch only after a non-trivial problem is demonstrably solved.

## 1. Gather evidence

Required:

- Problem and exact error text
- Observable symptoms
- Technical root cause: why it happened
- Proven solution: code or configuration that fixed it
- Prevention: checks, validation, or patterns that avoid recurrence

Include failed investigations, environment versions, and file/line locations when they improve reproducibility.

## 2. Search and classify

Search `docs/solutions/**/*.md` for the symptom, error, component, and root cause before creating a file. If a match has the same cause, update or cross-reference it. Create a separate record only when the cause differs.

Choose the closest category:

| Category | Directory |
| --- | --- |
| Build | `build-errors/` |
| Tests | `test-failures/` |
| Runtime | `runtime-errors/` |
| Performance | `performance-issues/` |
| Database | `database-issues/` |
| Security | `security-issues/` |
| UI | `ui-bugs/` |
| Integration | `integration-issues/` |
| Logic | `logic-errors/` |
| Configuration | `config-issues/` |

## 3. Write the record

Path: `docs/solutions/<category>/<sanitized-symptom>-<YYYYMMDD>.md`

```markdown
---
date: YYYY-MM-DD
category: <category>
severity: critical|high|medium|low
tags: [tag1, tag2]
---

# <Problem Title>

## Symptoms
<Exact errors and observed behavior>

## Root Cause
<Technical explanation of why>

## Solution
<Verified code or configuration changes; before/after examples when useful>

## What Didn't Work
<Failed attempts and why>

## Prevention
<Checks or reusable guidance>

## Related
<Bidirectional links to related records>
```

Good records are specific, searchable, reproducible, and explanatory. Never include credentials or real customer data.

## 4. Compound patterns

Add `Related` links in both directions. At 3+ similar records, create `docs/solutions/patterns/<pattern-name>.md` containing the common symptom, underlying cause, general solution pattern, and links to at least three examples.

Report the path created or updated and offer to continue, view it, or link related records.
