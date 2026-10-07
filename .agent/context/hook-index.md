# Hook Index

Hooks are deterministic local scripts. Load full hook files only when editing, auditing, or running them.

| Hook | Purpose |
|---|---|
| `suggest-compact` | suggest compaction from transcript pressure; no token counts in the note |
| `context-monitor` | agent-facing low-context notes (WARNING: persist state and continue; CRITICAL: checkpoint, compact, then continue authorized work); thresholds scale with the detected window and the note carries no count or percentage |
| `pre-compact` | save state before compaction |
| `session-end` | report pending/incomplete learning closeouts only; append session token usage (deduped per `message.id`) and the `.agent/` asset-read histogram to the runtime usage log (`npm run usage`) |
| `stop-check` | warn on risky output and actual pending/incomplete learning closeouts |
| `test-hooks-security` | verify hook safety |
