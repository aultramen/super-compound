# Gap Analysis and Plan

Load when translating a verification or review report into closure tasks.

## Parse

For every gap record:

- exact missing or broken behavior;
- source evidence and requirement;
- category: truth, artifact, wiring, test, or other explicit dimension;
- severity: critical, important, or minor;
- root cause: missing task, incorrect implementation, missing wiring, or unknown.

If root cause remains unknown, use `systematic-debugging` before prescribing a fix.

## Cluster

Group only gaps sharing a component/file, root cause, or verification dimension. Do not merge unrelated work merely to create a larger task.

```markdown
### Cluster: [component/area]
- Source gaps: [IDs/descriptions]
- Shared root cause: [evidence]
- Existing verified behavior to preserve: [behavior]
```

## Focused Plan

```markdown
## Gap Closure Plan
**Source:** [verification/review/manual report]
**Type:** gap_closure

### Fix Tasks
- [ ] **Fix 1:** [specific action]
  - Source gap: [ID]
  - Files: [bounded paths]
  - Verify: [command/observable check]

### Preserve
- [already-working behavior]

### Out of Scope
- [new features, enhancements, broad refactors]
```

Allowed work fixes identified gaps, broken wiring, missing regression tests, and failing checks. Disallow new features, architecture rewrites, improvements to already-passing behavior, and unrelated test cleanup.

If the user introduces an enhancement, state that it is outside this closure, capture it separately, and finish or explicitly stop the current closure before switching scope.
