---
name: compatibility-check
description: "Use when introducing dependencies or auditing runtime support, peer conflicts, deprecations, vulnerability posture, and rollback risk."
---

# Compatibility Check

## Purpose

Prevent dependency and runtime surprises before they become build failures, production bugs, or security risks.

Announce: "I'm using the compatibility-check skill to validate tech stack compatibility."

## Modes

| Mode | Trigger | Scope | Output |
|---|---|---|---|
| Pre-flight | `/sc-plan` introduces dependencies, vendors, runtimes, containers, or major version changes | Proposed changes | Compatibility section in the plan |
| Audit | `/sc-audit compat` or explicit request | Current project stack | Read-only compatibility report |
| Debug support | A failure looks version-related | Suspect dependency pair | Root-cause note and fix options |

## Reference Router

Load only the active branch:

- Determine manifests, lockfiles, runtime declarations, platform constraints, provenance, and suspicious names: [inspection surface](references/inspection-surface.md)
- Proposed dependency, runtime, vendor, container, or major-version change: [pre-flight](references/preflight.md)
- Existing stack or codebase-wide compatibility review: [audit](references/audit.md)
- Select ecosystem-native checks: [commands](references/commands.md)
- Classify and present supported findings: [reporting](references/reporting.md)
- Counter upgrade and audit shortcuts: [red flags](references/red-flags.md)

Use `context7-docs` or current primary documentation for version-specific support. Load command and reporting references only when producing or verifying those outputs.

## Mandatory Gates

- **Mutation gate:** Audit mode is read-only. Caller boundary: inside `/sc-audit`, approval selects `/sc-plan`, `/sc-debug`, `/sc-work`, or `/sc-go`; transition to that owner before installing, upgrading, pinning, replacing, or editing configuration.
- **Inventory gate:** Read both manifests and lockfiles plus runtime, CI, container, and deployment declarations. Check direct and critical transitive dependencies, peer and optional-peer requirements, native extensions, platform limits, provenance, licenses, and install scripts as applicable.
- **Evidence gate:** Record current and proposed versions, exact manifest or lockfile evidence, supported runtime range, primary documentation, command output, vulnerability posture, and rollback path. Never infer support from “latest.”
- **Tool gate:** If a required tool is missing, report that limitation instead of inventing a result. Separate unverified areas from verified no-findings.
- **STOP gate:** Do not approve implementation with an unresolved P0 or P1, unsupported production runtime, incompatible peer requirement, active breakage, or missing rollback path. Propose supported alternatives first.
- **Verification gate:** Run only project-appropriate native checks, inspect breaking-change and deprecation notes, and verify the selected version pair in the project’s actual runtime and build path.

## Related Skills

Use `context7-docs` for version-specific documentation, `security-audit` for broader risk, `writing-plans` for pre-flight decisions, `systematic-debugging` for version failures, and `knowledge-compounding` for resolved compatibility patterns.
