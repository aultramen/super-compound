# Goal-Backward Verification

## Summary

Load this reference when verifying a feature, workflow, plan, or gap-closure
outcome. A single localized task uses the same full-coverage completion rule;
its evidence checklist may be shorter.

## Process

1. **State the goal** as a user-visible outcome, not an implementation task.
2. **Enumerate every acceptance criterion and requirement** from the authoritative
   request/specification and derive the observable truths needed to prove them.
   A summary of truths never limits the number of criteria verified.
3. **List required artifacts** with exact paths or outputs.
4. **List required wiring** between callers, dependencies, layers, data, events, auth, and configuration.
5. **Trace each criterion, truth, artifact, and connection** to actual outcome
   assertions and fresh evidence; include the combined outcome for multi-goal work.
6. **Record gaps** whenever a truth cannot be traced, an artifact is absent or wrong, or wiring is unproven.

Do not infer integration from existence. When wiring spans components, run the separate `integration-checking` skill and attach its evidence.

## Report

```markdown
## Goal-Backward Verification

**Goal:** [user-visible outcome]

### Observable Truths
| Requirement / AC | Truth | Status | Evidence |
|---|---|---|---|
| [qualified ref] | [truth] | Verified / Gap | [command, output, inspection] |

### Required Artifacts
| Path/output | Exists | Correct | Evidence |
|---|---|---|---|
| [artifact] | Yes/No | Yes/No/Unclear | [evidence] |

### Required Wiring
| Connection | Status | Evidence |
|---|---|---|
| [A -> B] | Verified / Gap | [integration evidence] |

### Gaps
| Gap | Type | Severity | Next action |
|---|---|---|---|
| [gap] | truth/artifact/wiring | critical/important/minor | [action] |
```

Tests passing does not automatically prove every requirement. Re-read the source
plan/specification, map every requirement to evidence, and route gaps to
`gap-closure`. Retain this detailed report by locator and include the required
**Evidence of Completion** summary from [Claim Evidence](claim-evidence.md).
