---
template_name: "Optional Architecture Decision Record — Agentic AI Ready"
template_version: "2.0.0"
artifact_contract_version: "1.0.0"
document_type: "ADR"
optional_artifact: true
canonical_delivery_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
project_name: "{{PROJECT_NAME}}"
project_code: "{{PROJECT_CODE}}"
adr_id: "ADR-{{NNNN}}"
title: "{{DECISION_TITLE}}"
status: "DRAFT" # DRAFT | PROPOSED | IN_REVIEW | ACCEPTED | REJECTED | DEPRECATED | SUPERSEDED
applicability_status: "OPTIONAL_USED" # OPTIONAL_USED | REQUIRED_BY_PROJECT_POLICY
creation_trigger: "{{CROSS_SYSTEM | HARD_TO_REVERSE | SECURITY_PRIVACY | VENDOR_LOCK_IN | STANDARD_EXCEPTION | DURABLE_RATIONALE | OTHER}}"
decision_type: "{{ARCHITECTURE_PATTERN | TECHNOLOGY_SELECTION | DATA | INTEGRATION | SECURITY | PRIVACY | RELIABILITY | DEPLOYMENT | AI_ML | TOOLING | MIGRATION | DEPRECATION | STANDARD}}"
architecture_scope: "{{LOCAL | MODULE | SYSTEM | PLATFORM | ORGANIZATION}}"
risk_class: "{{LOW | MEDIUM | HIGH | CRITICAL}}"
reversibility: "{{REVERSIBLE | COSTLY_REVERSAL | EFFECTIVELY_IRREVERSIBLE}}"
proposed_date: "{{YYYY-MM-DD}}"
decision_date: "{{YYYY-MM-DD_OR_EMPTY}}"
review_by: "{{YYYY-MM-DD_OR_EVENT_TRIGGER}}"
target_release: "{{RELEASE_OR_MILESTONE}}"
repository: "{{REPOSITORY_URL_OR_PATH}}"
author: "{{NAME_OR_ROLE}}"
decision_owner: "{{NAME_OR_ROLE}}"
deciders:
  - "{{NAME_OR_ROLE}}"
consulted:
  - "{{NAME_OR_ROLE}}"
informed:
  - "{{NAME_OR_ROLE}}"
related_brd:
  - "BRD-{{PROJECT_CODE}}"
related_prd:
  - "PRD-{{PROJECT_CODE}}"
related_fsd:
  - "FSD-{{PROJECT_CODE}}"
replaces_fsd_tdec: "{{TDEC_ID_OR_NONE}}"
related_adrs: []
supersedes: []
superseded_by: []
affected_systems:
  - "{{SYSTEM_OR_COMPONENT}}"
tags:
  - "{{TAG}}"
---

# {{ADR_ID}} — {{DECISION_TITLE}}

> **Usage note:** The ADR is an **optional and conditional** artifact. Do not create an ADR just to complete the BRD/PRD/FSD chain. Use this template when a durable architecture rationale is genuinely valuable or project policy explicitly mandates it. One ADR file may only establish **one coherent architecture decision**. Replace every `{{PLACEHOLDER}}`; sections that are not relevant are written as `N/A — {{REASON}}`. `TBD`, `later`, `best practice`, `as needed`, or unmeasured adjectives are not allowed in an ADR with `ACCEPTED` status.

---

> **REFERENCE LIBRARY - skeleton first.** Never load this entire file into
> working context or copy it as the output shape. Start from
> `skeletons/ADR-Skeleton-OPTIONAL.md` and read only the named section required
> for the accepted architectural decision or review gap.

# 0. ADR Operating Contract

## 0.1 Document Purpose

This ADR is an optional sidecar that records one architecture decision for `{{PROJECT_NAME}}` in a way that is:

- understandable without depending on conversations or the author's memory;
- traceable to the underlying business/product requirements and constraints;
- testable through acceptance evidence or architecture fitness functions;
- prescriptive enough that the FSD, developers, and coding agents do not silently invent new architecture decisions when this ADR is used;
- honest about trade-offs, negative impacts, uncertainty, and residual risks;
- reviewable, subject to controlled exceptions, deprecatable, or supersedable without erasing history.

When the ADR is chosen for use, this document is considered complete when a reader can answer decisively:

1. what decision was made;
2. what problem required the decision;
3. the authority boundaries and scope of the decision;
4. which viable options were evaluated;
5. what evidence and criteria were used;
6. why the selected option is more appropriate in this context;
7. what positive and negative consequences, costs, and risks are accepted;
8. what changes are mandatory in the FSD, code, data, deployment, security, operations, and testing;
9. how implementation drift is detected;
10. what conditions trigger review, rollback, deprecation, or supersession.

## 0.2 When an ADR Is Worth Using — Optional and Conditional

The baseline artifact lifecycle is:

```text
BRD → PRD → FSD → GOAL → IMPLEMENTATION → VERIFICATION
                 ↘ ADR (optional)
```

The ADR is **not mandatory by default**. The FSD must remain complete and executable without an ADR through `TDEC-*` (embedded technical decisions). Create an ADR only when the value of a durable decision record outweighs its maintenance overhead, for example decisions that:

- affect more than one module, service, repository, team, or release;
- are expensive, risky, or hard to reverse;
- change the trust boundary, data classification, data residency, authentication, authorization, auditability, or threat model;
- select or replace a database, queue, protocol, cloud/provider, AI provider, primary framework, runtime, deployment topology, or integration mechanism;
- create material vendor lock-in, recurring cost, operational burden, or availability dependency;
- establish a source of truth, consistency model, transaction boundary, event-delivery semantics, canonicalization, encryption, retention, or migration strategy;
- deviate from an architecture principle, approved standard, security baseline, or a previous ADR;
- require an exception/waiver against a policy or standard;
- are reasonably likely to be re-debated because the rationale is not visible from the code/FSD and must be preserved across releases.

An ADR is usually not valuable for:

- local refactors that do not change external behavior or architecture boundaries;
- variable naming or implementation details that follow repository conventions;
- compatible dependency patch/minor updates that do not change the risk profile;
- decisions sufficiently recorded as `TDEC-*` in the FSD;
- decisions already established explicitly and completely by another active ADR.

Decision path:

1. The FSD performs the ADR applicability assessment.
2. When `NOT_REQUIRED`, use `TDEC-*`; do not create an empty ADR file.
3. When `LINKED`, create/reuse the ADR and wait for `ACCEPTED` status before the related goal becomes `READY`.
4. When project policy explicitly mandates an ADR, set `applicability_status=REQUIRED_BY_PROJECT_POLICY` and cite that policy.
5. When in doubt, use the **Minimal Architecture Decision Brief** in Appendix F or `TDEC-*` first; promote to a full ADR only when the blast radius/uncertainty justifies it.

## 0.3 One Decision per ADR Principle

One ADR must have one primary decision statement. Multiple rules may live in one ADR only when all of them:

- are required to make the primary decision implementable;
- share the same lifecycle, reviewers, and rollback boundary;
- cannot be adopted or cancelled independently without making the primary decision incoherent.

Split into separate ADRs when two choices can be approved, rejected, reviewed, or superseded independently.

## 0.4 Authority Boundaries of BRD, PRD, Optional ADR, and FSD

| Decision Type | BRD | PRD | Optional ADR | FSD |
|---|---:|---:|---:|---:|
| Business problem, outcome, benefit, risk appetite | **Authoritative** | Translates | Does not change | Does not change |
| Business scope, policy, rule, authority, compliance intent | **Authoritative** | Clarifies product behavior | Does not change | Implements |
| Product scope, user outcome, functional policy, UX intent | Constraint | **Authoritative** | Does not change | Implements |
| Architecture pattern, topology, technology, cross-cutting mechanism | Constraint | Constraint | **Authoritative within delegated scope when `ACCEPTED` and linked** | **Authoritative as `TDEC-*` when no ADR is used; always details the implementation** |
| API/schema/job/event detail and implementation behavior | Constraint | Constraint | Defines patterns/boundaries when material | **Authoritative** |
| Test, migration, rollout, rollback, and goal packet | Business/product gate | Acceptance intent | Defines constraints/fitness functions when linked | **Authoritative** |
| Local code-level design | Does not define | Does not define | Usually does not define | May define or delegate to repository conventions |

Precedence rules:

1. applicable law, contracts, regulators, and policy/security baselines;
2. the approved BRD for business intent and business boundaries;
3. the approved PRD for product intent and product boundaries;
4. an `ACCEPTED` ADR, **when present and linked**, for the delegated architecture scope;
5. the approved FSD for the implementation contract; `TDEC-*` applies when no ADR is used;
6. repository conventions and the existing implementation for local choices;
7. individual tasks, prompts, or `/sc-work` invocations.

The ADR is not a valid mechanism for silently weakening BRD/PRD requirements. The ADR also does not replace the FSD: every goal must still reference the FSD, while the ADR is only additional authority for the linked decision clauses. Conflicts with higher-authority artifacts must trigger a change request or an upstream revision.

## 0.5 Normative Language

- **MUST**: must be satisfied by every implementation within the ADR's scope.
- **MUST NOT**: must not be done.
- **SHOULD**: the expected default; deviations require a documented exception.
- **MAY**: optional and must not change mandatory outcomes.
- **Constraint**: a hard limit that must not be defeated by a weighted score.
- **Preference**: a desired value that can be compromised.
- **Decision driver**: a factor that differentiates options and influences the choice.
- **Fitness function**: an automated or periodic check that proves an architecture property still holds.
- **Residual risk**: risk that remains after mitigation and is explicitly accepted by an authority.
- **Blast radius**: the area of systems, data, users, or operations that can be affected if the decision fails.

## 0.6 Statement and Evidence Taxonomy

| Type | Definition | Minimum Evidence | May Serve as a Decision Basis? |
|---|---|---|---|
| `FACT` | A condition verifiable today | Primary source, repository evidence, or telemetry | Yes |
| `CONSTRAINT` | A hard limit from policy, platform, budget, time, or compatibility | Source + consequence if violated | Yes; may act as a veto |
| `ASSUMPTION` | An unproven statement used temporarily | Owner + validation method + expiry | Only when its risk is accepted |
| `HYPOTHESIS` | A prediction of a cause-effect relationship | Spike/experiment plan | Not as fact |
| `EVIDENCE` | The result of a benchmark, test, audit, PoC, incident, or data | Reproducible method + date + environment | Yes |
| `PREFERENCE` | A desired choice | Owner + rationale | Yes, but not a hard constraint |
| `DECISION` | An approved choice | Authority + date + rationale | Authoritative within scope |
| `OPEN` | Information/decision not yet available | Owner + deadline + safe fallback | Depends on blocker class |

Evidence quality:

| Level | Description | Example |
|---|---|---|
| E0 | Opinion without verification | “This library is popular” |
| E1 | Documentation/vendor claim | Official documentation, pricing page |
| E2 | Reproducible local spike | PoC on a representative sample |
| E3 | Environment-relevant test | Load/security/compatibility test on a staging-like setup |
| E4 | Production evidence | Telemetry, incident data, audited operating record |

An ADR with `HIGH` or `CRITICAL` risk must not rely only on E0/E1 for the most important drivers unless the decision authority explicitly accepts that uncertainty.

## 0.7 Placeholder and Open Item Policy

Use the following format for every unresolved item:

| ID | Question / Missing Evidence | Class | Impact | Affected IDs | Owner | Safe Fallback | Resolution Gate | Due Date | Status |
|---|---|---|---|---|---|---|---|---|---|
| OPEN-001 | {{QUESTION}} | ACCEPTANCE_BLOCKER / IMPLEMENTATION_BLOCKER / NON_BLOCKER | {{IMPACT}} | {{IDS}} | {{OWNER}} | {{FALLBACK_OR_NONE}} | {{GATE}} | {{DATE}} | OPEN |

Rules:

- `ACCEPTANCE_BLOCKER`: the ADR must not have `ACCEPTED` status.
- `IMPLEMENTATION_BLOCKER`: the ADR may be accepted when the decision is already clear, but the related goal must not have `READY` status.
- `NON_BLOCKER`: implementations may only use the safe fallback that has been written down.
- Coding agents are forbidden from filling in or guessing decisions that are not yet available.
- `RESOLVED` items must record the evidence, decider, date, and the ADR/FSD sections updated.

