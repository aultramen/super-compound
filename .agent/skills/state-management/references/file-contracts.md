# File Contracts

Create only the artifacts required by the active workflow.

| File | Contract |
| --- | --- |
| `docs/STATE.md` | Hot current position, decisions, blockers, completed work, and next action |
| `.continue-here.md` | Short pause handoff pointing to state and authoritative artifacts |
| `docs/progress.md` | Chronological sessions plus consolidated codebase patterns |
| `docs/ERROR_LOG.md` | Costly mistakes, root cause, correction, and prevention |
| `docs/LEARNED_KNOWLEDGE.md` | Confirmed reusable preferences and conventions |
| `docs/brd/`, `docs/prd/`, `docs/fsd/` | Authoritative delivery specifications; link, never duplicate |
| `docs/solutions/adr-####-<slug>.md` | Optional accepted architecture rationale |
| `docs/tasks/tasks-*.json` | Optional ledger for long or multi-agent work |
| `.scratch/<feature>/issues/*.md` | Local issue pointers for FSD goals |

## `STATE.md`

```markdown
# Project State
Last updated: YYYY-MM-DD HH:mm

## Current Position
- Workflow: <route>
- Active task: <task or none>
- Next action: <specific executable step>
- Branch/workspace: <branch or n/a>

## Decisions
- YYYY-MM-DD: <decision, scope, and why>

## Blockers
- <blocker, owner, and needed input>

## Completed Work
- YYYY-MM-DD: <outcome and important artifact links>

## Deferred Ideas
- <idea and reason out of scope>
```

## Error and learning records

```markdown
## YYYY-MM-DD - <error category>
- Symptom: <observed failure>
- Root cause: <why>
- Correct approach: <verified correction>
- Prevention: <bounded rule>
```

```markdown
## YYYY-MM-DD - <learning topic>
- Learning: <confirmed pattern>
- Confidence: confirmed | observed | inferred
- Applies to: <scope>
```

At session end, update exact Next Action, completed outcomes, decisions, blockers, and owner. Suggest knowledge compounding for a reusable solution and pause workflow for later continuation.
