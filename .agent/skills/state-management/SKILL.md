---
name: state-management
description: "Use to maintain durable project memory across sessions through STATE.md, progress notes, checkpoints, and pause handoff files."
---

# State Management

## Purpose

Keep project state durable, concise, and useful so a future session can run `/sc-status` and continue without guessing.

Announce: "I'm using the state-management skill to track project state."

## Primary Files

| File | Use |
|---|---|
| `docs/STATE.md` | Current position, decisions, blockers, completed work, and next action |
| `.continue-here.md` | Short handoff created by `/sc-pause` for the next session |
| `docs/progress.md` | Chronological progress and codebase patterns |
| `docs/ERROR_LOG.md` | Costly mistakes, root cause, and prevention |
| `docs/LEARNED_KNOWLEDGE.md` | Confirmed reusable project preferences and conventions |
| `docs/adr/` | Durable architecture decisions |
| `docs/tasks/tasks-*.json` | Optional task ledger for long or multi-agent work |

Do not create every file by default. Create only what the work needs.

## STATE.md Template

```markdown
# Project State

Last updated: YYYY-MM-DD HH:mm

## Current Position
- Workflow: <init/status/explore/research/prd/plan/eval/work/debug/review/audit/compound/pause/launch/ui/none>
- Active task: <task or none>
- Next action: <specific next step>
- Branch/workspace: <branch or n/a>

## Decisions
- YYYY-MM-DD: <decision and why>

## Blockers
- <blocker, owner, and needed input>

## Completed Work
- YYYY-MM-DD: <work completed and important files>

## Deferred Ideas
- <idea and why it is out of current scope>
```

## When To Create Or Update

Create or update durable state when:

- Starting non-trivial workflow execution
- Pausing work
- Completing a planned task
- Making a decision that future work must respect
- Encountering a blocker
- Deferring a user idea
- Finishing a feature, review, audit, or debug session

Skip state files for one-off questions, tiny edits, or throwaway experiments.

## Update Rules

- Read before writing.
- Append or revise the relevant section; do not erase useful history.
- Keep entries short and dated.
- Record decisions as constraints unless the user reopens them.
- Keep state lean; archive noisy old details under `docs/state-archive/` if needed.
- Never store secrets, credentials, private data, or full sensitive payloads.

## Session Start

At the beginning of continuation work:

1. Read `docs/STATE.md` if present.
2. Read `.continue-here.md` if present.
3. Read the active plan, PRD, brainstorm, or task ledger referenced by state.
4. Load only the files needed for the next step.
5. If the route is unclear, run `/sc-status`.

## Session End

Before stopping:

- Update exact next action.
- Record completed work and decisions.
- Note blockers and owner.
- Suggest `/sc-compound` if a reusable solution was discovered.
- Suggest `/sc-pause` if the user will continue in a later session.

## Error And Learning Capture

Use `docs/ERROR_LOG.md` for mistakes that caused rework:

```markdown
## YYYY-MM-DD - <category>
- Symptom: <what happened>
- Root cause: <why>
- Correct approach: <what to do next time>
- Prevention: <short rule>
```

Use `docs/LEARNED_KNOWLEDGE.md` for durable conventions:

```markdown
## YYYY-MM-DD - <topic>
- Learning: <confirmed pattern>
- Confidence: confirmed | observed | inferred
- Applies to: <scope>
```

## Red Flags

| Thought | Better Response |
|---|---|
| "I'll remember this" | Write the next action |
| "This decision is obvious" | Record it if future work depends on it |
| "We can clean state later" | Keep it lean now |
| "The handoff needs every detail" | Link to durable docs and name the next step |

## Related Skills

- `context-engineering` for selective loading
- `checkpoint-protocol` for pause decisions
- `executing-plans` for task progress
- `brainstorming` and `prd-generator` for upstream decisions
- `todo-management` for deferred ideas
