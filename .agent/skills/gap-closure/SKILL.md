---
name: gap-closure
description: "When verification finds gaps — creates targeted fix plans instead of full replanning. Focuses effort on what's missing, not what's already done."
---

# Gap Closure

## Overview

When verification reveals that completed work has gaps — missing features, broken wiring, failing tests — don't start over. Create targeted fix plans that address only the gaps.

**Announce:** "I'm using the gap-closure skill to create targeted fixes for the identified gaps."

## When to Activate

This skill activates when:
- `verification-before-completion` reports Goal-Backward gaps
- Code review finds P1/P2 issues
- Integration checking finds broken wiring
- Manual testing reveals missing functionality

## The Gap Closure Process

### Step 1: Parse Gaps

From the verification report, extract specific gap items:

```
For EACH gap:
  → What's missing or broken? (specific description)
  → What category? (truth / artifact / wiring)
  → What severity? (critical / important / minor)
  → What's the root cause? (missing task / incorrect implementation / missing wiring)
```

### Step 2: Cluster Related Gaps

Group gaps that share:
- Same component or file
- Same root cause
- Same verification dimension

```markdown
## Gap Clusters

### Cluster 1: [Component/Area]
- Gap: [description]
- Gap: [description]
- Root cause: [shared reason]

### Cluster 2: [Component/Area]
- Gap: [description]
- Root cause: [reason]
```

### Step 3: Generate Fix Plan

For each cluster, create a focused fix plan:

```markdown
## Gap Closure Plan

**Source:** [verification report / review / manual test]
**Type:** gap_closure

### Fix Tasks

- [ ] **Fix 1:** [specific action]
  - Files: [files to modify]
  - Verify: [how to confirm fix]

- [ ] **Fix 2:** [specific action]
  - Files: [files to modify]
  - Verify: [how to confirm fix]

### Out of Scope
- [Things that are NOT gaps — new features, enhancements]
```

### Step 4: Execute with Minimal Overhead

Gap closure plans skip:
- ❌ Brainstorming (problem is already understood)
- ❌ Full research (we already built the feature)
- ❌ Architecture decisions (architecture is already set)

Gap closure plans keep:
- ✅ TDD (write test first → fix → verify)
- ✅ Verification (re-run original verification after fixes)
- ✅ State updates (track in STATE.md)

### Step 5: Re-Verify

After all fixes are applied:

```
1. Re-run the ORIGINAL verification that found the gaps
2. Confirm all gaps are now closed
3. Check for regressions (fixes didn't break working features)
4. If new gaps found → max 2 more closure iterations
```

## Scope Discipline

| Allowed | Not Allowed |
|---------|-------------|
| Fix identified gaps | Add new features |
| Correct broken wiring | Refactor architecture |
| Add missing tests | Improve existing tests |
| Fix failing verification | Enhance passing features |

**If user requests enhancements during gap closure:**
> "That's an enhancement, not a gap closure. Let's finish closing these gaps first, then address enhancements separately."

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Gaps only** | Fix what's broken/missing, nothing more |
| **Cluster first** | Group related gaps to fix efficiently |
| **Skip overhead** | No brainstorming or research for gaps |
| **Re-verify always** | Confirm gaps are actually closed |
| **Max 2 re-iterations** | Prevent infinite gap-closure loops |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "While I'm here, let me also improve..." | That's scope creep, not gap closure |
| "Let me rewrite this component" | Fix the specific gap, don't rewrite |
| "No need to re-verify" | Always re-verify after closure |
| "Start from scratch" | Gap closure, not full replanning |

## Integration

**This skill is triggered by:**
- **verification-before-completion** — Goal-backward verification finds truth/artifact/wiring gaps
- **code-review** — P1/P2 findings need closure
- **integration-checking** — Cross-component wiring gaps

**This skill uses:**
- **executing-plans** — Execute fix tasks
- **test-driven-development** — Write failing test → fix → pass
- **verification-before-completion** — Re-verify after fixes
