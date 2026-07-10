## Pre-Flight Steps

1. List new or changed dependencies and runtimes.
2. Read current versions from manifests and lockfiles.
3. Use `context7-docs` for version-specific primary docs when available.
4. Check peer requirements, runtime minimums, and breaking-change notes.
5. Run native audit commands when the ecosystem supports them.
6. Document result in the plan.
7. If a blocker exists, propose alternatives before implementation.

Plan section:

```markdown
## Compatibility Check

| Item | Current | Proposed | Status | Notes |
|---|---:|---:|---|---|
| example-lib | n/a | 3.x | OK | Supports Node 20 and React 19 |

### Required Actions
- <install, pin, replace, or defer>
```
