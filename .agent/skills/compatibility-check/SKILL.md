---
name: compatibility-check
description: "Use before introducing dependencies or when auditing stack compatibility. Validates runtime support, peer conflicts, deprecations, vulnerability posture, and rollback risk."
---

# Compatibility Check

## Purpose

Prevent dependency and runtime surprises before they become build failures, production bugs, or security risks.

Announce: "I'm using the compatibility-check skill to validate tech stack compatibility."

## Modes

| Mode | Trigger | Scope | Output |
|---|---|---|---|
| Pre-flight | `/plan` introduces dependencies, vendors, runtimes, containers, or major version changes | Proposed changes | Compatibility section in the plan |
| Audit | `/audit compat` or explicit request | Current project stack | Read-only compatibility report |
| Debug support | A failure looks version-related | Suspect dependency pair | Root-cause note and fix options |

Audit mode is read-only unless the user explicitly approves changes.

## What To Inspect

- `package.json`, lockfiles, `requirements.txt`, `pyproject.toml`, `go.mod`, `composer.json`, `Cargo.toml`, and equivalent manifests
- Runtime declarations such as `.node-version`, `.python-version`, `.tool-versions`, `engines`, Docker base images, CI config, and deployment config
- Framework, build tool, language, and library version pairs
- Peer dependencies and optional peer dependencies
- Deprecated APIs or end-of-life runtimes
- Native extensions, platform constraints, and browser/server compatibility
- Licenses, install scripts, provenance, and suspicious package names for new dependencies

## Pre-Flight Steps

1. List new or changed dependencies and runtimes.
2. Read current versions from manifests and lockfiles.
3. Use `context7-docs` for version-specific primary docs when available.
4. Check peer requirements, runtime minimums, and breaking-change notes.
5. Run native audit commands when the ecosystem supports them.
6. Document result in the plan.
7. If a blocker exists, propose alternatives before implementation.

Plan section:

```markdown
## Compatibility Check

| Item | Current | Proposed | Status | Notes |
|---|---:|---:|---|---|
| example-lib | n/a | 3.x | OK | Supports Node 20 and React 19 |

### Required Actions
- <install, pin, replace, or defer>
```

## Audit Steps

1. Scan manifests, lockfiles, runtime declarations, CI, and deployment config.
2. Build a direct dependency map and note critical transitive dependencies.
3. Check major dependency pairs:
   - Framework and runtime
   - Framework and ORM
   - Library and library
   - Build tool and plugin
   - Test framework and runtime
4. Run ecosystem vulnerability checks where available.
5. Classify findings by severity.
6. Present a report and wait for approval before applying fixes.

## Common Commands

Use only commands that fit the project:

| Ecosystem | Commands |
|---|---|
| npm | `npm audit --audit-level=high`, `npm ls` |
| pnpm | `pnpm audit --audit-level=high`, `pnpm list` |
| yarn | `yarn npm audit --severity high` or project-supported equivalent |
| Python | `pip-audit`, `python -m pip check` |
| Go | `govulncheck ./...`, `go list -m all` |
| PHP | `composer audit`, `composer show` |
| Rust | `cargo audit`, `cargo tree` |

If a tool is missing, report that limitation instead of inventing a result.

## Severity

| Level | Meaning |
|---|---|
| P0 | Known exploitable vulnerability, active breakage, or unsupported production runtime |
| P1 | Likely build/runtime break, incompatible peer dependency, or high CVE |
| P2 | Deprecated or near-EOL dependency, medium CVE, risky but workable mismatch |
| P3 | Upgrade opportunity, cleanup, or low-risk warning |

## Report Format

```markdown
# Compatibility Audit

## Summary
- P0: 0
- P1: 1
- P2: 2
- P3: 3

## Findings

### P1: <title>
Item: <dependency/runtime>
Evidence: <manifest, lockfile, docs, command output>
Impact: <what can break>
Recommendation: <specific action>
Verification: <command>

## Suggested Order
1. <highest value fix>
```

## Red Flags

| Thought | Better Response |
|---|---|
| "Latest should work" | Check the version pair |
| "Peer warnings are harmless" | Confirm runtime behavior and test coverage |
| "Install first, fix later" | Check compatibility before adding the dependency |
| "The audit tool is enough" | Also check support policy, docs, and lockfile state |

## Related Skills

- `context7-docs` for version-specific documentation
- `security-audit` for broader security analysis
- `writing-plans` for pre-flight planning
- `systematic-debugging` when failures may be version-related
- `knowledge-compounding` for documenting resolved compatibility issues
