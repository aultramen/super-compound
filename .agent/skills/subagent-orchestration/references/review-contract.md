# Work-Package Review Contract

Load this reference only when dispatching or reviewing a file-backed goal.

## Implementer Contract

- Read `briefPath` and every qualified reference before editing.
- Follow existing patterns and exact target paths.
- Use repository patterns for reversible internal details. Stop the affected
  scope with `OPEN-*` only for missing/contradictory acceptance, contract, policy,
  or security authority; ordinary implementation judgment remains delegated.
- Write a failing test first for behavior/regression changes.
- Implement only the named goal and run its mapped verification.
- Write the full report to `reportPath` with outcome, changed files,
  verification, deviations, and blockers.
- Return only: outcome, report path, verification status, and blockers. Do not
  return the diff or report body.

## Single-Read Reviewer Contract

Use scheduler self-review for mechanical low-risk work and an independent
reviewer when behavior, security, contracts, complexity, or failure risk warrants
it. Review `briefPath`, `reportPath`, and `reviewPackagePath`. Write separate
verdicts so spec and quality remain independently actionable.

### SPEC Verdict

- All acceptance and verification refs are satisfied.
- Required files/behavior exist; no required functionality is missing.
- No extra scope, unapproved deviation, or invented contract exists.
- Tests cover new behavior and reported verification is supported by evidence.

### QUALITY Verdict

- Existing architecture and local patterns are preserved.
- Implementation is readable and no more complex than necessary.
- Boundary validation, error handling, security, and integration are adequate.
- No dead code, debug artifacts, unrelated edits, or sensitive output exists.

## Review Output

```markdown
# <goal-id> Review

SPEC: PASS | FAIL
QUALITY: PASS | FAIL

## Critical / Important Findings
- <file:line, evidence, required fix>

## Suggestions
- <optional improvement>

## Verification Checked
- <command/result or missing evidence>
```

Emit the Findings, Suggestions, and Verification Checked sections only when
non-empty.

If either verdict fails, return the review path plus a bounded finding summary.
Batch applicable spec and quality findings together when omissions do not make
intent ambiguous. An ambiguous spec pauses the affected judgment; it need not
suppress findings already supported by evidence. Regenerate the patch after
fixes and re-review affected evidence. Use the shared attempt/reassessment and
escalation rules in [orchestration loop](orchestration-loop.md), without a
separate two-cycle shutdown rule.

## Scheduler input and transition contract

The scheduler writes JSON files, not shell-interpolated JSON. `create-input.json`
contains `expectedEvidence` with `authorityDigest`, `evalDigest`, and
`reviewerDigest`: actual lowercase SHA-256 digests of the pinned authority,
verification plan, and review contract. Optional `composition` contains
`maxTokens` and `background: [{text, ref}]`. The CLI requires the three digests;
no untyped review assertion substitutes for them. Mechanical self-review still
pins its review contract and stores evidence.

After `create`, read its returned `ledgerVersion`. Before every `record`, read
current ledger state and write `transition-input.json` with `expectedVersion`
set to that version. The scheduler runs records serially; a stale version means
reconcile and retry, never overwrite another mutation.

- `ready -> in-progress`: `{"expectedVersion": <current version>}`.
- `in-progress -> implemented` and `implemented -> verified`: include `evidence`
  containing the same three digest fields and `evidenceRefs`, an array of 1-100
  unique repository-relative paths to actual bounded evidence files. Store
  evidence separately from mutable work-package control files. The tool hashes
  each evidence file; preserve its contents for later freshness checks.
- `ready|in-progress|implemented -> blocked` and
  `in-progress|implemented -> failed`: include `reason: {code, detail}` with an
  uppercase reason code and a nonempty detail of at most 500 characters.
- `blocked|failed -> ready`: include `recovery: {code, evidenceRef}` pointing
  to actual recovery evidence. Then repeat the supported intermediate states;
  `verified` is terminal.

Use `work-package.mjs record --run <run> --goal <goal> --status <status>
--verification <short result> --input-file <transition-input.json>` for each
transition. Keep full command/result and provenance in the referenced evidence.
The scheduler generates these files; the implementer reports progress and never
mutates pinned scope or shared ledger directly.
