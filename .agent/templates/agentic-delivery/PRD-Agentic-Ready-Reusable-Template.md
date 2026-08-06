---
template_name: "Product Requirements Document — BRD→PRD→FSD Agentic Delivery Ready"
template_version: "2.1.0"
artifact_contract_version: "2.0.0"
document_type: "PRD"
project_name: "{{PROJECT_NAME}}"
project_code: "{{PROJECT_CODE}}"
document_id: "PRD-{{PROJECT_CODE}}"
version: "{{PRD_VERSION}}"
status: "DRAFT" # DRAFT | IN_REVIEW | APPROVED | SUPERSEDED
ui_delivery_profile: "{{NOT_APPLICABLE | STANDARD | HIGH_INTERACTION}}"
experience_baseline_status: "{{NOT_APPLICABLE | DRAFT | VALIDATED | EXCEPTION_APPROVED}}"
product_owner: "{{NAME_OR_ROLE}}"
business_owner: "{{NAME_OR_ROLE}}"
security_compliance_owner: "{{NAME_OR_ROLE_OR_NA}}"
data_privacy_owner: "{{NAME_OR_ROLE_OR_NA}}"
target_release: "{{RELEASE_OR_MILESTONE}}"
default_locale: "{{LOCALE_EG_id-ID}}"
default_timezone: "{{IANA_TIMEZONE_EG_Asia/Jakarta}}"
document_classification: "{{PUBLIC_INTERNAL_CONFIDENTIAL_RESTRICTED}}"
last_updated: "{{YYYY-MM-DD}}"
canonical_delivery_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
adr_policy: "OPTIONAL_CONDITIONAL"
upstream_artifacts:
  required:
    - "BRD-{{PROJECT_CODE}}"
  supporting:
    - "{{BUSINESS_CASE_RESEARCH_POLICY_OR_EVIDENCE_SOURCE}}"
downstream_artifacts:
  required:
    - "FSD-{{PROJECT_CODE}}"
  optional: [] # Add ADR IDs only when an optional ADR is actually used
---

# {{PROJECT_NAME}} — Product Requirements Document

> **How to use this template**
>
> 1. Replace every `{{PLACEHOLDER}}` with real decisions or data.
> 2. Do not leave `TBD`, `later`, `as needed`, `fast`, `secure`, `optimal`, `user-friendly`, or other ambiguous terms without a measure and a decision owner.
> 3. Sections that are not relevant must be written as `N/A — {{REASON}}`; do not delete them silently.
> 4. Every approved requirement must have a stable ID. Do not change IDs just because the document order changes.
> 5. The PRD establishes **why**, **what**, **for whom**, **the boundaries**, and **the results that must be observable**. Implementation details such as physical schema, endpoints, libraries, queues, locking, and deployment are established in the FSD.
> 6. The ADR is an **optional** sidecar for material architecture decisions; the PRD must not depend on the existence of an ADR to be handed off to the FSD.
> 7. The PRD must not be approved while any product decision with `BLOCKER` status needed by the release remains.

---

> **REFERENCE LIBRARY - skeleton first.** Never load this entire file into
> working context or copy it as the output shape. Start from
> `skeletons/PRD-Skeleton.md` and read only the named section required for a
> concrete product risk, decision, or review gap.

# 0. PRD Operating Contract

## 0.1 Document Purpose

This PRD is the source of truth for the product intent of `{{PROJECT_NAME}}`. This document defines the problems, users, outcomes, scope, business policies, observable product behavior, acceptance criteria, guardrails, and measures of success.

This PRD is considered sufficiently complete when the product, design, engineering, QA, security/compliance, and operations teams, and the FSD-authoring agent, can continue working without inventing on their own:

- new problems or objectives;
- new actors, roles, access rights, or authority boundaries;
- new business rules, enums, statuses, or state transitions;
- new assumptions about data, dates, units, classification, or ownership;
- behavior on error, empty data, duplicates, stale data, and partial failure;
- unwritten definitions of success.

## 0.2 Authority Boundaries and the Relationship Between BRD, PRD, FSD, and the Optional ADR

### 0.2.1 Canonical Artifact Path

```text
BRD → PRD → FSD → GOAL → IMPLEMENTATION → VERIFICATION
                 ↘ ADR (optional, architecture-decision sidecar)
```

The PRD must be able to hand off directly to the FSD. The ADR must not become a hidden dependency. The FSD performs an applicability assessment and selects one of:

- `NOT_REQUIRED`: no ADR; material technical decisions are recorded as `TDEC-*` in the FSD;
- `LINKED`: one or more `ACCEPTED` ADRs are linked for delegated architecture decisions;
- `BLOCKED_BY_POLICY`: project policy explicitly mandates a specific ADR and that ADR is not yet `ACCEPTED`.

### 0.2.2 Authority Matrix

| Decision Type | BRD | PRD | FSD | Optional ADR |
|---|---:|---:|---:|---:|
| Business problem, outcome, benefit, and business boundary | **Authoritative** | Translates | Reference | Does not change |
| Product problem framing, users, and product outcome | Constraint | **Authoritative** | Reference | Does not change |
| Scope, non-goal, priority, and release slice | Business boundary | **Authoritative** | Translates | Does not change |
| Business rule and product policy | Business authority | **Authoritative for observable behavior** | Implements | Does not change |
| Role, permission intent, and approval authority | Business authority | **Authoritative** | Details enforcement | Does not change |
| Logical domain terms, enum intent, and product state | Constraint | **Authoritative** | Details persistence | Does not change |
| Physical schema, API, event, job, concurrency | Does not define | Constraint only | **Authoritative** | Defines patterns/boundaries when used |
| Architecture, framework, library, and topology | Business constraints | Product constraints | **Authoritative through `TDEC-*` when no ADR is used** | **Authoritative within delegated scope when `ACCEPTED` and linked** |
| Test implementation and verification commands | Business acceptance | Acceptance intent | **Authoritative** | Defines fitness functions when linked |
| Deployment, migration, and technical rollback | Business gate | Product gate | **Authoritative** | May define constraints/patterns when linked |

### 0.2.3 Precedence

1. Law, contracts, regulators, and approved policy/security baselines.
2. The `APPROVED` BRD for business intent and business boundaries.
3. The `APPROVED` PRD for product intent and product boundaries.
4. An `ACCEPTED` ADR, **when present and linked**, for delegated architecture decisions.
5. The `APPROVED` FSD for the implementation contract; `TDEC-*` applies when no ADR is used.
6. Repository conventions for local choices not yet defined.
7. Tasks, prompts, or `/sc-work` invocations.

The FSD or ADR must not change BRD/PRD outcomes, scope, business rules, role authority, or acceptance criteria without an approved change request. Conflicts between sections must not be resolved silently; record them in the **Conflict and Resolution Ledger**.

## 0.3 Audience

| Audience | Primary Use |
|---|---|
| Sponsor / Business Owner | Approves business value, risks, and outcomes |
| Product Owner | Maintains scope, priority, and product policy |
| Product Designer | Derives journeys and interaction requirements |
| Technical Lead / Architect | Drafts the FSD and assesses whether an optional ADR is needed without fabricating product rules |
| Developer / Coding Agent | Understands intent and constraints through a verified FSD |
| QA / Test Agent | Derives scenarios, oracles, and release evidence |
| Security / Compliance / Privacy | Verifies control intent and data boundaries |
| Operations / Support | Prepares rollout, support, and failure communication |

## 0.4 Normative Language

- **MUST**: mandatory for the defined release.
- **MUST NOT**: behavior that must not occur.
- **SHOULD**: a strong expectation; exceptions require a written decision.
- **MAY**: optional and must not change mandatory outcomes.
- **Source of truth**: one authoritative owner of a piece of data or a decision.
- **Business invariant**: a product/business condition that must always be true.
- **Observable behavior**: results that can be seen or verified by users, external systems, audits, or tests.
- **Release slice**: the part of the scope that is actually shipped in this release.

## 0.5 Placeholder and Open Item Policy

Unstructured `TBD` is forbidden. Use the following format:

| ID | Missing Question / Decision | Class | Impact | Affected Requirements / Features | Owner | Approved Safe Fallback | Decision Deadline | Status |
|---|---|---|---|---|---|---|---|---|
| OPEN-001 | {{QUESTION}} | BLOCKER / NON_BLOCKER | {{IMPACT}} | {{IDS}} | {{OWNER}} | {{FALLBACK_OR_NONE}} | {{YYYY-MM-DD_OR_GATE}} | OPEN |

Rules:

- `BLOCKER`: the release or feature cannot be declared ready until the decision is made.
- `NON_BLOCKER`: only the explicitly written fallback may be used.
- Agents, developers, designers, or QA must not invent new fallbacks.
- `RESOLVED` items must record the final decision, approver, date, and the requirements that changed.

## 0.6 Stable ID Conventions

| Prefix | Meaning | Example |
|---|---|---|
| SRC | Source artifact / evidence | SRC-001 |
| PROB | Problem statement | PROB-001 |
| EVD | Evidence / baseline | EVD-001 |
| OBJ | Objective | OBJ-001 |
| OUT | Target outcome | OUT-001 |
| PRINC | Product principle | PRINC-001 |
| SCOPE | Scope boundary | SCOPE-001 |
| SCOPE-NG | Explicit non-goal | SCOPE-NG-001 |
| ACT | Actor / role | ACT-001 |
| JTBD | Job to be done | JTBD-001 |
| JOURNEY | End-to-end user journey | JOURNEY-001 |
| FEAT | Feature / capability | FEAT-001 |
| US | User story | US-001 |
| BR | Business rule | BR-001 |
| INV | Business invariant | INV-001 |
| FR | Functional product requirement | FR-001 |
| AC | Acceptance criterion | AC-001 |
| NFR | Non-functional requirement | NFR-001 |
| SEC | Security requirement | SEC-001 |
| PRIV | Privacy requirement | PRIV-001 |
| COMP | Compliance requirement | COMP-001 |
| AI | AI / automation requirement | AI-001 |
| NOTIF | Notification requirement | NOTIF-001 |
| REPORT | Report / export requirement | REPORT-001 |
| METRIC | Metric definition | METRIC-001 |
| EVENT | Product analytics event | EVENT-001 |
| DEP | Dependency | DEP-001 |
| ASSUMP | Assumption | ASSUMP-001 |
| CONSTR | Constraint | CONSTR-001 |
| DEC | Product decision | DEC-001 |
| CONFLICT | Requirement conflict | CONFLICT-001 |
| RISK | Product / delivery risk | RISK-001 |
| OPEN | Open decision | OPEN-001 |
| UAT | User acceptance scenario | UAT-001 |

Approved IDs must not be reused for a different meaning. Cancelled requirements are given `RETIRED` status, not deleted from history.

