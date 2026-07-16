## Red Flags

| Thought | Reality |
|---------|---------|
| "These tasks are probably independent" | Check actual files. Probably ≠ verified. |
| "Small overlap is fine" | One shared file = merge conflict guaranteed |
| "Skip worktrees, just use branches" | Branches without worktrees = context switching overhead |
| "Auto-merge conflicts" | Manual resolution only. Conflicts = bad analysis. |
| "Delete worktrees now" | Validate paths and ask before removal. |
| "Frontend and backend use different folders, so they are independent" | Not without one pinned contract, a verified first slice, and single-writer generated surfaces. |
| "The mock passed, so scale-out is safe" | Mock conformance is not real-provider integration proof. |
