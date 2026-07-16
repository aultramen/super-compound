---
name: agentic-delivery
description: "Use when following the Super Compound BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION delivery path, artifact traceability, FSD authority, optional ADR handling, zero context bloat issue slicing, or OPEN-* stop conditions."
---

# Agentic Delivery

## Purpose

Keep delivery artifact-driven, traceable, and light on context. The canonical path is:

```text
BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION
```

Announce: "I'm using the agentic-delivery skill to follow the BRD -> PRD -> FSD -> GOAL delivery path."

## Reference Router

Load only the branch required by the active stage:

- Artifact creation, template paths, outputs, and consumers: [templates and outputs](references/templates-and-outputs.md)
- FSD authority, precedence, and conditional ADR policy: [authority and ADR](references/authority-and-adr.md)
- Cross-artifact ID syntax: [qualified references](references/qualified-references.md)
- Context loading, issue-pointer fields, statuses, and canonical skeleton: [context and issue pointers](references/context-and-issue-pointers.md)
- Missing authority, conflicts, or unavailable prerequisites: [OPEN stop conditions](references/open-stop-conditions.md)
- Stage-to-workflow handoff: [workflow integration](references/workflow-integration.md)
- UI-bearing profiles, readiness, contract boundaries, first-slice proof, scale-out, and compatibility: [UI contract readiness](references/ui-contract-readiness.md)

Do not preload templates or downstream procedures before their artifact or stage is active.

## Mandatory Gates

- **Authority gate:** User/system/developer instructions lead; approved BRD owns business intent, PRD owns observable product behavior, FSD authority owns implementation contracts, and linked `ACCEPTED` ADRs own only delegated decisions. Repository conventions fill ordinary gaps. Never invent schema, API, authorization, state, workflow, role, product behavior, or architecture outside that authority.
- **ADR gate:** Prefer approved FSD `TDEC-*` for local decisions. Link an ADR only when conditional criteria apply; it must be `ACCEPTED`, current, referenced by the FSD, and translated into implementation obligations before dependent goals become ready.
- **Reference gate:** Use qualified cross-artifact IDs. Bare IDs are allowed only when ambiguity is impossible within one artifact.
- **Issue-pointer gate:** Goal issues are pointers, not specifications. Use the canonical `.agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md`; never restate it or copy BRD, PRD, FSD, or ADR prose. During `/sc-work`, load only referenced sections and relevant repository files.
- **OPEN-* gate:** Stop and report `OPEN-xxx` instead of inventing when authority conflicts or is missing, an ADR is invalid, required behavior is unspecified, architecture contradicts the FSD, access is unavailable, or mandatory risk obligations cannot be met. Include the missing decision, impacted qualified refs, reason, owner/gate, approved fallback, and `Status: OPEN`.
- **Verification gate:** Execute only an approved goal and its referenced tests; retain implementation and verification evidence before advancing status.
- **UI delivery gate:** For UI-bearing scope, apply the routed experience and contract readiness gates. Scale-out requires a `VALIDATED` baseline and a verified real first slice; mock-only evidence is not integration proof.

## Related Skills

Use `brainstorming`, `prd-generator`, `writing-plans`, `issue-workflow`, `context-engineering`, `executing-plans`, `plan-verification`, and `verification-before-completion` at their routed stages.
