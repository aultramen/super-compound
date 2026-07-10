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

Filter internally by the todo frontmatter `area` value; there is no separate
public todo-list command.
```

### Routing

After presenting todos, ask user what to do:

| Option | Action |
|--------|--------|
| **Work now** | Execute an approved, concrete todo through `/sc-work` |
| **Add to plan** | Route it through `/sc-plan` for FSD/goal planning |
| **Explore** | Clarify an uncertain idea through `/sc-explore` |
| **Defer** | Keep for later; update status to `deferred` |
| **Done** | Already addressed; mark as `done` |
| **Delete** | Not relevant anymore; delete the file |
