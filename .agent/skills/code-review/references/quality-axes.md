# Quality Axes

Load after spec compliance passes. Apply only axes relevant to the changed code, but never skip an applicable risk area.

## Correctness

- Check normal, empty, null, boundary, error, concurrency, retry, and cancellation paths.
- Look for off-by-one errors, swallowed exceptions, partial transactions, stale state, and non-idempotent retries.

## Design and Architecture

- Follow existing patterns; preserve high cohesion and low coupling.
- Reject unnecessary complexity, duplication, unjustified seams, and shallow abstractions.
- Keep business logic out of controllers/routes/UI and respect dependency direction.
- Check placement, imports, circular dependencies, ownership, and public interfaces.
- Treat 1000-line files, 50-line functions, and nesting beyond three levels as investigation signals, not automatic style verdicts.
- Ensure tests exercise behavior through public interfaces.

## Security and Privacy

Check applicable items:

- typed, length-bounded server-side validation;
- no embedded secrets, credentials, tokens, or sensitive logs;
- parameterized queries and safe shell/process invocation;
- output encoding and safe HTML handling;
- authentication on protected routes and authorization against IDOR;
- CSRF, CORS, security headers, session/JWT flags, expiry, and token refresh;
- rate limits for auth/public APIs;
- file type/size/path/storage validation;
- non-leaking production errors;
- modern password hashing and environment-based secrets;
- dependency vulnerability posture.

Use `security-audit` for deep vulnerability/auth/secrets analysis, `secure-code-patterns` for validation/crypto, and `data-privacy` for PII or consent.

## Performance

- Detect N+1 queries, unbounded reads, database calls in loops, resource leaks, and avoidable algorithmic cost.
- Confirm pagination, indexes, caching, and batching where the scale contract requires them.

## Readability

- Names communicate domain intent.
- Comments explain non-obvious why/invariants, not syntax.
- Formatting and local conventions remain consistent.
- Remove stale TODO/FIXME without tracking and debug print/log artifacts.

## Testing

- New behavior and regressions have deterministic tests, including specified errors and edge cases.
- Names describe behavior; setup remains understandable.
- Tests avoid fixed sleeps, shared mutable state, real uncontrolled networks, disabled cases, and internal-module mocking.
- Mocks represent only justified boundaries and realistic failure paths.
