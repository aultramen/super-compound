## Workflow Integration

- `/sc-explore`: use `brainstorming` and this skill; output BRD or isolated throwaway decision evidence, then route to `/sc-prd`.
- `/sc-prd`: use `prd-generator` and this skill; create a PRD draft. UI-bearing drafts route through read-only `/sc-ui` validation before PRD approval and `/sc-plan`.
- `/sc-ui`: return evidence or a classified change route; accepted decisions must be absorbed by the owning PRD or FSD.
- `/sc-plan`: use `writing-plans`, `issue-workflow`, `plan-verification`, and this skill; consume the approved PRD, prove UI/API readiness, and output FSD plus contract-enabler/first-slice/scale-out pointers where applicable.
- `/sc-work`: use `executing-plans`, `context-engineering`, `test-driven-development`, `integration-checking`, and `verification-before-completion`; execute only referenced approved FSD goals and prove a real first slice before scale-out.

## Delivery Tier At Intake

`delivery_mode` in `.agent/rules/project-config.md` is `auto` unless a project
pins `light` or `full`. Under `auto`, classify every request before any read
fan-out and state one line: `Tier: light|full; trigger: T<n>|none`. Intake decides from changed semantics and material risk, never from session count.
Reassess when scope changes; administrative coordination alone cannot raise the tier.

Precedence: a pinned `full` mode or explicit BRD/PRD/FSD request keeps its
artifact scope; material T2/security or T4 changes take precedence over light
examples. Otherwise a bounded reversible feature or page is `light` when its
outcome/acceptance are clear, existing contracts/access/patterns cover it, and
mapped checks can prove it. Newness or missing PRD/FSD alone does not force full.
If those conditions do not hold, apply the remaining material T1/T3 triggers.
Document-only requests stop at their requested artifact and validation.

| Trigger | `full` when | Owner |
|---|---|---|
| T1 | New product capability needing unresolved material business/product decisions or broader acceptance authority; exclude bounded low-risk features/pages above | `/sc-explore` without a BRD, else `/sc-prd` -> `/sc-plan` |
| T2 | Material changes to data invariants, public API/wire compatibility, access policy, billing/payment effects, PII handling, or external integration behavior | `/sc-plan` (data/API) or `/sc-prd` (behavior) |
| T3 | New interactive surface with material journey/state/data/provider contracts that existing patterns cannot cover; a bounded low-risk page stays light | `/sc-ui` validation, then `/sc-plan`; the UI contract readiness lifecycle applies |
| T4 | Coordinated work changes product outcomes, cross-stream contracts, or material risk; issue boards, parallelism, and session handoff alone only require state management | `/sc-plan` goal pointers |
| T5 | The user asks for BRD/PRD/FSD, or the project pins `delivery_mode: full` | full path |

Everything else is `light`: bug fixes, refactors, config, copy or style inside an
existing screen, and bounded low-risk features/pages with proving checks. A single trivial
change is done directly, with `tdd_mode` and verification still applying. When a
material trigger appears mid-work, write `ESCALATE: T<n>`, return the affected
decision to its owner, and continue independent authorized work. Sensitive paths
are inspection signals: assess the diff, compatibility, access, data, and side
effects before escalating. Contract-preserving maintenance stays light.

## Shared Execution Policy

This reference owns risk, authorization, recovery, and verification policy.
Compact contracts and full procedures apply the same rules.

- Low risk: read-only investigation, scoped local fixes/tests/docs, and derived
  assets following approved semantics execute and verify without another approval.
- Medium risk: reversible technical changes within authority execute with a
  concise notice, targeted checks, and a recovery path. Scheduler scope amendments
  remain inside the approved goal and require ownership/dependency checks.
- High risk: destructive or production mutations, breaking contracts, new access
  policy, publishing, external spending, or material product decisions outside
  authority require explicit scoped authorization after concrete review material.

Authorization persists while operation, target, scope, and material risk remain
unchanged. A fresh preview checks those facts; it does not revoke authorization.
Implementation authority alone never authorizes commit, push, deploy, publish,
or destruction. Reversible internal details following repository patterns are
delegated by default; ambiguity about acceptance, public contracts, policy, or
security still uses OPEN-*.

For new setup or missing `approval_mode`, default to `exception`: within the
user's authorized goal, infer facts, decide reversible details, execute, validate,
and report. Record inherited scope/acceptance and authorization provenance in
the owning artifacts; drafting an artifact never self-approves an unresolved
material decision. BRD/PRD/FSD remain authority, not automatic human checkpoints.
Ask only for missing critical information, material product/architecture/security
decisions outside authority, or high-risk actions. A concrete scoped approval
may include its execution authorization when explicitly presented.