## 0.8 Stable ID Conventions

| Prefix | Meaning | Example |
|---|---|---|
| ADR | Architecture Decision Record | ADR-0042 |
| SRC | Source artifact/evidence | SRC-001 |
| CTX | Context fact | CTX-001 |
| DRV | Decision driver | DRV-001 |
| CONSTR | Hard constraint | CONSTR-001 |
| ASSUMP | Assumption | ASSUMP-001 |
| INV | Architecture invariant | INV-001 |
| OPT | Option | OPT-001 |
| CRIT | Evaluation criterion | CRIT-001 |
| EVD | Evidence item | EVD-001 |
| SPIKE | Spike/PoC | SPIKE-001 |
| BENCH | Benchmark | BENCH-001 |
| DEC | Decision clause | DEC-001 |
| RULE | Implementation rule | RULE-001 |
| PROHIB | Prohibited pattern | PROHIB-001 |
| CONS-POS | Positive consequence | CONS-POS-001 |
| CONS-NEG | Negative consequence | CONS-NEG-001 |
| RISK | Risk | RISK-001 |
| MIT | Mitigation | MIT-001 |
| FF | Architecture fitness function | FF-001 |
| EXC | Exception/waiver | EXC-001 |
| OPEN | Open item | OPEN-001 |
| REVTRIG | Review trigger | REVTRIG-001 |
| IMPL | Implementation obligation | IMPL-001 |
| VAL | Validation gate | VAL-001 |
| ROLLBACK | Rollback action | ROLLBACK-001 |
| GOAL | Agent-executable work package | GOAL-001 |

Published IDs must not be reused for a different meaning. Cancelled items are given `RETIRED` status with a rationale, not deleted.

### 0.8.1 Cross-Artifact References

Use a qualified reference for every ID from the BRD, PRD, FSD, or another ADR:

```text
{{DOCUMENT_ID}}#{{LOCAL_ID}}
{{DOCUMENT_ID}}@{{VERSION}}#{{LOCAL_ID}}   # for pinned snapshots
```

Examples: `BRD-CCC#BREQ-001`, `PRD-CCC#FR-014`, `FSD-CCC#TDEC-003`, `ADR-0042#DEC-001`. Goals must still reference the FSD with qualified references; the ADR is only added when the goal falls within the scope of this decision.

## 0.9 ADR Lifecycle and Immutability

Canonical status:

```text
DRAFT → PROPOSED → IN_REVIEW → ACCEPTED
                    ├──────────→ REJECTED
ACCEPTED → DEPRECATED → SUPERSEDED
ACCEPTED ───────────────────────→ SUPERSEDED
```

| Status | Meaning | May Serve as an Implementation Basis? |
|---|---|---:|
| `DRAFT` | Being drafted; not ready for assessment | No |
| `PROPOSED` | A complete decision request ready for review | No, except for explicit spikes |
| `IN_REVIEW` | Being assessed by the required approvers | No, except for explicit spikes |
| `ACCEPTED` | An active decision, binding within scope | Yes |
| `REJECTED` | The option/decision was not accepted; kept as history | No |
| `DEPRECATED` | May still exist in the system, but must not be used for new implementations | Approved maintenance only |
| `SUPERSEDED` | Replaced by another ADR | Not for new changes |

After `ACCEPTED`:

- the decision statement, rationale, option assessment, and accepted consequences are treated as a historical record;
- editorial corrections may be made through the revision history;
- material changes must be made through a new ADR that lists `supersedes`;
- the old ADR is updated only in the lifecycle fields, supersession links, and post-implementation outcome notes;
- do not edit history to make the old decision look more correct than it was when decided.

## 0.10 Decision Authority and Quorum

| Decision Class | Minimum Decider | Required Reviewers | Optional Reviewers |
|---|---|---|---|
| Local/module, low risk | Technical owner | Affected module owner | QA |
| Cross-system/platform | Architect/technical lead | All affected service owners, operations | Product |
| Security/privacy | Security/privacy owner + technical owner | Data owner, compliance | Legal |
| Data model/migration | Data owner + technical owner | Operations, QA | Product |
| Vendor/provider/recurring cost | Budget owner + technical owner | Security, procurement/finance | Legal |
| AI/ML decision boundary or data egress | Product owner + technical owner + security/privacy | Compliance, data owner, QA | Legal |
| Critical/irreversible | Steering or delegated authority | All mandatory disciplines | Independent reviewer |

Record the actual quorum in Section 1.5. No self-approval for `HIGH`/`CRITICAL` ADRs unless organizational governance explicitly allows it.

## 0.11 Guardrails for Agentic Coding

A coding agent that receives this ADR **MUST**:

1. use only ADRs with `ACCEPTED` status as architectural authority;
2. read the decision clauses, mandatory constraints, prohibited patterns, exception register, and fitness functions before changing code;
3. limit changes to the requirements/goals that explicitly trace to this ADR;
4. preserve the decided source of truth, trust boundaries, data classification, state semantics, transaction boundaries, and failure behavior;
5. run the validation commands and produce the requested evidence;
6. report deviations, unmet gates, residual risks, and repository facts that differ from the ADR's assumptions;
7. stop at declared stop conditions rather than inventing architectural workarounds.

A coding agent **MUST NOT**:

- replace the selected technology/provider/pattern with an “equivalent” alternative without a new ADR or an active exception;
- expand scope, refactor across modules, or upgrade major dependencies just because it is easier;
- create fake wrappers/abstractions that do not genuinely preserve the decided swap boundary;
- treat mocks, unit tests, or compilation success as proof of integration compatibility;
- weaken security, validation, audit, consistency, idempotency, observability, or tests to finish a task;
- introduce silent fallbacks, silent catches, unbounded retries, default-open authorization, or destructive migrations;
- declare the decision complete while implementation obligations, fitness functions, rollout, or runbooks are not yet in place.

## 0.12 ADR Approval Gate

This optional ADR may have `ACCEPTED` status only when:
- [ ] the applicability assessment in the FSD states `LINKED` or the cited project policy states an ADR is required;
- [ ] the decision is not better treated as a local implementation detail or a simple `TDEC-*`;

- [ ] there is only one coherent primary decision;
- [ ] the problem, context, scope, non-scope, and urgency are clear;
- [ ] the BRD, PRD, FSD, and every relevant existing ADR have been reconciled;
- [ ] hard constraints are distinguished from preferences;
- [ ] the status quo and at least two viable options are considered, or a valid reason why only one option is available is recorded;
- [ ] no strawman options are deliberately made weak;
- [ ] evaluation criteria have definitions, weights/priorities, and measurement methods;
- [ ] decisive claims are supported by evidence with dates and environments;
- [ ] the decision statement uses normative language and is unambiguous;
- [ ] positive, negative, neutral, cost, lock-in, operational, and organizational consequences are recorded;
- [ ] security, privacy, compliance, data, reliability, observability, and rollback impacts are assessed;
- [ ] implementation obligations and prohibited patterns are explicit;
- [ ] at least one fitness function or review mechanism detects architecture drift;
- [ ] rollout, migration, rollback, and degraded-mode implications are determined or `N/A — reason`;
- [ ] residual risks have an owner and an acceptance authority;
- [ ] no `ACCEPTANCE_BLOCKER` remains open;
- [ ] the handoff to the FSD and goals can proceed without invention;
- [ ] the FSD remains the primary implementation source of truth and lists this ADR as linked authority;
- [ ] review/supersession triggers have an owner and a date/event.

---

# 1. Document Control, Governance, and Traceability

## 1.1 Metadata ADR

| Field | Value |
|---|---|
| Project | `{{PROJECT_NAME}}` |
| ADR ID | `{{ADR_ID}}` |
| Title | `{{DECISION_TITLE}}` |
| Status | `{{DRAFT / PROPOSED / IN_REVIEW / ACCEPTED / REJECTED / DEPRECATED / SUPERSEDED}}` |
| Decision type | `{{TYPE}}` |
| Architecture scope | `{{LOCAL / MODULE / SYSTEM / PLATFORM / ORGANIZATION}}` |
| Risk class | `{{LOW / MEDIUM / HIGH / CRITICAL}}` |
| Reversibility | `{{REVERSIBLE / COSTLY_REVERSAL / EFFECTIVELY_IRREVERSIBLE}}` |
| Decision owner | `{{NAME_OR_ROLE}}` |
| Author | `{{NAME_OR_ROLE}}` |
| Proposed date | `{{YYYY-MM-DD}}` |
| Decision date | `{{YYYY-MM-DD_OR_N/A}}` |
| Target release | `{{RELEASE}}` |
| Review by | `{{DATE_OR_EVENT}}` |
| Repository | `{{PATH_OR_URL}}` |
| Default timezone | `{{IANA_TIMEZONE}}` |
| Data residency | `{{REGION_OR_N/A}}` |

## 1.2 Source Artifacts and Evidence Register

| Source ID | Artifact / Evidence | Version / Date | Authority / Quality | Relevant Claim | Location | Status |
|---|---|---|---|---|---|---|
| SRC-001 | `{{BRD_OR_POLICY}}` | `{{VERSION}}` | Business authority | `{{CLAIM}}` | `{{SECTION}}` | VALID |
| SRC-002 | `{{PRD}}` | `{{VERSION}}` | Product authority | `{{CLAIM}}` | `{{SECTION}}` | VALID |
| SRC-003 | `{{FSD_OR_REPOSITORY_EVIDENCE}}` | `{{VERSION_OR_COMMIT}}` | Implementation fact | `{{CLAIM}}` | `{{PATH_OR_SECTION}}` | VALID |
| EVD-001 | `{{SPIKE_BENCHMARK_INCIDENT_DOC}}` | `{{DATE}}` | `{{E0-E4}}` | `{{CLAIM_SUPPORTED}}` | `{{LINK_OR_PATH}}` | VALID |

Rules:

- Use primary sources where available.
- Vendor documentation does not prove compatibility with the project environment; use a spike when compatibility is material.
- Expired evidence must be given `STALE` status and not used without justification.
- Every performance/cost figure must state the workload, environment, period, and unit.

## 1.3 Revision History

| Version | Date | Author | Change Summary | Material? | Approval Impact |
|---|---|---|---|---:|---|
| 0.1 | {{YYYY-MM-DD}} | {{AUTHOR}} | Initial draft | Yes | Full review required |

## 1.4 Related and Supersession Map

| Relation | ADR ID | Title | Status | Relevance |
|---|---|---|---|---|
| Depends on | {{ADR-ID}} | {{TITLE}} | {{STATUS}} | {{WHY}} |
| Related | {{ADR-ID}} | {{TITLE}} | {{STATUS}} | {{WHY}} |
| Supersedes | {{ADR-ID_OR_NONE}} | {{TITLE}} | SUPERSEDED | {{WHAT_CHANGED}} |
| Superseded by | {{ADR-ID_OR_NONE}} | {{TITLE}} | {{STATUS}} | {{WHAT_CHANGED}} |

```mermaid
graph LR
    A[{{UPSTREAM_ADR_OR_REQUIREMENT}}] --> B[{{THIS_ADR_ID}}]
    B --> C[{{DOWNSTREAM_FSD_OR_ADR}}]
```

## 1.5 Decision Authority, Review, and Approval

| Role | Name | Authority | Decision | Date | Conditions / Notes |
|---|---|---|---|---|---|
| Decision owner |  | Accountable for decision outcome | Pending |  |  |
| Technical decider |  | Architecture | Pending |  |  |
| Product/business owner |  | Product/business boundary | Pending |  |  |
| Security/privacy |  | Security/data handling | Pending |  |  |
| Operations |  | Operability/SRE | Pending |  |  |
| Data owner |  | Data lifecycle/quality | Pending |  |  |
| Finance/procurement |  | Cost/vendor commitment | Pending |  |  |

Approval values: `APPROVE`, `APPROVE_WITH_RECORDED_CONDITIONS`, `REJECT`, `ABSTAIN`, `NOT_REQUIRED — reason`.

## 1.6 Stakeholder Impact and Communication

| Stakeholder / Team | Impact | Required Action | Communication Owner | Deadline | Acknowledged? |
|---|---|---|---|---|---:|
| {{TEAM}} | {{IMPACT}} | {{ACTION}} | {{OWNER}} | {{DATE}} | No |

