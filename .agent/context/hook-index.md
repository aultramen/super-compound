# Hook Index

Hooks are deterministic local scripts. Load full hook files only when editing, auditing, or running them.

| Hook | Purpose |
|---|---|
| `suggest-compact` | suggest pause/compaction |
| `pre-compact` | save state before compaction |
| `session-end` | persist session state |
| `stop-check` | warn on risky output |
| `test-hooks-security` | verify hook safety |
