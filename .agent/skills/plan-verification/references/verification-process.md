## Verification Process

1. Run all 9 dimensions against the plan, ledger, and issue files.
2. Classify findings:
   - Critical: missing requirements, broken dependencies, cycles, missing must-haves
   - Important: incomplete tasks, missing tests, scope concerns
   - Suggestion: minor sizing or ordering improvements
3. Produce a report:

```markdown
## FSD Verification Report

**FSD:** <fsd or issue board>
**Verdict:** PASS | PASS WITH NOTES | NEEDS REVISION

### Findings

| # | Dimension | Severity | Finding |
|---|---|---|---|
| 1 | Dependency Correctness | Critical | <finding> |
```

4. If revision is needed, apply targeted fixes only, then re-run the failed dimensions. Stop after three failed revision loops and mark `needs_review`.