## 1.7 Conflict and Resolution Ledger

| Conflict ID | Conflicting Statements | Sources | Decision Impact | Resolution | Approved By | Resulting Change |
|---|---|---|---|---|---|---|
| CONFLICT-001 | {{CONFLICT}} | {{SOURCES}} | {{IMPACT}} | {{RESOLUTION}} | {{APPROVER}} | {{UPDATED_IDS}} |

## 1.8 Change-Control Triggers

The following changes require a new ADR or supersession, not a material edit to this ADR:

| Trigger ID | Trigger | Required Action | Owner |
|---|---|---|---|
| CHG-001 | {{EXAMPLE: provider no longer meets residency requirement}} | New ADR + migration plan | {{OWNER}} |
| CHG-002 | {{EXAMPLE: target load exceeds tested envelope by 2x}} | Re-benchmark and review | {{OWNER}} |
| CHG-003 | {{EXAMPLE: security classification changes}} | Security review + possible supersession | {{OWNER}} |

---

# 2. Executive Decision Brief

## 2.1 Decision Statement — One Sentence

> **DEC-001:** The system **MUST** use `{{CHOSEN_OPTION_OR_PATTERN}}` for `{{SCOPE}}`, with `{{KEY_BOUNDARY_OR_CONDITION}}`; the system **MUST NOT** use `{{PROHIBITED_ALTERNATIVE_OR_BEHAVIOR}}` within this scope without an active exception or a replacement ADR.

The decision statement must be readable on its own without producing two equally plausible interpretations.

## 2.2 Decision Request

| Item | Summary |
|---|---|
| Decision requested | {{WHAT_MUST_BE_APPROVED}} |
| Problem being solved | {{PROBLEM}} |
| Selected option | {{OPT-ID_AND_NAME}} |
| Scope | {{IN_SCOPE}} |
| Out of scope | {{OUT_OF_SCOPE}} |
| Why now | {{URGENCY_OR_DEPENDENCY}} |
| Reversibility | {{LEVEL_AND_ESTIMATED_REVERSAL_COST}} |
| Blast radius | {{USERS_SYSTEMS_DATA_OPERATIONS}} |
| Residual risk | {{SUMMARY}} |
| Required go-live gate | {{GATE}} |

## 2.3 Rationale Summary

`{{CHOSEN_OPTION}}` was selected because of `{{TOP_2_TO_4_DECISIVE_REASONS}}`. This decision accepts the trade-off `{{MAIN_NEGATIVE_CONSEQUENCES}}` and applies only within the envelope `{{LOAD_DATA_SECURITY_TIME_ORGANIZATION_BOUNDARY}}`.

## 2.4 Expected Outcomes

| Outcome ID | Expected Effect | Metric / Evidence | Target | Evaluation Date |
|---|---|---|---|---|
| OUT-001 | {{OUTCOME}} | {{METRIC}} | {{TARGET}} | {{DATE_OR_GATE}} |

## 2.5 Conditions of Acceptance

| Condition ID | Condition | Owner | Evidence Required | Deadline / Gate |
|---|---|---|---|---|
| COND-001 | {{CONDITION_OR_N/A}} | {{OWNER}} | {{EVIDENCE}} | {{GATE}} |

Unmet conditions must not be hidden in notes. Mark them as implementation blockers where relevant.

---

# 3. Context, Problem, and Architecture Forces

## 3.1 Problem Statement

Format:

> Because of `{{CURRENT_CONDITION}}`, the system/team experiences `{{MEASURABLE_TECHNICAL_OR_OPERATIONAL_PROBLEM}}`, which impacts `{{USER_BUSINESS_SECURITY_OR_DELIVERY_IMPACT}}`. A decision is needed to select `{{DECISION_CATEGORY}}` before `{{TRIGGER_OR_DEADLINE}}`.

## 3.2 Current-State Architecture

Describe only the context needed for this decision.

| Component / Boundary | Current Responsibility | Current Technology / Mechanism | Pain / Limitation | Evidence |
|---|---|---|---|---|
| {{COMPONENT}} | {{RESPONSIBILITY}} | {{TECH}} | {{LIMITATION}} | {{SRC/EVD-ID}} |

```mermaid
flowchart LR
    U[{{ACTOR_OR_SYSTEM}}] --> A[{{CURRENT_COMPONENT}}]
    A --> D[{{DATA_STORE_OR_PROVIDER}}]
    A --> X[{{EXTERNAL_DEPENDENCY}}]
```

## 3.3 Target Boundary Being Decided

| In Scope | Out of Scope | Must Remain Unchanged |
|---|---|---|
| {{BOUNDARY}} | {{NON_DECISION}} | {{UPSTREAM_PRODUCT_OR_BUSINESS_INVARIANT}} |

## 3.4 Architecture Invariants

| Invariant ID | Invariant | Rationale | Enforcement / Evidence |
|---|---|---|---|
| INV-001 | {{CONDITION_THAT_MUST_ALWAYS_BE_TRUE}} | {{WHY}} | {{TEST_CONSTRAINT_MONITOR}} |

Example invariant categories:

- exactly one source of truth for a given datum;
- no unauthorized cross-tenant access;
- no acknowledged event lost;
- no classified data sent outside the approved boundary;
- no duplicate side effect for the same idempotency key;
- the service stays read-only when a given dependency is degraded;
- backward compatibility during the migration window.

## 3.5 Hard Constraints

| Constraint ID | Constraint | Source | Consequence if Violated | Veto? |
|---|---|---|---|---:|
| CONSTR-001 | {{CONSTRAINT}} | {{SRC-ID}} | {{CONSEQUENCE}} | Yes |

Hard constraints must not be “defeated” by the total weighted score.

## 3.6 Preferences

| Preference ID | Preference | Owner | Why Valuable | Tradeable Against |
|---|---|---|---|---|
| PREF-001 | {{PREFERENCE}} | {{OWNER}} | {{RATIONALE}} | {{OTHER_CRITERIA}} |

## 3.7 Assumptions and Validation

| Assumption ID | Assumption | Impact if False | Validation Method | Owner | Expiry / Gate | Status |
|---|---|---|---|---|---|---|
| ASSUMP-001 | {{ASSUMPTION}} | {{IMPACT}} | {{METHOD}} | {{OWNER}} | {{DATE_OR_GATE}} | UNVALIDATED |

## 3.8 Decision Drivers

| Driver ID | Driver | Priority | Why It Matters | Measurement |
|---|---|---:|---|---|
| DRV-001 | {{DRIVER}} | 1 | {{RATIONALE}} | {{HOW_MEASURED}} |

Priority `1` is the most important. Drivers that merely sound good but do not differentiate options must be removed.

## 3.9 Workload, Data, and Operating Envelope

| Dimension | Current | Target | Peak / Worst Case | Growth Horizon | Source |
|---|---:|---:|---:|---|---|
| Requests/second | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Concurrent users/jobs | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Data volume | {{VALUE_UNIT}} | {{VALUE_UNIT}} | {{VALUE_UNIT}} | {{PERIOD}} | {{SRC/EVD}} |
| Event/message rate | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Availability window | {{VALUE}} | {{VALUE}} | {{VALUE}} | {{PERIOD}} | {{SRC/EVD}} |
| Recovery objective | {{RTO/RPO}} | {{RTO/RPO}} | {{RTO/RPO}} | {{PERIOD}} | {{SRC/EVD}} |
| Data classification | {{CLASS}} | {{CLASS}} | {{CLASS}} | N/A | {{SRC}} |

Architecture claims outside this envelope must not be considered proven.

## 3.10 Why Now and Cost of Delay

| Trigger | Deadline / Event | Consequence of Delay | Temporary Mitigation |
|---|---|---|---|
| {{TRIGGER}} | {{DATE_OR_EVENT}} | {{IMPACT}} | {{MITIGATION_OR_NONE}} |

## 3.11 Non-Decisions and Explicit Non-Goals

- **ND-001:** This ADR does not decide `{{ITEM}}` because `{{REASON}}`.
- **ND-002:** This ADR does not change `{{BRD_PRD_POLICY_OR_API}}`.
- **ND-003:** This ADR does not grant permission for `{{PROHIBITED_SCOPE_EXPANSION}}`.

---

# 4. Evaluation Framework

## 4.1 Evaluation Criteria Dictionary

| Criterion ID | Criterion | Definition | Weight % | Measurement / Scoring Evidence | Minimum Threshold | Veto? |
|---|---|---|---:|---|---|---:|
| CRIT-001 | {{CRITERION}} | {{UNAMBIGUOUS_DEFINITION}} | {{0-100}} | {{METHOD}} | {{THRESHOLD}} | No |

Rules:

- Total weight must be `100%`.
- Overlapping criteria must be merged or their boundaries explained.
- Security, legal, residency, or mandatory compatibility criteria are usually better treated as hard constraints/vetoes than as small weights.
- Weights are set before the option results are known to reduce outcome bias.

## 4.2 Scoring Scale

Use the following anchors or define another equally explicit scale:

| Score | Meaning |
|---:|---|
| 0 | Does not meet the need; no realistic path |
| 1 | Very poor; large gaps/high risk |
| 2 | Below the need; requires material mitigation |
| 3 | Meets the minimum with acceptable trade-offs |
| 4 | Strong; meets the need with small trade-offs |
| 5 | Very strong; high evidence and a safe margin |

Every score must have a rationale and an evidence ID. Numbers without evidence are not analysis.

## 4.3 Decision Rules

- Options that violate a hard constraint are given `DISQUALIFIED` status, regardless of total score.
- Options with an evidence gap on a critical criterion must not be given optimistic scores; use a range or low confidence.
- A small score difference does not automatically determine the winner; consider reversibility, downside asymmetry, and uncertainty.
- The weighted score is an aid, not a replacement for engineering judgment and accountability.
- When a decision is highly reversible, preferring a small experiment can beat lengthy analysis.
- When a decision is effectively irreversible, the burden of proof must be higher.

## 4.4 Risk Appetite and Tolerance

| Dimension | Tolerance | Maximum Acceptable Exposure | Authority for Exception |
|---|---|---|---|
| Availability | {{LOW/MEDIUM/HIGH}} | {{THRESHOLD}} | {{ROLE}} |
| Data loss | {{TOLERANCE}} | {{RPO_OR_ZERO_LOSS}} | {{ROLE}} |
| Confidentiality | {{TOLERANCE}} | {{BOUNDARY}} | {{ROLE}} |
| Vendor lock-in | {{TOLERANCE}} | {{MAX_COMMITMENT}} | {{ROLE}} |
| Delivery delay | {{TOLERANCE}} | {{MAX_DELAY}} | {{ROLE}} |
| Cost variance | {{TOLERANCE}} | {{MAX_PERCENT_OR_AMOUNT}} | {{ROLE}} |

---

# 5. Options Considered

## 5.1 Option Inventory

| Option ID | Name | Category | Viable? | Status | Short Description |
|---|---|---|---:|---|---|
| OPT-000 | Status quo / do nothing | Baseline | Yes/No | EVALUATED | {{DESCRIPTION}} |
| OPT-001 | {{OPTION_NAME}} | {{BUILD/BUY/HYBRID/PATTERN}} | Yes | EVALUATED | {{DESCRIPTION}} |
| OPT-002 | {{OPTION_NAME}} | {{CATEGORY}} | Yes | EVALUATED | {{DESCRIPTION}} |

Status values: `EVALUATED`, `DISQUALIFIED`, `SELECTED`, `REJECTED`, `DEFERRED`.

## 5.2 Reusable Option Packet

Copy this section for every genuinely viable option.

### OPT-{{NNN}} — {{OPTION_NAME}}

#### 5.2.1 Summary

`{{DESCRIPTION_OF_OPTION_AND_CORE_MECHANISM}}`

#### 5.2.2 Architecture Sketch

```mermaid
flowchart LR
    A[{{COMPONENT_A}}] -->|{{PROTOCOL}}| B[{{OPTION_COMPONENT}}]
    B --> D[{{DATA_STORE_OR_PROVIDER}}]
```

#### 5.2.3 Scope and Assumptions

| Item | Detail |
|---|---|
| Applies to | {{SCOPE}} |
| Does not apply to | {{OUT_OF_SCOPE}} |
| Required assumptions | {{ASSUMP-IDS}} |
| Required dependencies | {{DEPENDENCIES}} |

