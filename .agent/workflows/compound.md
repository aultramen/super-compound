---
description: "Capture solved problems as searchable documentation. Use after solving a non-trivial bug or implementation challenge."
---

// turbo-all

# Compound Workflow

This workflow captures solved problems as structured knowledge documentation. Each solution documented today saves investigation time in future sessions.

## Steps

1. **Read knowledge-compounding skill** — Load `skills/knowledge-compounding/SKILL.md` and follow its process.

2. **Detect trigger** — This workflow activates when:
   - User confirms a fix ("that worked", "it's fixed", "problem solved")
   - User explicitly requests documentation
   - A non-trivial debugging session concludes

3. **Evaluate complexity** — Skip documentation for trivial fixes (typos, small syntax errors). Document when:
   - Multiple investigation attempts were needed
   - Root cause was non-obvious
   - Future sessions would benefit

4. **Gather context** — Extract from conversation:
   - Problem symptoms (exact error messages)
   - Root cause (technical explanation)
   - Solution (code/config changes)
   - What didn't work (failed attempts)
   - Prevention guidance

5. **Check existing docs** — Search `docs/solutions/` for similar issues. Cross-reference if found.

6. **Classify** — Determine category:
   `build-errors`, `test-failures`, `runtime-errors`, `performance-issues`,
   `database-issues`, `security-issues`, `ui-bugs`, `integration-issues`,
   `logic-errors`, `config-issues`

7. **Create documentation** — Write to `docs/solutions/<category>/<filename>.md` using template:
   ```markdown
   ---
   date: YYYY-MM-DD
   category: <category>
   severity: critical|high|medium|low
   tags: [tag1, tag2]
   ---
   # Problem Title
   ## Symptoms
   ## Root Cause
   ## Solution
   ## What Didn't Work
   ## Prevention
   ## Related
   ```

8. **Pattern detection** — If 3+ similar issues found, create pattern doc in `docs/solutions/patterns/`.

9. **Present summary** — Show file created, ask what's next:
   1. Continue working
   2. View the documentation
   3. Link related issues

## When to Use
- After solving non-trivial bugs
- After debugging sessions
- After implementing workarounds for tricky issues

## When to Skip
- Simple typos or syntax errors
- Obvious fixes
- Trivial configuration changes
