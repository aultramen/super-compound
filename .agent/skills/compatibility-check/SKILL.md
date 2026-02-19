---
name: compatibility-check
description: "Use BEFORE introducing new dependencies or when auditing an existing project's tech stack. Validates version compatibility, peer conflicts, and deprecations."
---

# Compatibility Check

## Overview

Validate that libraries, frameworks, and runtime versions are compatible with each other and with the project's existing tech stack. Prevents integration failures, peer dependency conflicts, and deprecated API usage before they reach testing or production.

**Announce:** "I'm using the compatibility-check skill to validate tech stack compatibility."

**Core principle:** Check compatibility BEFORE writing code. Prevention is cheaper than debugging.

## Modes

This skill operates in two modes depending on the trigger:

| Mode | Trigger | Scope | Output |
|------|---------|-------|--------|
| **Pre-flight** | Automatically during `/plan` (Phase 1: Research) | New/changed dependencies only | Compatibility section in plan document |
| **Audit** | On-demand via `/compatibility` workflow | Full project scan | Standalone audit report |

---

## Mode 1: Pre-flight Check

**When:** Planning introduces new dependencies or major version changes.

### Steps

1. **Identify new dependencies** — Compare plan requirements against current dependency files
2. **Read current versions** — Extract versions from `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `composer.json`, `Cargo.toml`, lock files
3. **Check compatibility** — For each new dependency:
   - Web search: `"[new-dep] compatibility [existing-framework] [version]"`
   - Web search: `"[new-dep] peer dependencies requirements"`
   - Check minimum runtime version requirements (Node, Python, Go, PHP, etc.)
4. **Cross-reference with existing stack** — Verify no conflicts with current dependencies listed in `project-config.md`
5. **Report findings** — Add a `## Compatibility Check` section to the plan document:

```markdown
## Compatibility Check

| Dependency | Version | Status | Notes |
|------------|---------|--------|-------|
| new-lib    | ^3.0    | 🟢 Compatible | Works with React 18+ |
| old-plugin | ^1.2    | 🔴 Conflict | Requires Node 20+, project uses Node 18 |

### Actions Required
- [Specific resolution steps if conflicts found]
```

6. **If blockers found** — Warn user in the plan and suggest alternatives. Do NOT proceed with incompatible deps.

---

## Mode 2: Full Audit

**When:** On-demand via `/compatibility` workflow.

### ⛔ Safety Rule

```
AUDIT MODE IS READ-ONLY.
NEVER modify any file without explicit user approval.
Present findings and suggestions ONLY.
```

### Steps

1. **Scan all dependency files** — Read every package manifest and lock file in the project
2. **Detect runtime versions** — Check for `.node-version`, `.python-version`, `.tool-versions`, `engines` in `package.json`, `Dockerfile` base images
3. **Build dependency map** — List all direct + notable transitive dependencies with versions
4. **Web search for known issues** — For each major dependency:
   - Search: `"[dep] [version] known issues compatibility"`
   - Search: `"[dep] end of life deprecation"`
   - Search: `"[dep] [version] breaking changes"`
5. **Cross-reference combinations** — Check key pairs:
   - Framework ↔ Runtime (e.g., Next.js 14 needs Node 18+)
   - Framework ↔ ORM (e.g., Prisma version compatibility with Next.js)
   - Library ↔ Library (e.g., React version + React Router version)
   - Build tool ↔ Framework (e.g., Vite version + plugin versions)
6. **Check project-config.md** — Verify declared stack matches actual installed versions
7. **Classify findings** — Assign severity to each finding
8. **Generate report** — Output structured audit report (see Report Format below)
9. **⛔ STOP** — Present report and ask for approval before any actions

---

## Severity Classification

| Level | Meaning | Example |
|-------|---------|---------|
| 🔴 **Critical** | Will break at runtime or build-time | Incompatible peer deps, missing runtime requirement, known security vulnerability |
| 🟡 **Warning** | Risky but may work, or soon problematic | Deprecated dependency, upcoming EOL, version nearing end of support |
| 🟢 **Info** | Suggestion, no immediate risk | Newer stable version available, optional performance improvement |

