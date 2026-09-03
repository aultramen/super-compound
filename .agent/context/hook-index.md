# Hook Index

Hooks are deterministic local scripts. Load full hook files only when editing, auditing, or running them.

| Hook | Purpose |
|---|---|
| `suggest-compact` | suggest compaction from transcript pressure; no token counts in the note |
| `context-monitor` | agent-facing low-context notes (WARNING: persist state and continue; CRITICAL: hand off); thresholds scale with the detected window and the note carries no count or percentage |
| `pre-compact` | save state before compaction |
| `session-end` | emit a closeout checklist; append session token usage (deduped per `message.id`) and the `.agent/` asset-read histogram to the runtime usage log (`npm run usage`) |
| `stop-check` | warn on risky output; nudge /sc-compound when edits outpace knowledge capture |
| `test-hooks-security` | verify hook safety |
