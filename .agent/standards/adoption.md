# Adopt Scoped Engineering Standards

## Summary

Adopt one reviewed core with scoped stack profiles and explicit checks. Preserve
existing project settings and record fresh completion evidence; real-host pilot
and administrator activation remain separate work.

## Model and ownership

One framework-agnostic super-compound core serves all stacks and AI hosts. The
goal is consistent compliance with adopted rules, not similar code text.

| Layer | Authority and responsibility |
|---|---|
| Core policy | `.agent/standards/core.json` identifies rule IDs and mandatory/recommendation labels, linking authoritative Markdown for maintainability, applicable security/integration controls, testing and completion evidence. |
| Development profile | `.agent/standards/profiles/nextjs-typescript.json` or `fastapi-python.json`: scoped naming/style, formatting, placement, dependencies, errors, testing and tool requirements. Existing architecture references remain on-demand guidance. |
| Project configuration | The unique `json super-compound-standards` fence in `.agent/rules/project-config.md`: active profiles, pinned identities, directory scopes, explicit validation commands and approved exceptions. |
| AI host adapter | Routes to `.agent/context/standards.contract.md` and the same adopted sources; owns no copied policy or separate SDLC. |

`docs/engineering-standards.md` and repository `AGENTS.md` guide development of
super-compound itself. They do not automatically impose that repository's layout
or tooling on application projects. Project choices may tune defaults; mandatory
organization controls need rule-owner review. Rule changes use the existing
authorized work owner; compound/evolve produce evidenced candidates only.

The initial catalog contains candidate core, Next.js/TypeScript and FastAPI/Python
bundles at version `1.0.0`; installation is not organization adoption. Existing
references for other stacks are not qualified profiles.
Core-only unknown-framework scopes report limitations and retain repository
conventions; they must not claim complete framework validation.

## Configure and resolve

The optional [SOLO-OWNER/1.0.0 contract](solo-owner.md) uses existing
`adoption.reviewAuthority` only after an actual scoped decision and protected
trusted-base appointment. It labels native owner `COMMENTED` inspection as owner
self-review; local JSON cannot authenticate or bootstrap CI authority. It leaves
existing independent qualification/enforcement approvals and G2-SO pilot thresholds
unchanged. Absent this optional field, the existing nonauthor `APPROVED` transport
remains mandatory. This guide does not activate the optional mode.

The shipped block is disabled. Missing/disabled standards return `legacy`, keep
existing conventions and make no organization-compliance claim. Preserve the
existing YAML settings and user approval preferences when editing this fence.

| Field | Required activation content |
|---|---|
| `schema`, `enabled` | `project_standards_v1`, then `true` only after reviewed configuration; never enable from manifest detection. |
| `core` | `{ref, version, digest}` pointing at the reviewed repository-local core file. Pin the exact version and SHA256 bytes. |
| `scopes` | Each `{path, profile, frameworkVersion, configRefs, checks}` binds a directory prefix to a selected profile; the most specific matching prefix wins. `profile` is `{ref, version, digest}` or `null` for core-only coverage. Optional `dependsOn` lists shared directory prefixes whose edits affect the scope's checks. |
| `configRefs` | An array of repository-relative path strings for validation/lock/config files; the resolver computes their digests in snapshot `inputs`. Include files the configured tool actually consumes. |
| `checks.review` | `{method: "manual", observationRef}`; substantive design/acceptance judgment needs recorded human review evidence. |
| Other `checks` | Explicit `test`, `security`, `format`, `lint`, `type`, `architecture` entries as required by the selected sources; each declares `{command, args, tool: {command, args, version}}`, optional repository-relative `cwd`, `configRefs` and `timeoutMs`; `test` also needs `resultRef`. Use argument arrays, not inferred shell strings. |
| `exceptions` | Approved entries carry `{ruleIds, scope, owner, reason, expiresAt, approvalRef, approvalDigest}`. Scope and rule IDs must match; expired or unsupported exceptions cannot waive checks. |
| `adoption` | `{owner, approvalRef, approvalDigest}` binds the rule owner's review to real repository-local approval evidence. Do not seed fictional approvals. |

Resolve an explicit repository-relative JSON path array through the existing
owning workflow:

```text
node .agent/tools/standards.mjs --paths-file .scratch/standards/paths.json
```

