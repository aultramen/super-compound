---
description: "Run a full tech stack compatibility audit. Scans dependencies, checks versions, and reports conflicts. Read-only — never modifies files without approval."
---

# Compatibility Workflow

This workflow runs a full compatibility and version audit on your project's tech stack. It is **strictly read-only** — it reports findings and suggestions, but never modifies any files without your explicit approval.

## Steps

1. **Read the compatibility-check skill** — Load `skills/compatibility-check/SKILL.md` and follow its Audit mode process.

2. **Announce** — "Running compatibility audit. Scanning project dependencies and versions..."

3. **Read project config** — Load `.agent/rules/project-config.md` for declared stack information.

4. **Scan dependency files** — Read all package manifests:
   // turbo
   - `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
   - `requirements.txt`, `pyproject.toml`, `Pipfile`, `Pipfile.lock`
   - `go.mod`, `go.sum`
   - `composer.json`, `composer.lock`
   - `Cargo.toml`, `Cargo.lock`
   - `Gemfile`, `Gemfile.lock`

5. **Detect runtime versions** — Check for:
   // turbo
   - `.node-version`, `.nvmrc`, `engines` field in `package.json`
   - `.python-version`, `requires-python` in `pyproject.toml`
   - `.tool-versions` (asdf)
   - `Dockerfile` base images
   - Runtime config files

6. **Invoke compatibility-check skill** — Run in **Audit mode**:
   - Build dependency map (all deps + versions)
   - Cross-reference key combinations
   - Check for deprecated/EOL dependencies
   - Check peer dependency conflicts
   - Verify framework ↔ runtime compatibility

7. **Web search** — For each flagged combination, search for:
   - Known incompatibilities and breaking changes
   - End-of-life and deprecation notices
   - Security advisories
   - Recommended version combinations

8. **Generate report** — Produce structured audit report with severity levels:
   - 🔴 **Critical** — Will break at runtime or build-time
   - 🟡 **Warning** — Risky, deprecated, or approaching EOL
   - 🟢 **Info** — Suggestions, newer versions available

9. **Present summary** — Show the full report with actionable suggestions.

10. **⛔ STOP — Ask for approval** — "Would you like me to apply any of these suggestions? Select which ones by number, or say 'none'."
    - **NEVER modify any file before this step**
    - Only act on items the user explicitly approves
    - For approved items, create a plan before executing changes

## When to Use
- Before major dependency upgrades
- After cloning or importing a new project (pairs well with `/init`)
- Periodic health checks on long-running projects
- Before deployment to production
- When encountering unexplained build or test failures
- When onboarding to an unfamiliar codebase

## When to Skip
- Brand new project with no dependencies yet
- Single-file scripts or trivial projects
- You just ran this workflow and nothing changed
