---
name: prd-generator
description: "Generate a structured Product Requirements Document (PRD) with clarifying questions. Use when planning a feature, starting a new project, or turning a vague idea into a clear specification. Sits between brainstorming and planning."
---

# PRD Generator

## Overview

Create detailed Product Requirements Documents that sit between brainstorming (exploration) and planning (execution). A PRD answers "What exactly will we build?" — clearer than a brainstorm, less technical than a plan.

**Announce:** "I'm using the prd-generator skill to create a structured PRD."

**Save to:** `docs/prd/prd-<feature-name>.md`

## The Process

### Step 1: Check for Existing Context

Before creating a new PRD, check for related work:

```
docs/brainstorms/*.md    → recent brainstorm to build on
docs/prd/*.md            → existing PRD on this topic
docs/progress.md         → Codebase Patterns for context
```

**If brainstorm found:** Use decisions as input, skip clarifying questions for already-decided aspects.
**If PRD exists:** Ask user whether to revise existing PRD or create new one.

### Step 2: Clarifying Questions

Ask 3-5 essential questions using **lettered options** for fast responses.

**Focus areas:**
- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?

**Format:**

```
1. What is the primary goal of this feature?
   A. Improve user experience
   B. Increase performance/efficiency
   C. Add new capability
   D. Other: [please specify]

2. Who is the target user?
   A. End users
   B. Admin users
   C. All users
   D. Developers/API consumers

3. What is the initial scope?
   A. Minimal viable version (core only)
   B. Full-featured implementation
   C. Backend/API only
   D. Frontend/UI only
```

Users can respond with "1A, 2C, 3B" for quick iteration. Always include a "D. Other" option.

### Step 3: Generate PRD

**Required Sections:**

#### 1. Introduction/Overview
Brief description of the feature and the problem it solves.

#### 2. Goals
Specific, measurable objectives (bullet list).

#### 3. User Stories

Each story follows this template:

```markdown
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Specific verifiable criterion
- [ ] Another criterion
- [ ] Typecheck/lint passes
- [ ] [UI stories only] Verify in browser
```

**Story sizing rules:**
- Each story must be completable in one focused session
- If a story cannot be described in 2-3 sentences, split it
- Order by dependency: schema → backend → API → frontend

#### 4. Functional Requirements
Numbered list of specific functionalities:
- "FR-1: The system must allow users to..."
- "FR-2: When a user clicks X, the system must..."

Be explicit and unambiguous. Vague requirements ("works correctly") are not acceptable.

#### 5. Non-Goals (Out of Scope)
What this feature will NOT include. Critical for managing scope.

#### 6. Design Considerations (Optional)
- UI/UX requirements
- Mockups or wireframe references
- Existing components to reuse

#### 7. Technical Considerations (Optional)
- Known constraints or dependencies
- Integration points with existing systems
- Performance requirements

#### 8. Success Metrics
How success will be measured:
- "Reduce time to complete X by 50%"
- "Increase conversion rate by 10%"

#### 9. Open Questions
Remaining questions or areas needing clarification.

### Step 4: Validate with User

Present the PRD for review. Ask:
- "Does this capture what you want to build?"
- "Should any stories be added, removed, or split?"
- "Are the non-goals correct?"

### Step 5: Handoff

After user approves:

```
✓ PRD saved to docs/prd/prd-<feature-name>.md

What next?
1. Convert to implementation plan → run /plan
2. Review and refine the PRD
3. Done for now — return later
```

## Writing for Clarity

The PRD reader may be a junior developer or AI agent. Therefore:

- Be explicit and unambiguous
- Avoid jargon or explain it
- Provide enough detail to understand purpose and core logic
- Number requirements for easy reference
- Use concrete examples where helpful

## Story Sizing

Apply the same sizing discipline as `writing-plans`:

| Right-Sized | Too Big (Split) |
|-------------|----------------|
| "Add a database column and migration" | "Build the entire dashboard" |
| "Add a UI component to an existing page" | "Add authentication" |
| "Update a server action with new logic" | "Refactor the API" |

## Red Flags

| Thought | Reality |
|---------|---------|
| "Skip the questions, I know what they want" | Assumptions cause rework. Ask. |
| "One big story is fine" | Small stories = reliable AI execution |
| "Acceptance criteria: works correctly" | Must be specific and verifiable |
| "Non-goals aren't important" | Undefined scope always expands |

## Integration

**Prerequisite skills:**
- **brainstorming** — Optional: provides decisions as input

**This skill feeds into:**
- **writing-plans** — Creates the implementation plan from this PRD
- **plan-verification** — Validates plan coverage against PRD requirements

**Related workflows:**
- `/prd` — Workflow that invokes this skill
- `/brainstorm` → `/prd` → `/plan` — Full specification pipeline