#### 5.2.4 Constraint Compliance

| Constraint ID | Meets? | Evidence / Rationale | Required Mitigation |
|---|---:|---|---|
| CONSTR-001 | Yes/No/Unknown | {{EVIDENCE}} | {{MITIGATION_OR_NONE}} |

#### 5.2.5 Functional and Domain Fit

- Source-of-truth impact: `{{IMPACT}}`
- Consistency model: `{{MODEL}}`
- Transaction/idempotency behavior: `{{BEHAVIOR}}`
- Compatibility with required workflows: `{{FIT}}`
- Known semantic mismatch: `{{MISMATCH_OR_NONE}}`

#### 5.2.6 Security, Privacy, and Compliance

| Area | Impact / Control | Evidence | Residual Concern |
|---|---|---|---|
| Authentication/authorization | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Data egress/residency | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Encryption/secrets | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Audit/retention | {{IMPACT}} | {{EVD}} | {{CONCERN}} |
| Supply chain/vendor | {{IMPACT}} | {{EVD}} | {{CONCERN}} |

#### 5.2.7 Reliability and Failure Model

| Failure Mode | System Behavior | Detectability | Recovery | Data-Loss/Duplicate Risk |
|---|---|---|---|---|
| {{FAILURE}} | {{BEHAVIOR}} | {{SIGNAL}} | {{RECOVERY}} | {{RISK}} |

#### 5.2.8 Performance and Scalability

| Dimension | Expected Capability | Evidence Level | Tested Envelope | Limitation |
|---|---|---|---|---|
| Latency | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |
| Throughput | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |
| Storage/growth | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |
| Concurrency | {{VALUE}} | {{E0-E4}} | {{ENV}} | {{LIMIT}} |

#### 5.2.9 Operability and Observability

- Deployment model: `{{MODEL}}`
- Runtime ownership: `{{TEAM}}`
- Monitoring/alerting burden: `{{BURDEN}}`
- Backup/restore: `{{MODEL}}`
- On-call/runbook impact: `{{IMPACT}}`
- Degraded-mode capability: `{{CAPABILITY}}`

#### 5.2.10 Delivery, Skills, and Organizational Fit

| Dimension | Assessment |
|---|---|
| Implementation effort | {{SIZE_OR_RANGE_WITH_ASSUMPTIONS}} |
| Team familiarity | {{LEVEL_AND_EVIDENCE}} |
| Training need | {{NEED}} |
| Cross-team coordination | {{IMPACT}} |
| Delivery dependency | {{DEPENDENCY}} |

#### 5.2.11 Cost and Commercial Impact

| Cost Type | One-Time | Recurring | Unit / Driver | Confidence | Source |
|---|---:|---:|---|---|---|
| Build/migration | {{AMOUNT_OR_RANGE}} | N/A | {{DRIVER}} | {{LOW/MED/HIGH}} | {{SRC}} |
| License/provider | {{AMOUNT}} | {{AMOUNT_PERIOD}} | {{UNIT}} | {{CONFIDENCE}} | {{SRC}} |
| Operations/support | {{AMOUNT}} | {{AMOUNT_PERIOD}} | {{DRIVER}} | {{CONFIDENCE}} | {{SRC}} |
| Exit/reversal | {{AMOUNT_OR_RANGE}} | N/A | {{DRIVER}} | {{CONFIDENCE}} | {{SRC}} |

#### 5.2.12 Lock-In, Portability, and Reversibility

| Item | Assessment |
|---|---|
| Lock-in source | {{API/DATA/OPERATIONS/CONTRACT/SKILL}} |
| Exit path | {{PATH}} |
| Data export | {{FORMAT_AND_COMPLETENESS}} |
| Estimated reversal effort | {{RANGE}} |
| Irreversible effects | {{EFFECT_OR_NONE}} |

#### 5.2.13 Migration, Rollout, and Rollback

- Migration approach: `{{APPROACH}}`
- Parallel run possible: `{{YES_NO_AND_CONDITION}}`
- Feature flag/traffic split: `{{MECHANISM}}`
- Rollback trigger: `{{TRIGGER}}`
- Rollback feasibility: `{{ASSESSMENT}}`
- Data compatibility after rollback: `{{ASSESSMENT}}`

#### 5.2.14 Benefits

- `{{BENEFIT_1}}`
- `{{BENEFIT_2}}`

#### 5.2.15 Drawbacks and Risks

- `{{DRAWBACK_1}}`
- `{{DRAWBACK_2}}`

#### 5.2.16 Unknowns and Evidence Gaps

| Open ID | Unknown | Decision Impact | Validation | Blocker? |
|---|---|---|---|---:|
| OPEN-{{NNN}} | {{UNKNOWN}} | {{IMPACT}} | {{METHOD}} | Yes/No |

## 5.3 Disqualified Options

| Option ID | Reason Disqualified | Constraint Violated | Evidence | Could Become Viable If |
|---|---|---|---|---|
| OPT-{{NNN}} | {{REASON}} | {{CONSTR-ID}} | {{EVD-ID}} | {{CONDITION_OR_NEVER}} |

## 5.4 Options Not Evaluated

| Candidate | Why Not Evaluated | Risk of Exclusion | Reviewer Agreement |
|---|---|---|---|
| {{CANDIDATE}} | {{REASON}} | {{RISK}} | {{NAME/ROLE}} |

Excluding an option because the author is unfamiliar with it is not a valid reason.

---

# 6. Comparative Analysis and Evidence

## 6.1 Hard-Constraint Matrix

| Constraint | OPT-000 | OPT-001 | OPT-002 | Notes |
|---|---:|---:|---:|---|
| CONSTR-001 | PASS/FAIL/? | PASS/FAIL/? | PASS/FAIL/? | {{RATIONALE}} |

## 6.2 Weighted Scorecard

| Criterion | Weight | OPT-000 Score | OPT-000 Evidence | OPT-001 Score | OPT-001 Evidence | OPT-002 Score | OPT-002 Evidence |
|---|---:|---:|---|---:|---|---:|---|
| CRIT-001 | {{%}} | {{0-5}} | {{EVD}} | {{0-5}} | {{EVD}} | {{0-5}} | {{EVD}} |
| **Weighted total** | **100%** | **{{TOTAL}}** |  | **{{TOTAL}}** |  | **{{TOTAL}}** |  |

## 6.3 Score Confidence

| Option | Score Range | Confidence | Main Uncertainty | Effect if Wrong |
|---|---|---|---|---|
| OPT-001 | {{LOW-HIGH}} | LOW/MEDIUM/HIGH | {{UNCERTAINTY}} | {{IMPACT}} |

## 6.4 Spike / PoC / Benchmark Plan and Results

### SPIKE-{{NNN}} — {{NAME}}

| Field | Value |
|---|---|
| Hypothesis | {{TESTABLE_HYPOTHESIS}} |
| Environment | {{HARDWARE_SOFTWARE_NETWORK_DATA}} |
| Dataset/workload | {{REPRESENTATIVE_INPUT}} |
| Procedure | {{REPRODUCIBLE_STEPS_OR_SCRIPT}} |
| Success threshold | {{MEASURABLE_THRESHOLD}} |
| Failure threshold | {{MEASURABLE_THRESHOLD}} |
| Result | {{RESULT}} |
| Raw evidence | {{PATH_LINK_LOG_REPORT}} |
| Limitations | {{WHAT_THIS_DOES_NOT_PROVE}} |
| Conclusion | {{SUPPORTED_NOT_SUPPORTED_INCONCLUSIVE}} |

Spike code must be labeled `throwaway` or `production-candidate`. Do not put spikes into production without the applicable quality/security review.

## 6.5 Compatibility Matrix

| Dimension | Required | OPT-001 | OPT-002 | Verification Method |
|---|---|---|---|---|
| Runtime/OS | {{VERSION}} | {{COMPAT}} | {{COMPAT}} | {{TEST}} |
| Database | {{VERSION}} | {{COMPAT}} | {{COMPAT}} | {{TEST}} |
| Existing API/event | {{CONTRACT}} | {{COMPAT}} | {{COMPAT}} | {{CONTRACT_TEST}} |
| Deployment platform | {{PLATFORM}} | {{COMPAT}} | {{COMPAT}} | {{SMOKE}} |
| Security controls | {{CONTROL}} | {{COMPAT}} | {{COMPAT}} | {{REVIEW_TEST}} |
| Data migration | {{NEED}} | {{COMPAT}} | {{COMPAT}} | {{DRY_RUN}} |

## 6.6 Sensitivity Analysis

Test whether the choice changes when a key assumption or weight changes.

| Scenario | Changed Variable | OPT-001 Result | OPT-002 Result | Winner Changes? | Implication |
|---|---|---:|---:|---:|---|
| Base | None | {{SCORE}} | {{SCORE}} | No | {{NOTE}} |
| Cost +50% | {{COST}} | {{SCORE}} | {{SCORE}} | Yes/No | {{NOTE}} |
| Load 2x | {{LOAD}} | {{SCORE}} | {{SCORE}} | Yes/No | {{NOTE}} |
| Provider outage | {{AVAILABILITY}} | {{SCORE}} | {{SCORE}} | Yes/No | {{NOTE}} |

## 6.7 Trade-Off Summary

| Trade-Off | Gain | Accepted Loss | Why Acceptable | Owner |
|---|---|---|---|---|
| {{TRADEOFF}} | {{GAIN}} | {{LOSS}} | {{RATIONALE}} | {{OWNER}} |

## 6.8 Dissenting Opinion

| Reviewer | Position | Strongest Argument | Evidence | Resolution / Why Not Selected |
|---|---|---|---|---|
| {{NAME_OR_ROLE}} | {{POSITION}} | {{ARGUMENT}} | {{EVD}} | {{RESOLUTION}} |

The absence of a dissenting opinion may be recorded as `N/A — all reviewers agreed after review`; do not delete this section.

## 6.9 Decision Confidence

| Item | Value |
|---|---|
| Overall confidence | `{{LOW / MEDIUM / HIGH}}` |
| Evidence ceiling | `{{E0-E4}}` |
| Most fragile assumption | `{{ASSUMP-ID}}` |
| Downside if wrong | `{{IMPACT}}` |
| Fastest validation after adoption | `{{METHOD}}` |

---

# 7. Decision Specification

## 7.1 Selected Option

`OPT-{{NNN}} — {{OPTION_NAME}}` is selected.

## 7.2 Normative Decision Clauses

Write down every rule that must be passed on to the FSD and implementation goals.

| Decision ID | Normative Clause | Applies To | Verification |
|---|---|---|---|
| DEC-001 | The system **MUST** `{{BEHAVIOR_OR_PATTERN}}`. | {{SCOPE}} | {{FF/TEST/REVIEW}} |
| DEC-002 | The system **MUST NOT** `{{FORBIDDEN_BEHAVIOR}}`. | {{SCOPE}} | {{FF/TEST/REVIEW}} |
| DEC-003 | `{{COMPONENT}}` **MUST** be the source of truth for `{{DATA_OR_STATE}}`. | {{SCOPE}} | {{CONSTRAINT/TEST}} |

Avoid phrases such as “use a good abstraction” or “make sure it is scalable”. State a concrete interface, boundary, target, or check.

## 7.3 Decision Scope Matrix

| Area | Included | Excluded / Delegated | Authority Downstream |
|---|---|---|---|
| Components | {{COMPONENTS}} | {{EXCLUDED}} | FSD may detail internals |
| Data | {{DATA}} | {{EXCLUDED}} | FSD defines schema within rules |
| Interfaces | {{INTERFACES}} | {{EXCLUDED}} | FSD defines exact contracts |
| Deployment | {{TOPOLOGY}} | {{EXCLUDED}} | Platform team may tune within limits |
| Operations | {{OPERATING_MODEL}} | {{EXCLUDED}} | Runbook details downstream |

## 7.4 Target Architecture

```mermaid
flowchart LR
    U[{{USER_OR_UPSTREAM}}] --> G[{{ENTRY_COMPONENT}}]
    G --> S[{{SERVICE_OR_MODULE}}]
    S --> D[( {{SOURCE_OF_TRUTH}} )]
    S --> Q[{{QUEUE_OR_ASYNC_BOUNDARY}}]
    Q --> W[{{WORKER}}]
    W --> X[{{EXTERNAL_SYSTEM}}]
```

