---
description: "Initialize or refresh project context by scanning the codebase, config, commands, and framework conventions."
---

# Init Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.

Inspect project context, then route the first task; use setup mode only for installation.



## Example

Input: `/sc-init`.
Prerequisite: Installed framework in the current workspace.
Result and next action: Detected stack, verification commands and gaps; /sc-status chooses the next task.

## Usage

```text
/sc-init
/sc-init reload
/sc-init setup
```

## Setup Submode

Only `/sc-init setup` authorizes installation. Read `SETUP.md`, detect OS/host,
ask the missing scope (project/global/both), preserve existing configuration,
then run setup install/update and doctor. Use project core before global cache;
activate projects from `~/.super-compound/framework` when no checkout is present.
Installation never authorizes project implementation, Git delivery, or publication.

## Steps

1. Read `.agent/rules/project-config.md`.
2. Inspect package manifests, lockfiles, config files, README, tests, source layout, and existing docs.
3. Infer stack, commands, architecture, dependency manager, database, and deployment hints.
4. Detect Git defaults such as base branch and remote when useful, then suggest `gitWorkflow` updates instead of guessing silently.
5. Suggest updates to project config instead of guessing silently.
6. Stay read-only by default. Create or refresh a concise codebase note only
   when the user requested initialization notes; never rewrite config or source
   from an inference.
7. Report enabled MCP/tool schemas and installed skill metadata when the host exposes them. Mark unavailable measurements `unknown`; do not disable capabilities automatically.
8. For `/sc-init reload`, re-read rules/workflows/skills that changed and summarize what matters.
9. Then run `/sc-status` to pick the next route from durable state.

## Output

- Current stack and commands.
- Gaps or recommended config changes.
- Host-injected context surface: measured values or explicit `unknown`.
- Next recommended workflow.
