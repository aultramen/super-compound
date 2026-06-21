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

### Step 2: Choose A Settings Template

Use one of the two templates:

- `hooks.json` is the safe global template for `~/.claude/settings.json`. Replace `<ABSOLUTE_PROJECT_PATH>` with a real absolute project path before use.
- `hooks.project.json` is for project-local settings evaluated from the project root. Do not copy it into global settings.

The hook scripts derive the project root from their own script path, so global hooks do not rely on the current working directory.

Open or create `~/.claude/settings.json` and merge the hooks block from `hooks.json`.

```powershell
# View current settings
cat ~/.claude/settings.json

# Then manually merge the hooks from .agent/hooks/hooks.json.
# Replace <ABSOLUTE_PROJECT_PATH> with a real absolute project path.
```

Example global command shape:

```json
{
  "type": "command",
  "command": "node \"C:/path/to/your-project/.agent/hooks/suggest-compact.js\"",
  "async": true,
  "timeout": 5
}
```

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

## Antigravity IDE: Equivalent Behavior

Hooks do not run automatically in Antigravity. Equivalent behavior is manual:

1. Run `/sc-pause` when you want to save state before a long break.
2. Run `/sc-compound` after solving a non-trivial problem.
3. Use the `context-engineering` skill to decide when to pause for fresh context.

The AI will remind you to use these at natural breakpoints based on rules in `SUPER-COMPOUND.md`.
