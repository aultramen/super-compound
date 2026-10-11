# Distributed Application Standards

The core and two development profiles are versioned **candidates**. Rule owners
must review and adopt them; installing files is not organization approval.
Core policy, development profiles and AI host adapters have separate roles.
Contributor `AGENTS.md` and `docs/engineering-standards.md` remain repository
guidance, not implicit application policy.
Adoption, pin changes and rollout follow the [adoption guide](adoption.md).

JSON bundles identify rules and point to authoritative Markdown anchors. Core
mandatory check IDs are `review`, `test`, `security`; supported profiles add
`format`, `lint`, `type`, `architecture`. `recommendation` rules are defaults that
projects can adjust; mandatory controls need explicit approved exceptions.
Commands here are suggestions only. Explicit project configuration, pinned tool
versions and existing accepted tool configs determine what local and CI run.

Load the relevant profile and reference only for the changed directory. Do not
paste every profile into startup context or maintain manual per-host copies.
Bundle hashes are computed externally from content; no self-referential hash is
stored here. Identical bundles alone do not prove identical tool configuration.

## Reference Examples

- [Next.js / TypeScript](examples/nextjs-typescript/README.md): App Router route,
  service, Vitest tests and static ESLint import mapping.
- [FastAPI / Python](examples/fastapi-python/README.md): route, service, pytest
  tests and Python AST import mapping.

These isolated examples do not certify an application's production security or
deployment. Their direct dependencies/tooling are pinned. Applications should
retain their existing lockfiles and resolve transitive dependencies consistently.

## Result Adapters

`tools/vitest-outcome.mjs --input <vitest.json> --output <outcome.json>` and
`tools/pytest-outcome.py --input <junit.xml> --output <outcome.json>` convert actual
test case records into `standards_check_outcome_v1`. They emit `pass`, `fail` or
`skip`, a case-derived `observed` description and counts. Zero/failed/skipped
tests never pass. Malformed reports exit nonzero. Configure test+adapter as one
explicit validation entrypoint; the runner must clear result outputs before each
run so stale files cannot prove current work.

`tools/python-boundaries.py --root <project> --config <mapping.json>` uses Python
stdlib AST only. The mapping has `schema: python_boundaries_v1`, nonempty relative
`sourceRoots`, and `rules: [{from: "app.domain", forbidden: ["fastapi"]}]`.
Paths stay inside the project; invalid mappings, syntax errors and empty source
roots fail rather than report compliance. Its result states static-analysis limits.