## 7.5 Component Responsibilities and Boundaries

| Component | Owns | Must Not Own | Inputs | Outputs | Failure Boundary |
|---|---|---|---|---|---|
| {{COMPONENT}} | {{RESPONSIBILITY}} | {{NON_RESPONSIBILITY}} | {{INPUT}} | {{OUTPUT}} | {{FAILURE_BEHAVIOR}} |

## 7.6 Allowed and Prohibited Patterns

| ID | Type | Rule | Rationale | Detection |
|---|---|---|---|---|
| RULE-001 | REQUIRED | {{REQUIRED_PATTERN}} | {{WHY}} | {{TEST/REVIEW}} |
| PROHIB-001 | FORBIDDEN | {{PROHIBITED_PATTERN}} | {{WHY}} | {{LINT/TEST/REVIEW}} |

## 7.7 Source-of-Truth and Consistency Rules

| Datum / State | Authoritative Owner | Replicas/Caches | Consistency Model | Conflict Resolution | Reconciliation |
|---|---|---|---|---|---|
| {{DATA}} | {{OWNER}} | {{REPLICAS}} | {{STRONG/EVENTUAL}} | {{RULE}} | {{JOB_OR_N/A}} |

## 7.8 Data and Persistence Implications

- Data model constraints: `{{CONSTRAINTS}}`
- Schema ownership: `{{OWNER}}`
- Migration compatibility: `{{FORWARD_BACKWARD_RULE}}`
- Retention/deletion: `{{RULE}}`
- Encryption/classification: `{{RULE}}`
- Canonical identifiers/versioning: `{{RULE}}`
- Transaction boundary: `{{BOUNDARY}}`
- Locking/concurrency strategy: `{{STRATEGY}}`

The ADR does not need to contain the entire schema unless the schema choice is the core of the decision. The FSD must still detail the physical model.

## 7.9 Interface, API, Event, and Integration Implications

| Interface | Decision Boundary | Required Semantic | Compatibility | Owner |
|---|---|---|---|---|
| {{API/EVENT/ADAPTER}} | {{BOUNDARY}} | {{IDEMPOTENCY_ORDERING_VERSIONING}} | {{RULE}} | {{OWNER}} |

## 7.10 Reliability and Failure Semantics

| Dependency / Failure | Required System Behavior | Degraded Mode | Retry/Timeout/Circuit Rule | Data Integrity Rule |
|---|---|---|---|---|
| {{FAILURE}} | {{BEHAVIOR}} | {{MODE}} | {{RULE}} | {{INVARIANT}} |

## 7.11 Security, Privacy, and Trust-Boundary Rules

| Rule ID | Requirement | Enforcement | Evidence |
|---|---|---|---|
| SEC-001 | {{SECURITY_RULE}} | {{CONTROL}} | {{TEST_REVIEW}} |
| PRIV-001 | {{PRIVACY_RULE}} | {{CONTROL}} | {{TEST_REVIEW}} |

## 7.12 Operational Model

| Topic | Decision |
|---|---|
| Runtime owner | {{TEAM}} |
| Deployment model | {{MODEL}} |
| Configuration ownership | {{OWNER}} |
| Secret ownership | {{OWNER}} |
| On-call responsibility | {{TEAM_OR_N/A}} |
| Backup/restore responsibility | {{TEAM}} |
| Capacity review | {{CADENCE_OR_TRIGGER}} |
| Vendor escalation | {{PATH_OR_N/A}} |

## 7.13 Exception Policy

Deviations are only allowed through an exception record:

| Exception ID | Requested Deviation | Scope | Reason | Risk | Compensating Control | Approver | Expiry | Exit Plan | Status |
|---|---|---|---|---|---|---|---|---|---|
| EXC-001 | {{DEVIATION}} | {{SCOPE}} | {{REASON}} | {{RISK}} | {{CONTROL}} | {{APPROVER}} | {{DATE}} | {{PLAN}} | REQUESTED |

Rules:

- Exceptions must not lack an expiry.
- Exceptions must not implicitly expand the scope.
- Expired exceptions are treated as violations, not permanent precedents.
- Repeated exceptions indicate the ADR needs review or the implementation needs fixing.

---

# 8. Consequences and Accepted Trade-Offs

## 8.1 Positive Consequences

| ID | Consequence | Beneficiary | Expected Evidence | Realization Owner |
|---|---|---|---|---|
| CONS-POS-001 | {{POSITIVE_EFFECT}} | {{TEAM/SYSTEM/USER}} | {{METRIC}} | {{OWNER}} |

## 8.2 Negative Consequences

| ID | Consequence | Severity | Why Accepted | Mitigation | Owner |
|---|---|---|---|---|---|
| CONS-NEG-001 | {{NEGATIVE_EFFECT}} | {{LOW-HIGH}} | {{RATIONALE}} | {{MITIGATION}} | {{OWNER}} |

Real downsides must be listed. “No negative consequences” requires extraordinary justification.

## 8.3 Neutral / Structural Consequences

| ID | Consequence | Affected Area | Required Follow-Up |
|---|---|---|---|
| CONS-NEU-001 | {{STRUCTURAL_CHANGE}} | {{AREA}} | {{ACTION}} |

## 8.4 Technical Debt Deliberately Accepted

| Debt ID | Debt | Why Accepted Now | Cost/Risk | Paydown Trigger | Owner |
|---|---|---|---|---|---|
| DEBT-001 | {{DEBT}} | {{RATIONALE}} | {{IMPACT}} | {{TRIGGER}} | {{OWNER}} |

## 8.5 Cost, Lock-In, and Exit Consequences

| Area | Accepted Consequence | Maximum Exposure | Exit Mechanism | Review Trigger |
|---|---|---|---|---|
| Recurring cost | {{COST}} | {{LIMIT}} | {{EXIT}} | {{TRIGGER}} |
| Vendor lock-in | {{LOCKIN}} | {{LIMIT}} | {{EXIT}} | {{TRIGGER}} |
| Operational burden | {{BURDEN}} | {{LIMIT}} | {{EXIT}} | {{TRIGGER}} |
| Skills dependency | {{DEPENDENCY}} | {{LIMIT}} | {{TRAINING_OR_EXIT}} | {{TRIGGER}} |

## 8.6 Organizational and Process Consequences

| Team / Process | Change | Training / Staffing | New Ownership | Evidence of Readiness |
|---|---|---|---|---|
| {{TEAM}} | {{CHANGE}} | {{NEED}} | {{OWNER}} | {{EVIDENCE}} |

## 8.7 Residual Risk Acceptance

| Risk ID | Residual Risk | Likelihood | Impact | Owner | Accepted By | Review Date/Trigger |
|---|---|---:|---:|---|---|---|
| RISK-001 | {{RISK}} | {{1-5}} | {{1-5}} | {{OWNER}} | {{AUTHORITY}} | {{DATE/TRIGGER}} |

---

# 9. Implementation, Migration, and Rollout Contract

## 9.1 Implementation Obligations

| Obligation ID | Required Change | Affected Artifact / Component | Owner | Depends On | Completion Evidence |
|---|---|---|---|---|---|
| IMPL-001 | {{REQUIRED_CHANGE}} | {{FSD/CODE/DATA/INFRA}} | {{OWNER}} | {{DEPENDENCY}} | {{EVIDENCE}} |

## 9.2 FSD Handoff Requirements

When this ADR is used and has `ACCEPTED` status, the related FSD **MUST** update the following areas or write `N/A — reason`. Without a linked FSD, this ADR must not become a standalone implementation instruction:

| FSD Area | Required Detail | ADR Clauses | Blocker? |
|---|---|---|---:|
| Architecture/context | Target components and boundary | DEC-001 | Yes |
| Domain/source of truth | Ownership and invariants | DEC-003, INV-* | Yes |
| Data design | Schema, constraints, migration, retention | {{DEC-IDS}} | {{YES/NO}} |
| API/events | Exact versioning, idempotency, failure contracts | {{DEC-IDS}} | {{YES/NO}} |
| Security/privacy | Trust boundaries and control enforcement | {{SEC/PRIV-IDS}} | {{YES/NO}} |
| Jobs/integration | Retry, timeout, reconciliation, degraded mode | {{DEC-IDS}} | {{YES/NO}} |
| NFR/capacity | Tested operating envelope and SLO | {{DRV/CRIT-IDS}} | {{YES/NO}} |
| Observability | Fitness functions, metrics, alerts, runbook | {{FF-IDS}} | {{YES/NO}} |
| Delivery | Migration, rollout, rollback | {{IMPL-IDS}} | {{YES/NO}} |
| Goal manifest | Atomic work packages referencing FSD and this ADR when applicable | {{IMPL-IDS}} | Yes |

## 9.3 Dependency and Sequencing

```mermaid
graph TD
    G1[GOAL-001: {{FOUNDATION}}] --> G2[GOAL-002: {{IMPLEMENTATION}}]
    G2 --> G3[GOAL-003: {{MIGRATION}}]
    G2 --> G4[GOAL-004: {{OBSERVABILITY}}]
    G3 --> G5[GOAL-005: {{ROLLOUT}}]
    G4 --> G5
```

| Sequence | Obligation / Goal | Entry Criteria | Exit Criteria |
|---:|---|---|---|
| 1 | {{IMPL/GOAL-ID}} | {{PRECONDITION}} | {{VERIFIABLE_RESULT}} |

## 9.4 Migration Strategy

| Phase | Scope | Method | Data Compatibility | Verification | Rollback Point |
|---|---|---|---|---|---|
| 0 | Preparation | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 1 | Shadow/dual-read | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 2 | Partial cutover | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 3 | Full cutover | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |
| 4 | Decommission | {{METHOD}} | {{RULE}} | {{CHECK}} | {{POINT}} |

## 9.5 Backward and Forward Compatibility

- Old reader with new data: `{{SUPPORTED/NOT_SUPPORTED_AND_RULE}}`
- New reader with old data: `{{SUPPORTED/NOT_SUPPORTED_AND_RULE}}`
- API/event compatibility window: `{{WINDOW}}`
- Mixed-version deployment behavior: `{{BEHAVIOR}}`
- Rollback after schema migration: `{{POSSIBLE/CONDITIONS}}`

## 9.6 Feature Flag / Traffic Control

| Flag / Control | Purpose | Default | Owner | Removal Criteria | Maximum Lifetime |
|---|---|---|---|---|---|
| {{FLAG}} | {{PURPOSE}} | OFF/ON | {{OWNER}} | {{CRITERIA}} | {{DATE}} |

Permanent flags without an owner and removal criteria are forbidden.

## 9.7 Rollout Plan

| Stage | Audience/Traffic | Duration / Evidence Window | Success Criteria | Abort Criteria |
|---|---:|---|---|---|
| Internal | {{SCOPE}} | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |
| Canary | {{PERCENT}} | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |
| Broad | {{PERCENT}} | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |
| Full | 100% | {{WINDOW}} | {{CRITERIA}} | {{CRITERIA}} |

## 9.8 Rollback Contract

| Rollback ID | Trigger | Decision Authority | Action | Data Handling | Verification | Maximum Recovery Time |
|---|---|---|---|---|---|---|
| ROLLBACK-001 | {{TRIGGER}} | {{ROLE}} | {{ACTION}} | {{DATA_RULE}} | {{CHECK}} | {{TIME}} |

The rollback plan must explain whether a code rollback also requires a data/config/provider-state rollback. “Redeploy the old version” is rarely enough.

## 9.9 Decommission Plan

| Legacy Component / Pattern | Disable Condition | Data Disposition | Consumer Migration | Removal Verification | Owner |
|---|---|---|---|---|---|
| {{LEGACY}} | {{CONDITION}} | {{RULE}} | {{PLAN}} | {{CHECK}} | {{OWNER}} |

## 9.10 Operational Readiness

- [ ] The owner and on-call path are in place.
- [ ] Dashboards and alerts are in place before material rollout.
- [ ] Runbooks for the top failure modes are available.
- [ ] The backup/restore or recovery mechanism is tested.
- [ ] Secrets/configuration are available in the target environment.
- [ ] Capacity limits and cost guardrails are installed.
- [ ] The vendor escalation/support path is documented where relevant.
- [ ] A rollback rehearsal or dry run is complete for `HIGH/CRITICAL` risk.

