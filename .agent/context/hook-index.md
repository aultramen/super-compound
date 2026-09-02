# Hook Index

Hooks are deterministic local scripts. Load full hook files only when editing, auditing, or running them.

| Hook | Purpose |
|---|---|
| `suggest-compact` | suggest pause/compaction |
| `context-monitor` | agent-facing low-context warnings (wrap up <=35%, save state <=25%); reports raw usage of an assumed 200k window when the model window is not detected |
| `pre-compact` | save state before compaction |
| `session-end` | emit a closeout checklist; append session token usage (deduped per `message.id`) and the `.agent/` asset-read histogram to the runtime usage log (`npm run usage`) |
| `stop-check` | warn on risky output; nudge /sc-compound when edits outpace knowledge capture |
| `test-hooks-security` | verify hook safety |
