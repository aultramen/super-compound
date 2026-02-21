---
name: state-management
description: "Use to maintain persistent project memory across sessions. Creates and updates STATE.md to track position, decisions, blockers, completed work, and deferred ideas."
---

# State Management

## Overview

Maintain persistent project memory so every session starts with full context. STATE.md is the single source of truth for where you are, what you've decided, and what's left to do.

**Announce:** "I'm using the state-management skill to track project state."

## The STATE.md File

**Location:** `docs/STATE.md` (project root)

### Template

```markdown
# Project State

> Last updated: YYYY-MM-DD HH:mm

## Current Position

| Field | Value |
|-------|-------|
| Active Workflow | [brainstorm/plan/work/debug/review/none] |
| Active Task | [task description or "none"] |
| Active Step | [step number/name or "none"] |
| Branch | [current git branch] |

## Decisions Made

Locked decisions — do NOT revisit unless user explicitly requests.

| # | Decision | Context | Date |
|---|----------|---------|------|
| 1 | [what was decided] | [why] | YYYY-MM-DD |

## Blockers & Open Questions

| # | Blocker | Status | Since |
|---|---------|--------|-------|
| 1 | [description] | [waiting/investigating/resolved] | YYYY-MM-DD |

## Completed Work

| # | What | Files Changed | Date |
|---|------|---------------|------|
| 1 | [description] | [key files] | YYYY-MM-DD |

## Quick Tasks Completed

| # | Task | Date |
|---|------|------|
| 1 | [description] | YYYY-MM-DD |

## Deferred Ideas

Ideas captured during work — NOT in current scope.

| # | Idea | Source | Priority |
|---|------|--------|----------|
| 1 | [description] | [brainstorm/work/review] | [high/medium/low] |
```

## When to Create STATE.md

**Create automatically when:**
- Starting any workflow (brainstorm, plan, work, debug)
- User runs `/init` on a project
- User runs `/resume` and no STATE.md exists

**Never create for:**
- Simple questions or one-off tasks
- Prototyping with no-git mode
- Single-file scripts

## When to Update STATE.md

### Mandatory Updates

| Event | What to Update |
|-------|---------------|
| Starting a workflow | Current Position → active workflow |
| Making a decision | Add to Decisions Made |
| Completing a task | Move to Completed Work, update position |
| Encountering a blocker | Add to Blockers |
| User mentions future idea | Add to Deferred Ideas |
| Pausing work (`/pause`) | Full state snapshot |
| Finishing a workflow | Clear Current Position, update Completed Work |

### Update Rules

1. **Read before write** — Always read current STATE.md before modifying
2. **Append, don't overwrite** — Add new entries, don't remove old ones
3. **Timestamp everything** — Every entry gets a date
4. **Lock decisions** — Once in Decisions Made, treat as constraints
5. **Keep it lean** — Max 20 entries per section; archive old entries to `docs/state-archive/`

## How to Use STATE.md

### At Session Start

```
1. READ docs/STATE.md
2. LOAD Current Position → resume from where you left off
3. LOAD Decisions Made → respect all locked decisions
4. CHECK Blockers → address if possible
5. ANNOUNCE position to user: "Resuming from [position]. Last worked on [task]."
```

### During Work

```
1. After each significant step → update Current Position
2. After each decision → add to Decisions Made
3. When user mentions future idea → add to Deferred Ideas with source
4. When blocked → add to Blockers, suggest checkpoint
```

### At Session End

```
1. UPDATE Current Position with exact stopping point
2. ENSURE all new decisions are recorded
3. VERIFY Completed Work is up to date
```

## Key Principles

| Principle | Description |
|-----------|-------------|
| **State survives sessions** | STATE.md persists across conversations |
| **Decisions are locked** | Once recorded, don't revisit without explicit request |
| **Deferred ≠ forgotten** | Capture ideas but don't act on them now |
| **Position is precise** | "Step 3 of Task 2 in work workflow" not "working on feature" |
| **Lean state** | Only track what's needed to resume; archive the rest |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I'll remember where we were" | You won't. Update STATE.md |
| "This decision doesn't need recording" | If it affects future work, record it |
| "Too small to track" | Small decisions compound into big confusion |
| "I'll update state later" | Update NOW or it's lost |

## Integration

**This skill is used by:**
- **executing-plans** — Tracks task completion and position
- **brainstorming** — Records decisions and deferred ideas
- **systematic-debugging** — Tracks investigation state

**Pairs with:**
- **checkpoint-protocol** — Checkpoints trigger state updates
- **pause/resume workflows** — State is the handoff mechanism
- **todo-management** — Deferred ideas feed into todos
