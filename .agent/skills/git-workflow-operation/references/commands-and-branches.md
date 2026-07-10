## Command Previews

Standard branch start:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feature/example
```

Optional worktree start:

```bash
git fetch origin
git worktree add -b feature/example ../project-feature origin/main
cd ../project-feature
```

Finish flow:

```bash
git status
git diff
git add .
git commit -m "Describe the change"
git push -u origin feature/example
```

Use `.agent/tools/git-workflow.mjs` for deterministic previews and `.agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md` for PR text.

## Branch Names

Allowed forms:

- `feature/name`
- `fix/name`
- `hotfix/name`
- `refactor/name`
- `docs/name`
- `chore/name`

Reject empty names, spaces, shell-risky characters, `..`, `//`, `@{`, leading dash, trailing dot, trailing slash, and unsupported prefixes.