Default execution is read-only and prints `effective_standards_v1`; it does not
activate configuration. The authorized work/planning owner may supply explicit
`--output .scratch/standards/effective.json` to store the snapshot, then pins its
`effectiveStandardsDigest` before check results. `/sc-init` stays read-only by default.
The resolver exits nonzero for `legacy` or `conflict`; these statuses must not
be presented as established organization compliance.
Snapshot paths/scopes/rules/checks/inputs/inventory expose the effective sources,
mandatory/recommendation distinction, conflicts and limitations. A `conflict` requires
owning-route reconciliation rather than guessing replacements. Each changed
directory uses its applicable scope; sibling profiles must not contaminate one
another. Manifest/version/layout detection is supporting evidence only. Include
lockfiles/config in `configRefs` and use the project's frozen/locked installation
procedure locally and in CI; a dependency declaration alone does not prove the
installed framework version. Bundle/project configuration changes require fresh
affected snapshots rather than relying on a previous receipt.
Digests bind exact file bytes; preserve agreed line endings (for example with
repository `.gitattributes`) across developer and CI checkouts. A digest detects
drift; protected rule/config paths and owner review establish approval authority.

For real-project preflight, inspect the original read-only and resolve proposed
active configuration only in an isolated source-only copy. Preserve module paths
and record the selected source/config/lock hashes; exclude credentials, runtime
data and generated dependencies. The resolver inventories configured directories,
not the Gitignore selection, so an original root scope can capture unrelated data.
Inspect repository-supplied executable tool configuration, its imported helpers,
install hooks and plugins before installing dependencies or running checks. A
frozen lockfile provides reproducibility, not trust in executable configuration.

Put framework-specific bindings on their leaf scopes. Ancestor check bindings
inherit by check ID; override incompatible defaults explicitly and use distinct
result paths for each consumer. A configured binding is scheduled only when an
adopted mandatory rule references its ID. The resolver reports unused bindings in
`limitations`; their results are outside the standards receipt, including extra
formatter or linter bindings on a core-only scope. A ready snapshot identifies
the applicable configuration; passing compliance still requires the mandatory
checks, fresh evidence and the stated limitations.

Before coding or debugging, inspect the relevant qualified reference/example
and the current repository pattern. Examples prove their stated bounded checks,
not an entire framework or deployed application. Load only relevant rules and
references; keep snapshot locators/digests in handoffs, checkpoint `contractRefs`
and worker/reviewer briefs. Do not expand startup context or turn defaults into
mandatory instruction constraints.

## Checks, completion and application CI

After snapshot review, local execution and application CI invoke the same tool:

```text
node .agent/tools/standards-checks.mjs --snapshot .scratch/standards/effective.json --output .scratch/standards/checks.json
```

Only project-declared validation commands execute. Pin tool versions and config
digests; run check-only formatter/linter modes, never a hidden mass reformat.
Inspect script arguments rather than assuming a script named `lint` or `format`
is read-only. Configure failure on mandatory findings when a linter downgrades
errors to warnings. Match the application's reviewed runtime and frozen tool
installation locally and in CI, including the fresh receipt-verification job;
the reference example's runtime is not an application runtime requirement.
The configured `tool.version` must match the trimmed output of its explicit
version-probe command; receipt verification probes the current version again.
Use stable version output across supported environments; a banner containing OS
or architecture needs an explicit portable probe rather than a different CI pin.
Put generated receipts, `resultRef` and `observationRef`
under `.scratch` with separate paths per scope/check; keep them distinct from
source, policy and snapshot files.
Map rule IDs to check results. Format/lint/type/tests/security and configured
dependency-boundary checks are deterministic where their tool supports it;
maintainability, threat coverage, architecture choices and substantive review
still require inspected evidence and human judgment. Hooks provide early
feedback, not merge authority.

Test runners produce a fresh configured `resultRef` with
`{schema: "standards_check_outcome_v1", status, observed, counts:
{total, passed, failed, skipped}}`. `observed` must describe the actual result;
passing requires more than zero tests and zero failed/skipped tests. Use the
supplied test-result converters under `.agent/standards/tools/` for their supported
runner output, without hiding failed or skipped results.

Manual `observationRef` records use `standards_review_v1`, with `checkKey`,
`standardsDigest`, `sourceDigest`, `status: "pass"`, `observer`, `steps`, `observed`
and `timestamp`. Record actual inspection, identity and observations; a file's
existence or an AI assertion cannot establish review truth. Refresh after affected
changes rather than copying an old timestamp or digest.

