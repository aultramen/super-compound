# Standards Ownership and Release Operations

## Summary

Keep one core, stack profiles, existing project configuration and existing quality
gate entrypoints. This packet records who approves qualification and adoption,
how maintainers release/upgrade, and how applications prove protection and roll
back. It extends [adoption](adoption.md) and the [live pilot](pilot.md), without
enabling enforcement, creating commands or granting new execution authority.

## Accountable ownership

| Role | Owns | Required real appointment |
|---|---|---|
| Central engineering standards owner | Core policy, mandatory control changes, adoption/release decision. | Named organization approver and protected ownership path. |
| Framework maintainer | Resolver/runner/completion compatibility, packaging, six adapters and nineteen workflows. | Repository maintainer responsible for qualified candidate. |
| Profile maintainers | Next.js/TypeScript or FastAPI/Python conventions/tools and golden references. | At least one accountable maintainer per active profile. |
| Security owner | Relevant security coverage, intelligence provenance/freshness and accepted residual risk. | Authorized security reviewer independent of implementation. |
| Application maintainer | Directory scopes, actual commands/config/locks, migration and current evidence. | Accountable maintainer in each application repository. |
| Pilot lead and host owners | Two developers, Claude Code/Codex settings, forty live observations and data quality. | Actual lead, D1/D2 and host owners recorded before pilot. |
| Repository administrator | Required status checks, branch/ruleset protection, bypass and audit. | Principal with actual administrator responsibility. |
| Independent verifier | Review truth, pilot adjudication and observed merge-denial/rollback behavior. | Reviewer who did not implement the evaluated change. |

Role labels in bundles are not signatures. Digests prove byte identity, not
reviewer authority, approval authenticity or command execution origin. Use actual
repository/service authentication and protected ownership records. AI review
remains advisory; deterministic gate evidence and required human decisions remain
separate. Do not materialize a passing observation solely from a bot assertion.
Minimize human interruptions by assembling one concrete consolidated qualification
and adoption decision packet containing these gates, actual results, unresolved
items and proposed scope activation. An accountable owner's appointment does not
complete substantive review. Independent live pilot participation and required
human approval remain real activities, not repeated procedural permission prompts.

## Qualification and adoption decision record

Retain a dated record in the existing application/release evidence store. Each row
starts `pending`, names its actual accountable person, lists authentic evidence
locators/digests and records decision/time. Do not replace pending rows with
simulated signatures or reuse prototype observations.

| Gate | Required evidence | Accountable approval |
|---|---|---|
| G0 candidate identified | Reviewed commit plus dirty/new-file inventory; preserved unrelated work; historical reconciliation owner and actual pilot applications/people. | Framework maintainer and sponsor. |
| G1 candidate qualified | Required full regression/audit/security/standards checks green without waivers; canonical current evidence; Python 3.12 and supported platforms; frozen reference installs and genuine human review; approved residual limits. | Framework/profile/security maintainers and independent reviewer. |
| G2 pilot qualified | Forty valid live records, independently adjudicated defects/metrics, zero false pass/leakage, measured overhead and approved disclosed limits. | Pilot lead, independent reviewer and rule owner. |
| G3 enforcement authorized | Local/CI parity, trusted review/evidence handling, administrator protection challenges and rollback rehearsal; selected scopes/status names/bypass recorded. | Rule owner, application maintainer and administrator. |
| G4 expansion authorized | At least two weeks and twenty eligible PRs per pilot application; monitored failures/false positives/rework/expiry/bypass/overhead and cohort decision. | Central owner and receiving team leads. |

**Solo evaluation contract, version G2-SO/1.0.0.** An explicitly approved solo
evaluation may use one named operator, Aulia Rahman, across Claude Code and
Codex. Its result is G2-SO, not G2 or independent review. Prerequisites are all
applicable deterministic checks, security checks and frozen candidate/application
identities passing, plus actual owner inspection and substantive acceptance of
disclosed coverage limits. Failed, skipped, missing, stale or forged evidence
remains denial. No security waiver is allowed for positive qualification.