### 0.6.1 Cross-Artifact References

Local IDs may be used within the PRD. References to the BRD, FSD, or optional ADR **MUST** use:

```text
{{DOCUMENT_ID}}#{{LOCAL_ID}}
{{DOCUMENT_ID}}@{{VERSION}}#{{LOCAL_ID}}   # for pinned snapshots
```

Examples: `BRD-CCC#BREQ-001`, `PRD-CCC#FR-014`, `FSD-CCC#TDEC-003`, `ADR-0042#DEC-001`. Do not write `FR-001` across documents without a document namespace.

## 0.7 Quality Rules to Prevent AI Slop

An approved PRD must comply with the following rules:

1. Every feature maps to at least one `PROB`, `OBJ`, and `OUT`.
2. Every requirement states one observable behavior; avoid combining multiple behaviors with the word “and” when each can fail on its own.
3. Adjectives such as fast, secure, easy, real-time, accurate, scalable, and robust must have a target, measurement conditions, and an evidence source.
4. Requirements must not use “and so on”, “etc.”, “as appropriate”, or open-ended lists for mandatory behavior.
5. Every rule is written once as a canonical rule and referenced from other features; do not duplicate rules with different wording.
6. Enums, statuses, roles, and state transitions must use the same canonical names throughout the document.
7. Acceptance criteria must cover the happy path and the material negative/edge paths.
8. Access rights must be written as allowed and forbidden actions, not just a list of roles.
9. Automation or AI must not have implicit authority. Explain which decisions are advisory, deterministic, human-approved, or autonomous.
10. “Success” must include the expected output, final state, side effects, and evidence.
11. “Failure” must include the user-facing behavior, preservation of prior state, retry/recovery expectations, and audit/notification where relevant.
12. Assumptions must be verifiable and have an owner; unproven critical assumptions become `OPEN` or `RISK`.
13. Examples must not replace rules. Examples must be consistent with the canonical rules.
14. Every non-goal must be explicit so that agents do not “complete” features beyond the scope.
15. The FSD must not be forced to guess product semantics from mockups, table names, or legacy system behavior.

## 0.8 PRD Approval Gate

The PRD may only have `APPROVED` status when:

- [ ] The problem and impact are supported by evidence or labeled as hypotheses to be validated.
- [ ] Users, actors, roles, ownership, and approval authority are clear.
- [ ] Objectives, outcomes, baselines, targets, and measurement sources are available.
- [ ] In-scope, out-of-scope, non-goals, and the release slice are explicit.
- [ ] All features have a stable ID and priority.
- [ ] Business rules, canonical states, enums, date/unit semantics, and precedence do not conflict.
- [ ] Acceptance criteria cover the relevant happy, negative, authorization, empty, duplicate, stale, and failure paths.
- [ ] `ui_delivery_profile` and `experience_baseline_status` have been set; every UI state is `COVERED` or `N/A - reason + approver`.
- [ ] UI-bearing scope has responsive/accessibility intent, risk-appropriate evidence, and a Business Owner approver; `HIGH_INTERACTION` has interactive evidence, with runnable evidence for timing, runtime responsive, keyboard/focus, realtime, or offline risk, or an explicit exception.
- [ ] Security, privacy, compliance, audit, classification, retention, and AI authority boundaries have been assessed.
- [ ] NFRs have measurable targets and load/usage context.
- [ ] Dependencies, constraints, assumptions, risks, and degraded behavior are recorded.
- [ ] No `BLOCKER` needed by the release remains `OPEN`.
- [ ] UAT and release acceptance are traceable to requirements.
- [ ] The handoff manifest to the FSD is complete and contains no conflicts.
- [ ] All placeholders have been replaced or marked `N/A — reason`.

---

# 1. Document Control and Traceability

## 1.1 Document Metadata

| Field | Value |
|---|---|
| Project | `{{PROJECT_NAME}}` |
| Project code | `{{PROJECT_CODE}}` |
| PRD ID | `PRD-{{PROJECT_CODE}}` |
| Version | `{{PRD_VERSION}}` |
| Status | `{{DRAFT / IN_REVIEW / APPROVED / SUPERSEDED}}` |
| Product Owner | `{{NAME_OR_ROLE}}` |
| Business Owner / Sponsor | `{{NAME_OR_ROLE}}` |
| Security / Compliance Owner | `{{NAME_OR_ROLE_OR_NA}}` |
| Privacy / Data Owner | `{{NAME_OR_ROLE_OR_NA}}` |
| Target release | `{{RELEASE_OR_MILESTONE}}` |
| Default locale | `{{LOCALE}}` |
| Default timezone | `{{IANA_TIMEZONE}}` |
| Classification | `{{CLASSIFICATION}}` |
| Last updated | `{{YYYY-MM-DD}}` |

## 1.2 Source Artifacts and Evidence

| Source ID | Artifact / Evidence | Version / Date | Owner | Authority / Purpose | Relevant Sections | Status |
|---|---|---|---|---|---|---|
| SRC-001 | `BRD-{{PROJECT_CODE}}` | {{VERSION_DATE}} | {{BUSINESS_OWNER}} | **Authoritative business intent, scope, rules, and acceptance** | {{SECTION}} | APPROVED |
| SRC-002 | `{{RESEARCH_BASELINE_OR_BUSINESS_CASE}}` | {{VERSION_DATE}} | {{OWNER}} | Problem/evidence | {{SECTION}} | VERIFIED |
| SRC-003 | `{{POLICY_STANDARD_CONTRACT}}` | {{VERSION_DATE}} | {{OWNER}} | Policy/compliance | {{SECTION}} | VERIFIED |
| SRC-004 | `{{CURRENT_SYSTEM_OR_PROCESS_DOC}}` | {{VERSION_DATE}} | {{OWNER}} | Current-state reference | {{SECTION}} | REFERENCE |
| SRC-005 | `{{ADR_ID_OR_NONE}}` | {{VERSION_DATE_OR_NA}} | {{DECISION_OWNER_OR_NA}} | Optional architecture decision; not required for PRD approval | {{SECTION_OR_NA}} | N/A / ACCEPTED |

Source status classification:

- `APPROVED`: the authoritative artifact has been approved.
- `VERIFIED`: the source has been checked and may serve as the basis of requirements.
- `REFERENCE`: provides context but is not final authority.
- `HYPOTHESIS`: not yet validated; must be tied to an experiment or open item.
- `SUPERSEDED`: no longer applies and must not be used for new decisions.
- `N/A`: the optional artifact is not used; not a blocker.

## 1.3 Revision History

| Version | Date | Author | Change Summary | Affected IDs | Approver |
|---|---|---|---|---|---|
| 0.1 | {{YYYY-MM-DD}} | {{AUTHOR}} | Initial draft | All | Pending |

## 1.4 Approval

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| Business Owner / Sponsor |  | PENDING |  |  |
| Product Owner |  | PENDING |  |  |
| Technical Lead |  | PENDING |  | Validates implementability, does not change intent |
| QA Lead |  | PENDING |  | Validates testability |
| Security / Compliance |  | PENDING / N/A |  |  |
| Privacy / Data Owner |  | PENDING / N/A |  |  |
| Operations / Support |  | PENDING / N/A |  |  |

## 1.5 Decision Log

| Decision ID | Product Decision | Options Considered | Rationale | Affected IDs | Approver | Date | Status |
|---|---|---|---|---|---|---|---|
| DEC-001 | {{DECISION}} | {{OPTIONS}} | {{RATIONALE}} | {{IDS}} | {{APPROVER}} | {{YYYY-MM-DD}} | APPROVED |

## 1.6 Conflict and Resolution Ledger

| Conflict ID | Conflicting Statements | Source / ID | Impact | Canonical Decision | Superseded Text / IDs | Approver | Date |
|---|---|---|---|---|---|---|---|
| CONFLICT-001 | {{CONFLICT}} | {{SOURCE_IDS}} | {{IMPACT}} | {{RESOLUTION}} | {{SUPERSEDED_IDS}} | {{APPROVER}} | {{YYYY-MM-DD}} |

## 1.7 Requirement Inventory

Use this table as the canonical index. Requirement details remain in the feature or cross-cutting sections.

| Requirement ID | Short Title | Type | Feature / Section | Priority | Release | Status | Owner |
|---|---|---|---|---|---|---|---|
| FR-001 | {{TITLE}} | Functional | FEAT-001 | MUST | {{RELEASE}} | DRAFT | {{OWNER}} |
| NFR-001 | {{TITLE}} | Performance | Cross-cutting | MUST | {{RELEASE}} | DRAFT | {{OWNER}} |

Status requirement: `DRAFT`, `IN_REVIEW`, `APPROVED`, `DEFERRED`, `RETIRED`.

---

# 2. Executive Summary

## 2.1 One-Paragraph Summary

`{{IN 4–7 SENTENCES: WHO EXPERIENCES THE PROBLEM, WHAT PROBLEM, ITS IMPACT, THE PROPOSED CAPABILITY, THE RELEASE SLICE, AND THE PRIMARY OUTCOME. AVOID IMPLEMENTATION DETAIL.}}`

## 2.2 Product Snapshot

| Aspect | Summary |
|---|---|
| Primary users | {{USERS}} |
| Primary problem | {{PROBLEM}} |
| Proposed capability | {{CAPABILITY}} |
| Business value | {{VALUE}} |
| Release slice | {{MVP_OR_RELEASE_SCOPE}} |
| Critical guardrail | {{GUARDRAIL}} |
| Blocker decisions | {{NONE_OR_OPEN_IDS}} |

## 2.3 Product Pitch

**For** `{{TARGET_USER}}`  
**who** `{{HAS_THIS_PROBLEM_OR_JOB}}`,  
**this product is** `{{PRODUCT_CATEGORY_OR_CAPABILITY}}`  
**that enables** `{{PRIMARY_OUTCOME}}`.  
**Unlike** `{{CURRENT_WORKAROUND_OR_ALTERNATIVE}}`,  
**this product** `{{DIFFERENTIATOR_WITHOUT_MARKETING_HYPE}}`.

---

# 3. Context, Problem, and Evidence

## 3.1 Business / Operational Context

`{{DESCRIBE THE ORGANIZATIONAL, PROCESS, REGULATORY, MARKET, OR SYSTEM CONTEXT THAT MAKES THE PROBLEM RELEVANT.}}`

## 3.2 Problem Statements

Write problems, not solutions.

| Problem ID | Affected Actor | Condition / Trigger | Problem | Measured Impact | Frequency | Evidence IDs | Confidence |
|---|---|---|---|---|---|---|---|
| PROB-001 | {{ACTOR}} | {{WHEN}} | {{PROBLEM}} | {{COST_DELAY_RISK_ERROR}} | {{FREQUENCY}} | EVD-001 | HIGH / MEDIUM / LOW |

