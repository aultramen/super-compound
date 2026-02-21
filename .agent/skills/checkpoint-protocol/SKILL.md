---
name: checkpoint-protocol
description: "Use when human input, decision, or action is required before proceeding. Defines 7 checkpoint types for structured human-in-the-loop gates."
---

# Checkpoint Protocol

## Overview

Not everything can be automated. When human input, decisions, or actions are needed, use a structured checkpoint instead of ad-hoc questions. Checkpoints are formal pause points with clear context, options, and resumption paths.

**Announce:** "I'm using the checkpoint-protocol skill — this requires your input before proceeding."

## Checkpoint Types

### 1. `needs_info`

**When:** Missing information that cannot be inferred or researched.

```markdown
## ⓘ CHECKPOINT: Information Needed

**What I need:** [specific information]
**Why:** [how it affects the work]
**What I've tried:** [research/inference already attempted]

**Please provide:**
- [specific question 1]
- [specific question 2]
```

### 2. `needs_decision`

**When:** Multiple valid approaches exist and the choice impacts the outcome.

```markdown
## ⚖️ CHECKPOINT: Decision Required

**Context:** [what we're deciding and why it matters]

| Option | Pros | Cons |
|--------|------|------|
| A: [description] | [pros] | [cons] |
| B: [description] | [pros] | [cons] |
| C: [description] | [pros] | [cons] |

**My recommendation:** Option [X] because [reason]

**Please choose:** A, B, or C (or suggest alternative)
```

### 3. `needs_confirmation`

**When:** About to perform a destructive, irreversible, or high-impact action.

```markdown
## ⚠️ CHECKPOINT: Confirmation Required

**Action:** [what will happen]
**Impact:** [what changes, what could break]
**Reversible:** [yes/no — if yes, how]

**Proceed?** (yes/no)
```

### 4. `needs_testing`

**When:** Verification requires the user to test in their environment (browser, device, API, etc.).

```markdown
## 🧪 CHECKPOINT: Manual Testing Needed

**What to test:** [specific scenario]
**Steps:**
1. [step 1]
2. [step 2]
3. [step 3]

**Expected result:** [what should happen]

**Please report:** Does it work as expected? Any issues?
```

### 5. `needs_credentials`

**When:** API keys, tokens, service access, or secrets are required.

```markdown
## 🔑 CHECKPOINT: Credentials Needed

**Service:** [what service/API]
**What's needed:** [API key / token / connection string / etc.]
**Where to get it:** [URL or instructions]
**Where to put it:** [.env variable name, config file location]

**Security note:** Never paste secrets in chat. Add them to `.env` directly.
```

### 6. `needs_deployment_action`

**When:** The user must deploy, restart, configure infrastructure, or perform external actions.

```markdown
## 🚀 CHECKPOINT: Deployment Action Required

**Action needed:** [what the user must do]
**Why:** [why this can't be automated]
**Instructions:**
1. [step 1]
2. [step 2]

**After completing:** Let me know so I can continue with [next step]
```

### 7. `needs_review`

**When:** Code, design, or architecture requires human review before proceeding.

```markdown
## 👁️ CHECKPOINT: Review Required

**What to review:** [files/design/architecture]
**Key areas:** [what to focus on]
**Files:**
- [file 1] — [what changed]
- [file 2] — [what changed]

**After review:** Approve to continue, or provide feedback for revision
```

## When to Trigger Checkpoints

### Always Trigger

| Situation | Type |
|-----------|------|
| Deleting files or data | `needs_confirmation` |
| Database migrations (production) | `needs_confirmation` |
| Choosing between architectures | `needs_decision` |
| Missing environment variables | `needs_credentials` |
| UI/UX changes that affect users | `needs_review` |
| Deploying to production | `needs_deployment_action` |
| Missing business rules | `needs_info` |
| Browser/device-specific behavior | `needs_testing` |

### Never Trigger (Handle Autonomously)

| Situation | Action Instead |
|-----------|---------------|
| Choosing variable names | Follow conventions |
| Picking test values | Use sensible defaults |
| File organization | Follow architecture skill |
| Import ordering | Follow linter rules |
| Choosing between equivalent approaches | Pick one, note in STATE.md |

## Checkpoint Behavior Rules

1. **One checkpoint at a time** — Don't stack multiple checkpoints
2. **Context is mandatory** — Never ask bare questions; always provide context
3. **Options when possible** — Prefer `needs_decision` over `needs_info` when options exist
4. **Recommend first** — Lead with your recommendation, then ask
5. **State update** — Record the checkpoint in STATE.md (Blockers section)
6. **Resume cleanly** — After user responds, acknowledge and continue from exact position
7. **Don't over-checkpoint** — If you can make a reasonable choice, make it and note it in STATE.md Decisions

## After Checkpoint Resolution

```
1. ACKNOWLEDGE the user's input
2. UPDATE STATE.md — move from Blockers to Decisions Made (if decision)
3. CONTINUE from exact position before checkpoint
4. DON'T re-read or re-analyze already completed work
```

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Minimal interruption** | Only checkpoint when genuinely needed |
| **Maximum context** | Every checkpoint includes full context |
| **Always recommend** | Don't just ask — lead with your best option |
| **One at a time** | Sequential, never parallel checkpoints |
| **State-aware** | Every checkpoint updates STATE.md |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I'll just ask the user" | Use a formal checkpoint type, not a bare question |
| "Let me checkpoint every small decision" | Only checkpoint when you genuinely can't proceed |
| "I'll batch these questions" | One checkpoint at a time |
| "The user will figure out what I need" | Provide full context and options |

## Integration

**This skill is used by:**
- **executing-plans** — Checkpoint at decision points during execution
- **brainstorming** — Checkpoint for design decisions
- **systematic-debugging** — Checkpoint for user testing and credentials

**Pairs with:**
- **state-management** — Checkpoints trigger state updates
- **pause/resume workflows** — Checkpoints can trigger pause
- **verification-before-completion** — `needs_testing` for manual verification
