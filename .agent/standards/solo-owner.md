# SOLO-OWNER/1.0.0

## Scope and authority

This optional, versioned contract permits a genuinely appointed repository owner
to inspect their own change. Its evidence is **owner self-review**, never independent
or nonauthor approval. An absent `adoption.reviewAuthority` preserves the existing
authorized nonauthor native `APPROVED` path. Unknown modes, versions and authority
fields fail closed. The shipped project configuration remains disabled.

SOLO-OWNER does not satisfy existing organization G1/G2 independent approvals,
G3/G4 enforcement authorization, GitHub approving-review counts or CODEOWNER
requirements. GitHub cannot approve one's own PR. It does not grant merge, bypass,
deployment, appointment or enforcement authority. Security and deterministic
controls remain mandatory; no security waiver grants positive qualification.
G2-SO/1.0.0 still requires the approved twenty baseline/advisory pairs, forty live
observations, real owner inspection and its existing thresholds. Fixtures and AI
reviews are advisory evidence, not human participation or security clearance.

## Existing configuration and appointment

Use only the existing `json super-compound-standards` fence and adoption fields;
there is no parallel configuration, new command, workflow or host adapter.
After a separate actual scoped approval, `adoption.reviewAuthority` has these
strict fields. This table is a schema, not an appointment or activated example.

| Field | Required value or bound |
|---|---|
| `mode`, `contractVersion`, `provider` | `solo-owner`, `1.0.0`, `github` |
| `policyRef`, `policyDigest` | `.agent/standards/solo-owner.md`, exact SHA256 bytes |
| `ownerLogin` | Actual appointed human GitHub login; a name or local assertion is not authentication |
| `expiresAt` | Exact appointment expiry in canonical UTC ISO format, including milliseconds |
| `maxAgeHours` | Optional integer 1..24; default and maximum 24 |

Existing `adoption.owner`, `approvalRef` and `approvalDigest` bind the accountable
owner and a repository-local structured appointment. Its only fields are:
`schema: standards_owner_appointment_v1`, `contractVersion: 1.0.0`,
`status: approved`, `owner`, `ownerLogin`, `repository` (`owner/repo`), `scopes`,
`policyDigest`, `approvedAt`, and `expiresAt`. Owner/login/policy must exactly
match the configuration. Scopes must be unique normalized directory paths and
cover exactly the configured scopes. Approval and expiry must be canonical UTC
ISO timestamps; approval cannot be future, expiry must be current and later than
approval, and the appointment lifetime cannot exceed 30 days. Renewal needs a new
real decision; no automatic appointment or renewal is provided.

The resolver validates these local structures and hashes. A resolver snapshot or
local JSON receipt cannot authenticate a human, establish an appointment or enable
trusted CI. Local review provenance validation is structural only. A forgery with
plausible fields must still fail the separate authenticated native CI verification.

## Protected native trust boundary

Before activation, an administrator must establish the reviewed configuration,
policy, appointment, standards engine, normative sources and workflow on an
actually protected trusted base. Its current exact base SHA is read through the
authenticated GitHub API. PR or local JSON cannot appoint itself. An unprotected
main fails closed. Installing this implementation does not bootstrap protection.
Any future bootstrap needs a separate explicit administrator decision and genuine
appointment evidence; the implementation does not relax existing trust defaults.

Trusted base jobs execute the base helper with read-only credentials. They never
install dependencies, run hooks or execute PR code with those credentials. The
helper requires an open ready PR and exact current head/base/tested merge SHA,
protected base branch identity, matching base configuration, current appointment,
policy/engine/normative-source byte identities and appointed scope list. Both PR
author and appointed reviewer must be native `User` actors with the same appointed
login; reviewer permission must be write, maintain or admin. Outstanding native
`CHANGES_REQUESTED` denies; `REVIEW_REQUIRED` or null does not impersonate `APPROVED`.

The owner must actually inspect the current source, findings and disclosed limits,
then submit a native **COMMENTED review** containing exactly one fenced
`json super-compound-review` object. Ordinary issue comments do not qualify.
Its only accepted fields are `testedSha`, `headSha`, `baseSha`,
`reviewAuthority: owner-self-review`, `contractVersion: 1.0.0`, `policyDigest`,
`decision: accept`, `observations`, and optional matching `repository` and `number`.
Each required unwaived scope needs an observation with its current `checkKey`,
`standardsDigest`, `sourceDigest`, nonempty actual inspection `steps` and substantive
`observed` findings. The review must follow appointment approval, cover the current
head, and be no older than the configured maximum age. Tools never submit the
human comment or fabricate inspection findings.

The latest submitted owner action controls. A newer unstructured comment,
dismissal, rejection, revocation, wrong identity or stale acceptance cannot fall
back to an older accept. Native IDs, permissions, review body/state/time,
appointment, protection and source identities are re-fetched before return; the
current age and expiry are checked again. The existing review artifact records
native provenance and explicitly labels owner self-review and `COMMENTED`.
It is not a native approving-review count.

The existing CI starter performs the same authenticated verification again after
checks, compares freshly fetched native evidence with every saved observation,
then requires every producer and fresh verification job to succeed. Failed,
skipped, cancelled, missing, stale, forged or wrong-scope evidence remains denial.
Existing receipts and completion bindings retain their current format and guards.
Actual host CI, required-check/protection challenges and owner inspections need
separate execution evidence; deterministic fixtures do not prove them.

## Compatibility, human actions and rollback

The authenticated adapter supports GitHub only. Authority source paths and base
branch names use bounded ASCII letters/digits, `_`, `.`, `/`, `-`; traversal and
malformed encodings are rejected, and branch slashes are URL-encoded. Native file
responses must be regular bounded files with canonical base64 and matching size.
Other provider/path conventions remain unsupported, not silently approximated.
The Contents API can return a symlink target as a file, so its `type` alone is not
mode evidence. The adapter reads the exact base Git commit, then bounded
nonrecursive parent trees (cached within each fresh verification) to require
`040000` parent directories and a regular `100644` or `100755` blob. Missing,
duplicate, truncated or wrong-identity trees, symlinks and submodules deny.
Contents metadata and decoded bytes must match that exact Git blob identity.
See GitHub's [Contents API](https://docs.github.com/en/rest/repos/contents#get-repository-content),
[commit API](https://docs.github.com/en/rest/git/commits#get-a-commit) and
[tree API](https://docs.github.com/en/rest/git/trees#get-a-tree).

Routine resolution, checks, artifact generation and fresh native comparison are
automated. Human actions remain actual scoped contract/adoption approval, protected
trust establishment, appointment, substantive current-source review, and separate
merge/bypass/enforcement/deployment decisions. Approval of implementation alone
performs none of those actions. Application repositories without owned Git/remote
authority cannot activate this transport.

Rollback restores the prior reviewed adoption configuration and tool/policy pins,
then resolves, runs mandatory checks and obtains fresh applicable review evidence.
Removing this optional field returns to the existing nonauthor `APPROVED` path;
it does not exempt review. Expiry, revoked or changed appointment, changed policy,
source or engine invalidates old evidence. Preserve historical evidence separately.
Administrator changes to required checks or review counts need separate explicit
authorization and real allowed/denied merge challenges; never silently disable
mandatory controls to adopt or roll back this contract.