Recommended format:

> When `{{CONTEXT}}`, `{{ACTOR}}` cannot `{{JOB}}` because `{{ROOT_CAUSE_OR_CONSTRAINT}}`, resulting in `{{MEASURABLE_IMPACT}}`.

## 3.3 Evidence and Baseline

| Evidence ID | Supports Problem | Evidence Type | Baseline / Finding | Sample / Period | Source | Limitations |
|---|---|---|---|---|---|---|
| EVD-001 | PROB-001 | Analytics / Interview / Audit / Incident / Cost | {{FINDING}} | {{SAMPLE_WINDOW}} | SRC-001 | {{LIMITATION}} |

Do not turn correlation into causation without evidence. Unvalidated findings must be labeled as hypotheses.

## 3.4 Root Cause vs Symptom

| ID | Statement | Category | Evidence | Product Implication |
|---|---|---|---|---|
| RC-001 | {{STATEMENT}} | ROOT_CAUSE / CONTRIBUTOR / SYMPTOM | {{EVIDENCE}} | {{IMPLICATION}} |

## 3.5 Current Workflow and Workarounds

| Step | Actor | Current Activity | Tool / Channel | Pain / Risk | Time / Cost |
|---|---|---|---|---|---|
| 1 | {{ACTOR}} | {{ACTIVITY}} | {{TOOL}} | {{PAIN}} | {{TIME_COST}} |

## 3.6 Existing Alternatives

| Alternative | Strengths | Weaknesses | Why It Is Not Enough | Kept / Replaced |
|---|---|---|---|---|
| Manual process | {{PROS}} | {{CONS}} | {{GAP}} | {{DECISION}} |
| Existing system | {{PROS}} | {{CONS}} | {{GAP}} | {{DECISION}} |
| Do nothing | {{PROS}} | {{CONS}} | {{RISK}} | {{DECISION}} |

## 3.7 Why Now

`{{DESCRIBE THE TIMING TRIGGER: RISK, REGULATORY DEADLINE, COST CURVE, CUSTOMER COMMITMENT, PLATFORM CHANGE, OR NEW CAPABILITY.}}`

## 3.8 Opportunity Statement

`{{DESCRIBE THE VALUE THAT COULD BE CREATED IF THE PROBLEM IS SOLVED, WITHOUT GUARANTEEING UNPROVEN RESULTS.}}`

---

# 4. Vision, Objective, Outcome, and Product Principles

## 4.1 Product Vision

`{{ONE OR TWO SENTENCES ABOUT THE DESIRED FUTURE STATE.}}`

## 4.2 Objectives and Measurable Outcomes

| Objective ID | Objective | Baseline | Target Outcome | Measurement Source | Window | Owner |
|---|---|---:|---:|---|---|---|
| OBJ-001 | {{OBJECTIVE}} | {{BASELINE}} | {{TARGET}} | {{SOURCE}} | {{WINDOW}} | {{OWNER}} |

Separate outputs from outcomes:

| Outcome ID | Objective | Expected Outcome | Leading Indicator | Lagging Indicator | Target | Guardrail |
|---|---|---|---|---|---|---|
| OUT-001 | OBJ-001 | {{OUTCOME}} | {{LEADING}} | {{LAGGING}} | {{TARGET}} | {{MUST_NOT_WORSEN}} |

## 4.3 Product Principles

| Principle ID | Principle | Implication for Product Decisions | Non-Example |
|---|---|---|---|
| PRINC-001 | {{PRINCIPLE}} | {{IMPLICATION}} | {{WHAT_VIOLATES_IT}} |

Example principles that may be used where relevant:

- Human authority for high-risk decisions.
- Fail-closed for confidential data.
- One source of truth for derived state.
- No silent failures.
- Progressive disclosure, not hiding evidence.
- Graceful degradation for non-critical dependencies.

## 4.4 Guardrail Metrics

| Metric ID | Guardrail | Baseline | Maximum / Minimum Limit | Measurement | Action When Breached |
|---|---|---:|---:|---|---|
| METRIC-001 | {{METRIC}} | {{BASELINE}} | {{THRESHOLD}} | {{SOURCE}} | {{ACTION}} |

---

# 5. Scope, Non-Goals, and Release Slice

## 5.1 Scope Boundary Matrix

| Dimension | In Scope | Out of Scope | Future Consideration |
|---|---|---|---|
| Users / roles | {{IN}} | {{OUT}} | {{FUTURE}} |
| Business unit / tenant | {{IN}} | {{OUT}} | {{FUTURE}} |
| Geography / jurisdiction | {{IN}} | {{OUT}} | {{FUTURE}} |
| Channels / platforms | {{IN}} | {{OUT}} | {{FUTURE}} |
| Data types | {{IN}} | {{OUT}} | {{FUTURE}} |
| Workflow stages | {{IN}} | {{OUT}} | {{FUTURE}} |
| Integrations | {{IN}} | {{OUT}} | {{FUTURE}} |
| Reporting | {{IN}} | {{OUT}} | {{FUTURE}} |
| Historical data | {{IN}} | {{OUT}} | {{FUTURE}} |

## 5.2 In-Scope Capabilities

| Scope ID | Capability | Outcome | Feature IDs | Priority | Release |
|---|---|---|---|---|---|
| SCOPE-001 | {{CAPABILITY}} | OUT-001 | FEAT-001 | MUST | {{RELEASE}} |

## 5.3 Explicit Non-Goals

| Scope ID | Non-Goal | Reason | Misinterpretation Risk | Future Trigger |
|---|---|---|---|---|
| SCOPE-NG-001 | {{NOT_DELIVERED}} | {{REASON}} | {{WHAT_AGENT_TEAM_MIGHT_ASSUME}} | {{WHEN_REVISIT}} |

Non-goals must be specific enough to prevent the team or coding agents from implementing unrequested “complementary features”.

## 5.4 Release Slice

| Release / Phase | Feature IDs | User Segment | Data Scope | Entry Criteria | Exit Criteria |
|---|---|---|---|---|---|
| {{MVP}} | {{FEAT_IDS}} | {{SEGMENT}} | {{DATA_SCOPE}} | {{ENTRY}} | {{EXIT}} |

## 5.5 Prioritization

Use one consistent scheme.

| Feature ID | Priority | Rationale | Cost / Complexity Signal | Dependency | Deferral Consequence |
|---|---|---|---|---|---|
| FEAT-001 | MUST / SHOULD / COULD / WONT | {{RATIONALE}} | S / M / L / XL | {{DEP_IDS}} | {{IMPACT}} |

## 5.6 Constraints

| Constraint ID | Constraint | Type | Source | Product Impact | Negotiable? |
|---|---|---|---|---|---|
| CONSTR-001 | {{CONSTRAINT}} | Legal / Contract / Budget / Timeline / Platform / Policy | SRC-002 | {{IMPACT}} | YES / NO |

## 5.7 Assumptions

| Assumption ID | Assumption | Current Evidence | Verification Owner | Validation / Deadline | Impact If Wrong | Status |
|---|---|---|---|---|---|---|
| ASSUMP-001 | {{ASSUMPTION}} | {{EVIDENCE}} | {{OWNER}} | {{METHOD_DATE}} | {{IMPACT}} | UNVERIFIED |

Assumptions with high impact and low evidence must be converted into `OPEN` or `RISK`.

## 5.8 Dependencies

| Dependency ID | Dependency | External Owner | Required By | Contract / Expected Outcome | Needed By | Failure / Degraded Behavior | Status |
|---|---|---|---|---|---|---|---|
| DEP-001 | {{DEPENDENCY}} | {{OWNER}} | {{FEATURE_IDS}} | {{OUTCOME}} | {{DATE_GATE}} | {{BEHAVIOR}} | UNCONFIRMED |

---

# 6. Users, Actors, Roles, and Authority

## 6.1 Actor Catalog

| Actor ID | Actor / Role | Primary Goal | Responsibilities | Data Scope | Authority Boundary | Volume / Frequency |
|---|---|---|---|---|---|---|
| ACT-001 | {{ROLE}} | {{GOAL}} | {{RESPONSIBILITY}} | {{SCOPE}} | {{CAN_AND_CANNOT_APPROVE}} | {{FREQUENCY}} |

Distinguish:

- **Persona**: a pattern of user needs/behavior.
- **Role**: a set of permissions.
- **Actor**: a human, system, scheduler, or external party that interacts.
- **Owner**: the party accountable for an entity or process.
- **Approver**: the party authorized to change specific states.

## 6.2 Jobs to Be Done

| JTBD ID | Actor | Situation | Job | Desired Outcome | Current Alternative | Success Signal |
|---|---|---|---|---|---|---|
| JTBD-001 | ACT-001 | When {{SITUATION}} | I want to {{JOB}} | So that {{OUTCOME}} | {{ALTERNATIVE}} | {{SIGNAL}} |

## 6.3 Role and Permission Intent Matrix

Write the actions, object scope, and prohibitions. The FSD will detail technical enforcement.

| Capability / Action | ACT-001 | ACT-002 | System Actor | Scope / Condition Notes |
|---|---:|---:|---:|---|
| View {{ENTITY}} | ALLOW | OWNED_ONLY | N/A | {{CONDITION}} |
| Create {{ENTITY}} | ALLOW | DENY | N/A | {{CONDITION}} |
| Approve / finalize {{STATE}} | ALLOW | DENY | DENY | Human-only |
| Export classified data | CLEARANCE_ONLY | DENY | DENY | Logged |

Use the canonical values: `ALLOW`, `DENY`, `OWNED_ONLY`, `ASSIGNED_ONLY`, `CLEARANCE_ONLY`, `SYSTEM_ONLY`, `N/A`.

## 6.4 Segregation of Duties and Conflict of Interest

| Rule ID | Initiating Action | Verification / Approval Action | Same Actor Allowed? | Exception | Audit Evidence |
|---|---|---|---:|---|---|
| BR-001 | {{CREATE_OR_SUBMIT}} | {{VERIFY_OR_CLOSE}} | YES / NO / RECOMMENDED_NO | {{EXCEPTION}} | {{EVIDENCE}} |

## 6.5 User Context and Accessibility Needs

| Actor | Device / Environment | Connectivity | Frequency | Domain Expertise | Accessibility / Language Need |
|---|---|---|---|---|---|
| ACT-001 | {{DEVICE}} | {{NETWORK}} | {{FREQUENCY}} | {{LEVEL}} | {{NEEDS}} |

---

# 7. Domain Semantics and Product Policies

## 7.1 Canonical Glossary

| Term | Canonical Definition | Does Not Mean | Source / Owner |
|---|---|---|---|
| {{TERM}} | {{DEFINITION}} | {{COMMON_MISINTERPRETATION}} | {{SOURCE_OWNER}} |

