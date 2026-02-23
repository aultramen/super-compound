---
name: writing-plans
description: "Use when you have requirements or a spec for a multi-step task. Creates implementation plans with configurable depth before any code is written. Optionally generates machine-parseable tasks.json for automated progress tracking."
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

## Task-Sizing Discipline

**The #1 rule:** Each task must be completable in one focused session (one AI context window).

### Right-Sized Tasks (DO)

| Example | Why It Works |
|---------|-------------|
| "Add a database column and migration" | One schema change, verifiable |
| "Add a UI component to an existing page" | One visual change, verifiable in browser |
| "Update a server action with new logic" | One endpoint, verifiable with test |
| "Add a filter dropdown to a list" | One interaction, verifiable in browser |
| "Create a validation middleware" | One concern, testable in isolation |

### Too-Big Tasks (SPLIT THESE)

| Too Big | Split Into |
|---------|-----------|
| "Build the entire dashboard" | Schema → queries → UI components → filters → layout |
| "Add authentication" | Schema → middleware → login UI → session handling → guards |
| "Refactor the API" | One story per endpoint or pattern |
| "Add notification system" | DB table → service → bell icon → dropdown → mark-as-read → preferences |

### Sizing Rules

1. **2-3 sentence test:** If you cannot describe the change in 2-3 sentences, it is too big — split it
2. **Single concern:** Each task should modify ONE layer (DB, backend, or frontend) — not all three
3. **Dependency order:** Schema → backend logic → API → frontend UI → integration tests
4. **Independent verification:** Each task must be independently verifiable (not "verify after task 5")
5. **Time estimate:** If a task feels like >2 hours of work, split it

### Auto-Splitting Guidance

When a requirement is too broad, split using this pattern:

```
Original: "Add [complex feature]"
Split:
  1. DB/Schema changes + migration
  2. Backend service/logic
  3. API endpoint/route
  4. UI component (minimal)
  5. UI interaction + validation
  6. Integration test
```

## Remember

- Exact file paths always
- Complete code in plan (not "add validation here")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- Don't skip the depth selection — ask the user
- Reference `docs/solutions/` learnings when relevant
- Read `docs/progress.md` Codebase Patterns before planning

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
- **prd-generator** — Creates the product spec this skill turns into a technical plan

**This skill feeds into:**
- **executing-plans** — Executes the plan task by task
- **test-driven-development** — Each task follows TDD cycle
- **ui-ux-pro-max** — Design system generation for frontend plans

**Pre-flight skills (invoked conditionally):**
- **compatibility-check** — When new dependencies introduced
- **threat-modeling** — When auth/data/API features involved
- **data-privacy** — When PII processing involved

---

## Optional: Machine-Parseable Tasks (tasks.json)

For projects needing automated progress tracking in addition to a Markdown plan, create a `tasks.json` alongside the plan document.

**Use when:**
- Multi-session feature with many stories (automated tracking helps)
- Autonomous execution pipeline (machine-readable required)
- Team handoff where structured format reduces ambiguity
- Single developer with small feature → **skip** (Markdown alone is enough)

**Save to:** `docs/tasks/tasks-<feature>.json`

### Format

```json
{
  "project": "[Project Name]",
  "feature": "[Feature Name]",
  "branch": "[git branch name]",
  "description": "[Brief feature description]",
  "created": "YYYY-MM-DD",
  "stories": [
    {
      "id": "US-001",
      "title": "[Short descriptive title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Specific verifiable criterion",
        "Typecheck/lint passes"
      ],
      "priority": 1,
      "status": "pending",
      "notes": ""
    }
  ]
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently being worked on |
| `done` | Completed and verified |
| `blocked` | Cannot proceed (see notes) |
| `skipped` | Intentionally skipped (see notes) |

### Creating tasks.json from a PRD

If a PRD exists (`docs/prd/prd-<feature>.md`):
1. Each PRD user story → one JSON story entry
2. PRD acceptance criteria → `acceptanceCriteria` array
3. Add `"Typecheck/lint passes"` to every story
4. Add `"Verify in browser"` to UI stories
5. Set priority by dependency order (schema → backend → frontend)
6. Set all statuses to `"pending"`

### Acceptance Criteria Quality

✅ **Good (Verifiable):**
- `"Add 'status' column to tasks table with default 'pending'"`
- `"Filter dropdown has options: All, Active, Completed"`

❌ **Bad (Vague — NEVER use):**
- `"Works correctly"`
- `"Good UX"`

### Tracking Progress

1. Set current story to `"in_progress"`
2. Only set to `"done"` after ALL acceptance criteria verified
3. When all stories are `"done"` — feature is complete
4. Archive: move to `docs/archive/YYYY-MM-DD-<feature>/tasks.json`