---

## Audit Report Format

```markdown
# Compatibility Audit Report

**Project:** [name]
**Date:** [YYYY-MM-DD]
**Runtime:** [Node 18.x / Python 3.11 / etc.]

## Summary
- 🔴 Critical: [count]
- 🟡 Warning: [count]
- 🟢 Info: [count]

## Findings

### 🔴 Critical

#### [Finding title]
- **Dependency:** [name] v[version]
- **Issue:** [description]
- **Impact:** [what breaks]
- **Suggestion:** [specific fix — upgrade to vX.Y, switch to alternative, etc.]

### 🟡 Warning
[same structure]

### 🟢 Info
[same structure]

## Suggested Actions
1. [Prioritized action item]
2. [Next action]

> ⛔ **No changes will be made without your approval.**
> Which suggestions would you like me to apply? (list numbers, or "none")
```

---

## What Gets Checked

| Category | Examples |
|----------|----------|
| **Library ↔ Library** | React 18 + React Router 5 (needs v6), Vue 3 + Vuex 3 (needs Pinia or Vuex 4) |
| **Framework ↔ Runtime** | Next.js 14 needs Node 18+, Django 5 needs Python 3.10+ |
| **Peer dependencies** | Package A requires React ^17 but project uses React 18 |
| **Deprecated / EOL** | Node 16 EOL, Python 3.7 EOL, library no longer maintained |
| **Version range conflicts** | Two packages require conflicting versions of a shared dependency |
| **Build tool compatibility** | Vite plugin requires Vite 5 but project uses Vite 4 |
| **Type system** | @types/[lib] version mismatched with lib version |

---

## Vulnerability Scanning

Run security vulnerability scans as part of both Pre-flight and Audit modes. Use the appropriate command(s) for the project's stack:

| Ecosystem | Command | What It Checks |
|-----------|---------|----------------|
| Node.js (npm) | `npm audit --audit-level=high` | Known CVEs in npm registry |
| Node.js (pnpm) | `pnpm audit --audit-level=high` | Known CVEs in npm registry |
| Node.js (yarn) | `yarn audit --level high` | Known CVEs in npm registry |
| Python | `pip-audit` | Known CVEs via PyPI advisory DB |
| Python (alt) | `safety check` | Known CVEs via Safety DB |
| Python (SAST) | `bandit -r . -ll` | Static analysis for common issues |
| Go | `govulncheck ./...` | Go vulnerability database |
| Go (SAST) | `gosec ./...` | Static analysis for Go |
| PHP | `composer audit` | Known CVEs in Packagist |
| Rust | `cargo audit` | RustSec advisory database |
| Ruby | `bundle audit check --update` | Ruby advisory database |

**Severity mapping:**
- 🔴 **Critical/High CVE** → Same as Critical compatibility finding
- 🟡 **Medium CVE** → Same as Warning
- 🟢 **Low CVE** → Same as Info

**In Pre-flight mode:** Run scan only for newly added dependencies.
**In Audit mode:** Run full scan and include results in the audit report.

> For comprehensive security analysis beyond dependencies, use the **security-audit** skill or `/security` workflow.

---

## Red Flags

| Thought | Reality |
|---------|---------|
| "These versions are probably fine" | Search for actual compatibility data. Don't guess. |
| "The latest version should work" | Latest ≠ compatible. Check the combination. |
| "I'll just install it and see" | Check BEFORE installing. Prevention beats debugging. |
| "Peer dep warnings are just warnings" | Peer dep mismatches cause subtle runtime bugs. |
| "I can fix compatibility issues later" | Later = after test failures + wasted time. |

---

## Integration

**This skill is used by:**
- **writing-plans** — Pre-flight check during Phase 1: Research
- **executing-plans** — When a task introduces dependencies not in the plan

**This skill pairs with:**
- **architecture-enforcement** — Architecture rules + compatibility rules = safe code
- **systematic-debugging** — When bugs stem from version incompatibility

**This skill feeds into:**
- **knowledge-compounding** — Document resolved compatibility issues for future reference
