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

Search mechanically before creating a file:

```bash
node .agent/tools/knowledge-search.mjs "<symptom or root cause>" --dir docs/solutions
```

Score overlap with each hit on five dimensions: problem, root cause, solution,
files touched, prevention. High overlap (4-5 dimensions) means update the
existing record and set `last_updated:`; moderate overlap (2-3) means create a
new record and add a consolidation note in `Related`; otherwise create freely.
Two records describing the same problem will drift apart - prefer update.

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

## 3b. Ground the record

Run the mechanical validator before finishing:

```bash
node .agent/tools/validate-doc-claims.mjs docs/solutions/<category>/<file>.md
```

It flags missing cited paths, broken relative links, unknown commit SHAs, and
leftover drafting scaffold. Adjudicate every finding yourself; the tool never
edits the record. A claim that cannot be grounded gets rewritten or removed,
not left as-is.

## 4. Compound patterns

Add `Related` links in both directions. At 3+ similar records, create `docs/solutions/patterns/<pattern-name>.md` containing the common symptom, underlying cause, general solution pattern, and links to at least three examples.

## 5. Discoverability check

After writing, ask: would an agent without this skill find the store? If
`AGENTS.md` or `CLAUDE.md` does not point to `docs/solutions/` and
`node .agent/tools/knowledge-search.mjs`, propose the smallest one-line
addition. Knowledge that cannot be found does not compound.

Report the path created or updated and offer to continue, view it, or link related records.