---

# 10. Security, Privacy, Compliance, and AI Impact

## 10.1 Data Flow and Trust Boundaries

```mermaid
flowchart LR
    subgraph T1[{{TRUST_ZONE_1}}]
      A[{{COMPONENT}}]
    end
    subgraph T2[{{TRUST_ZONE_2}}]
      B[{{COMPONENT_OR_VENDOR}}]
    end
    A -->|{{DATA_CLASS_AND_PROTOCOL}}| B
```

| Flow ID | Source | Destination | Data | Classification | Purpose | Encryption | Authorization | Retention |
|---|---|---|---|---|---|---|---|---|
| FLOW-001 | {{SOURCE}} | {{DEST}} | {{DATA}} | {{CLASS}} | {{PURPOSE}} | {{CONTROL}} | {{CONTROL}} | {{PERIOD}} |

## 10.2 Threat Model Delta

The ADR must assess the **change** in the threat model, not copy a generic list.

| Threat ID | New/Changed Threat | Asset | Attack Path | Likelihood | Impact | Mitigation | Residual Risk |
|---|---|---|---|---:|---:|---|---|
| THREAT-001 | {{THREAT}} | {{ASSET}} | {{PATH}} | {{1-5}} | {{1-5}} | {{MIT-ID}} | {{RISK-ID}} |

## 10.3 Security Control Impact

| Control Area | Current | Decision Impact | Required Control | Verification |
|---|---|---|---|---|
| Identity/session | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Authorization | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Secrets | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Encryption | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Logging/audit | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |
| Supply chain | {{CURRENT}} | {{IMPACT}} | {{CONTROL}} | {{TEST}} |

## 10.4 Privacy and Data-Lifecycle Impact

| Topic | Decision |
|---|---|
| Personal data introduced/changed | {{DATA_OR_NONE}} |
| Purpose/legal basis | {{PURPOSE_OR_N/A}} |
| Data minimization | {{RULE}} |
| Data subject rights impact | {{IMPACT_OR_N/A}} |
| Residency/transfer | {{RULE}} |
| Retention/deletion | {{RULE}} |
| Processor/subprocessor | {{VENDOR_OR_NONE}} |
| DPIA/assessment required | {{YES_NO_REASON}} |

## 10.5 Compliance and Policy Mapping

| Obligation / Control | Applicability | How Decision Satisfies It | Evidence | Exception |
|---|---|---|---|---|
| {{POLICY_STANDARD_CONTROL}} | {{YES/NO}} | {{MECHANISM}} | {{EVIDENCE}} | {{EXC-ID_OR_NONE}} |

## 10.6 AI/ML-Specific Decision Boundary

Complete when the ADR concerns AI/ML/agentic automation; otherwise `N/A — the decision does not use AI/ML`.

| Topic | Required Decision |
|---|---|
| Model/provider | {{MODEL_OR_ABSTRACTION}} |
| Permitted data | {{DATA_CLASSES}} |
| Prohibited data | {{DATA_CLASSES}} |
| Data egress/residency | {{BOUNDARY}} |
| Human authority | {{WHAT_AI_MAY_AND_MAY_NOT_DECIDE}} |
| Structured output | {{SCHEMA_OR_CONTRACT}} |
| Evidence/citation requirement | {{RULE}} |
| Prompt/tool versioning | {{RULE}} |
| Evaluation gate | {{DATASET_METRIC_THRESHOLD}} |
| Hallucination/invalid output handling | {{FAIL_CLOSED_BEHAVIOR}} |
| Prompt injection boundary | {{CONTROL}} |
| Audit/reproducibility | {{RUN_ID_MODEL_PROMPT_INPUT_HASH}} |
| Degraded fallback | {{BEHAVIOR}} |
| Provider swap boundary | {{INTERFACE_AND_NON_GOALS}} |

AI output must not become authoritative state merely because of high confidence. A human or deterministic gate must be written down when the outcome has material impact.

## 10.7 Third-Party and Vendor Risk

| Vendor | Data/Access | Availability Dependency | Contract/SLA | Exit Risk | Security Evidence | Owner |
|---|---|---|---|---|---|---|
| {{VENDOR}} | {{DATA}} | {{DEPENDENCY}} | {{SLA}} | {{RISK}} | {{EVIDENCE}} | {{OWNER}} |

---

# 11. Architecture Fitness Functions and Verification

## 11.1 Fitness Function Inventory

Every important architecture property must have a clear automated or manual check.

| FF ID | Property Protected | Check | Type | Frequency | Threshold | Failure Action | Owner |
|---|---|---|---|---|---|---|---|
| FF-001 | {{ARCHITECTURE_PROPERTY}} | {{COMMAND_TEST_QUERY_REVIEW}} | CI / runtime / scheduled / manual | {{FREQUENCY}} | {{PASS_CRITERIA}} | {{ACTION}} | {{OWNER}} |

Examples:

- a dependency rule test prevents the domain layer from importing infrastructure adapters;
- a contract test verifies the provider adapter satisfies the decided interface;
- a query verifies there are no rows without a tenant key;
- policy-as-code verifies storage resides in the approved region;
- an SLO alert detects p95 latency exceeding the envelope;
- a reconciliation metric detects source-of-truth drift;
- a CI scan prevents direct vendor SDK usage outside the adapter package.

## 11.2 Acceptance and Validation Matrix

| Validation ID | ADR Clause | Scenario | Evidence Required | Environment | Owner | Gate |
|---|---|---|---|---|---|---|
| VAL-001 | DEC-001 | {{SCENARIO}} | {{TEST_LOG_REPORT}} | {{ENV}} | {{OWNER}} | Merge/Release/Post-release |

## 11.3 Repository Verification Commands

```bash
# Replace with verified repository commands; do not invent.
{{INSTALL_COMMAND}}
{{LINT_COMMAND}}
{{TYPECHECK_COMMAND}}
{{UNIT_TEST_COMMAND}}
{{INTEGRATION_TEST_COMMAND}}
{{CONTRACT_TEST_COMMAND}}
{{MIGRATION_DRY_RUN_COMMAND}}
{{SECURITY_SCAN_COMMAND}}
{{ARCHITECTURE_TEST_COMMAND}}
{{BUILD_COMMAND}}
{{SMOKE_TEST_COMMAND}}
```

Every command must have been run in the relevant repository/environment before a goal is declared `READY`.

## 11.4 Performance / Capacity Verification

| Test | Workload | Environment | Warm-up | Duration | Target | Abort Threshold | Result Artifact |
|---|---|---|---|---|---|---|---|
| BENCH-001 | {{WORKLOAD}} | {{ENV}} | {{TIME}} | {{TIME}} | {{TARGET}} | {{ABORT}} | {{PATH}} |

## 11.5 Failure Injection and Recovery Verification

| Failure | Injection Method | Expected Behavior | Data Integrity Check | Recovery Check | Result |
|---|---|---|---|---|---|
| {{DEPENDENCY_TIMEOUT}} | {{METHOD}} | {{BEHAVIOR}} | {{CHECK}} | {{CHECK}} | {{PASS/FAIL}} |

## 11.6 Security Verification

| Test / Review | Scope | Expected Result | Evidence | Owner |
|---|---|---|---|---|
| Threat-model review | {{SCOPE}} | No unmitigated critical threat | {{REPORT}} | {{OWNER}} |
| Authorization negative test | {{SCOPE}} | Deny + audit | {{TEST}} | {{OWNER}} |
| Secret scan | {{SCOPE}} | Zero exposed secrets | {{REPORT}} | {{OWNER}} |
| Dependency/SBOM review | {{SCOPE}} | Within policy | {{REPORT}} | {{OWNER}} |

## 11.7 Completion Evidence

The ADR implementation is not considered complete until the following are available:

- [ ] an FSD update that traces the decision clauses;
- [ ] code/config/schema/infra changes per the implementation obligations;
- [ ] active tests and fitness functions;
- [ ] migration/rollout/rollback evidence;
- [ ] dashboards/alerts/runbooks for material failures;
- [ ] security/privacy/compliance approvals where required;
- [ ] post-deployment validation results;
- [ ] records of any still-open debt, exceptions, or residual risks;
- [ ] a completion report with commit/release references.

---

# 12. Observability, Operations, and Economics

## 12.1 Decision-Specific Telemetry

| Signal | Type | Purpose | Labels/Dimensions | Threshold | Retention |
|---|---|---|---|---|---|
| {{METRIC_LOG_TRACE}} | metric/log/trace/audit | {{PURPOSE}} | {{DIMENSIONS}} | {{THRESHOLD}} | {{PERIOD}} |

Avoid uncontrolled high-cardinality labels or logging sensitive payloads.

## 12.2 Dashboards and Alerts

| Dashboard / Alert | Audience | Signal | Trigger | Severity | Response Runbook |
|---|---|---|---|---|---|
| {{NAME}} | {{AUDIENCE}} | {{SIGNAL}} | {{TRIGGER}} | {{SEVERITY}} | {{RUNBOOK}} |

## 12.3 Runbook Inventory

| Runbook ID | Scenario | Owner | Trigger | Required Steps | Last Tested |
|---|---|---|---|---|---|
| RB-001 | {{FAILURE_SCENARIO}} | {{OWNER}} | {{TRIGGER}} | {{PATH_OR_SUMMARY}} | {{DATE}} |

## 12.4 Cost Guardrails

| Cost Driver | Unit | Expected | Warning Threshold | Hard Limit / Approval | Owner |
|---|---|---:|---:|---:|---|
| {{DRIVER}} | {{UNIT}} | {{VALUE}} | {{VALUE}} | {{VALUE_OR_APPROVAL}} | {{OWNER}} |

## 12.5 Capacity and Scaling Triggers

| Resource / Limit | Current Envelope | Warning | Scale Action | Architecture Review Trigger |
|---|---:|---:|---|---|
| {{RESOURCE}} | {{VALUE}} | {{VALUE}} | {{ACTION}} | {{TRIGGER}} |

---

# 13. Agentic Execution Handoff

## 13.1 Machine-Readable Decision Manifest

```yaml
schema_version: "2.0"
artifact_governance:
  optional_artifact: true
  canonical_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
  fsd_is_primary_implementation_authority: true
  adr_must_be_linked_from_fsd: true
adr:
  id: "{{ADR_ID}}"
  title: "{{DECISION_TITLE}}"
  status: "{{ACCEPTED}}"
  applicability_status: "{{OPTIONAL_USED_OR_REQUIRED_BY_PROJECT_POLICY}}"
  linked_fsd_id: "FSD-{{PROJECT_CODE}}"
  replaces_fsd_tdec: "{{TDEC_ID_OR_NONE}}"
  decision_type: "{{TYPE}}"
  risk_class: "{{RISK_CLASS}}"
  reversibility: "{{REVERSIBILITY}}"
  scope:
    include:
      - "{{COMPONENT_OR_BOUNDARY}}"
    exclude:
      - "{{OUT_OF_SCOPE}}"
  upstream_authority:
    brd:
      - "{{BRD_ID}}"
    prd:
      - "{{PRD_ID}}"
    policies:
      - "{{POLICY_ID}}"
  selected_option: "OPT-{{NNN}}"
  mandatory_decisions:
    - id: "DEC-001"
      rule: "{{NORMATIVE_RULE}}"
    - id: "DEC-002"
      rule: "{{NORMATIVE_RULE}}"
  invariants:
    - id: "INV-001"
      rule: "{{INVARIANT}}"
  prohibited_patterns:
    - id: "PROHIB-001"
      rule: "{{PROHIBITED_BEHAVIOR}}"
  implementation_obligations:
    - id: "IMPL-001"
      target: "{{ARTIFACT_OR_COMPONENT}}"
      required_change: "{{CHANGE}}"
  fitness_functions:
    - id: "FF-001"
      command_or_check: "{{VERIFIED_CHECK}}"
      pass_condition: "{{PASS_CONDITION}}"
  rollout:
    strategy: "{{STRATEGY}}"
    abort_conditions:
      - "{{CONDITION}}"
  rollback:
    supported: true
    trigger:
      - "{{TRIGGER}}"
    data_constraint: "{{DATA_RULE}}"
  open_items:
    blockers: []
    non_blockers:
      - id: "OPEN-{{NNN}}"
        fallback: "{{APPROVED_FALLBACK}}"
  stop_conditions:
    - "FSD status is not APPROVED"
    - "FSD does not link this ADR"
    - "ADR status is not ACCEPTED"
    - "An upstream BRD/PRD conflict is discovered"
    - "A mandatory repository fact contradicts the ADR and no approved fallback exists"
    - "Required destructive migration lacks approved backup and rollback evidence"
    - "Security/privacy boundary cannot be implemented as specified"
  review_triggers:
    - id: "REVTRIG-001"
      trigger: "{{EVENT_OR_THRESHOLD}}"
```

