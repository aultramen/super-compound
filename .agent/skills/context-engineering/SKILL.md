---
name: context-engineering
description: "Use when managing AI context budget, selective file loading, history digests, and fresh-session handoffs."
---

# Context Engineering

## Purpose

Load the minimum useful context for the current task, preserve durable state on disk, and recommend fresh sessions before context quality degrades.

Announce: "I'm applying context engineering to keep the working context focused."

## Core Rules

- Load by relevance to the current task, not by directory size.
- Prefer summaries and targeted file reads before loading large files.
- Follow imports, references, and tests only as far as needed.
- Use durable files for cross-session state; conversation memory is not durable.
- Stop gathering context once you can safely act.

## What To Load

| Task | Start With | Add Only If Needed |
|---|---|---|
| Planning | Request, PRD, prior brainstorm, README, package metadata | Similar code, ADRs, docs/solutions |
| Execution | Plan, target files, tests, local instructions | Callers, interfaces, fixtures |
| Debugging | Error output, failing test, implicated files | Related config, recent changes |
| Review | Diff, tests, requirements | Nearby code for behavior comparison |
| UI work | Existing design system, components, target route | `interface-design` search results |

## History Digest Pattern

When returning to work:

1. Read `docs/STATE.md` if present.
2. Read `.continue-here.md` if present.
3. Read the active plan, PRD, or brainstorm.
4. Load only files needed for the current next step.
5. Run `/sc-status` to route the session if the next action is unclear.

## Fresh Context Signals

Suggest `/sc-pause` and a fresh session when:

- The task is switching to a different feature or domain
- Debugging has accumulated many failed hypotheses
- A major feature is complete and review should start clean
- The assistant is relying on stale memory instead of current files
- The conversation is long enough that important details are being compressed

After a fresh session, use `/sc-status` to recover from disk.

## Checkpoints

At natural breaks, ask internally:

- Am I using the files I loaded?
- Is the next file necessary for the next action?
- Do I need a summary instead of a full file?
- Should this state be written to `docs/STATE.md`, `docs/progress.md`, or `.continue-here.md`?

## Red Flags

| Thought | Better Response |
|---|---|
| "Read the whole repo first" | Search, sample, and follow references |
| "Keep everything in memory" | Summarize and persist durable state |
| "Reload the whole conversation" | Use `STATE.md`, `.continue-here.md`, and current files |
| "More context will fix uncertainty" | Identify the specific missing fact |

## Related Skills

- `state-management` for durable state files
- `executing-plans` for task-by-task loading
- `systematic-debugging` for investigation scope
- `brainstorming` for lightweight product context
- `checkpoint-protocol` for pause and handoff decisions
