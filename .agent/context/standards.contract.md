# Effective Standards Contract

## Summary

Load for scoped coding, planning, review/audit, standards proposals, or affected
resume drift. This contract adds no workflow, tier, or authorization boundary.

- Authority: adopted core policy + selected development profile + project
  configuration. AI host adapters convey the same sources; they own no policy.
  Rule IDs and mandatory/recommendation labels live in `.agent/standards/`;
  JSON bundles point to each rule's authoritative Markdown source.
- Read the unique `json super-compound-standards` fence in
  `.agent/rules/project-config.md`. Absent or `enabled:false` is `legacy`:
  use repository conventions/advisory references; claim no organization compliance.
- Resolve explicit target paths with
  `node .agent/tools/standards.mjs --paths-file <repo-relative-json-array>`.
  Default execution emits a read-only `effective_standards_v1` snapshot. Never replace
  configured profiles or tool config from detection/inference. Manifest/version
  evidence supports configuration; `conflict` blocks only affected standards work.
- Select profiles per directory scope; crossing scopes requires each applicable
  profile and checks. Unknown frameworks use core and repository conventions;
  report limitations rather than claiming complete framework validation.
- Pin the ready snapshot, `effectiveStandardsDigest`, source/profile versions,
  tool/config digests and explicit checks before results. The owning authorized
  route may save evidence with explicit `--output` under `.scratch`; init stays
  read-only by default. Review any changed
  pin through its owner; do not silently lower mandatory organization controls.
- Before work/debug, inspect the relevant tested reference and current repository
  pattern. Load selected rules/examples only; unsupported or unqualified examples
  are advisory. Do not coerce all stacks into one folder layout or formatter.
- Carry locators and digests through handoff/checkpoint/dispatch, using existing
  `contractRefs` and standards binding. Re-resolve affected drift before reuse.
  Do not copy profiles or recommendations into mandatory instruction constraints.
- Execute configured checks with
  `node .agent/tools/standards-checks.mjs --snapshot <ref> --output <ref>`.
  Local and application CI use this same explicit, version-pinned entrypoint.
  Hooks give early feedback. Deterministic checks do not replace human design
  review; manual review evidence remains applicable completion proof.
- Tests need a fresh configured `resultRef` with outcome counts; zero tests or
  skipped tests cannot prove passing. Manual review needs inspected observation
  evidence bound to the scope/source/standards identity, never a prose claim.
  Generated receipts/results/observations live under `.scratch`; approved waivers
  are recorded as `waived`, never as passing checks.
- Bind active completion contracts with
  `standards: {snapshotRef, digest, receiptRef}`. Existing outcome/all-AC evidence
  still proves the task. Failed, skipped, missing, stale, or wrong-scope mandatory
  checks remain incomplete; a green exit alone cannot authorize completion.
- Exceptions require rule IDs, scope, owner, reason, `expiresAt`, and approved
  evidence. Project defaults may change; mandatory controls need rule-owner review.
  Compound/evolve capture candidates only; global adoption is never automatic.

Configuration, migration, admin gates and planned pilot:
`.agent/standards/adoption.md`. Completion authority:
`skills/verification-before-completion/SKILL.md` under `.agent/`.
