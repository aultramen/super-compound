# Codex Adapter

This adapter installs Super Compound as a Codex skill while keeping `.agent/` canonical. The installed `SKILL.md` prefers a live project's compact `.agent/context/` routing and loads full instructions only on demand; bundled references are the fallback when a project has no `.agent/` directory.

## Install

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex\install-super-compound.ps1
```

The destination is `$CODEX_HOME\skills\super-compound`. If `CODEX_HOME` is unset, the installer uses `$HOME\.codex`. Use an explicit isolated destination for testing:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex\install-super-compound.ps1 -CodexHome C:\temp\codex-home
```

The installer copies `.agent/context`, workflows, skills, templates, rules, agents, hooks, and runtime tools into `references/`, excluding generated Python bytecode caches. It builds the replacement in a path-confined staging directory, verifies its exact file set and deterministic SHA-256 manifest, then swaps it into place. A copy/hash failure rolls back to the previous verified installation. Stale files are removed only through that managed replacement, and a clean second run is a no-op.

## Verify

Verification is read-only and compares the installed file set, manifest, and hashes with the current canonical sources:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex\install-super-compound.ps1 -VerifyOnly
```

Run the normal install again to repair missing, stale, or modified files. Start a new Codex session after installation so the skill is discovered.
