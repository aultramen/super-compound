# Goal-Backward Verification

Load this reference after completing a feature, workflow, plan, or gap-closure effort. A single localized task usually needs only the standard claim gate.

## Process

1. **State the goal** as a user-visible outcome, not an implementation task.
2. **Derive 3-7 observable truths** that must independently hold from the user's perspective.
3. **List required artifacts** with exact paths or outputs.
4. **List required wiring** between callers, dependencies, layers, data, events, auth, and configuration.
5. **Trace each truth, artifact, and connection** to implemented tasks and fresh evidence.
6. **Record gaps** whenever a truth cannot be traced, an artifact is absent or wrong, or wiring is unproven.

Do not infer integration from existence. When wiring spans components, run the separate `integration-checking` skill and attach its evidence.

## Report

```markdown
## Goal-Backward Verification

**Goal:** [user-visible outcome]

### Observable Truths
| Truth | Status | Evidence |
|---|---|---|
| [truth] | Verified / Gap | [command, output, inspection] |

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

Tests passing does not automatically prove every requirement. Re-read the source plan or specification, map every requirement to evidence, and route discovered gaps to `gap-closure` instead of claiming the goal is complete.
