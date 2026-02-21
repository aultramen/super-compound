---
description: "Create session handoff when pausing work. Saves complete state so the next session can resume seamlessly."
---

# Pause Workflow

This workflow creates a `.continue-here.md` handoff file to preserve complete work state across sessions.

## Steps

1. **Read current state** — Load `docs/STATE.md` for current position and context.

2. **Gather state snapshot** — Collect:
   - Current workflow, task, and step
   - What's been completed in this session
   - What remains to be done
   - Key decisions made
   - Active blockers or open questions
   - Current git branch and uncommitted changes

3. **Check for uncommitted work** — 
   // turbo
   ```bash
   git status --porcelain
   git diff --stat
   ```
   - If uncommitted changes exist: commit as WIP or warn user

4. **Create handoff file** — Write `.continue-here.md` in project root:

   ```markdown
   # Continue Here

   > Session paused: YYYY-MM-DD HH:mm

   ## Position
   - **Workflow:** [active workflow]
   - **Task:** [current task description]
   - **Step:** [exact step]
   - **Branch:** [git branch]

   ## Completed This Session
   - [item 1]
   - [item 2]

   ## Remaining Work
   - [ ] [next task 1]
   - [ ] [next task 2]

   ## Key Decisions
   - [decision 1]: [reason]

   ## Blockers
   - [blocker, if any]

   ## Resume Command
   Run `/resume` to continue from this point.
   ```

5. **Update STATE.md** — Update current position to reflect paused state.

6. **Confirm** — Present summary:
   > "✅ Session paused. Handoff saved to `.continue-here.md`. Run `/resume` in your next session to continue."

## When to Use
- End of working session
- Switching to different task/project
- Context getting too large (need `/clear`)
- Before major context-consuming operations

## When to Skip
- Quick one-off tasks
- Simple questions
- No active work in progress
