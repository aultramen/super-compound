# Shared Application Core

This versioned baseline is a **candidate for organization owner adoption**. Its
presence in a bundle does not prove approval. The named owners are governance
roles; projects must record the real approving owner before enforcement.

This file governs application projects using an adopted bundle. Root `AGENTS.md`
and `docs/engineering-standards.md` govern contributions to Super Compound; they
are not automatically an application's policy. Profiles govern stack conventions;
host adapters deliver references and identities, not alternative rules.

<a id="review"></a>
## Review

`CORE-REVIEW` is mandatory within an adopted baseline. A reviewer examines changed
behavior for readability, cohesive responsibilities, dependency direction, explicit
error handling and relevant integration contracts. Reuse existing local patterns;
avoid speculative abstractions. Preserve public contracts unless an authorized
change includes consumer/migration evidence. Handle or propagate errors with safe
context; do not silently swallow failures or expose internal details to users.

Record the reviewed scope, revision, reviewer, findings and resolution. Automated
formatting or import checks do not prove design quality. Scope and proportional
review follow the existing [code-review skill](../skills/code-review/SKILL.md).

<a id="testing"></a>
## Testing

`CORE-TEST` is mandatory within an adopted baseline. Verify changed behavior and
regressions with deterministic tests proportionate to the scope; control clocks,
randomness, external services and shared state when needed. Use the project's
existing test framework and fixtures. A test gate needs observed test outcomes;
an empty suite, skipped tests, an unexecuted command or a stale report is not pass.

Completion remains governed by the existing
[verification-before-completion skill](../skills/verification-before-completion/SKILL.md).
Exceptions are explicit approved exceptions, not successful test evidence.

<a id="security"></a>
## Security

`CORE-SECURITY` is mandatory within an adopted baseline. Validate untrusted input
at trust boundaries; use parameterized queries and context-appropriate encoding,
keep secrets and personal data out of source/evidence, and fail closed on access
control errors. Apply authentication, authorization, safe client errors and abuse
controls when the changed capability exposes HTTP or sensitive operations.

Use explicitly configured relevant security checks and record their actual scope.
A scanner's pass does not certify every security property. Human judgement uses
the [security-audit skill](../skills/security-audit/SKILL.md); HTTP implementation
references remain in
[HTTP/security](../skills/architecture-enforcement/references/http-security.md).
Profiles must not invent a second universal security policy.
