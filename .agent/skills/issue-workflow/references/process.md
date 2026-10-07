## Process

### 1. Gather Source Context

Read the source material needed to slice safely:

- Approved FSD under `docs/fsd/`
- Upstream PRD and BRD IDs referenced by the FSD
- Linked accepted ADRs under `docs/solutions/adr-####-<slug>.md`, if any
- Relevant `CONTEXT.md`, code, tests, and previous `.scratch/` boards

If a local board needs a parent file, create `.scratch/<feature-slug>/FSD.md` as a short pointer to `docs/fsd/fsd-<feature>.md`, not a copy of the FSD.

### 2. Draft Goal Issue Pointers

Each issue must point to one `FSD-<PROJECT>#GOAL-xxx` packet that:

- produces one coherent, independently verifiable outcome
- has explicit requirement and acceptance references
- lists dependencies and no hidden prerequisite
- bounds allowed and prohibited scope in the FSD
- states data/API/UI/job/security impact in the FSD
- includes verification references or exact commands
- for full-tier networked UI, pins UI delivery role, `CONTRACT-*`, `UIMAP-*`,
  `SCHEMA-*`, fixture/test refs, contract version, and required gate
- has no unresolved blocker

Use foundational goals only for contracts, migrations, adapters, or infrastructure that are independently testable.

### 3. Build The Dependency DAG

For every issue, assign:

- `id`: the FSD goal ID such as `GOAL-001`
- `title`: short atomic outcome title
- `blocked_by`: issue paths or `None`
- `upstream_refs`: qualified BRD/PRD/FSD refs
- `technical_refs`: `FSD-*#TDEC-*` refs when relevant
- `adr_refs`: linked `ADR-*#DEC-*` refs or `None`
- `verification_refs`: FSD test or command IDs
- `contract_refs`: versioned FSD contract/mapping/schema/fixture IDs when applicable
- `contract_gate`: `NOT_APPLICABLE`, `READY_FOR_SLICE`, or `FIRST_VERTICAL_SLICE_VERIFIED`

Validate before publishing:

- Every blocker path exists or will be created earlier.
- Blockers come before dependents.
- No circular dependencies exist.
- Parallel candidates do not require the same unmerged files unless the FSD states an integration strategy.
- Networked UI DAG order is optional `CONTRACT_ENABLER` -> internal planning-owned mechanical readiness promotion -> exactly
  one active real `FIRST_VERTICAL_SLICE` per pinned revision -> dependent
  `SCALE_OUT_SLICE` issues -> one `HARDENING` issue blocked by all applicable UI
  delivery slices. Scale-out also requires a `VALIDATED` PRD baseline. Unchanged
  derived evidence/index revisions do not re-enter full planning. LOCAL_ONLY
  maps local state/data/behavior and accessibility tests in its goal; add a
  separate hardening pointer only for outstanding merged/cross-slice checks.
- Shared schemas, generated clients, fixtures, migrations, lockfiles, and
  registries are an explicit dependency or single-writer stream.
- Every ADR ref points to an accepted linked ADR.

If there is a cycle, missing authority, or unresolved decision, revise the FSD or create an `OPEN-*` blocker before writing ready issues.

### 4. Validate The Derived Board

Validate goal coverage, qualified refs, dependency ordering, ownership, and
applicable gates, then write the board without re-approval of approved decisions.
Notify the user with a concise goal/dependency summary and validation results.
Only a material change outside approved authority returns to the decision owner.

### 5. Publish Local Issues

Create issue files in dependency order so blockers receive lower numbers.

Create each issue from
`.agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md`; do not
restate the template in this procedure. Populate only qualified references,
dependency paths, and concise goal-specific boundaries.

For blocked issues, use relative issue paths in `Blocked by`, such as:

```text
Blocked by: 01-contract-and-schema.md, 02-domain-behavior.md
```

If a goal is blocked by a missing decision, set `Status: blocked` and include an `OPEN-*` record in `## Stop Conditions`.
