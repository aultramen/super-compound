---
name: threat-modeling
description: "Use when designing features that handle sensitive data, authentication, or external integrations and need STRIDE, attack-tree, or trust-boundary analysis."
---

# Threat Modeling

## Overview

Identify threats before they become vulnerabilities. Model assets, actors, data flows, and trust boundaries before writing sensitive, authentication, or integration code.

**Announce:** "I'm using the threat-modeling skill to identify security threats in this design."

**Core principle:** Model first, code second.

## Modes

| Mode | Trigger | Scope | Output |
|---|---|---|---|
| Pre-flight | Automatically during `/sc-plan` when auth/data/API features are involved | Single feature | Threat section in plan document |
| Full Model | Via `/sc-audit security`, directly, or by `security-audit` | Component or system | Standalone threat model document |
| Incident Response | After security incident | Attack vector analysis | Updated threat model and new mitigations |

## Reference Router

- Every model: apply [STRIDE](references/stride.md)
- Complex multi-step or high-risk attacker goal: add [attack trees](references/attack-trees.md)
- Data crossing users, services, stores, or vendors: map [trust boundaries](references/trust-boundaries.md)
- Standalone artifact required: use the [document template](references/document-template.md)
- End-to-end execution or handoff: follow [the process](references/process.md)
- Scope-denial or defer-until-launch pressure: consult [red flags](references/red-flags.md)

Load STRIDE plus only the other branches the scoped system needs. Attack trees remain optional for high-risk components.

## Mandatory Gates

1. **Scope gate:** Name the feature or system, protected assets, actors, entry points, dependencies, and attacker goals.
2. **Boundary gate:** Draw data flows and trust boundaries. At each crossing, examine validation, encryption, authentication, authorization, and response validation.
3. **STRIDE gate:** Walk all six STRIDE categories for every applicable component and flow. Record threat, likelihood, impact, current mitigation, residual risk, and status.
4. **STOP gate:** Do not approve implementation while an authentication or data trust boundary is undefined, or an open risk lacks an owner, treatment, and explicit acceptance or planned mitigation.
5. **Requirement gate:** Convert open risks into testable security requirements and feed them into the PRD when product behavior changes or the FSD when implementation controls change.
6. **Evidence gate:** Save the model when a standalone artifact is required, cite concrete architecture or code evidence, distinguish mitigated from OPEN threats, and record residual risk and the verification method.

For incident response, reconstruct the realized attack path, update the model, and add controls and regression evidence; do not overwrite the pre-incident record.

## Integration

Used by `writing-plans` and `/sc-audit security`. Pair with `security-audit` to verify mitigations, `secure-code-patterns` to implement them, and `knowledge-compounding` to retain reusable threat patterns.
