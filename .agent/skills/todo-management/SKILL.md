---
name: todo-management
description: "When ideas/tasks surface during work — capture and track them without losing focus. Prevents idea loss while maintaining current task discipline."
---

# Todo Management

## Overview

Ideas surface at the worst times — mid-debugging, during execution, in code reviews. Capture them immediately in a structured way, then get back to work. Address them later.

**Announce:** "I'm using the todo-management skill to capture this for later."

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

## Checking Todos

### List Todos

Show pending todos sorted by priority:

```markdown
## 📋 Pending Todos

### High Priority
- [ ] [title] — [area] — [created date]

### Medium Priority
- [ ] [title] — [area] — [created date]

### Low Priority
- [ ] [title] — [area] — [created date]

**Filter by area:** /check-todos --area frontend
```

### Routing

After presenting todos, ask user what to do:

| Option | Action |
|--------|--------|
| **Work now** | Execute the todo immediately (use `work` workflow) |
| **Add to plan** | Include in next plan as a task |
| **Brainstorm** | Needs more exploration (use `brainstorm` workflow) |
| **Defer** | Keep for later; update status to `deferred` |
| **Done** | Already addressed; mark as `done` |
| **Delete** | Not relevant anymore; delete the file |

## Cross-Referencing

### With STATE.md

When capturing a todo:
1. Add to STATE.md → Deferred Ideas section
2. Reference the todo file path

### With Plans

When creating plans:
1. Check `docs/todos/` for relevant pending items
2. Ask: "These todos may be related to this plan: [list]. Include any?"

## Quick Capture (During Work)

When you notice something mid-work, don't context-switch. Use the minimal format:

```
1. Create todo file with title, area, and one-line description
2. Add to STATE.md deferred ideas
3. Continue current work immediately
```

**Time budget:** Max 30 seconds on capture. Details can be added later.

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Capture fast** | 30 seconds max, then back to work |
| **Infer context** | Area and priority from what you're doing |
| **Don't context-switch** | Capture ≠ act on it now |
| **Review periodically** | Check todos before planning |
| **Keep or kill** | Regularly prune irrelevant todos |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "Let me just quickly do this todo now" | Capture it and stick to current work |
| "It's too small to write down" | Write it down or lose it forever |
| "I'll remember this later" | You won't. Capture it now. |
| "Let me detail this thoroughly" | Quick capture now, details later |

## Integration

**This skill is used during:**
- **executing-plans** — Ideas surface during execution
- **brainstorming** — Out-of-scope ideas captured
- **code-review** — Enhancement ideas captured
- **systematic-debugging** — Related issues noticed

**Pairs with:**
- **state-management** — Todos feed into STATE.md deferred ideas
- **writing-plans** — Todos are reviewed when creating new plans
