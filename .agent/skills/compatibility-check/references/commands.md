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
