## Capturing Todos

### When to Capture

| Situation | Action |
|-----------|--------|
| User mentions future idea during work | Capture immediately, continue work |
| You notice something to fix during execution | Capture if not in current plan scope |
| Code review surfaces improvement ideas | Capture as follow-up |
| Brainstorming generates out-of-scope ideas | Capture to deferred ideas |

### Todo Structure

Create files in `docs/todos/`:

```markdown
---
area: [frontend/backend/database/infra/docs/testing]
priority: [high/medium/low]
source: [brainstorm/work/review/debug/user]
created: YYYY-MM-DD
status: [pending/in-progress/done/deferred]
---

# [Short descriptive title]

## Description
[What needs to be done]

## Context
[Why this was captured, what was happening when it surfaced]

## Related
- [Related files, plans, or brainstorms]
```

**Filename format:** `docs/todos/YYYY-MM-DD-<slug>.md`

### Area Inference

Infer the area from context:

| Context | Area |
|---------|------|
| Working on React/Vue/CSS files | `frontend` |
| Working on API/controllers/services | `backend` |
| Working on migrations/models/queries | `database` |
| Working on Docker/CI/deploy configs | `infra` |
| Working on README/docs/comments | `docs` |
| Working on test files | `testing` |