Existing G1/G2 independent approvals and G3/G4 enforcement authority remain
unchanged. A technically qualified solo evaluation does not grant independent
qualification, production adoption, native nonauthor CI review or merge authority.
Reports must show those gates separately as pending/blocked where unfulfilled.
Owner inspection records are labeled owner self-review and are never submitted
to the existing nonauthor helper as independent approval. AI review is advisory.

Record candidate/reference versions, repository head/base/tested identity,
runtime/platform coverage, every failed/unrun check, residual limitations with
approving owner, and selected adoption scopes. Supported runtime means it was
actually qualified on the stated platform; a target version in configuration is
not executed compatibility evidence. The reference examples' input/error tests
do not establish authentication, dependency/SAST/SCA or deployed security coverage.
Application owners select relevant existing security checks, prove seeded faults
and meaningful nonempty scan scope, and approve explicit uncovered behavior.

## Trusted application CI and administrator packet

An explicitly scoped future adoption may opt into
[SOLO-OWNER/1.0.0](solo-owner.md) through existing `adoption.reviewAuthority`.
This labels genuine native owner `COMMENTED` evidence as owner self-review,
requires a current protected trusted base and actual appointment, and does not
satisfy the default G1/G2 independent approvals or G3/G4 authorization. Absent
the optional field, the nonauthor `APPROVED` contract below remains the default.
No appointment, protection or adoption is activated by shipping the contract.

Extend the existing [application CI starter](../templates/standards/application-ci.yml)
for the application's reviewed runtime, frozen installation and human approval
transport. Producer and aggregate use identical approved tools/config/locks.
Start conservatively with every declared scope. Preserve the always-running
aggregate, full evidence transfer, producer-success requirement and fresh receipt
verification. Installation of YAML does not install repository protection.

Record head/base/tested revision, CI run/attempt, artifact provenance and effective
standards/source identity. Approval must cover the actual tested revision and
current scoped identities; edits, review dismissal, source/base or policy changes
require revalidation. Retrieve human decisions through authenticated service data,
verify authorized independent reviewers, then supply the existing observation
format. Author-supplied JSON, a matching hash or an approver name is not authority.
Fork/untrusted code must not gain secrets or a write token merely to obtain review.

For GitHub pilot applications, the internal
[native review helper](../tools/standards-github-review.mjs) materializes and
independently re-verifies authenticated decisions into existing
`standards_review_v1` files. Install/protect it on the trusted PR base before
activation; do not execute the PR's replacement helper with review credentials.
Manual `observationRef` paths must be under `.scratch/standards/reviews/`.
An authorized nonauthor human with write/maintain/admin repository permission
submits a native `APPROVED` review containing exactly one fenced
`json super-compound-review` block with these actual values:

| Review-body field | Actual inspected value |
|---|---|
| `testedSha`, `headSha`, `baseSha` | Current PR tested merge, head and base SHA, matching CI and snapshot. |
| `observations` | Array covering each required unwaived manual review scope. |
| Per observation | `checkKey`, `standardsDigest`, `sourceDigest`, nonempty `steps` array and substantive `observed` findings/resolutions from actual inspection. |

One real review may cover multiple scopes. Native required-review approval,
reviewer eligibility and each scoped identity must all validate; fields alone
cannot grant approval. Submission/edit/dismissal re-runs checks, and the aggregate
refetches native decisions instead of trusting a downloaded observation. Retain
native review URL/ID and body digest. Other hosting services remain unqualified
until their equivalent authenticated approval transport is implemented/reviewed.

Re-run applicable security checks in each qualification CI attempt. Record scanner
version, policy/config and vulnerability-intelligence provenance. A policy owner
defines and enforces maximum intelligence age in the existing application check
entrypoint; source freshness alone does not prove external intelligence freshness.
Empty/ignored scope, disabled rules or an exit-zero wrapper without meaningful
scan evidence cannot establish a qualified security/architecture gate.

Before G3 the administrator records:

- Protected branches/rulesets, exact required aggregate name and expected source;
  authorized human review requirements and dismissal of stale approval.
- Protected core/profile/config/engine/workflow/ownership paths and independent
  review for changes to gate authority; allowed emergency bypass principals,
  authorization, audit retention and post-event review. No standing author bypass.