`conventions.approval_mode: stage` is opt-in and selects four checkpoints:
BRD approval → PRD approval → FSD + goals + verification approval → separate
execution authorization. Each stage consumes the separately approved upstream.
Do not bundle these checkpoints in stage mode. Preserve existing project configuration
and previously granted authorization on update. Reapproval is needed only when
scope, decisions, material risk, or the authorized action changes.

Within an authorized stage, prepare derived boards, pointers, fixtures,
checkpoints, documentation repairs, and evidence automatically. These are not
additional approval gates when semantics are unchanged. Review/audit remain
read-only; route remediation to the owning workflow with existing authorization.
Accepted decisions require their authoritative source and approval provenance;
observed lessons are advisory until adopted by the decision owner.
When a host has no subagents, run the same goal and review checks sequentially
in-thread and report the lack of independent worker isolation.

## Human Input And Internal Handoffs

Apply [the human input runtime contract](../../../context/checkpoint.contract.md)
before asking, reporting blockers, or reconciling a response. Check acceptance
and authorization against target, scope, revision, operation and material risk.
An evidence-only revision does not revoke semantic approval; changed semantics
require a concrete delta, unaffected approvals retained, and scoped reapproval.
Approval resolves only the named decision/action, never unperformed tests.

Agent-researchable facts and available automated checks remain agent work.
Mixed OPEN-* entries are split into needs under existing artifacts and STATE,
with owner, affected scope and next action; no second approval ledger is added.
Checkpoint only human/external needs after concrete review material exists.

Under active implementation/delivery intent, invoke the next owner internally
when scope and authority suffice: PRD -> read-only UI review -> owning PRD
reconciliation -> FSD planning. After verified enabler/first-slice proof, the
active controller performs planning-owned deterministic index/pointer promotion
internally, verifies the same gates, and continues authorized work without
planning re-entry solely for metadata. It never changes authority semantics;
material deltas return to the decision owner. Load receiving contracts only for
real owner changes and preserve their read-only/write boundary. Stage approval
and separate execution authorization apply only in configured stage mode when
not already granted. A read-only invocation
alone authorizes findings, not remediation or a write handoff. Do not require the
user to type the next /sc-* command merely to transfer already-authorized work.

When the requested goal is satisfied and required checks/closeout are complete,
deliver the result and stop. An empty queue alone never authorizes new ideation;
`/sc-geniusloop` requires explicit improvement intent. Lessons may guide scoped
authorized work without another approval; framework policy changes remain
reviewed proposals through their owner.

## Recovery And Progress

An attempt tests one hypothesis; a fix round batches related corrections and
verification. At repeated failure (normally 2-3 attempts), reassess evidence and
seams, change strategy/tool, or escalate to a fresh capable worker when available.
Numbers trigger reassessment, not universal shutdown. Round 5 adjudication
records remaining gaps; it never parks mandatory failures as completed work.
Stop only the affected dependency stream for missing authority/access, hard
user/host limits, or demonstrated stagnation after available safe alternatives.
Record what failed, what changed, and the next recovery; continue independent
goals. Retry idempotent transient tool failures with bounded backoff; preserve
partial results, timeouts, and RED evidence. Never mask failure as completion.

Context pressure triggers a durable checkpoint, optional-context reduction, and
host compaction/continuation at a natural boundary. Resume from STATE, artifacts,
and ledger; skip verified goals. Stop for context only when safe recovery is
unavailable. Active user intent and ready work precede administrative freshness
or memory hygiene, reconciled through the owning route.

## Evidence Identity

Evidence can be reused after provenance inspection only when tested source and
dirty-change digests, contract/fixture revisions, environment/configuration,
command/arguments, and required scope match. Use the existing evidence artifact
to retain identity, timestamps, actual pass/fail/skip counts, and locators.
Independent review inspects the diff and provenance; it reruns checks when state
changes, after integration/merge, for missing identity, nondeterminism, or
material risk. One deterministic proving run is sufficient for unchanged scope.
Regression sensitivity needs RED without the fix and GREEN with it once; an
extra toggle cycle is required only if original RED is missing or inadequate.
Repeated independent attempts measure reliability only when nondeterminism or
explicit acceptance calls for it; do not impose pass^3 on every regression.
