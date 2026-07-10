# Super Compound Hooks Installation Guide

## Compatibility

| Feature | Antigravity IDE | Claude Code |
|---|---|---|
| Hook system | Not supported | Supported |
| Subagents | Manual invocation | Native subagents |
| Skills and workflows | Native | Native |

## Claude Code: How To Install Hooks

The hook scripts in this directory are designed for Claude Code only.

### Step 1: Keep Hook Scripts In The Project

Recommended layout:

```text
your-project/
  .agent/hooks/
    lib/hook-utils.js
    pre-compact.js
    session-end.js
    stop-check.js
    suggest-compact.js
```

### Step 2: Use The Settings Template

Use `hooks.json` for either `~/.claude/settings.json` or project-local
`.claude/settings.json`; merge its `hooks` object rather than replacing unrelated
settings.

The template uses Claude Code's `${CLAUDE_PROJECT_DIR}` placeholder with exec-form `args`, so paths remain correct after a `cd` and spaces are not shell-tokenized.

Open or create `~/.claude/settings.json` and merge the hooks block from `hooks.json`.

```powershell
# View current settings
cat ~/.claude/settings.json

# Then manually merge the hooks from .agent/hooks/hooks.json.
```

Example global command shape:

```json
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PROJECT_DIR}/.agent/hooks/suggest-compact.js"],
  "timeout": 5
}
```

`suggest-compact.js` must remain synchronous so Claude Code can receive its structured `hookSpecificOutput.additionalContext`. `stop-check.js` is also synchronous so its bounded warning can surface as `systemMessage`. Neither hook emits raw input.

### Step 3: Verify Hooks Work

```bash
node .agent/hooks/suggest-compact.js
# Should print nothing when the threshold is not hit.

node .agent/hooks/test-hooks-security.js
# Should print: hook security tests passed
```

### Configuration

| Env Variable | Default | Description |
|---|---:|---|
| `COMPACT_THRESHOLD` | `50` | Tool calls before first `/sc-pause` suggestion |
| `COMPACT_REMINDER_INTERVAL` | `25` | Calls between reminders |
| `COMPACT_CONTEXT_THRESHOLD` | `160000` (`250000` for 1M context) | Input-context tokens before the first context-pressure suggestion; set `0` to disable this signal |
| `COMPACT_CONTEXT_INTERVAL` | `60000` | Additional context tokens between reminders |
| `COMPACT_STATE_TTL_DAYS` | `14` | Age after which inactive session state is removed |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | model-derived | Explicit context-window size used for the percentage label |
| `SUPER_COMPOUND_PROJECT_ROOT` | script-derived | Optional absolute project-root override |

The latest complete usage record is read from a bounded transcript tail (256 KiB normally, expanding to at most 1 MiB for one large record). A session-scoped tool counter is the fallback when transcript usage is unavailable. State lives under ignored `.agent/.compact-state/<session>.json`; a session ID or hashed transcript path isolates reminders, while legacy payloads that provide neither identity share the `default` fallback.

`pre-compact.js` and `session-end.js` keep stdout silent so they cannot inject accidental context. Diagnostics go to stderr, and all hook stdin is size-bounded and parsed without echoing payloads.

## Antigravity IDE: Equivalent Behavior

Hooks do not run automatically in Antigravity. Equivalent behavior is manual:

1. Run `/sc-pause` when you want to save state before a long break.
2. Run `/sc-compound` after solving a non-trivial problem.
3. Use the `context-engineering` skill to decide when to pause for fresh context.

The AI will remind you to use these at natural breakpoints based on rules in `SUPER-COMPOUND.md`.