## 13.2 Goal-Slicing Rules

- One goal must produce one atomic, reviewable outcome.
- Foundation/interface goals precede adapter/provider implementation when the abstraction boundary is part of the decision.
- Data migration is separated from application cutover when the two carry different rollback risks.
- Fitness functions and observability must not be deferred to “cleanup”; place them before rollout.
- A decommission goal is only `READY` after the rollback window and exit criteria are satisfied.
- Every goal must reference the FSD and the related FSD requirements.
- When a goal falls within the scope of this ADR, the goal must also reference the `ADR-ID`, `DEC-*`, `IMPL-*`, and `FF-*`.
- Goals outside the ADR's scope do not need to add token ADR references.
- Goals must not make new technology, enum, source-of-truth, consistency, security, or failure-semantics decisions.

## 13.3 Reusable Goal Packet

### GOAL-{{NNN}} — {{ATOMIC_OUTCOME}}

**Authority**

- FSD: `{{FSD_ID_AND_SECTION}}` — primary implementation authority
- FSD requirements: `{{FSD-IDS}}`
- ADR: `{{ADR_ID}}` — optional linked authority for this goal
- Decision clauses: `{{DEC-IDS}}`
- Depends on: `{{GOAL-IDS_OR_NONE}}`

**Objective**

`{{ONE_OBSERVABLE_OUTCOME}}`

**Allowed scope**

- `{{PATH_COMPONENT_SCHEMA_CONFIG}}`

**Explicitly prohibited**

- `{{OUT_OF_SCOPE_REFACTOR_OR_SUBSTITUTION}}`
- No new provider/pattern outside `{{SELECTED_OPTION}}`.
- No weakened validation, authorization, audit, tests, or failure handling.

**Implementation contract**

- `{{MANDATORY_RULES}}`

**Acceptance gates**

- [ ] `{{OBSERVABLE_ACCEPTANCE}}`
- [ ] `{{NEGATIVE_OR_FAILURE_ACCEPTANCE}}`
- [ ] `{{FITNESS_FUNCTION_ACTIVE}}`

**Verification commands**

```bash
{{VERIFIED_COMMANDS}}
```

**Required completion report**

- changed files and rationale;
- migrations/config/secrets impact;
- tests and commands with results;
- FSD/ADR deviations: none or explicitly listed;
- residual risks/open items;
- rollback notes;
- commit/reference.

**Stop conditions**

- `{{CONDITION_REQUIRING_HUMAN_DECISION}}`

## 13.4 `/sc-work` Invocation Template

Use this variant only for a goal whose approved FSD explicitly links this ADR.

```text
/sc-work FSD-{{PROJECT_CODE}}#GOAL-{{NNN}}

Authority:
- FSD: {{FSD_ID_AND_SECTION}} (status must be APPROVED; primary source)
- FSD requirements: {{FSD-IDS}}
- ADR: {{ADR_ID}} (optional linked authority; status must be ACCEPTED)
- Decision clauses: {{DEC-IDS}}

Execute only the bounded FSD goal packet.
Preserve all FSD invariants and the linked ADR decision/prohibited-pattern rules.
Do not interpret the ADR as permission to expand product scope or bypass FSD contracts.
Use repository facts and approved defaults; do not invent architecture.
Run every listed verification command.
Stop only on a declared stop condition.
Return the required completion report with evidence, not a narrative claim of completion.
```

## 13.5 Agent Stop Conditions

For goals that link this ADR, the agent must stop and report a blocker when:
- the FSD is not `APPROVED` or does not link this ADR;

- the ADR is not `ACCEPTED`, is already `DEPRECATED/SUPERSEDED`, or its supersession status is ambiguous;
- the repository state proves the decision assumptions wrong and no fallback exists;
- an upstream requirement conflicts with a decision clause;
- external integration compatibility is unproven but the goal requests a production cutover;
- a migration can damage data without a backup/restore/rollback gate;
- a security/privacy/compliance control cannot be satisfied;
- a required secret, credential, environment, or access is unavailable for verification;
- a test failure shows changes outside the bounded goal are required;
- the only way to finish the task is to weaken an acceptance gate or a prohibited pattern.

The agent does not need to stop for local choices already determined by repository conventions that do not change the decision semantics.

---

# 14. Traceability Matrix

## 14.1 End-to-End Traceability

| Upstream ID | Need / Constraint | ADR Driver | Option Evidence | Decision Clause | FSD Requirement | Implementation Goal | Test / FF | Runtime Evidence |
|---|---|---|---|---|---|---|---|---|
| {{BRD_OR_PRD_DOCUMENT_ID}}#{{LOCAL_ID}} | {{NEED}} | DRV-001 | EVD-001 | DEC-001 | FSD-{{PROJECT_CODE}}#{{LOCAL_ID}} | GOAL-001 | FF-001 | {{DASHBOARD/REPORT}} |

Rules:

- Every decision clause must have a downstream implementation or `N/A — rationale`.
- Every implementation obligation must have completion evidence.
- Every high-risk consequence must have a mitigation, owner, and verification.
- Orphan goals without FSD authority must be rejected. An ADR reference is only required for goals genuinely within this ADR's scope.

## 14.2 ADR-to-Code Map

| Decision / Rule | Repository Path / Resource | Enforcement Type | Owner |
|---|---|---|---|
| DEC-001 | `{{PATH}}` | Code/config/infra/policy | {{OWNER}} |
| PROHIB-001 | `{{LINT_OR_ARCH_TEST_PATH}}` | Automated guard | {{OWNER}} |
| FF-001 | `{{TEST_MONITOR_PATH}}` | CI/runtime | {{OWNER}} |

## 14.3 ADR Compliance Review Questions

- Does the code access the provider directly outside the approved adapter boundary?
- Do the source of truth and conflict resolution remain as decided?
- Does a new data flow cross a trust boundary that has not been reviewed?
- Have the retry/idempotency/ordering/transaction semantics changed?
- Do schema/API/event changes remain backward compatible within the window?
- Are the architecture fitness functions still active and passing?
- Has an exception expired or been used more broadly than its scope?
- Has the operational cost or load exceeded the envelope?
- Does the implementation add hidden fallbacks or silent degradation?

---

# 15. Risks, Open Items, and Exceptions

## 15.1 Risk Register

| Risk ID | Risk | Cause | Likelihood | Impact | Score | Mitigation | Detection | Owner | Status |
|---|---|---|---:|---:|---:|---|---|---|---|
| RISK-001 | {{RISK}} | {{CAUSE}} | {{1-5}} | {{1-5}} | {{LxI}} | {{MIT-ID}} | {{SIGNAL}} | {{OWNER}} | OPEN |

## 15.2 Mitigation Register

| Mitigation ID | Risk | Action | Prevent/Detect/Recover | Owner | Due | Evidence | Residual Risk |
|---|---|---|---|---|---|---|---|
| MIT-001 | RISK-001 | {{ACTION}} | {{TYPE}} | {{OWNER}} | {{DATE}} | {{EVIDENCE}} | {{RISK}} |

## 15.3 Open Decision / Evidence Register

| Open ID | Question | Class | Options | Recommendation | Safe Fallback | Owner | Gate | Status |
|---|---|---|---|---|---|---|---|---|
| OPEN-001 | {{QUESTION}} | {{CLASS}} | {{OPTIONS}} | {{RECOMMENDATION}} | {{FALLBACK}} | {{OWNER}} | {{GATE}} | OPEN |

## 15.4 Exception Register

| Exception ID | ADR Rule | Scope | Compensating Control | Approved By | Start | Expiry | Exit Criteria | Status |
|---|---|---|---|---|---|---|---|---|
| EXC-001 | {{RULE}} | {{SCOPE}} | {{CONTROL}} | {{APPROVER}} | {{DATE}} | {{DATE}} | {{CRITERIA}} | ACTIVE |

## 15.5 Issue and Incident Feedback

| Issue / Incident | Date | Relevance to Decision | Corrective Action | ADR Review Required? | Owner |
|---|---|---|---|---:|---|
| {{ID}} | {{DATE}} | {{LEARNING}} | {{ACTION}} | Yes/No | {{OWNER}} |

---

# 16. Review, Outcome, Deprecation, and Supersession

## 16.1 Review Triggers

| Trigger ID | Trigger | Evidence to Review | Reviewer | Required Outcome |
|---|---|---|---|---|
| REVTRIG-001 | Target load exceeds `{{THRESHOLD}}` | Capacity metrics | {{OWNER}} | Confirm or supersede |
| REVTRIG-002 | Critical security advisory affects selected option | Security advisory + exposure | {{OWNER}} | Mitigate/deprecate/supersede |
| REVTRIG-003 | Recurring cost exceeds `{{LIMIT}}` | Billing/cost dashboard | {{OWNER}} | Reassess option |
| REVTRIG-004 | `{{DATE}}` periodic review | Fitness and outcome metrics | {{OWNER}} | Continue/deprecate/supersede |
| REVTRIG-005 | Exception count/age exceeds `{{LIMIT}}` | Exception register | {{OWNER}} | Fix implementation or review ADR |

## 16.2 Post-Implementation Outcome Review

| Outcome / Assumption | Expected | Actual | Evidence Period | Variance | Action |
|---|---|---|---|---|---|
| OUT-001 | {{TARGET}} | {{ACTUAL}} | {{PERIOD}} | {{VARIANCE}} | {{ACTION}} |
| ASSUMP-001 | {{EXPECTED}} | {{ACTUAL}} | {{PERIOD}} | {{VARIANCE}} | {{ACTION}} |

## 16.3 Decision Health

| Dimension | Status | Evidence | Action |
|---|---|---|---|
| Fitness functions | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Cost | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Reliability | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Security/compliance | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Developer usability | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |
| Exit/reversibility | HEALTHY/AT_RISK/FAILED | {{EVIDENCE}} | {{ACTION}} |

## 16.4 Deprecation Plan

An ADR may become `DEPRECATED` when the decision still exists in production but must not be used for new development.

| Item | Plan |
|---|---|
| Reason for deprecation | {{REASON}} |
| Replacement direction | {{ADR_OR_PATTERN}} |
| New adoption cutoff | {{DATE}} |
| Existing workload support | {{WINDOW}} |
| Migration owner | {{OWNER}} |
| Security/operations support | {{PLAN}} |
| Final removal criteria | {{CRITERIA}} |

## 16.5 Supersession Record

| Field | Value |
|---|---|
| Superseded by | `{{NEW_ADR_ID}}` |
| Effective date | `{{YYYY-MM-DD}}` |
| What changed | `{{MATERIAL_CHANGE}}` |
| What remains valid | `{{REMAINING_CONTEXT_OR_NONE}}` |
| Migration required | `{{YES_NO_AND_PLAN}}` |
| Existing exceptions disposition | `{{RULE}}` |

---

# 17. Final ADR Readiness Checklist

## 17.1 Decision Quality

- [ ] The FSD applicability assessment states this ADR is used, or the project policy mandating it has been cited.
- [ ] The value of a durable decision record justifies separation from `TDEC-*`.
- [ ] One primary decision statement is clear and normative.
- [ ] The decision owner and required deciders are clear.
- [ ] Scope, non-scope, blast radius, reversibility, and urgency are clear.
- [ ] There are no hidden product/business decisions inside the ADR.
- [ ] No acceptance blocker remains open.

## 17.2 Context and Evidence

- [ ] Current-state facts have sources/evidence.
- [ ] Constraints are distinguished from preferences and assumptions.
- [ ] The workload/data/operating envelope is explicit.
- [ ] Decisive claims have an adequate evidence level.
- [ ] Benchmarks/spikes are reproducible and their limitations are recorded.

