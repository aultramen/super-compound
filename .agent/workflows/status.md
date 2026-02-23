---
description: "Show project state overview and resume work from previous session. Quick way to see where you are, what to do next, and seamlessly resume after a break."
---

# Status Workflow

This workflow shows your project state dashboard and intelligently routes to the next productive action. It automatically resumes if a handoff file exists.

> **Use at the start of any session, or whenever you need orientation.**

## Usage

```
/status     → Show dashboard + smart routing (auto-resumes if .continue-here.md exists)
/resume     → Alias for /status
/progress   → Alias for /status
```

---

## Steps

1. **Check for handoff file** —
   // turbo
   - Look for `.continue-here.md` in project root
   - If found: parse position, remaining work, decisions, blockers → **Resume Mode** (go to step 3)
   - If not found: continue to step 2

2. **Load project state** — Read `docs/STATE.md` if it exists.
   // turbo
   - If no STATE.md: offer to run `/init` to create one

3. **Scan project artifacts** —
   // turbo
   - Incomplete plans in `docs/plans/` (tasks not all checked)
   - Pending brainstorms in `docs/brainstorms/` (no follow-up plan)
   - Pending context docs in `docs/context/` (no follow-up plan)
   - Pending research in `docs/research/` (no follow-up plan)
   - Pending todos in `docs/todos/` (status: pending)

4. **Check Git status** —
   // turbo
   ```bash
   git status --short
   git log --oneline -5
   ```

5. **Present dashboard** —

   ```markdown
   ## 📊 Project Status

   **Project:** [name from project-config]
   **Branch:** [current branch]
   **Last activity:** [date from STATE.md or handoff]

   ### Current Position
   [Active workflow → task → step]

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

6. **Route to next action** —

   | State | Suggestion |
   |-------|-----------|
   | Has `.continue-here.md` | "Resume previous work? (`/work`)" |
   | Has in-progress plan | "Continue executing plan? (`/work`)" |
   | Has brainstorm without plan | "Ready to create a plan? (`/plan`)" |
   | Has pending context/research | "Ready to plan with these findings? (`/plan`)" |
   | Has pending todos | "Review your todos?" |
   | Has blockers | "Resolve blockers?" |
   | Has uncommitted changes | "Commit your changes?" |
   | Everything clean | "What would you like to work on next?" |

7. **Clean up** — If `.continue-here.md` was found and user chooses to resume:
   - Delete `.continue-here.md` (consumed)
   - Update STATE.md with resumed session timestamp

8. **Acknowledge choice** — Execute the chosen route or ask for a different direction.

---

## When to Use
- Start of any new session ("where was I?")
- After running `/pause` in a previous session
- When returning to a project after time away
- When AI responses feel generic (missing context)
- Quick orientation: "what's the status?"

## When to Skip
- Brand new project with nothing to resume
- Already have full context in current session
- Simple one-off questions