Every domain term that can affect state, permissions, metrics, billing, compliance, or audit must be defined.

## 7.2 Conceptual Entity Catalog

This is a conceptual model, not a database schema.

| Entity | Business Definition | Business Identifier | Owner | Lifecycle Summary | Data Sensitivity |
|---|---|---|---|---|---|
| {{ENTITY}} | {{DEFINITION}} | {{BUSINESS_KEY}} | {{OWNER}} | {{LIFECYCLE}} | {{CLASSIFICATION}} |

## 7.3 Source-of-Truth Matrix

| Data / Decision | Source of Truth | Producer | Consumer | Update Authority | Derived or Stored | Conflict Policy |
|---|---|---|---|---|---|---|
| {{DATUM}} | {{SYSTEM_ROLE_DOCUMENT}} | {{PRODUCER}} | {{CONSUMERS}} | {{AUTHORITY}} | DERIVED / STORED | {{POLICY}} |

One datum must not have two sources of truth. Mirrors/caches must be labeled non-authoritative.

## 7.4 Canonical Enum Catalog

| Enum / Field | Allowed Values | Definition of Each Value | Default | Unknown Handling | Owner |
|---|---|---|---|---|---|
| `{{FIELD}}` | `VALUE_A`, `VALUE_B` | {{DEFINITIONS}} | {{DEFAULT_OR_NONE}} | {{REJECT_FAIL_CLOSED_FLAG}} | {{OWNER}} |

Rules:

- Do not add synonyms such as `CANCELLED` and `CANCELED` for the same meaning.
- Explain whether a value is terminal, temporary, system-derived, or user-set.
- Defaults must have a reason and must not accidentally expose access/data.

## 7.5 Business State Machines

### 7.5.1 `{{ENTITY_OR_PROCESS}}`

```text
{{INITIAL_STATE}}
  ├─ {{ACTION / CONDITION}} → {{NEXT_STATE}}
  └─ {{ACTION / CONDITION}} → {{ALTERNATE_STATE}}

{{NEXT_STATE}}
  └─ {{ACTION / CONDITION}} → {{TERMINAL_STATE}}
```

### 7.5.2 Transition Contract

| From | Action / Trigger | Actor | Preconditions | To | Visible Side Effect | Prohibited When | Audit Required |
|---|---|---|---|---|---|---|---:|
| {{FROM}} | {{ACTION}} | ACT-001 | {{PRECONDITIONS}} | {{TO}} | {{SIDE_EFFECT}} | {{PROHIBITION}} | YES |

## 7.6 Business Rules

| Rule ID | Rule Canonical | Applies To | Priority / Precedence | Example | Non-Example | Source |
|---|---|---|---|---|---|---|
| BR-001 | {{UNAMBIGUOUS_RULE}} | {{FEATURE_ENTITY}} | {{PRECEDENCE}} | {{EXAMPLE}} | {{NON_EXAMPLE}} | {{SOURCE}} |

Business rules must answer the condition, decision, outcome, and exception.

## 7.7 Business Invariants

| Invariant ID | Condition That Is Always True | Scope | How It Can Be Violated | Expected Product Response | Evidence |
|---|---|---|---|---|---|
| INV-001 | {{INVARIANT}} | {{SCOPE}} | {{VIOLATION}} | {{REJECT_ALERT_RECONCILE}} | {{EVIDENCE}} |

## 7.8 Precedence Rules

Use when multiple sources or rules can produce different values.

| Policy ID | Data / Decision | Precedence Highest → Lowest | Tie-Breaker | Fail-Safe Default | Audit / Flag |
|---|---|---|---|---|---|
| BR-101 | {{FIELD}} | {{SOURCE_A}} → {{SOURCE_B}} → {{SOURCE_C}} | {{TIE_BREAKER}} | {{DEFAULT}} | {{FLAG}} |

## 7.9 Time, Date, Locale, Number, and Unit Semantics

| Concern | Product Rule |
|---|---|
| Default timezone | `{{IANA_TIMEZONE}}` |
| Storage/display distinction | {{PRODUCT_EXPECTATION; FSD DEFINES THE IMPLEMENTATION}} |
| “Today” boundary | {{LOCAL_TIME_BOUNDARY}} |
| Inclusive/exclusive date | {{RULE}} |
| Business days | {{CALENDAR_SOURCE_OR_NONE}} |
| Month addition | {{END_OF_MONTH_RULE}} |
| Currency | {{ISO_CODE_AND_ROUNDING_POLICY}} |
| Decimal / percentage | {{PRECISION_AND_ROUNDING}} |
| Duration canonical unit | {{UNIT}} |
| Locale and formatting | `{{LOCALE}}` |
| Sorting/collation expectation | {{RULE}} |

## 7.10 Data Classification, Clearance, and Retention Intent

| Classification | Definition | Who May View | Excerpt / Export Policy | Sharing Boundary | Retention Intent | Default When Unknown |
|---|---|---|---|---|---|---|
| {{CLASS}} | {{DEFINITION}} | {{ROLES_CLEARANCE}} | {{POLICY}} | {{BOUNDARY}} | {{RETENTION}} | {{FAIL_SAFE}} |

---

# 8. User Journey and End-to-End Scenarios

## 8.1 Journey Inventory

| Journey ID | Journey Name | Primary Actor | Trigger | Outcome | Feature IDs | Priority |
|---|---|---|---|---|---|---|
| JOURNEY-001 | {{NAME}} | ACT-001 | {{TRIGGER}} | {{OUTCOME}} | FEAT-001 | MUST |

## 8.2 Journey Specification Template

### JOURNEY-{{NNN}} — {{JOURNEY_NAME}}

#### Objective

`{{USER_OUTCOME}}`

#### Trigger

`{{EVENT_OR_USER_INTENT}}`

#### Preconditions

- {{PRECONDITION_1}}
- {{PRECONDITION_2}}

#### Main Journey

| Step | Actor / System | Action | Observable Result | Requirement IDs |
|---:|---|---|---|---|
| 1 | ACT-001 | {{ACTION}} | {{RESULT}} | FR-001 |

#### Alternative / Negative Journeys

| Scenario | Trigger / Condition | Expected Product Behavior | State Preserved / Changed | Recovery / Next Action | IDs |
|---|---|---|---|---|---|
| Unauthorized | {{CONDITION}} | Deny with clear message | No mutation | Request access | SEC-001 |
| Empty state | No data | Show actionable empty state | No mutation | {{ACTION}} | AC-002 |
| Duplicate action | Same request repeated | {{DEDUPE_OR_CONFLICT_BEHAVIOR}} | {{STATE}} | {{ACTION}} | BR-002 |
| Stale data | Source changed | {{WARN_BLOCK_REFRESH}} | {{STATE}} | {{ACTION}} | FR-003 |
| Dependency unavailable | {{DEPENDENCY}} | {{DEGRADED_BEHAVIOR}} | Preserve prior valid state | Retry / manual path | DEP-001 |

#### Postconditions

- {{POSTCONDITION_1}}
- {{POSTCONDITION_2}}

#### Evidence of Completion

- {{UI_STATE_RECORD_AUDIT_NOTIFICATION_EXPORT_OR_METRIC}}

---

# 9. Feature Specifications

> Copy this entire feature packet for every capability. One feature must be cohesive enough to understand, but does not have to equal one implementation task. Technical decomposition happens in the FSD.

## 9.1 FEAT-{{NNN}} — {{FEATURE_NAME}}

### 9.1.1 Feature Metadata

| Field | Value |
|---|---|
| Feature ID | `FEAT-{{NNN}}` |
| Priority | MUST / SHOULD / COULD / WONT |
| Release | `{{RELEASE}}` |
| Status | DRAFT / IN_REVIEW / APPROVED / DEFERRED |
| Product owner | `{{OWNER}}` |
| Related problems | `{{PROB_IDS}}` |
| Related objectives/outcomes | `{{OBJ_IDS}}`, `{{OUT_IDS}}` |
| Related journeys | `{{JOURNEY_IDS}}` |
| Primary actors | `{{ACTOR_IDS}}` |
| Dependencies | `{{DEP_IDS_OR_NONE}}` |
| Open blockers | `{{OPEN_IDS_OR_NONE}}` |

### 9.1.2 Feature Objective

`{{ONE OUTCOME ACHIEVED BY THE USER OR THE BUSINESS.}}`

### 9.1.3 Feature Boundary

**Included:**

- {{IN_SCOPE_BEHAVIOR}}

**Not included:**

- {{OUT_OF_SCOPE_BEHAVIOR}}

**Must not be assumed:**

- {{COMMON_BUT_UNAPPROVED_ASSUMPTION}}

### 9.1.4 User Stories

| User Story ID | Story | Priority | Related Rule / Journey |
|---|---|---|---|
| US-{{NNN}} | As `{{ACTOR}}`, I want `{{CAPABILITY}}`, so that `{{OUTCOME}}`. | MUST | BR-001 / JOURNEY-001 |

User stories do not replace requirements. Use stories for intent; use FR/AC for testable behavior.

### 9.1.5 Trigger, Preconditions, and Postconditions

| Type | Conditions |
|---|---|
| Trigger | {{TRIGGER}} |
| Preconditions | {{PRECONDITIONS}} |
| Success postconditions | {{SUCCESS_STATE_AND_SIDE_EFFECTS}} |
| Failure postconditions | {{STATE_THAT_MUST_REMAIN_UNCHANGED_OR_FLAGGED}} |

### 9.1.6 Main Flow

| Step | Actor / System | Action | Product Response | Rule / Requirement IDs |
|---:|---|---|---|---|
| 1 | ACT-001 | {{ACTION}} | {{RESPONSE}} | FR-001 |

### 9.1.7 Alternative, Negative, Edge, and Recovery Flows

| Scenario ID | Scenario | Condition | Expected Behavior | User Message / Visibility | State Impact | Recovery | Requirement IDs |
|---|---|---|---|---|---|---|---|
| ALT-001 | {{SCENARIO}} | {{CONDITION}} | {{BEHAVIOR}} | {{MESSAGE}} | {{IMPACT}} | {{RECOVERY}} | FR-002 |

Explicitly consider where relevant:

- invalid input;
- unauthorized and insufficient clearance;
- missing prerequisite;
- no data / zero result;
- duplicate submission / repeated click;
- stale version / source changed;
- dependency timeout / rate limit / auth failure;
- partial batch success;
- conflicting update;
- deleted, archived, obsolete, or missing source;
- notification undeliverable;
- export too large or data redacted;
- AI output invalid, unsupported, low-confidence, or without evidence;
- user abandons the flow midway;
- retry after failure;
- recovery after the service returns to normal.

