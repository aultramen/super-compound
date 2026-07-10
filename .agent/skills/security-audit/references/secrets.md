## Secrets Handling

Golden rules:

- No secrets in source, docs, tests, screenshots, logs, telemetry, or prompts.
- `.env` stays ignored; `.env.example` contains placeholders only.
- Read credentials from environment variables, secret managers, or platform config.
- Production secrets are scoped by environment and rotated after exposure.
- Error responses never include secrets, stack traces, internal paths, or provider payloads.

Audit commands are project-specific, but common checks include:

```bash
rg -n "(api[_-]?key|secret|token|password|private[_-]?key|BEGIN .*PRIVATE KEY)" .
git status --short
git log --all --full-history -- .
```

If a real secret is found:

1. Do not print the full value.
2. Identify affected file, commit range, and exposure channel.
3. Rotate or revoke the credential.
4. Remove it from active files and history only with explicit user approval.
5. Add regression checks or documentation to prevent recurrence.
