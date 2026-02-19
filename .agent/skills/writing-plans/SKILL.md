---
name: writing-plans
description: "Use when you have requirements or a spec for a multi-step task. Creates implementation plans with configurable depth before any code is written."
---

# Writing Plans

## Overview

Write implementation plans that are clear enough for any engineer — or AI agent — to follow. Plans break work into bite-sized tasks with exact file paths, complete code, and verification steps.

**Announce:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>-plan.md`

## Phase 0: Check for Brainstorm

Before starting, look for recent brainstorm documents:

```
docs/brainstorms/*.md  (within last 14 days, matching topic)
```

**If found:** Use brainstorm decisions as input, skip idea refinement.
**If not found:** Briefly confirm requirements with user before planning.

## Phase 1: Research

### 1.1 Local Research (Always)
- Review existing codebase for similar patterns
- Check project documentation and SUPER-COMPOUND.md config
- Search `docs/solutions/` for related past solutions

### 1.2 Research Decision
Based on findings, decide if external research is needed:

| Signal | Action |
|--------|--------|
| Strong local patterns, clear guidance | Skip external research |
| High-risk topic (security, payments, APIs) | Always research |
| Unfamiliar territory, new technology | Research |

Announce the decision: "Your codebase has solid patterns for this. Proceeding without external research." or "This involves [topic], so I'll research best practices first."

### 1.3 Compatibility Pre-flight

If the plan introduces **new dependencies or major version changes**:

1. **Invoke** the `compatibility-check` skill in **pre-flight mode**
2. **Scan** current dependency files for existing versions
3. **Web search** for compatibility data on new dependencies
4. **Report** findings in a `## Compatibility Check` section of the plan
5. **If blockers found** — warn user and suggest alternatives before proceeding

**Skip if:** No new dependencies are introduced, or changes are internal-only.

### 1.4 UI/UX Design System (if frontend)

If the plan involves creating or modifying frontend UI:

1. **Check** for existing `design-system/MASTER.md` — reuse if available
2. **Generate** new design system if none exists:
   ```bash
   python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry>" --design-system -p "<Project>"
   ```
3. **Include** design system recommendations in plan document
4. **Add** pre-delivery checklist items as acceptance criteria

**Skip if:** Plan is backend-only or has no UI changes.

### 1.5 Privacy Pre-flight (if PII handling)

If the plan involves processing personal data (PII):

1. **Invoke** the `data-privacy` skill in **pre-flight mode**
2. **Check** if consent mechanism is needed
3. **Verify** data minimization (collect only what's needed)
4. **Add** privacy requirements to plan acceptance criteria
5. **Include** `## Privacy Considerations` section in plan if applicable

**Skip if:** No personal data processing involved.

## Phase 2: Choose Depth Level

### 📄 QUICK (Simple tasks)

**Best for:** Small bugs, minor improvements, clear features

```markdown
---
title: [Title]
type: [feat|fix|refactor]
date: YYYY-MM-DD
depth: quick
---

# [Title]

[Brief description]

## Acceptance Criteria
- [ ] Requirement 1
- [ ] Requirement 2

## Tasks
- [ ] Task 1
- [ ] Task 2

## Context
[Any critical information]
```

### 📋 STANDARD (Most features)

**Best for:** Medium features, complex bugs, team collaboration

Includes everything from QUICK plus:
- Detailed background and motivation
- Technical considerations
- Dependencies and risks
- File paths and code snippets

### 📚 COMPREHENSIVE (Major features)

**Best for:** Major features, architectural changes, complex integrations

Includes everything from STANDARD plus:
- Phased implementation plan
- Alternative approaches considered
- Non-functional requirements
- Risk mitigation strategies
- Documentation plan

## Phase 3: Write the Plan

### Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ext`
- Modify: `exact/path/to/existing.ext`
- Test: `tests/exact/path/to/test.ext`

**Step 1: Write the failing test**
[Complete test code]

**Step 2: Run test to verify it fails**
Run: `[test command] [specific test]`
Expected: FAIL with "[expected message]"

**Step 3: Write minimal implementation**
[Complete implementation code]

**Step 4: Run test to verify it passes**
Run: `[test command] [specific test]`
Expected: PASS

**Step 5: Commit**
git add [files]
git commit -m "feat: [description]"
```

### Plan Document Header

Every plan MUST start with:

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies]
**Depth:** [quick|standard|comprehensive]
**TDD Mode:** [strict|balanced|relaxed]

---
```

## Phase 4: Handoff

After saving the plan, present execution options:

**"Plan saved to `docs/plans/<filename>.md`. How would you like to proceed?"**

1. **Execute sequentially** — Work through tasks one at a time with checkpoints
2. **Execute with swarm** — Parallel execution with multiple agents (for independent tasks)
3. **Review and refine** — Improve the plan document
4. **Done for now** — Come back later

## Remember

- Exact file paths always
- Complete code in plan (not "add validation here")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- Don't skip the depth selection — ask the user
- Reference `docs/solutions/` learnings when relevant

## Red Flags

| Thought | Reality |
|---------|---------|
| "The plan is clear in my head" | Write it down. Memory is unreliable. |
| "Too detailed" | Details prevent rework. Be specific. |
| "Skip TDD for this plan" | Unless prototyping, always include tests. |
| "One big task is fine" | 2-5 minute tasks. Break it down. |

## Integration

**Prerequisite skills:**
- **brainstorming** — Creates the design this skill plans from

**This skill feeds into:**
- **executing-plans** — Executes the plan task by task
- **test-driven-development** — Each task follows TDD cycle
- **ui-ux-pro-max** — Design system generation for frontend plans

**Pre-flight skills (invoked conditionally):**
- **compatibility-check** — When new dependencies introduced
- **threat-modeling** — When auth/data/API features involved
- **data-privacy** — When PII processing involved
