---
description: "Initialize or refresh project context by scanning the codebase, config, commands, and framework conventions."
---

# Init Workflow

## Usage

```text
/sc-init
/sc-init reload
```

## Steps

1. Read `.agent/rules/project-config.md`.
2. Inspect package manifests, lockfiles, config files, README, tests, source layout, and existing docs.
3. Infer stack, commands, architecture, dependency manager, database, and deployment hints.
4. Suggest updates to project config instead of guessing silently.
5. Create or refresh concise codebase notes when useful.
6. For `/sc-init reload`, re-read rules/workflows/skills that changed and summarize what matters.

## Output

- Current stack and commands.
- Gaps or recommended config changes.
- Next recommended workflow.