### 9.1.8 Business Rules

| Rule ID | Rule | Condition | Outcome | Exception | Precedence | Example / Non-Example |
|---|---|---|---|---|---|---|
| BR-{{NNN}} | {{RULE}} | {{WHEN}} | {{OUTCOME}} | {{EXCEPTION}} | {{PRECEDENCE}} | {{EXAMPLES}} |

### 9.1.9 Functional Product Requirements

| Requirement ID | Requirement | Priority | Actor / Trigger | Observable Outcome | Failure Behavior |
|---|---|---|---|---|---|
| FR-{{NNN}} | The system MUST {{BEHAVIOR}} when {{CONDITION}}. | MUST | {{ACTOR_TRIGGER}} | {{OUTCOME}} | {{FAILURE_BEHAVIOR}} |

A good requirement pattern:

> `FR-001`: When `{{CONDITION}}`, the system MUST `{{BEHAVIOR}}` so that `{{OBSERVABLE_OUTCOME}}`. If `{{FAILURE_CONDITION}}`, the system MUST `{{SAFE_FAILURE_BEHAVIOR}}` and MUST NOT `{{UNSAFE_BEHAVIOR}}`.

### 9.1.10 Acceptance Criteria

Use separate IDs so they can be traced to tests.

| AC ID | Given | When | Then | Evidence / Oracle | Requirement IDs |
|---|---|---|---|---|---|
| AC-{{NNN}} | {{PRECONDITION}} | {{ACTION}} | {{EXPECTED_RESULT}} | {{HOW_TO_VERIFY}} | FR-001 |

Minimum acceptance coverage per feature, where relevant:

- [ ] Happy path.
- [ ] Validation boundary.
- [ ] Authorization / ownership / clearance denial.
- [ ] Empty state / zero result.
- [ ] Duplicate / idempotent user action.
- [ ] Stale or changed source.
- [ ] Partial failure and preservation of prior state.
- [ ] Dependency unavailable / degraded mode.
- [ ] Audit / notification / analytics side effect.
- [ ] Accessibility / localization behavior.
- [ ] Data classification / redaction.
- [ ] Recovery or retry.

### 9.1.11 Input and Output Product Contract

Describe business information, not physical schema.

| Input / Output | Field / Information | Required? | Source | Validation / Meaning | Classification | Display / Redaction Rule |
|---|---|---:|---|---|---|---|
| Input | {{FIELD}} | YES | {{SOURCE}} | {{RULE}} | {{CLASS}} | {{RULE}} |
| Output | {{FIELD}} | YES | Derived | {{MEANING}} | {{CLASS}} | {{RULE}} |

### 9.1.12 State and Lifecycle Impact

| Entity / Process | Current State | Action | Result State | Who Can Trigger | Reversible? | Evidence |
|---|---|---|---|---|---:|---|
| {{ENTITY}} | {{STATE}} | {{ACTION}} | {{STATE}} | {{ACTOR}} | YES / NO | {{EVIDENCE}} |

### 9.1.13 Permission and Approval Requirements

| Action | Allowed Actors | Object Scope | Approval Needed | Denied Actors | Denial Behavior | Audit Required |
|---|---|---|---|---|---|---:|
| {{ACTION}} | {{ACTORS}} | {{OWNED_ASSIGNED_ALL}} | {{APPROVER_OR_NONE}} | {{ACTORS}} | {{403_REDACTION_MESSAGE}} | YES |

### 9.1.14 Notification Requirements

| Notification ID | Trigger | Recipient | Channel Intent | Timing | Content Minimum | Dedupe / Frequency | Undeliverable Behavior |
|---|---|---|---|---|---|---|---|
| NOTIF-{{NNN}} | {{TRIGGER}} | {{RECIPIENT}} | Email / In-app / Other | {{TIMING}} | {{CONTENT}} | {{RULE}} | {{FLAG_ESCALATE}} |

Technical channels may be detailed in the FSD, unless the channel is a business or contractual requirement.

### 9.1.15 Reporting, Search, Filter, and Export

| Requirement ID | Capability | Scope | Fields / Dimensions | Filters / Sort | Format | Completeness Rule | Classification Rule |
|---|---|---|---|---|---|---|---|
| REPORT-{{NNN}} | {{REPORT_EXPORT_SEARCH}} | {{SCOPE}} | {{FIELDS}} | {{FILTERS}} | {{FORMAT}} | {{NO_TRUNCATION_OR_PAGINATION}} | {{REDACTION}} |

### 9.1.16 Audit and Evidence Requirements

| Action / Event | Actor Attribution | Minimum Evidence | Immutable? | Query / Export Need | Retention Intent |
|---|---|---|---:|---|---|
| {{ACTION}} | Human / System / AI | {{BEFORE_AFTER_REASON_SOURCE_VERSION}} | YES | {{NEED}} | {{RETENTION}} |

### 9.1.17 AI / Automation Behavior

Enter `N/A — reason` when the feature does not use AI/automation.

| Concern | Product Decision |
|---|---|
| Purpose | {{WHAT_AI_AUTOMATION_DOES}} |
| Authority | ADVISORY / DRAFT_ONLY / DETERMINISTIC_AUTOMATION / HUMAN_APPROVAL_REQUIRED / AUTONOMOUS_WITH_LIMITS |
| Inputs allowed | {{DATA_SCOPE}} |
| Inputs prohibited | {{SENSITIVE_OR_UNTRUSTED_DATA}} |
| Required evidence | {{CITATION_CONFIDENCE_STRUCTURED_OUTPUT}} |
| Human gate | {{WHO_APPROVES_WHAT}} |
| Unsupported output | {{REJECT_FLAG_RETRY}} |
| Low-confidence behavior | {{BEHAVIOR}} |
| Provider unavailable | {{DEGRADED_MODE}} |
| Re-evaluation trigger | {{SOURCE_CHANGE_MODEL_CHANGE_MANUAL}} |
| Auditability | {{RUN_ID_PROMPT_VERSION_SOURCE_VERSION_DECISION}} |
| User disclosure | {{HOW_AI_ASSISTANCE_IS_LABELED}} |

### 9.1.18 Security, Privacy, and Compliance

| ID | Requirement | Protected Asset / Data | Threat / Obligation | Expected Product Behavior | Evidence |
|---|---|---|---|---|---|
| SEC-{{NNN}} | {{REQUIREMENT}} | {{ASSET}} | {{THREAT}} | {{BEHAVIOR}} | {{EVIDENCE}} |

### 9.1.19 Accessibility, Localization, and Content

| Concern | Requirement |
|---|---|
| Language | {{LANGUAGE_AND_DOMAIN_TERMS}} |
| Responsive range | {{SUPPORTED_VIEWPORT_DEVICE}} |
| Keyboard | {{EXPECTATION}} |
| Screen reader | {{LABEL_LIVE_REGION_TABLE_RULE}} |
| Color | Status must not be conveyed by color alone |
| Error content | {{ACTIONABLE_LOCALIZED_MESSAGE}} |
| Empty state | {{WHAT_USER_CAN_DO_NEXT}} |
| Date/number format | {{LOCALE_RULE}} |

#### UI Experience Gate

The PRD is the authority for the experience baseline and observable UI behavior.
Visual/prototype evidence supports decisions; that evidence is not authority or a
production seed.

| Field | Contract |
|---|---|
| `ui_delivery_profile` | `NOT_APPLICABLE / STANDARD / HIGH_INTERACTION` |
| `experience_baseline_status` | `NOT_APPLICABLE / DRAFT / VALIDATED / EXCEPTION_APPROVED` |
| Critical journey/feature/AC refs | `{{JOURNEY/FEAT/AC IDS}}` |
| Responsive/accessibility intent refs | `{{NFR/AC IDS}}` |
| Validation evidence refs | `{{SRC/DESIGN/PROTOTYPE REFS}}` |
| Approver | `{{BUSINESS_OWNER + DECISION REF}}` |
| Blocking `OPEN-*` refs | `{{IDS_OR_NONE}}` |

##### State Applicability Matrix

Every row is `COVERED` or `N/A - reason + approver`. Material edge cases are
named scenarios, not a generic `Edge` state.

| State | Applicability | Observable behavior / recovery | AC refs | N/A reason + approver |
|---|---|---|---|---|
| Loading | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Empty | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Success | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Validation | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Error | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Permission denied | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Stale/conflict | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Partial/degraded | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Offline | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |
| Async/in-progress | COVERED / N/A | {{BEHAVIOR}} | {{AC IDS}} | {{REASON/APPROVER}} |

### 9.1.20 Feature Metrics

| Metric ID | Metric | Definition | Numerator | Denominator | Segments | Source | Target | Decision Enabled |
|---|---|---|---|---|---|---|---|---|
| METRIC-{{NNN}} | {{METRIC}} | {{DEFINITION}} | {{NUM}} | {{DENOM}} | {{SEGMENTS}} | {{SOURCE}} | {{TARGET}} | {{DECISION}} |

### 9.1.21 Feature Risks and Open Items

| ID | Type | Description | Impact | Mitigation / Fallback | Owner | Gate / Deadline | Status |
|---|---|---|---|---|---|---|---|
| RISK-{{NNN}} | Risk | {{RISK}} | {{IMPACT}} | {{MITIGATION}} | {{OWNER}} | {{DATE}} | OPEN |
| OPEN-{{NNN}} | Blocker | {{QUESTION}} | {{IMPACT}} | {{FALLBACK_OR_NONE}} | {{OWNER}} | {{GATE}} | OPEN |

### 9.1.22 Feature Definition of Ready for FSD

- [ ] The feature's problem, objective, outcome, actors, and scope are clear.
- [ ] All business rules use canonical IDs.
- [ ] Main, alternative, negative, and recovery flows are available.
- [ ] State transitions and role authority are unambiguous.
- [ ] Acceptance criteria have observable oracles.
- [ ] UI Experience Gate profile, state applicability, evidence, and approver are complete or `NOT_APPLICABLE` with approved reason.
- [ ] `HIGH_INTERACTION` evidence covers the material runtime interaction risk or records an explicit exception.
- [ ] Input/output product semantics and classification are clear.
- [ ] The AI/human authority boundary is stated or N/A.
- [ ] The relevant NFRs and dependencies have been linked.
- [ ] No open blocker needed by the feature remains.
- [ ] The Product Owner approves the feature for translation into the FSD.

---

# 10. Cross-Cutting Product Requirements

## 10.1 Security Objectives

| Security ID | Objective / Requirement | Asset | Actor / Threat | Product Behavior | Applicable Features | Acceptance Evidence |
|---|---|---|---|---|---|---|
| SEC-001 | {{REQUIREMENT}} | {{ASSET}} | {{THREAT}} | {{BEHAVIOR}} | {{FEATURES}} | {{EVIDENCE}} |

