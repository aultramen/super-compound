---
name: context-engineering
description: "When managing AI context budget — selective loading, history digest, and fresh context recommendations. Ensures AI doesn't waste context on irrelevant information."
---

# Context Engineering

## Overview

AI context is a scarce resource. Loading irrelevant files wastes context that should be used for actual work. This skill defines how to strategically manage what gets loaded into context and when.

**Announce:** "I'm applying context engineering to optimize what we load."

## Core Principles

### 1. Context Budget

Every work session has a finite context window. Allocate it strategically:

| Activity | Context Budget | What to Load |
|----------|---------------|--------------|
| Planning | ~40% for research, ~40% for plan creation, ~20% reserve | Requirements, brainstorms, codebase docs |
| Execution | ~60% for implementation, ~25% for testing, ~15% reserve | Plan, target files, reference files |
| Debugging | ~30% for investigation, ~50% for analysis, ~20% for fix | Error context, related files, test files |
| Review | ~70% for code reading, ~30% for feedback | Changed files, tests, requirements |

### 2. Selective Loading

**Load by relevance to current task, not by existence:**

```
DO load:
  → Files directly referenced in the current task
  → Files that will be modified
  → Closely related files (imports, interfaces)
  → Test files for modified code

DO NOT load:
  → Entire directory listings "just to understand"
  → Files from unrelated features
  → All tests when only fixing one
  → Full history when a summary suffices
```

### 3. History Digest Pattern

When resuming work or when context is filling up:

```
Instead of: Loading full conversation history
Do this:    
  1. Read STATE.md (compact state summary)
  2. Read .continue-here.md (if exists)
  3. Read relevant plan/brainstorm document
  4. Load specific files needed for CURRENT step
```

### 4. Fresh Context Principle

Know when to recommend clearing context:

| Signal | Action |
|--------|--------|
| Context feels slow/degraded | Suggest `/pause` → start new session → `/resume` |
| Switching to unrelated task | Suggest `/pause` current → new session → different work |
| Deep debugging with many hypotheses | Suggest `/pause` → fresh debug session with only relevant files |
| After completing a major feature | Suggest `/pause` → fresh session for review |

## Loading Strategies by Task Type

### New Feature Development

```
1. Load: requirements/plan document
2. Load: architecture docs (if exist)
3. Load: target files to modify
4. Load: reference files for patterns
5. Do NOT load: unrelated feature code
```

### Bug Fix

```
1. Load: error message/stack trace
2. Load: file(s) mentioned in error
3. Load: relevant test file(s)
4. Load: related config files
5. Do NOT load: entire test suite
```

### Code Review

```
1. Load: changed files (git diff)
2. Load: related test files
3. Load: plan/requirements for context
4. Do NOT load: unchanged files for "background"
```

### Refactoring

```
1. Load: files to refactor
2. Load: all importers of those files (find references)
3. Load: test files for refactored code
4. Do NOT load: unrelated modules
```

## Context Optimization Techniques

### Summarize Before Loading

When a document is large but only partially relevant:

```
DO: Read and summarize relevant sections, then work from summary
DO NOT: Load the entire document into context
```

### Incremental Loading

When exploring unfamiliar code:

```
1. Start with file outlines (list functions/classes)
2. Load only relevant functions
3. Follow imports only when needed
4. Stop loading when you have enough context to work
```

### Context Checkpoints

At natural breakpoints during execution:

```
1. Have I loaded files I'm not using? → Mentally deprioritize them
2. Am I about to load a large file? → Check if I need all of it
3. Is the current context working well? → Don't add more
4. Am I struggling to recall earlier context? → Consider /pause + /resume
```

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Load what you need** | Not what might be useful |
| **Summary first** | Read summaries before full documents |
| **Fresh > stale** | New context session > degraded old session |
| **STATE.md is your anchor** | Always start from state, not from scratch |
| **Less is more** | Smaller focused context > large unfocused context |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "Let me read all the files to understand" | Load selectively based on current task |
| "I'll just keep everything loaded" | Context degradation is real |
| "I need to re-read the whole conversation" | Use STATE.md + .continue-here.md |
| "Loading more files will help" | More noise rarely helps |

## Integration

**This skill informs:**
- **executing-plans** — What to load per task
- **systematic-debugging** — What to load per investigation
- **brainstorming** — What project context to load

**Pairs with:**
- **state-management** — STATE.md as compact context anchor
- **pause/resume workflows** — Fresh context mechanism
