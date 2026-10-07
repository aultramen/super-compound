## Authority And Precedence

1. User/system/developer instructions.
2. Approved BRD for business objectives, policies, and business acceptance.
3. Approved PRD for user experience, observable product behavior, product rules, and acceptance criteria.
4. Approved FSD for technical implementation contracts, data/API/UI/job/security details, tests, goals, and execution boundaries.
5. Linked `ACCEPTED` ADRs only for delegated architecture decisions.
6. Repository conventions for ordinary choices not specified by the FSD.

For full-tier work, a coding agent must not invent schema, APIs, authorization,
state transitions, workflows, product behavior, roles, or architecture outside
the authorized FSD and linked accepted ADRs. For light-tier work, a concrete
user request or issue with acceptance and verification is sufficient authority;
reuse repository conventions for reversible internal choices without requiring
new BRD/PRD/FSD documents. Escalate only affected scope when a full-tier trigger
or material risk/authority change appears; see `workflow-integration.md`.

## ADR Policy

ADR is optional and conditional. Prefer embedded FSD `TDEC-*` records for project-local technical decisions.

Create or link an ADR only when the decision is cross-system, high-risk, costly to reverse, security/privacy-sensitive, platform-level, vendor-locking, recurring-cost material, or explicitly required by policy.

Linked ADR rules:

- Store linked ADRs under `docs/solutions/adr-####-<slug>.md`.
- Use the optional ADR template.
- The ADR must be `ACCEPTED`, not deprecated or superseded, before a dependent goal can be `ready-for-agent`.
- The FSD must set `adr_applicability: LINKED`, reference the ADR, and translate implementation obligations into FSD contracts.

When ADR is not required:

- Set `adr_applicability: NOT_REQUIRED` in the FSD.
- Capture material technical decisions in the FSD Technical Decision Register as approved `TDEC-*`.
