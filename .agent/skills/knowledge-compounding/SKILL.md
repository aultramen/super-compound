---
name: knowledge-compounding
description: "Use after solving a non-trivial problem. Captures the solution as structured documentation in docs/solutions/ for future reference."
---

# Knowledge Compounding

## Overview

Every non-trivial problem you solve should benefit your future self and all future sessions. This skill captures solutions as searchable documentation.

**Announce:** "I'm using the knowledge-compounding skill to document this solution."

**Core principle:** "Each unit of engineering work should make subsequent units of work easier — not harder."

## Activation Triggers

### Auto-Detect Confirmation Phrases
- "that worked", "it's fixed", "working now"
- "problem solved", "that did it"
- After solving a debugging session
- After implementing a workaround for a tricky issue

### Skip Documentation For
- Simple typos or syntax errors
- Obvious fixes immediately corrected
- Trivial configuration changes
- Things that wouldn't help future sessions

### Document When
- Multiple investigation attempts were needed
- Root cause was non-obvious
- Future sessions would benefit from this knowledge
- Solution involves a pattern that could recur

## The Process

### Step 1: Gather Context

Extract from the current conversation:

**Required:**
- **Problem:** What went wrong (exact error messages)
- **Symptoms:** Observable behavior
- **Root Cause:** Technical explanation of WHY
- **Solution:** What fixed it (code/config changes)
- **Prevention:** How to avoid in future

**Optional but valuable:**
- Failed investigation attempts (what didn't work)
- Environment details (versions, OS, config)
- Related files and line numbers

### Step 2: Check Existing Docs

Search for similar documented issues:

```
docs/solutions/**/*.md
```

**If similar issue found:**
- Cross-reference the existing doc
- Only create new doc if root cause is different

### Step 3: Classify the Problem

**Categories:**

| Category | Directory | Examples |
|----------|-----------|----------|
| Build errors | `build-errors/` | Compilation, bundling, dependency issues |
| Test failures | `test-failures/` | Flaky tests, setup issues, assertion errors |
| Runtime errors | `runtime-errors/` | Crashes, exceptions, undefined behavior |
| Performance | `performance-issues/` | Slow queries, memory leaks, N+1 |
| Database | `database-issues/` | Migrations, schema, connection problems |
| Security | `security-issues/` | Vulnerabilities, auth issues, CORS |
| UI/Frontend | `ui-bugs/` | Layout, rendering, interaction bugs |
| Integration | `integration-issues/` | API, third-party service, protocol mismatches |
| Logic errors | `logic-errors/` | Wrong behavior, incorrect calculations |
| Configuration | `config-issues/` | Environment, settings, deployment config |

### Step 4: Create Documentation

**Filename format:** `<sanitized-symptom>-<YYYYMMDD>.md`

**File location:** `docs/solutions/<category>/<filename>.md`

**Template:**

```markdown
---
date: YYYY-MM-DD
category: <category>
severity: critical|high|medium|low
tags: [tag1, tag2, tag3]
---

# <Problem Title>

## Symptoms
<What you observed — exact error messages, behavior>

## Root Cause
<Technical explanation of WHY this happened>

## Solution
<What fixed it — code changes, config changes>

## What Didn't Work
<Investigation attempts that failed and why>

## Prevention
<How to avoid this in future — checks, patterns, validations>

## Related
<Links to related solution docs, if any>
```

### Step 5: Cross-Reference

If related issues exist:
- Add "Related" links to both documents
- If 3+ similar issues exist, consider creating a pattern entry

### Step 6: Present Summary

```
✓ Solution documented

File created:
• docs/solutions/<category>/<filename>.md

What next?
1. Continue working (recommended)
2. View the documentation
3. Link related issues
4. Other
```

## Pattern Detection

When you find 3+ similar issues in `docs/solutions/`:

```markdown
# Common Pattern: <Pattern Name>

**Symptom:** <Common observable behavior>
**Root Cause:** <Underlying reason>
**Solution Pattern:** <General approach>

**Examples:**
- [Link to doc 1]
- [Link to doc 2]
- [Link to doc 3]
```

Save to: `docs/solutions/patterns/<pattern-name>.md`

## Quality Guidelines

**Good documentation has:**
- ✅ Exact error messages (copy-paste from output)
- ✅ Specific file:line references
- ✅ Observable symptoms (not interpretations)
- ✅ Failed attempts documented
- ✅ Technical explanation (not just "what" but "why")
- ✅ Code examples (before/after)
- ✅ Prevention guidance

**Bad documentation has:**
- ❌ Vague descriptions ("something was wrong")
- ❌ Missing technical details ("fixed the code")
- ❌ No context (which version? which file?)
- ❌ Just code dumps without explanation
- ❌ No prevention guidance

## Session Progress Log

Beyond per-problem solution docs, maintain an **append-only session log** for cumulative project knowledge.

### File: `docs/progress.md`

This file is the project's long-term memory. It accumulates learnings across all work sessions.

### Structure

```markdown
## Codebase Patterns
<!-- Consolidated reusable patterns — kept at the TOP -->
<!-- Add only general, reusable patterns, not session-specific details -->
- [Pattern]: [Description]
- [Pattern]: [Description]

---

## [YYYY-MM-DD HH:MM] - [Task/Feature Name]
- **What was done:** [Summary of work]
- **Files changed:** [List of key files]
- **Learnings for future sessions:**
  - [Pattern discovered, gotcha encountered, useful context]
---
```

### Rules

| Rule | Why |
|------|-----|
| **Always append** — never replace existing entries | Preserves timeline and context |
| **Consolidate patterns at the TOP** | Makes reusable knowledge instantly accessible |
| **Include learnings** in every entry | Future sessions avoid repeating mistakes |
| **Read Codebase Patterns first** before starting work | Re-use existing knowledge before discovering it again |

### When to Append

- After completing a work session (before `/pause`)
- After solving a debugging session
- After implementing a significant feature
- After discovering a non-obvious codebase convention

### Pattern Consolidation

When you notice a recurring pattern across 2+ session entries:

1. Add it to the `## Codebase Patterns` section at the top
2. Keep patterns **general and reusable** (not session-specific)
3. Examples of good patterns:
   - "Use `sql<number>` template for aggregations"
   - "Always run migrations before seed in this project"
   - "Auth middleware must be applied before validation middleware"

## Integration

**This skill is triggered by:**
- **systematic-debugging** — After solving a debugging session
- **executing-plans** — After overcoming a tricky implementation issue
- **compound workflow** — Explicit knowledge capture
- **pause workflow** — Append session summary before handoff

**This skill's output is used by:**
- **writing-plans** — Reference past solutions during planning
- **brainstorming** — Avoid known pitfalls
- **resume workflow** — Read progress.md for context restoration