Active completion contracts add
`standards: {snapshotRef, digest, receiptRef}` to the existing request/FSD-derived
outcome and all-AC proof. A check receipt is additional evidence, not an outcome
substitute. Failed, not-run, skipped, stale, wrong-scope or missing mandatory
checks cannot yield completion or release dependencies. Retain existing light/full
tiers, stage/exception approval preferences and completion ledger enums.
Approved scoped exceptions are reported as `waived`, never `pass`; preserve the
exception owner, reason, expiry and approval evidence alongside the receipt.

Application maintainers add the shared entrypoint to their CI, uploading scoped
snapshot/receipt and outcome evidence for the tested revision. The repository
administrator separately activates **required status checks**, branch/ruleset
protection and controlled bypass access, then proves that a failing required
check blocks merge. A workflow file does not activate that protection. The
administrator records owner, status names, bypass principals, audit expectations
and the protection-test result; avoid path-filtered jobs producing misleading
skipped green merge gates. A required aggregate reports only when all applicable
scope checks ran and passed.

Super-compound's own CI verifies the resolver, receipts, catalogs, fixtures,
contracts and packaging. It does not establish enforcement in an application's
repository or prove its real-host adoption.

## Planned pilot and adoption gates

The live developer/AI-host pilot is planned, not executed by adding these assets.
Use the [live pilot operator packet](pilot.md) and its
[40-observation register](pilot-observations.csv) to execute and adjudicate the
approved matrix. The [operating and release packet](operations.md) assigns
qualification, protection, versioning, exception and rollback responsibilities.
These packets extend this procedure; they are not additional project configuration.
Run **40 observations**: five paired baseline/advisory-standard runs for each
group below, ten observations per group. Record source revision/dirty identity,
task/AC, host/model, developer, source/profile/tool/config digests and environment
for each pair. Use equivalent tasks and fixed fixtures; disclose confounders.

| Group | Pilot and negative checks |
|---|---|
| A | Two developers using two available AI hosts, same framework/profile/version. Inject formatting, lint and type violations; both hosts must select the same applicable rules and detect the faults. |
| B | Next.js/TypeScript and FastAPI/Python share one core, use their own profile. Inject test and security failures; compare rule compliance, not implementation text. |
| C | One multi-framework monorepo with isolated directory scopes. Inject forbidden dependency edges and cross-scope configuration leakage; unrelated source-only edits preserve sibling scope evidence, while shared policy/config changes require re-resolution. |
| D | Unknown framework, conflicting pins/manifests, legacy config and expired exception. Expect truthful core-only limitations, visible conflicts and legacy advisory behavior; skipped/missing/stale mandatory results must not become passing proof. |

Measure applicable mandatory-rule compliance, formatter consistency, confirmed
lint/architecture defects, review rework attributable to style, context bytes/
tokens and CI duration. Reuse context-load measurement for cold entry, warm reuse,
execution, checkpoint and resume; keep host-injected costs separate. Similar code
text is not a success metric.

Adopt in three reviewed stages:

1. **Audit:** Inventory existing rules/config/tools and capture baseline metrics,
   unsupported scopes and user settings. Do not mutate project configuration.
2. **Advisory:** Trial explicitly reviewed snapshots and checks alongside current
   gates. Exit when all planned seeded violations are detected, scope/host routing
   agrees, false positives are adjudicated and overhead is recorded. No compliance
   claim based solely on an advisory run.
3. **Enforcement:** Rule-owner review approves mandatory checks and exceptions;
   application administrator activates required merge checks and verifies blocked
   merge/bypass behavior. Require current proof and acceptable measured overhead;
   unmet criteria keep that scope advisory.

This is adoption progression, not a new public command or workflow runtime mode.

## Migration and rollback

- Inventory old configuration, tool versions, approvals and local conventions
  before enabling. Missing/disabled blocks remain compatible; unsupported schema
  or conflicting pins require explicit repair, not a silent fallback to green.
- Review a narrow migration diff and pin source/profile/tool/config versions.
  Change only selected scopes; preserve user config, avoid mass reformat and
  separate any intentional formatting cleanup from behavioral work.
- Standards upgrades require owner review and fresh checks for affected scopes.
  Preserve prior snapshots, receipts and approval references as historical evidence;
  changed identities cannot prove the new revision.
- For rollback, restore the previous reviewed configuration, pinned sources and
  tool/config files, re-resolve and rerun affected gates. Coordinate status-check
  changes with the application administrator; do not silently disable mandatory
  organization controls. An approved return to disabled/advisory mode reports that
  organization compliance is unproven.
- Exceptions carry owner/reason/scope, approval evidence and `expiresAt`; review
  expiry and compensating controls. Captured lessons or deadline pressure never
  authorize a global standard change.
