## Red Flags

| Thought | Reality |
|---------|---------|
| "These tasks are probably independent" | Check actual files. Probably ≠ verified. |
| "Small overlap is fine" | One shared file = merge conflict guaranteed |
| "Skip worktrees, just use branches" | Branches without worktrees = context switching overhead |
| "Auto-merge conflicts" | Require proof of identical edits or deterministic regeneration preserving both sides; otherwise investigate semantic intent. |
| "Delete worktrees now" | Validate paths and ask before removal. |
| "Frontend and backend use different folders, so they are independent" | Not without one pinned contract, a verified first slice, and single-writer generated surfaces. |
| "The mock passed, so scale-out is safe" | Mock conformance is not real-provider integration proof. |
| "Wait for the entire previous wave" | Dispatch after this goal's own dependencies verify and a safe slot is free. |
| "One worker drifted; stop every stream" | Quarantine that worker and its affected dependencies; continue independent work. |
| "Acquire the goal-waves lock" | No lock helper exists; use one scheduler, serial mutations, atomic replacement, and ledger version checks. |
