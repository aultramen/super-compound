---
name: structured-tasks
description: "Define machine-parseable task format (tasks.json) for projects needing automated progress tracking. Optional supplement to Markdown plans for structured execution."
---

# Structured Tasks

## Overview

Some projects benefit from machine-parseable task definitions alongside human-readable plans. This skill defines a `tasks.json` format that enables automated progress tracking, priority-based ordering, and clear pass/fail status.

**Announce:** "I'm using the structured-tasks skill to create machine-parseable task definitions."

**This is OPTIONAL** — use only when automated tracking provides value. Most projects work fine with Markdown plans alone.

## When to Use

| Scenario | Use tasks.json? |
|----------|----------------|
| Single developer, small feature | ❌ Markdown plan is enough |
| Multi-session feature with many stories | ✅ Helps track progress |
| Autonomous execution pipeline | ✅ Machine-readable is essential |
| Team handoff with clear stories | ✅ Structured format reduces ambiguity |
| Quick bug fix | ❌ Overkill |

## File: `tasks.json`

Place in the project root or `docs/tasks/tasks-<feature>.json`.

### Format

```json
{
  "project": "[Project Name]",
  "feature": "[Feature Name]",
  "branch": "[git branch name]",
  "description": "[Brief feature description]",
  "created": "YYYY-MM-DD",
  "stories": [
    {
      "id": "US-001",
      "title": "[Short descriptive title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Specific verifiable criterion",
        "Another verifiable criterion",
        "Typecheck/lint passes"
      ],
      "priority": 1,
      "status": "pending",
      "notes": ""
    }
  ]
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently being worked on |
| `done` | Completed and verified |
| `blocked` | Cannot proceed (see notes) |
| `skipped` | Intentionally skipped (see notes) |

### Field Rules

| Field | Required | Rules |
|-------|----------|-------|
| `id` | ✅ | Sequential: US-001, US-002, etc. |
| `title` | ✅ | Short, descriptive, action-oriented |
| `description` | ✅ | "As a [user], I want [feature] so that [benefit]" |
| `acceptanceCriteria` | ✅ | Array of verifiable strings (no vague criteria) |
| `priority` | ✅ | Integer, lower = higher priority, dependency-ordered |
| `status` | ✅ | One of: pending, in_progress, done, blocked, skipped |
| `notes` | Optional | Session learnings, blockers, implementation notes |

## Creating tasks.json

### From a PRD

If a PRD exists (`docs/prd/prd-<feature>.md`), convert it:

1. Each PRD user story → one JSON story entry
2. PRD acceptance criteria → `acceptanceCriteria` array
3. Add `"Typecheck/lint passes"` to every story
4. Add `"Verify in browser"` to UI stories
5. Set priority by dependency order (schema → backend → frontend)
6. Set all statuses to `"pending"`

### From Scratch

1. Break the feature into right-sized stories (see sizing rules)
2. Order by dependency
3. Write verifiable acceptance criteria
4. Follow the 2-3 sentence test for sizing

## Story Sizing (Same Rules as writing-plans)

**Each story must be completable in one focused session.**

### Right-Sized

- "Add a database column and migration"
- "Add a UI component to an existing page"
- "Update a server action with new logic"

### Too Big — Split These

| Too Big | Split Into |
|---------|-----------|
| "Build the entire dashboard" | Schema → queries → components → filters |
| "Add authentication" | Schema → middleware → login UI → session |
| "Refactor the API" | One story per endpoint |

### The 2-3 Sentence Test

If you cannot describe the story's change in 2-3 sentences, it is too big.

## Acceptance Criteria Quality

### Good (Verifiable)

- "Add `status` column to tasks table with default 'pending'"
- "Filter dropdown has options: All, Active, Completed"
- "Clicking delete shows confirmation dialog"
- "Typecheck/lint passes"

### Bad (Vague — NEVER Use)

- "Works correctly"
- "User can do X easily"
- "Good UX"
- "Handles edge cases"

## Tracking Progress

### Updating Status

When working through stories:

1. Set current story to `"in_progress"`
2. Only set to `"done"` after ALL acceptance criteria verified
3. Add implementation notes to `"notes"` field
4. When all stories are `"done"` — feature is complete

### Progress Check

At any time, check feature progress:

```
Total stories: [N]
Done: [X] / Pending: [Y] / Blocked: [Z]
Next story: US-[NNN] - [title]
```

## Session Archiving

When a feature is complete (all stories `"done"`):

1. Move `tasks.json` to `docs/archive/YYYY-MM-DD-<feature>/tasks.json`
2. Reset for next feature

## Red Flags

| Thought | Reality |
|---------|---------|
| "Let me create tasks.json for this quick fix" | Overkill for small tasks. Use Markdown. |
| "Status: done (but I didn't verify)" | Done requires ALL criteria verified |
| "Acceptance criteria: it works" | Must be specific and verifiable |
| "One big story is fine" | Small stories = reliable execution |

## Integration

**This skill pairs with:**
- **prd-generator** — PRD provides the stories to convert
- **writing-plans** — Plans and tasks.json can coexist
- **executing-plans** — Can use tasks.json for automated tracking
- **knowledge-compounding** — Append learnings to progress.md after completion

**This skill is NOT a replacement for:**
- **writing-plans** — Plans provide implementation detail; tasks.json tracks progress
- **plan-verification** — Still verify plans regardless of format