Minimum areas that must be assessed:

- authentication expectation;
- authorization, ownership, clearance, and default-deny;
- sensitive action confirmation;
- session expiry and privilege revocation intent;
- classified content display/export;
- secret exposure in UI, logs, exports, or support channels;
- malicious/untrusted input;
- audit trail integrity;
- abuse, rate, and bulk-action risk;
- data egress to third parties.

## 10.2 Privacy Requirements

| Privacy ID | Data Subject / Data | Purpose | Lawful / Approved Basis | Minimum Data | Access | Retention / Erasure | Export / Sharing | Evidence |
|---|---|---|---|---|---|---|---|---|
| PRIV-001 | {{DATA}} | {{PURPOSE}} | {{BASIS}} | {{MINIMIZATION}} | {{ACCESS}} | {{RETENTION}} | {{SHARING}} | {{EVIDENCE}} |

## 10.3 Compliance Requirements

| Compliance ID | Regulation / Standard / Contract | Clause / Control | Product Obligation | Evidence Produced | Owner | Release Gate |
|---|---|---|---|---|---|---|
| COMP-001 | {{SOURCE}} | {{REF}} | {{OBLIGATION}} | {{EVIDENCE}} | {{OWNER}} | {{GATE}} |

Do not claim “compliant” merely because a feature exists. State the obligations and the evidence that must be provable.

## 10.4 Auditability Requirements

| Requirement ID | Event / Decision | Actor | Source Version / Context | Before/After | Reason Required | Search / Export | Retention |
|---|---|---|---|---|---:|---|---|
| FR-{{NNN}} | {{EVENT}} | {{ACTOR}} | {{CONTEXT}} | YES / NO | YES / NO | {{NEED}} | {{RETENTION}} |

## 10.5 AI and Automation Governance

| AI ID | Use Case | Authority Level | Human Gate | Evidence Required | Prohibited Use | Evaluation Metric | Fallback |
|---|---|---|---|---|---|---|---|
| AI-001 | {{USE_CASE}} | {{LEVEL}} | {{GATE}} | {{EVIDENCE}} | {{PROHIBITED}} | {{METRIC}} | {{FALLBACK}} |

You must explain:

1. Whether the AI output is a suggestion, draft, classification, extraction, ranking, or autonomous action.
2. Who holds the final decision.
3. Whether output without citations/evidence may be stored or displayed.
4. What happens on malformed output, hallucination, prompt injection, unsupported claims, and model/provider outages.
5. The dataset/eval set and release thresholds used.
6. When old results are considered stale and must be re-evaluated.
7. The permitted data egress, provider retention, and classification boundaries.

## 10.6 Notification and Communication Policy

| Notification ID | Trigger | Audience | Urgency | Channel Requirement | Frequency / Dedupe | Escalation | Opt-out Allowed? | Audit |
|---|---|---|---|---|---|---|---:|---:|
| NOTIF-001 | {{TRIGGER}} | {{AUDIENCE}} | {{URGENCY}} | {{CHANNEL}} | {{RULE}} | {{ESCALATION}} | YES / NO | YES |

## 10.7 Search, Reporting, and Export Policy

| Report ID | Audience | Business Question | Data Scope | Freshness | Format | Completeness | Redaction | Generated Timestamp / Version |
|---|---|---|---|---|---|---|---|---|
| REPORT-001 | {{AUDIENCE}} | {{QUESTION}} | {{SCOPE}} | {{FRESHNESS}} | {{FORMAT}} | {{RULE}} | {{RULE}} | REQUIRED |

## 10.8 Non-Functional Requirements

NFRs must contain a target, context, measurement, and failure consequence.

| NFR ID | Category | Requirement / SLO | Load / Context | Measurement Method | Target | Failure Consequence | Priority |
|---|---|---|---|---|---|---|---|
| NFR-001 | Performance | {{BEHAVIOR}} | {{DATA_USERS_REQUEST_PROFILE}} | {{METHOD}} | {{TARGET}} | {{CONSEQUENCE}} | MUST |

Areas that must be assessed:

- performance and latency;
- availability and business-hour expectations;
- durability and data-loss tolerance;
- recovery time / recovery point intent;
- scale and expected volume;
- concurrency / duplicate-action product effects;
- freshness and sync latency;
- compatibility (browser, device, file format, locale);
- accessibility;
- graceful degradation;
- observability visible to operators/users;
- supportability and diagnosability;
- legal/data residency;
- cost ceiling when it is a business constraint.

## 10.9 Capacity and Usage Assumptions

| Dimension | Current | Release Target | Peak / Burst | Growth Horizon | Source / Confidence |
|---|---:|---:|---:|---|---|
| Named users | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Concurrent users | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Records / documents | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Actions / jobs per day | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |
| Max item / file size | {{SIZE}} | {{SIZE}} | {{SIZE}} | {{PERIOD}} | {{SOURCE}} |
| Export size | {{N}} | {{N}} | {{N}} | {{PERIOD}} | {{SOURCE}} |

---

# 11. External Systems and Business Integration Outcomes

The PRD defines integration outcomes and boundaries. Endpoints, payloads, retries, credential mechanisms, and adapter technicalities are established in the FSD.

## 11.1 Integration Inventory

| Dependency ID | System / Party | Purpose | Authoritative Data | Data Sent | Data Received | Business Freshness | Owner | Criticality |
|---|---|---|---|---|---|---|---|---|
| DEP-001 | {{SYSTEM}} | {{PURPOSE}} | {{DATA}} | {{SENT}} | {{RECEIVED}} | {{FRESHNESS}} | {{OWNER}} | CRITICAL / DEGRADABLE |

## 11.2 Integration Product Contract

### DEP-{{NNN}} — {{SYSTEM_NAME}}

| Concern | Product Requirement |
|---|---|
| User/business outcome | {{OUTCOME}} |
| Source of truth | {{SOURCE}} |
| Trigger / cadence expectation | {{TRIGGER_OR_FRESHNESS}} |
| Data scope | {{SCOPE}} |
| Consent / classification / egress | {{BOUNDARY}} |
| Duplicate behavior | {{PRODUCT_EXPECTATION}} |
| Stale data behavior | {{WARN_BLOCK_ALLOW_WITH_LABEL}} |
| Unavailable behavior | {{DEGRADED_MODE}} |
| Manual fallback | {{FALLBACK_OR_NONE}} |
| Recovery expectation | {{RECONCILE_RETRY_REAUTH}} |
| User/operator visibility | {{HEALTH_BANNER_ALERT_STATUS}} |
| Audit evidence | {{EVIDENCE}} |
| Legal / contract dependency | {{SOURCE_OR_NONE}} |

## 11.3 Cross-System Consistency Intent

| Invariant ID | Systems / Records | Authoritative Side | Allowed Lag | Drift Visibility | Repair Authority | User Impact During Drift |
|---|---|---|---|---|---|---|
| INV-{{NNN}} | {{SYSTEMS}} | {{AUTHORITY}} | {{LAG}} | {{VISIBILITY}} | {{WHO_OR_SYSTEM}} | {{IMPACT}} |

---

# 12. Analytics, Metrics, and Product Learning

## 12.1 Metric Dictionary

| Metric ID | Metric | Product Question | Definition | Numerator | Denominator | Exclusions | Segment | Source | Cadence | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| METRIC-001 | {{NAME}} | {{QUESTION}} | {{DEFINITION}} | {{NUM}} | {{DENOM}} | {{EXCLUSIONS}} | {{SEGMENT}} | {{SOURCE}} | {{CADENCE}} | {{OWNER}} |

Metric definitions must prevent division-by-zero, double counting, and invisible denominator changes.

## 12.2 Product Analytics Event Intent

The FSD will detail the event schema. The PRD establishes the business meaning and privacy boundary.

| Event ID | Event Name | Trigger Meaning | Actor | Required Dimensions | Prohibited Data | Metric Consumers |
|---|---|---|---|---|---|---|
| EVENT-001 | `{{event_name}}` | {{MEANING}} | {{ACTOR}} | {{DIMENSIONS}} | {{PII_SECRET_CONTENT}} | METRIC-001 |

## 12.3 Experiment / Validation Plan

Complete when the outcome or solution is still a hypothesis.

| Experiment ID | Hypothesis | Segment | Method | Success Threshold | Guardrail | Duration / Sample | Decision Rule | Owner |
|---|---|---|---|---|---|---|---|---|
| EXP-001 | {{HYPOTHESIS}} | {{SEGMENT}} | {{METHOD}} | {{THRESHOLD}} | {{GUARDRAIL}} | {{WINDOW}} | {{SHIP_ITERATE_STOP}} | {{OWNER}} |

## 12.4 Success Review Cadence

| Review | Timing | Inputs | Decision Owner | Possible Decisions |
|---|---|---|---|---|
| Launch readiness | {{DATE_GATE}} | UAT, risk, blockers | {{OWNER}} | Go / No-go / Conditional |
| Early-life review | {{DAYS_AFTER}} | Incidents, adoption, guardrails | {{OWNER}} | Continue / Rollback / Patch |
| Outcome review | {{WINDOW}} | Outcome metrics | {{OWNER}} | Scale / Iterate / Retire |

---

# 13. Rollout, Adoption, Support, and Change Management

## 13.1 Rollout Strategy

| Phase | Audience / Scope | Feature IDs | Entry Criteria | Monitoring | Exit / Expansion Criteria | Rollback Trigger |
|---|---|---|---|---|---|---|
| Pilot | {{SCOPE}} | {{FEATURES}} | {{CRITERIA}} | {{METRICS}} | {{EXIT}} | {{TRIGGER}} |

## 13.2 Existing Data / Process Transition

| Area | Current State | Target State | Migration / Backfill Intent | Validation Owner | Failure / Rollback Expectation |
|---|---|---|---|---|---|
| {{AREA}} | {{CURRENT}} | {{TARGET}} | {{INTENT}} | {{OWNER}} | {{EXPECTATION}} |

## 13.3 Training and Communication

| Audience | Change | Required Material | Delivery Channel | Owner | Completion Evidence |
|---|---|---|---|---|---|
| {{AUDIENCE}} | {{CHANGE}} | {{GUIDE_TRAINING_RUNBOOK}} | {{CHANNEL}} | {{OWNER}} | {{EVIDENCE}} |

## 13.4 Support Model

| Concern | Decision |
|---|---|
| Support owner | {{TEAM_ROLE}} |
| Support hours | {{WINDOW}} |
| Severity taxonomy | {{REFERENCE_OR_DEFINITION}} |
| User-facing issue channel | {{CHANNEL}} |
| Escalation path | {{PATH}} |
| Known limitation communication | {{METHOD}} |
| Data correction authority | {{ROLE}} |
| Incident evidence required | {{EVIDENCE}} |