## 17.3 Option Analysis

- [ ] The status quo is considered.
- [ ] At least two viable options are compared or the single-option constraint is proven.
- [ ] There are no strawman options.
- [ ] The hard-constraint matrix is complete.
- [ ] Weighted scores have rationale/evidence.
- [ ] Sensitivity and uncertainty are assessed.
- [ ] Dissenting opinions are recorded.

## 17.4 Decision and Consequences

- [ ] The selected option, rules, boundaries, source of truth, and prohibited patterns are explicit.
- [ ] Positive, negative, neutral, cost, debt, lock-in, and organizational impacts are recorded.
- [ ] Residual risks are accepted by the appropriate authority.
- [ ] The exception policy has an expiry and compensating controls.

## 17.5 Security, Privacy, Compliance, and AI

- [ ] The trust-boundary/data-flow delta is mapped.
- [ ] The threat-model delta is assessed.
- [ ] Classification, residency, retention, audit, secrets, and vendor risk are assessed.
- [ ] The AI decision boundary, evaluation, human authority, and data-egress rules are complete where relevant.
- [ ] The required approvals are in place.

## 17.6 Implementation and Operations

- [ ] The FSD handoff requirements are complete.
- [ ] The FSD has `APPROVED` status, links this ADR, and remains the primary implementation authority.
- [ ] Implementation obligations have owners and evidence.
- [ ] Migration, compatibility, rollout, rollback, and decommission are assessed.
- [ ] Observability, capacity/cost guardrails, alerts, and runbooks are in place.
- [ ] At least one fitness function can detect architecture drift.

## 17.7 Agentic Readiness

- [ ] The machine-readable manifest matches the narrative decision.
- [ ] Goals always reference the FSD; ADR references are added only for goals in scope.
- [ ] Goal boundaries and dependencies can be determined without invention.
- [ ] Allowed scope, prohibited changes, verification commands, and stop conditions are clear.
- [ ] There are no placeholders, fake fallbacks, or ambiguous adjectives.
- [ ] Mock success is not used as the sole integration evidence.
- [ ] The agent does not need to make new architecture/product/security decisions to complete a goal.

## 17.8 Lifecycle

- [ ] The review date/event and owner are recorded.
- [ ] The deprecation/supersession mechanism is clear.
- [ ] The ADR index and related ADR links are updated, or `N/A — the organization does not use a central ADR index`.
- [ ] Historical decision content will not be rewritten after acceptance.

---

# Appendix A — Good and Bad ADR Writing Patterns

## A.1 A Good Decision Statement

> **DEC-001:** All outbound payment requests **MUST** be sent through the `PaymentProvider` interface in the `domain/payments` package; application code **MUST NOT** import the provider SDK directly. Provider adapters **MUST** pass the contract tests `{{PATH}}` before being activated.

Why it is good: the scope, boundary, prohibited behavior, and verification are clear.

## A.2 A Bad Decision Statement

> Use a flexible and scalable abstraction for payments.

The problem: it does not define the abstraction, scope, target, prohibited patterns, or how to verify.

## A.3 A Good Rationale

> OPT-002 was selected because it is the only option that satisfies data-residency constraint CONSTR-003, passed contract spike SPIKE-002 on the target runtime, and preserves rollback without a data rewrite. This option has an 18% higher recurring cost, which the budget owner accepted up to a volume of 2 million transactions/month.

## A.4 A Bad Rationale

> This technology is modern, popular, and best practice.

The problem: the claims are not contextual, not measurable, and do not compare options.

## A.5 A Good Consequence

> The operations team must manage an additional broker and a new on-call runbook. This risk is mitigated with a managed service, alert FF-004, and a game day before the 50% traffic cutover.

## A.6 A Bad Consequence

> There is no meaningful downside.

The problem: this is almost always dishonest or unanalyzed.

## A.7 A Good Fitness Function

> The CI test `pnpm test:architecture` fails when a file outside `src/adapters/provider-x/**` imports the `provider-x-sdk` package.

## A.8 A Bad Fitness Function

> Code review ensures the architecture stays clean.

The problem: it is not deterministic, has no owner/frequency, and drifts easily.

---

# Appendix B — Anti-Pattern and AI-Slop Rejection Checklist

Reject the ADR when one or more of the following conditions is found without correction:

- the ADR was created just because the template exists, without an applicability assessment or durable decision value;

- the decision statement only names a technology without a boundary and reason;
- the selected option was decided first and the scores were engineered afterwards;
- the status quo or a viable alternative was not considered;
- the rejected options are strawmen;
- “best practice”, “industry standard”, “scalable”, “secure”, or “simple” is used without definition/evidence;
- all consequences are written as positive;
- benchmarks do not state the environment, workload, or raw results;
- vendor documentation is treated as proof of integration compatibility;
- there are no hard constraints, or constraints are mixed with preferences;
- the architecture diagram contradicts the decision clauses;
- the source of truth, failure modes, data ownership, or rollback is left implicit;
- exceptions have no expiry;
- the migration merely says “migrate data” without compatibility and rollback;
- observability/runbooks are deferred until after go-live;
- the fitness function is only a manual code review without a cadence/owner;
- the ADR attempts to change product scope or business rules;
- the machine-readable manifest differs from the narrative content;
- `/sc-work` can replace the provider/pattern without a blocker;
- the agent can be “done” with mocks, TODOs, disabled tests, silent catches, or weakened validation;
- an accepted ADR still has an unresolved acceptance blocker;
- an old ADR is materially edited after acceptance without supersession.

---

# Appendix C — Option Scoring and Decision Heuristics

## C.1 Weighted Score Formula

```text
weighted_total(option) = Σ(score_criterion × weight_criterion)
```

When scores use a 0–5 scale and weights are percentages:

```text
normalized_score = Σ(score × weight) / 5
```

The normalized score falls in the 0–100% range. Do not display false precision; one decimal place is usually enough.

## C.2 Risk-Adjusted View

The weighted score may be supplemented, not replaced, by:

```text
risk_exposure = likelihood × impact × uncertainty_multiplier
```

Use only when the scale and interpretation have been defined. Do not reduce every aspect to a single number when the downside is non-linear or a veto.

## C.3 Reversibility Heuristic

- **Reversible:** the change can be undone within one release without data loss or a contract break.
- **Costly reversal:** requires material migration, downtime, dual-run, or consumer coordination.
- **Effectively irreversible:** produces external commitments, irreversible data transformations, widespread contract adoption, or regulatory exposure.

The harder the reversal, the higher the evidence and approval burden.

## C.4 Buy vs Build Questions

- Is it a differentiating capability or a commodity?
- Does the vendor meet the data, security, residency, audit, and exit requirements?
- What is the total cost including integration, operations, support, and exit?
- Does the team have the skills and capacity for long-term ownership?
- Are the API/data exports sufficient to avoid unacceptable lock-in?
- Would a provider failure eliminate a core business capability?

---

# Appendix D — ADR Review Comment Format

```markdown
### REV-{{NNN}} — {{SHORT_TITLE}}

- **Reviewer:** {{NAME_OR_ROLE}}
- **Date:** {{YYYY-MM-DD}}
- **Severity:** BLOCKER | MAJOR | MINOR | QUESTION
- **Affected section / IDs:** {{SECTION_OR_IDS}}
- **Observation:** {{FACTUAL_ISSUE}}
- **Why it matters:** {{DECISION_IMPLEMENTATION_OR_RISK_IMPACT}}
- **Required change:** {{SPECIFIC_CHANGE_OR_DECISION}}
- **Resolution:** OPEN | ACCEPTED | REJECTED_WITH_RATIONALE | RESOLVED
- **Evidence / response:** {{DETAIL}}
```

Review comments must identify a specific defect or missing decision, not a style preference without consequence.

---

# Appendix E — ADR Index Template

When the organization uses a central ADR index, keep it in `{{ADR_DIRECTORY}}/README.md` or an agreed location. Otherwise, mark it `N/A` and make sure the linked FSD remains the entry point.

| ADR | Title | Status | Decision Date | Scope | Owner | Supersedes | Review By |
|---|---|---|---|---|---|---|---|
| ADR-0001 | {{TITLE}} | ACCEPTED | {{DATE}} | {{SCOPE}} | {{OWNER}} | — | {{DATE/EVENT}} |

Recommended directory:

```text
docs/
└── solutions/
    ├── README.md
    ├── adr-0001-{{slug}}.md
    ├── adr-0002-{{slug}}.md
    └── evidence/
        ├── adr-0001/
        │   ├── benchmark.md
        │   ├── spike-results.json
        │   └── diagrams/
        └── adr-0002/
```

File naming:

```text
docs/solutions/adr-{{4_DIGIT_ID}}-{{lowercase-kebab-case-title}}.md
```

Do not renumber old ADRs or remove rejected/superseded ADRs from the index.

---

# Appendix F — Minimal Architecture Decision Brief

Use for small/reversible decisions when a separate record still has value. Consider a full ADR when the review finds cross-system impact, security/data implications, lock-in, migration, or significant uncertainty; otherwise, a `TDEC-*` in the FSD remains valid.

```markdown
---
adr_id: "ADR-{{NNNN}}"
title: "{{TITLE}}"
status: "PROPOSED"
owner: "{{OWNER}}"
date: "{{YYYY-MM-DD}}"
reversibility: "REVERSIBLE"
---

# ADR-{{NNNN}} — {{TITLE}}

## Context

{{FACTUAL_PROBLEM_AND_SCOPE}}

## Constraints

- {{CONSTRAINT_WITH_SOURCE}}

## Options

1. **OPT-001 — {{NAME}}:** {{SUMMARY_AND_TRADEOFF}}
2. **OPT-002 — {{NAME}}:** {{SUMMARY_AND_TRADEOFF}}
3. **OPT-000 — Status quo:** {{CONSEQUENCE}}

## Decision

> The system **MUST** {{NORMATIVE_DECISION}} and **MUST NOT** {{PROHIBITED_BEHAVIOR}}.

## Rationale

{{WHY_THIS_OPTION_WINS_IN_THIS_CONTEXT}}

## Consequences

- Positive: {{EFFECT}}
- Negative: {{EFFECT}}
- Risk: {{RISK_AND_MITIGATION}}

## Implementation Obligations

- {{CHANGE_AND_OWNER}}

## Verification

- {{TEST_OR_FITNESS_FUNCTION}}

## Review Trigger

- {{DATE_OR_EVENT}}
```

---

# Appendix G — ADR Discovery Questions

## Context and Scope

- What decision genuinely needs to be made now?
- What happens if no decision is made?
- What system, data, organizational, and time boundaries are relevant?
- Which upstream requirements must not change?

## Constraints and Drivers

- Which are legal/policy/hard constraints and which are merely preferences?
- What workload and failure envelope must be borne?
- What source of truth and invariants must be preserved?
- Which downsides are unacceptable even with a high total score?

## Options and Evidence

- What is the status quo?
- What viable options might the author dislike?
- What evidence genuinely differentiates the choices?
- Which claims come only from the vendor or intuition?
- What is the cheapest spike that can reduce the biggest uncertainty?

## Consequences and Operations

- Who will operate, pay, respond to incidents, and perform migrations?
- What new failures are introduced?
- What is the exit path if the decision is wrong or the vendor changes?
- Which architecture properties can drift and how do CI/runtime detect it?

## Agentic Implementation

- What decisions could still be interpreted differently by two coding agents?
- Could an agent replace the provider/pattern in the name of simplification?
- Can the goals be verified without manual intuition?
- What stop conditions prevent dangerous workarounds?

---

# Appendix H — Final Sign-Off Record

| Role | Name | Decision | Date | Signature / Reference | Conditions Closed? |
|---|---|---|---|---|---:|
| Decision owner |  |  |  |  |  |
| Technical/architecture |  |  |  |  |  |
| Product/business |  |  |  |  |  |
| Security/privacy |  |  |  |  |  |
| Operations |  |  |  |  |  |
| Data owner |  |  |  |  |  |
| Finance/procurement |  |  |  |  |  |

**Final status:** `{{STATUS}}`  
**Effective date:** `{{YYYY-MM-DD}}`  
**Next review:** `{{YYYY-MM-DD_OR_EVENT}}`  
**Supersession link:** `{{ADR_ID_OR_NONE}}`
