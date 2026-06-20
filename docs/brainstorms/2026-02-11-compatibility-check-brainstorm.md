# Compatibility Check — Brainstorm

> Brainstormed on 2026-02-11

## What We're Building

A **compatibility and version check** feature for the Super Compound framework that proactively validates tech stack compatibility before AI writes code, and provides an on-demand audit for existing projects.

**Two delivery mechanisms:**

1. **Skill** (`skills/compatibility-check/SKILL.md`) — Defines the check logic, invoked automatically during `/sc-plan` and available to any workflow
2. **Workflow** (`workflows/compatibility.md`) — `/compatibility` slash command for on-demand full stack audit

## Why This Approach

### Chosen: New Skill + New Workflow (Approach A)

Mirrors the existing framework pattern (e.g., `brainstorming` skill + `/brainstorm` workflow). Clean separation between automatic invocation and explicit on-demand use. Most discoverable for users.

### Alternatives Considered

| Approach | Why Not |
|----------|---------|
| Skill only (B) | No discoverable `/compatibility` command, users must know to ask |
| Quality gate integration (C) | Too aggressive — fires on every task, doesn't support on-demand audit |

## Key Decisions Made

### 1. Dual Mode Operation
- **Pre-flight** (automatic) — Invoked during `/sc-plan` Phase 1: Research when new dependencies are introduced
- **Audit** (on-demand) — Full project scan via `/compatibility` command

### 2. Data Sources
- **Project introspection** — Read `package.json`, lock files, `requirements.txt`, `pyproject.toml`, `go.mod`, etc. to detect current versions
- **Web search** — Search for compatibility data, changelogs, known incompatibilities, EOL notices when introducing new deps or uncertain combinations

### 3. Safety: Read-Only Audit with Approval Gate
- On-demand `/compatibility` audit is **strictly read-only**
- Outputs summary + suggestions only
- **Never modifies any files** without explicit user approval
- Asks user which suggestions to apply, or "none"

### 4. Severity Classification
- 🔴 **Critical** — Will break at runtime (incompatible peer deps, missing runtime requirements)
- 🟡 **Warning** — Risky combinations, deprecations, upcoming EOL
- 🟢 **Info** — Suggestions, newer versions available

### 5. What Gets Checked
- Library-to-library compatibility (e.g., React 18 + older router)
- Framework-to-runtime compatibility (e.g., Next.js 14 needs Node 18+)
- Deprecated/EOL dependencies
- Peer dependency conflicts
- Version range conflicts between direct deps

## Design Details

### Skill: `compatibility-check`

**File:** `.agent/skills/compatibility-check/SKILL.md`

**Mode 1 — Pre-flight (automatic during `/sc-plan`):**
- Triggered in `writing-plans` skill Phase 1: Research
- Reads project dependency files
- Identifies new deps the plan introduces
- Web-searches for compatibility data
- Outputs Compatibility Report section in the plan document
- Warns user if blockers found, suggests alternatives

**Mode 2 — Audit (triggered by `/compatibility`):**
- Full project scan: all deps, all versions, runtime versions
- Web-searches for known incompatibilities
- Outputs standalone Compatibility Audit Report
- Strictly read-only — never modifies files
- Asks for approval before any changes

### Workflow: `/compatibility`

**File:** `.agent/workflows/compatibility.md`

**Steps:**
1. Announce — "Running compatibility audit..."
2. Read `project-config.md` for known stack info
3. Scan dependency files
4. Detect versions (deps + runtime)
5. Invoke compatibility-check skill in Audit mode
6. Web search for flagged combinations
7. Generate report with severity levels
8. Present summary with actionable suggestions
9. ⛔ STOP — Ask for approval before any changes
10. Only act on user-approved items

**When to Use:** Before major upgrades, after cloning, periodic health checks, pre-deployment
**When to Skip:** Fresh greenfield projects with no deps

### Integration Points

| Integration | How |
|-------------|-----|
| `writing-plans` skill | Add step in Phase 1 (Research): invoke compatibility-check in pre-flight mode |
| `super-compound.md` rule | Add to Skills Reference table and Workflow Pipeline table |
| `project-config.md` rule | No changes needed (already has stack info) |
| `sc-launch.md` workflow | No changes needed (inherits from plan) |

## Open Questions

None — all decisions confirmed.