## 13.5 Product Rollback Criteria

Technical rollback is detailed in the FSD. The PRD establishes the business triggers.

| Trigger ID | Condition | Threshold | Decision Owner | Immediate User Communication | Data / Process Expectation |
|---|---|---|---|---|---|
| ROLLBACK-001 | {{CONDITION}} | {{THRESHOLD}} | {{OWNER}} | {{MESSAGE}} | {{PRESERVE_REVERT_RECONCILE}} |

---

# 14. UAT, Acceptance, and Release Gates

## 14.1 UAT Strategy

`{{DESCRIBE WHO PERFORMS UAT, THE ENVIRONMENT/DATA USED, THE SCOPE, AND THE EVIDENCE THAT MUST BE KEPT.}}`

## 14.2 UAT Scenario Matrix

| UAT ID | Scenario | Actor | Preconditions / Data | Summary Steps | Expected Outcome | Negative Check | Requirement / AC IDs | Evidence | Approver |
|---|---|---|---|---|---|---|---|---|---|
| UAT-001 | {{SCENARIO}} | ACT-001 | {{DATA}} | {{STEPS}} | {{OUTCOME}} | {{NEGATIVE}} | FR-001, AC-001 | {{SCREEN_RECORD_AUDIT}} | {{OWNER}} |

## 14.3 Release Acceptance Matrix

| Gate | Criteria | Evidence | Owner | Status |
|---|---|---|---|---|
| Product scope | All MUST features complete; no non-goal leakage | Traceability matrix | Product Owner | PENDING |
| Functional | All MUST ACs and UAT pass | Test/UAT evidence | QA Lead | PENDING |
| Security/privacy | All MUST controls and reviews complete | Review report | Security/Privacy | PENDING |
| Data/migration | Reconciliation and sample validation pass | Validation report | Data/Engineering | PENDING |
| Operations | Monitoring, support, and rollback ready | Runbook evidence | Operations | PENDING |
| Outcome instrumentation | Metrics/events ready and validated | Analytics validation | Product/Data | PENDING |
| Blocker | No open release blockers | Open-item register | Product Owner | PENDING |

## 14.4 Acceptance Sign-Off

| Role | Name | Decision | Date | Conditions / Exceptions |
|---|---|---|---|---|
| Business Owner |  |  |  |  |
| Product Owner |  |  |  |  |
| QA Lead |  |  |  |  |
| Technical Lead |  |  |  |  |
| Security / Compliance |  | N/A / APPROVE |  |  |
| Operations |  | N/A / APPROVE |  |  |

---

# 15. Risks, Assumptions, Dependencies, and Open Decisions

## 15.1 Risk Register

| Risk ID | Risk | Category | Likelihood | Impact | Exposure | Early Signal | Mitigation | Contingency | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | {{RISK}} | Product / User / Legal / Security / AI / Dependency / Delivery | L/M/H | L/M/H | {{RANK}} | {{SIGNAL}} | {{MITIGATION}} | {{CONTINGENCY}} | {{OWNER}} | OPEN |

## 15.2 Assumption Register

| Assumption ID | Assumption | Criticality | Validation Method | Owner | Deadline | Result | Affected IDs |
|---|---|---|---|---|---|---|---|
| ASSUMP-001 | {{ASSUMPTION}} | L/M/H | {{METHOD}} | {{OWNER}} | {{DATE}} | PENDING | {{IDS}} |

## 15.3 Dependency Register

| Dependency ID | Dependency | Commitment | Owner | Needed By | Verification Evidence | Failure Mode | Fallback | Status |
|---|---|---|---|---|---|---|---|---|
| DEP-001 | {{DEPENDENCY}} | {{COMMITMENT}} | {{OWNER}} | {{GATE}} | {{EVIDENCE}} | {{FAILURE}} | {{FALLBACK}} | OPEN |

## 15.4 Open Decisions

| Open ID | Question | Options | Recommendation | Blocker? | Owner | Decision Date | Fallback | Status |
|---|---|---|---|---:|---|---|---|---|
| OPEN-001 | {{QUESTION}} | {{OPTIONS}} | {{RECOMMENDATION}} | YES / NO | {{OWNER}} | {{DATE}} | {{FALLBACK}} | OPEN |

## 15.5 Resolved Decisions

| Decision ID | Resolved Open ID | Decision | Rationale | Approved By | Date | IDs Updated | Supersedes |
|---|---|---|---|---|---|---|---|
| DEC-001 | OPEN-001 | {{DECISION}} | {{RATIONALE}} | {{APPROVER}} | {{DATE}} | {{IDS}} | {{OLD_TEXT_IDS}} |

---

# 16. Traceability and Handoff to FSD

## 16.1 End-to-End Traceability Matrix

Fill in the FSD/Test/Goal columns as downstream artifacts are created. The PRD must not be considered failed merely because downstream columns are still empty in draft, but those columns must be filled before autonomous development starts. The technical-decision column may contain `TDEC-*`, an `ACCEPTED` ADR, or `N/A`.

| BRD Source | Problem | Objective / Outcome | Feature | User Story | Business Rule | Product Requirement | Acceptance Criteria | UAT | FSD IDs | Decision Ref (`TDEC` / optional ADR) | Test IDs | Goal IDs | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BRD-{{PROJECT_CODE}}#BREQ-001 / BRD-{{PROJECT_CODE}}#BAC-001 | PROB-001 | OBJ-001 / OUT-001 | FEAT-001 | US-001 | BR-001 | FR-001 | AC-001 | UAT-001 |  | N/A |  |  | DRAFT |

Check for orphans:

- A PRD requirement without a BRD source or approved exception.
- A problem without an objective/feature.
- An objective without a metric.
- A feature without a problem/outcome.
- A requirement without an AC.
- An AC without a requirement.
- A UAT without a requirement.
- A `MUST` requirement without a target release.
- An FSD/goal that does not map to the PRD.
- A material technical decision without a `TDEC-*` or an `ACCEPTED` ADR.
- A goal that points only to an ADR but not to the FSD.

## 16.2 Product Decisions That FSD Must Not Invent

| Decision Area | Canonical PRD IDs | Final Decision | FSD May Decide | FSD Must Not Decide |
|---|---|---|---|---|
| Role authority | ACT-001, BR-001 | {{DECISION}} | Enforcement detail | New roles/approvals |
| State semantics | BR-010, INV-001 | {{DECISION}} | Persistence/transaction | New states/transitions |
| Data classification | SEC-001, PRIV-001 | {{DECISION}} | Technical control | More permissive defaults |
| AI authority | AI-001 | {{DECISION}} | Provider/prompt contract | Auto-approval without a gate |
| Scope | SCOPE-001, SCOPE-NG-001 | {{DECISION}} | Delivery slicing within release | Features outside the scope |

## 16.3 FSD Handoff Requirements

The downstream FSD must at minimum produce:

- [ ] A conflict ledger and source precedence.
- [ ] The canonical domain model, enums, states, and invariants.
- [ ] The physical data model, keys, constraints, indexes, migration, and retention.
- [ ] API/interface/event contracts with an error taxonomy.
- [ ] UI states, validation, accessibility, and localization details.
- [ ] Background jobs, scheduler, retry, idempotency, concurrency, and recovery.
- [ ] External integration adapters, timeouts, health, degraded mode, and reconciliation.
- [ ] Security, privacy, audit, clearance, redaction, and secret handling.
- [ ] The AI prompt/tool/output/evaluation contract where relevant.
- [ ] The NFR load profile, observability, alerts, backup, restore, and runbooks.
- [ ] The test matrix and repository verification commands.
- [ ] Rollout, migration, cutover, rollback, and post-deploy validation.
- [ ] The goal dependency graph and atomic goal packets executable by coding agents.
- [ ] An ADR applicability assessment: `NOT_REQUIRED`, `LINKED`, or `BLOCKED_BY_POLICY`.
- [ ] A Technical Decision Register: every material technical decision is recorded as a `TDEC-*` or linked to an `ACCEPTED` ADR, never both as dual authority.
- [ ] The FSD remains complete and executable when `adr_applicability = NOT_REQUIRED`.
- [ ] Every goal treats the FSD as the primary source of truth; the ADR is only additional authority when linked.

## 16.4 Handoff Blockers

| Blocker ID | Missing Product Decision | Affected Features | Why FSD Must Not Guess | Owner | Resolution Gate |
|---|---|---|---|---|---|
| OPEN-001 | {{MISSING_DECISION}} | {{FEATURES}} | {{REASON}} | {{OWNER}} | {{GATE}} |

## 16.5 Machine-Readable Handoff Manifest

Update this manifest before the FSD is created. Empty values in mandatory fields are blockers.

```yaml
prd_handoff:
  prd_id: "PRD-{{PROJECT_CODE}}"
  version: "{{PRD_VERSION}}"
  status: "APPROVED"
  target_release: "{{RELEASE}}"
  default_locale: "{{LOCALE}}"
  default_timezone: "{{IANA_TIMEZONE}}"

  upstream:
    brd_ids: ["BRD-{{PROJECT_CODE}}"]
    brd_requirement_refs: ["BRD-{{PROJECT_CODE}}#BREQ-001"]
    brd_acceptance_refs: ["BRD-{{PROJECT_CODE}}#BAC-001", "BRD-{{PROJECT_CODE}}#BAT-001"]

  ui_experience:
    profile: "STANDARD"
    baseline_status: "VALIDATED"
    not_applicable_reason: "{{REQUIRED_FOR_NOT_APPLICABLE_OTHERWISE_NA}}"
    critical_journey_refs: ["PRD-{{PROJECT_CODE}}#JOURNEY-001"]
    feature_refs: ["PRD-{{PROJECT_CODE}}#FEAT-001"]
    state_applicability_refs: ["PRD-{{PROJECT_CODE}}#AC-001"]
    responsive_accessibility_refs: ["PRD-{{PROJECT_CODE}}#NFR-001"]
    validation_evidence_refs: ["PRD-{{PROJECT_CODE}}#SRC-010"]
    blocking_open_refs: []
    approved_by: "{{BUSINESS_OWNER}}"

  artifact_governance:
    canonical_path: "BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION"
    fsd_required_for_autonomous_delivery: true
    adr:
      mode: "OPTIONAL_CONDITIONAL"
      applicability_default: "NOT_REQUIRED"
      candidate_decisions: []
      linked_accepted_ids: []
      fallback_authority_when_not_used: "FSD TDEC-*"

  sources:
    - id: "SRC-001"
      authority: "problem_evidence"
      status: "VERIFIED"

  objectives:
    - id: "OBJ-001"
      outcome_ids: ["OUT-001"]
      metric_ids: ["METRIC-001"]

  release_scope:
    in_scope_ids: ["SCOPE-001"]
    non_goal_ids: ["SCOPE-NG-001"]
    feature_ids: ["FEAT-001"]

  actors:
    - id: "ACT-001"
      role: "{{ROLE_NAME}}"
      authority_summary: "{{AUTHORITY}}"

  canonical_semantics:
    business_rule_ids: ["BR-001"]
    invariant_ids: ["INV-001"]
    enum_names: ["{{ENUM_NAME}}"]
    state_machine_names: ["{{STATE_MACHINE}}"]
    source_of_truth_items: ["{{DATUM}}"]

  requirements:
    functional: ["FR-001"]
    security: ["SEC-001"]
    privacy: ["PRIV-001"]
    compliance: ["COMP-001"]
    ai: ["AI-001"]
    non_functional: ["NFR-001"]

  acceptance:
    acceptance_criteria: ["AC-001"]
    uat_scenarios: ["UAT-001"]
    release_metrics: ["METRIC-001"]

  dependencies:
    required: ["DEP-001"]
    degraded_mode_defined: true

  blockers:
    open_blocker_ids: []
    non_blocking_open_ids: []

  approvals:
    product_owner: "{{NAME}}"
    business_owner: "{{NAME}}"
    qa_reviewed: true
    security_reviewed: true

  downstream_guardrails:
    fsd_must_not_invent_product_rules: true
    fsd_must_record_adr_applicability: true
    goals_must_reference_fsd: true
    adr_is_not_required_when_applicability_is_not_required: true
    linked_adrs_must_be_accepted: true
```

