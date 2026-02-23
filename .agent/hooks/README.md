# Super Compound Hooks — Installation Guide

## Compatibility

| Feature | Antigravity IDE | Claude Code |
|---------|----------------|-------------|
| Hook System | ❌ Not supported | ✅ Supported |
| Subagents | ⚠️ Via manual invocation | ✅ Native subagents |
| Skills & Workflows | ✅ Native | ✅ Native |

---

## Claude Code: How to Install Hooks

The hook scripts in this directory are designed for **Claude Code** only.

### Step 1: Copy hook scripts

The JS scripts can be placed anywhere; we recommend keeping them in your project:
```
your-project/
└── .agent/hooks/
    ├── session-end.js
    ├── pre-compact.js
    └── suggest-compact.js
```

### Step 2: Merge hooks.json into Claude Code settings

Open (or create) `~/.claude/settings.json` and add the hooks block.

**Windows (PowerShell):**
```powershell
# View current settings
cat ~/.claude/settings.json

# Then manually merge the hooks from .agent/hooks/hooks.json
# Key: update the script paths to absolute project paths
```

**Updated hooks.json for Claude Code** — replace relative paths with absolute:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "node \"C:\\path\\to\\your-project\\.agent\\hooks\\suggest-compact.js\"",
          "async": true,
          "timeout": 5
        }],
        "description": "Suggest /pause at logical intervals"
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "node \"C:\\path\\to\\your-project\\.agent\\hooks\\pre-compact.js\""
        }],
        "description": "Save STATE.md before compaction"
      }
    ],
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "node \"C:\\path\\to\\your-project\\.agent\\hooks\\session-end.js\""
        }],
        "description": "Remind to /compound at session end"
      }
    ]
  }
}
```

### Step 3: Verify hooks work

```bash
node .agent/hooks/suggest-compact.js
# Should print nothing (no threshold hit yet)
```

### Configuration

| Env Variable | Default | Description |
|---|---|---|
| `COMPACT_THRESHOLD` | `50` | Tool calls before first `/pause` suggestion |
| `COMPACT_REMINDER_INTERVAL` | `25` | Calls between reminders |

---

## Antigravity IDE: Equivalent Behavior

Hooks don't run automatically in Antigravity. Instead, **equivalent behavior** is achieved through:

1. **`/pause`** — Run manually when you want to save state before a long break
2. **`/compound`** — Run manually after solving a non-trivial problem
3. **`context-engineering` skill** — Guides you on when to pause for fresh context

The AI will remind you to use these at natural breakpoints based on rules in `SUPER-COMPOUND.md`.
