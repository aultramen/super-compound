---
description: "Show project state overview and route to next action. Quick way to see where you are and what to do next."
---

# Progress Workflow

This workflow shows a quick overview of your project state and intelligently routes you to the most productive next action.

## Steps

1. **Load project state** — Read `docs/STATE.md` if it exists.
   // turbo
   - If no STATE.md: offer to run `/init` + create STATE.md

2. **Scan project artifacts** — Check for:
   // turbo
   - Incomplete plans in `docs/plans/` (tasks not all checked)
   - Pending brainstorms in `docs/brainstorms/` (no follow-up plan)
   - Pending context docs in `docs/context/` (no follow-up plan)
   - Pending research in `docs/research/` (no follow-up plan)
   - Pending todos in `docs/todos/` (status: pending)
   - Unresolved `.continue-here.md` handoff file

3. **Check Git status** —
   // turbo
   ```bash
   git status --short
   git log --oneline -5
   ```

4. **Present dashboard** —

   ```markdown
   ## 📊 Project Progress

   **Project:** [name from project-config]
   **Branch:** [current branch]
   **Last activity:** [date from STATE.md]

   ### Current Position
   [From STATE.md — active workflow, task, step]

   ### Work Summary
   | Status | Count |
   |--------|-------|
   | ✅ Completed tasks | [N] |
   | 🔄 In-progress plans | [N] |
   | 📋 Pending todos | [N] |
   | ⚠️ Blockers | [N] |

   ### Recent Decisions
   [Last 3 decisions from STATE.md]

   ### Uncommitted Changes
   [Git status summary]
   ```

5. **Route to next action** — Based on state analysis:

   | State | Suggestion |
   |-------|-----------|
   | Has `.continue-here.md` | "Resume previous work? (`/resume`)" |
   | Has in-progress plan | "Continue executing plan? (`/work`)" |
   | Has brainstorm without plan | "Ready to create a plan? (`/plan`)" |
   | Has pending todos | "Review your todos? (show list)" |
   | Has blockers | "Resolve blockers?" |
   | Has uncommitted changes | "Commit your changes?" |
   | Everything clean | "What would you like to work on next?" |

6. **Acknowledge choice** — Execute the chosen route or ask for a different direction.

## When to Use
- Beginning of a new session
- "Where was I?"
- "What's the status?"
- "What should I do next?"
- Quick orientation after being away

## When to Skip
- Already have context from current session
- Just starting a brand new project (nothing to show)
- In the middle of active work