- Live challenge PR/revision/run for failing, skipped, cancelled, missing,
  stale-revision, tampered, wrong-scope, unauthorized-review and expired-exception
  evidence. Each must visibly deny merge; a valid positive path must allow merge.
- Merge-queue event/check coverage if that application uses a merge queue; required
  checks must run for its tested merge group, not only the pull-request head.
- Revalidation after protection/workflow/ownership changes, including a separate
  independent verifier's observation of allowed and denied merge behavior.

Use the hosting service's actual required-check and review semantics. A green
check label or neutral/skipped producer alone is not proof of allowed mandatory
standards. The administrator retains screenshots/API exports/run URLs and the
independent observed result. Do not auto-activate protection or organization-wide
enforcement from the installer, resolver, hooks or host adapter.

## Versioning, references and framework onboarding

Treat released bundle bytes as immutable. A change to mandatory rules, linked
normative sources or tool requirements gets a reviewed new version and digest,
compatibility assessment, affected positive/negative checks and upgrade notes.
Keep rule IDs stable; explicitly describe additions, retirement and equivalent
controls. Patching bytes under a released version is not an upgrade procedure.
Projects pin approved versions independently; no automatic global update.

Profile maintainers validate golden references using frozen dependencies and the
supported runtime/platform matrix. Record purpose, coverage, commands, positive
and seeded-negative proof, installed identities, limitations and reviewer. Examples
are bounded evidence, not mandatory application folder layouts. Preserve existing
framework references and project tooling rather than forcing a formatter or pattern.

Onboard another framework only after a maintainer, scope/tool mapping, golden
reference, compatibility matrix, core-control coverage and independent review exist.
Until then use core-only coverage and repository conventions with visible limits.
Add the profile to the existing catalog/config mechanism; do not fork the core,
copy rules into host wrappers or create a parallel SDLC. Compound/evolve learning
is a candidate change requiring the responsible rule owner's review.

## Exceptions, upgrades and rollback

Use the existing exception fields: rule IDs, exact scope, owner, reason,
`expiresAt`, approval reference/digest. Retain genuine decision identity, compensating
controls and audit history alongside that reference. Review before expiry; no
automatic renewal. Revocation or expiry causes fresh resolution and denial until
controls pass or a genuine replacement decision exists. Report `waived` distinctly
from pass. Qualification/release checks need no waivers; sandbox exception tests
demonstrate behavior, not organization compliance.

For an upgrade, inventory prior pins/config/locks/user settings and protected
status names; review a narrow diff, install frozen tools, resolve affected scopes
and run gates plus genuine review before activation. Preserve old immutable
snapshots/receipts/approvals as history. Avoid mass reformat and separate intentional
style cleanup from behavior changes. Use the same adoption/config path and keep
existing light/full and authorization/completion mechanisms.

Rehearse rollback before G3: restore previous reviewed bundle/profile pins,
project configuration, tools and locks; resolve and run fresh affected checks;
obtain current human observations and receipt verification. Retain upgrade failure
evidence and the actual rollback identity/time/result. Old receipts cannot prove
the restored checkout if their revision/inputs differ. Coordinate required status
changes with the administrator; never silently disable mandatory controls.

Suspend rollout immediately for false passing proof, unauthorized review, profile
leakage or unexplained drift. Investigate sustained false positives or context/CI
budget breaches using original measurements. Returning selected scopes to advisory
requires rule-owner/administrator approval and reports compliance as unproven.
Restart after corrected fresh proof and the affected gate is reviewed again.

## Team onboarding and monitoring

Application maintainers guide teams through inventory, explicit reviewed pins,
scope selection, frozen installation, normal local checks, evidence and human
review, CI parity, and upgrade/rollback rehearsal using the same adoption guide.
Demonstrate both positive and deliberately failing checks; verify the developer,
subagent, continuation session and CI see identical standards/config identities.
Load profile detail only when relevant; keep startup and host adapters concise.

During narrow enforcement, monitor rule/check failures, missed faults and false
positives, style rework, context/CI overhead, version drift, exception expiry,
review freshness and bypass activity. Review at least weekly during the initial
two-week/twenty-PR window per pilot application. Receiving teams approve their
own scope-specific adoption; monitoring success never silently enables other teams.
