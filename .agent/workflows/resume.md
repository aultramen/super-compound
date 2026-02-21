---
description: "Restore project context and resume work from previous session. Detects handoff files, loads state, and routes to next action."
---

# Resume Workflow

This workflow restores complete project context and seamlessly continues work from a previous session.

## Steps

1. **Check for handoff file** — Look for `.continue-here.md` in project root.
   // turbo
   - If found: read and parse position, remaining work, decisions, blockers
   - If not found: continue to step 2

2. **Check for STATE.md** — Look for `docs/STATE.md`.
   // turbo
   - If found: read and parse current position
   - If not found: offer to run `/init` or start fresh

3. **Detect incomplete work** — Scan for:
   // turbo
   - Plans without completion markers in `docs/plans/`
   - Brainstorms without follow-up plans in `docs/brainstorms/`
   - Open todo items in `docs/todos/`
   - Uncommitted changes on current branch

4. **Present status** — Show the user a clear summary:

   ```markdown
   ## 📍 Project Status

   **Last session:** [date from handoff/state]
   **Position:** [workflow → task → step]
   **Branch:** [current branch]

   ### Completed
   - [completed item 1]
   - [completed item 2]

   ### Remaining
   - [ ] [remaining task 1]
   - [ ] [remaining task 2]

   ### Blockers
   - [blocker, if any — offer to resolve]

   ### Decisions in Effect
   - [locked decision 1]
   - [locked decision 2]
   ```

5. **Route to next action** — Based on state analysis:

   | State | Route |
   |-------|-------|
   | Has remaining work from plan | "Continue executing? (`/work`)" |
   | Plan exists but not started | "Ready to execute? (`/work`)" |
   | Brainstorm exists, no plan | "Ready to plan? (`/plan`)" |
   | Has unresolved blockers | "Resolve blockers first?" |
   | Has open todos | "Review todos? (`/check-todos`)" |
   | Everything complete | "What's next?" |

6. **Clean up** — After resuming:
   - Delete `.continue-here.md` (no longer needed)
   - Update STATE.md with resumed session timestamp

## When to Use
- Starting a new session on an existing project
- After running `/pause` in a previous session
- When returning to a project after time away
- When AI responses feel generic (missing context)

## When to Skip
- Brand new project (nothing to resume)
- Simple questions or one-off tasks
- Already have full context in current session
