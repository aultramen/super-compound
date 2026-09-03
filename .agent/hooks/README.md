# Hook boundary

Hooks are advisory, deterministic, local-first helpers. They may warn, validate, or record bounded audit evidence, but they cannot create or consume human approval.

The Loop Runtime controller and hard source-write interceptor provide hard enforcement. Operation adapters enforce allowlists, approval bindings, counters, and reconciliation at each action boundary.

See `docs/loop-runtime-v2.md` for the authoritative operating guide.

## Environment variables

Every variable a hook reads is listed here; `.agent/tools/hook-env-surface.test.mjs` fails when a hook reads one that is not.

| Variable | Read by | Meaning |
| --- | --- | --- |
| `SC_DISABLED_HOOKS` | all hooks | comma-separated hook names to skip (kill switch) |
| `SUPER_COMPOUND_PROJECT_ROOT` | all hooks | project root override; default is two levels above the hook file, so hooks registered from a parent workspace still write state under this repository |
| `CLAUDE_SESSION_ID` | suggest-compact, context-monitor, stop-check, session-end | session id fallback when the host payload carries none |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | context-monitor, suggest-compact | host context window in tokens; set it when the model window is not detected (hooks then say the 200k window is assumed) |
| `SC_CONTEXT_WARN_PCT` | context-monitor | remaining-context percent that fires WARNING (default 35; 15 on a detected 1M window) |
| `SC_CONTEXT_CRITICAL_PCT` | context-monitor | remaining-context percent that fires CRITICAL (default 25; 8 on a detected 1M window) |
| `COMPACT_STATE_TTL_DAYS` | suggest-compact | days before stale per-session state files are removed (default 14) |
| `COMPACT_CONTEXT_THRESHOLD` | suggest-compact | context tokens that trigger the compaction suggestion (default 160000; 700000 for 1M windows; 0 disables) |
| `COMPACT_CONTEXT_INTERVAL` | suggest-compact | context tokens between repeated suggestions (default 60000) |