## 16.6 FSD Review Questions

The FSD reviewer must check:

1. Does the FSD add roles, enums, states, business rules, or workflows that are not in the PRD?
2. Is any PRD requirement missing or downgraded to optional?
3. Does degraded mode preserve product invariants and prior valid state?
4. Does AI/automation receive greater authority than approved?
5. Are data classification, redaction, audit, and retention weaker than the PRD?
6. Does every MUST requirement have a deterministic test and a goal owner?
7. Do technical details restrict product outcomes in an unapproved way?
8. Were any conflicts resolved silently?
9. Has the FSD determined `adr_applicability` and does it remain complete when no ADR is used?
10. When an ADR is linked, is its status `ACCEPTED`, is its scope delegated, and does the FSD avoid duplicating authority in a contradictory way?
11. Does every goal point to the FSD, rather than the ADR, as the sole source of truth?

---

# 17. Final PRD Readiness Checklist

## 17.1 Problem and Outcome

- [ ] The problem is written without being a solution in disguise.
- [ ] Evidence/baseline is available or hypotheses have a validation plan.
- [ ] Objectives and outcomes are measurable.
- [ ] Guardrails prevent harmful local optimization.
- [ ] The why-now and consequence of inaction are clear.

## 17.2 Scope and Users

- [ ] In-scope, out-of-scope, non-goals, and future scope do not overlap.
- [ ] The release slice is realistic and does not hide mandatory dependencies.
- [ ] Actors, personas, roles, owners, and approvers are distinguished.
- [ ] The permission matrix covers allow and deny.
- [ ] Segregation of duties is defined where relevant.

## 17.3 Semantics and Rules

- [ ] The glossary, enums, statuses, and states use canonical terms.
- [ ] Every important datum has one source of truth.
- [ ] Business rules are not duplicated or conflicting.
- [ ] Precedence and fail-safe defaults are clear.
- [ ] Date/time, unit, currency, rounding, locale, and version semantics are clear.
- [ ] Invariants and forbidden outcomes are written down.

## 17.4 Feature Quality

- [ ] Every feature maps to a problem, objective, outcome, and journey.
- [ ] User stories are not the only specification.
- [ ] Requirements are observable and atomic.
- [ ] Acceptance criteria have objective oracles.
- [ ] Happy, validation, authorization, empty, duplicate, stale, partial-failure, degraded, and recovery paths are assessed.
- [ ] Notifications, reporting, audit, accessibility, and metrics are assessed.
- [ ] There is no “etc.” or open-ended mandatory list.

## 17.5 Security, Privacy, Compliance, and AI

- [ ] Data classification and clearance intent are clear.
- [ ] The redaction/export policy is clear.
- [ ] Retention and data minimization are defined.
- [ ] Audit evidence for high-risk actions is defined.
- [ ] Data egress and third-party sharing are approved.
- [ ] AI authority, evidence, human gates, evals, stale/re-evaluation, and fallback are clear.
- [ ] Unknown/default behavior is not accidentally more permissive.

## 17.6 Delivery and Readiness

- [ ] NFRs are measurable and use real load/context.
- [ ] Dependencies have an owner, commitment, and degraded behavior.
- [ ] Risks have mitigation, contingency, and early signals.
- [ ] UAT can be executed with the available data/evidence.
- [ ] Release gates, rollout, support, and rollback business criteria are clear.
- [ ] No blockers remain open.
- [ ] The traceability matrix is free of orphans.
- [ ] The handoff manifest is valid and consistent.
- [ ] The BRD source and `BREQ/BAC` traceability are complete.
- [ ] The ADR is declared optional; candidate architecture decisions have been passed to the FSD without making them automatic blockers.

## 17.7 AI-Slop Rejection

Reject the PRD or its derived outputs when any of the following is found:

- [ ] A feature that does not solve any problem/outcome.
- [ ] A generic requirement that could be pasted into any product.
- [ ] A new business rule without a source or approver.
- [ ] Shifting terminology for the same entity/state.
- [ ] Happy path only, without negative/failure behavior.
- [ ] “AI will decide” without evidence, an authority boundary, and fallback.
- [ ] An “automated system” without a trigger, cadence, dedupe, failure, and visibility.
- [ ] A vanity metric without a decision to be taken.
- [ ] Security/compliance as claims, not observable controls/evidence.
- [ ] An NFR without numbers, context, or a measurement method.
- [ ] Extra features included as “best practice” but not approved in scope.
- [ ] Acceptance criteria that merely repeat the user story.
- [ ] Placeholders, fake certainty, or hidden assumptions.

---

# Appendix A — Requirement Writing Patterns

## A.1 A Good Functional Requirement

> **FR-001:** When an owner submits a review for a document they own, the system MUST store the submission as `SUBMITTED`, display the submission to the verifier, and MUST NOT reset the review cycle before the verifier completes verification.

Why it is good: the trigger, actor, state, observable behavior, and forbidden side effect are clear.

## A.2 A Good Negative Requirement

> **SEC-001:** Users without the required clearance MUST NOT see excerpts or sensitive values on pages, API responses, notifications, and exports. The system MUST display a redaction placeholder and record the denial without recording the hidden content.

## A.3 A Good Failure Requirement

> **FR-002:** If a dependency fails after part of a batch has been processed, the system MUST preserve the prior valid state, mark the run as a partial failure, and provide a recovery action. The system MUST NOT delete unconfirmed records.

## A.4 A Good NFR

> **NFR-001:** For a release with at most 5,000 active records and 50 concurrent users, the list page MUST display initial content within p95 ≤ 2 seconds on the broadband connection defined by test profile `{{PROFILE_ID}}`.

## A.5 Bad Requirements

- “The system must be fast and user-friendly.”
- “Use AI to analyze the data.”
- “Admins can manage everything.”
- “The system must be scalable.”
- “Handle errors properly.”
- “Send notifications when needed.”
- “Data is stored securely.”
- “Support all common formats.”

The fix: define the actor, object, scope, trigger, behavior, target, failure path, and evidence.

---

# Appendix B — Acceptance Criteria Patterns

## B.1 Happy Path

```gherkin
Given {{VALID_PRECONDITION}}
When {{AUTHORIZED_ACTOR_PERFORMS_ACTION}}
Then {{EXPECTED_STATE_AND_OUTPUT}}
And {{EXPECTED_SIDE_EFFECT_OR_EVIDENCE}}
```

## B.2 Authorization Denial

```gherkin
Given {{ACTOR_LACKS_PERMISSION_OR_CLEARANCE}}
When {{ACTOR_ATTEMPTS_ACTION}}
Then the action is denied
And no protected state is changed
And the denial is recorded without exposing protected content
```

## B.3 Duplicate Action

```gherkin
Given {{ACTION_HAS_ALREADY_SUCCEEDED}}
When the same logical action is submitted again
Then {{NO_DUPLICATE_SIDE_EFFECT_OR_EXPLICIT_CONFLICT}}
And the user receives {{CLEAR_RESULT}}
```

## B.4 Stale Source

```gherkin
Given {{SOURCE_CHANGED_AFTER_USER_LOADED_OR_AI_ANALYZED_IT}}
When {{DECISION_OR_MUTATION_IS_ATTEMPTED}}
Then {{BLOCK_WARN_REEVALUATE}}
And the prior decision is not silently applied to the new version
```

## B.5 Dependency Failure

```gherkin
Given {{DEPENDENCY_IS_UNAVAILABLE}}
When {{FEATURE_IS_TRIGGERED}}
Then {{DEGRADED_OR_FAILED_BEHAVIOR}}
And the prior valid state is preserved
And the user/operator can see the failure and next action
```

## B.6 AI Evidence Gate

```gherkin
Given an AI output lacks required evidence or violates the output contract
When the system receives the output
Then the output is not promoted to authoritative state
And the run is marked invalid or requires review
And no high-impact action is executed automatically
```

---

# Appendix C — PRD Review Comment Format

Use actionable review comments:

| Field | Content |
|---|---|
| Review ID | `REV-{{NNN}}` |
| Severity | BLOCKER / MAJOR / MINOR / QUESTION |
| Affected ID | {{REQUIREMENT_OR_SECTION_ID}} |
| Issue | {{WHAT_IS_AMBIGUOUS_INCONSISTENT_MISSING}} |
| Risk | {{WHAT_CAN_GO_WRONG}} |
| Required Decision | {{WHAT_MUST_BE_DECIDED}} |
| Suggested Resolution | {{OPTIONAL_SUGGESTION}} |
| Owner | {{OWNER}} |
| Status | OPEN / RESOLVED / REJECTED_WITH_REASON |

---

# Appendix D — Minimal PRD Variant

For small features, the following sections remain mandatory and must not be removed:

1. Metadata and approver.
2. Problem/evidence.
3. Objective/outcome/metric.
4. Scope/non-goal.
5. Actors/permission intent.
6. Canonical business rules/state.
7. Feature requirements and acceptance criteria.
8. Negative/failure/degraded behavior.
9. Security/privacy/AI assessment.
10. Dependency/risk/open items.
11. UAT/release gate.
12. Traceability and FSD handoff manifest.

Other sections may be marked `N/A — reason`, not deleted without a trace.
