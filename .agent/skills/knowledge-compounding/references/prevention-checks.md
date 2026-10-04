# Verified Learning Into Checks

Follow `verified outcome -> capture -> prevention-gap assessment -> reuse/add
check -> verification -> receipt -> effectiveness feedback`. The owning
`/sc-work` or `/sc-debug` performs assessment and check execution within existing
authority. `/sc-compound` captures and stores results. `/sc-evolve` proposes
skill/workflow/policy changes; automatic learning never changes those authorities.

Search the existing lint, tests and checks first. Reuse a check that exercises
the reproducer. Add an additive regression test only for an evidenced prevention
gap, without weakening acceptance, required verifiers, policy or budget. One
verified defect may get its own regression; general pattern promotion still
requires three independent origins. Do not promote stale, contradicted or
superseded guidance before reviewed revalidation.

Save a JSON input and run `node .agent/tools/prevention-checks.mjs record
<input.json>`. Required fields: owner (`sc-work` or `sc-debug`), origin, closeout,
knowledgeRef, scope, authorizedScope, reproducer, checkRef, mode (`reuse` or
`add`), evidence, state, reason. Scope comes from the authorized issue or the
scheduler-owned allowlist, never a worker's wider proposal. `add` requires
`preventionGap:true`. Evidence references bind actual files and stable origin;
legacy backslash locators canonicalize to `/`, while origin identity is unchanged.

Lifecycle: candidate -> validated -> applied/rejected/deferred. Rejected or
deferred evidence versions are not offered again. New evidence gets a new
candidate identity with prior receipts retained. At most one new check candidate
per closeout and two validation attempts per evidence version. Failed validation
is durably recorded; the second failure defers it. Include a reason and evidence
for every rejection/deferral. Generated checks remain additive and scoped.

Validation requires `afterRef`: saved JSON `{exitCode:0, command, sourceDigest,
timestamp, counts:{pass,fail,skip}}`. A new regression also requires `beforeRef`
with the same command and nonzero exitCode. Save actual command output alongside
these summaries. Check/evidence hashes must still match before application.
Use `expectedVersion` for transitions. Do not fabricate pass counts or proof;
the tool validates structure and byte identity, the owning route establishes
the outcome, authorized scope and prevention gap.

Receipts are losslessly retained in docs/learnings/prevention-receipts.json,
created on the first receipt in the owning project.
Storage limits fail without evicting history. IO failures queue the input in
.scratch/pending-checks/ (created only on failure); capture failures use pending-captures. At closeout or
owning resume, run `memory-maintenance.mjs flush` once: at most three jobs, only
unfinished maintenance, with failures and remaining jobs reported. Retain the
original input if both receipt and queue persistence fail. Repair a stale version
through the owning route before retrying; never rerun verified implementation.

Later prevention evidence uses `prevention-checks.mjs feedback <input.json>`:
id, expectedVersion, outcome (`prevented`, `missed`, `unknown`), evidence. Maintenance
report connects knowledge, check outcome, evidence version and effectiveness;
receipt existence alone does not prove fewer future defects.
