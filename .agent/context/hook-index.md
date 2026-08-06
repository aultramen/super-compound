# Hook Index

Hooks are deterministic local scripts. Load full hook files only when editing, auditing, or running them.

| Hook | Purpose |
|---|---|
| `suggest-compact` | suggest pause/compaction |
| `context-monitor` | agent-facing low-context warnings (wrap up <=35%, save state <=25%) |
| `pre-compact` | save state before compaction |
| `session-end` | emit a closeout checklist; it does not write state |
| `stop-check` | warn on risky output |
| `test-hooks-security` | verify hook safety |
