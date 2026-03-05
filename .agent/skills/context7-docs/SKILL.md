---
name: context7-docs
description: "Use when you need up-to-date library/API documentation, code examples, version-specific guides, or framework conventions. Wraps the Context7 MCP tools with a clear usage pattern and fallback strategy."
---

# Context7 Docs

## Overview

Context7 MCP pulls **up-to-date, version-specific documentation and code examples** directly from the source and injects them into your context. It eliminates hallucinated APIs, outdated code samples, and generic answers based on stale training data.

**Announce:** "I'm using the context7-docs skill to fetch up-to-date documentation."

**MCP Tools available:**
- `mcp_context7_resolve-library-id` — Find the Context7 library ID for a given library name
- `mcp_context7_query-docs` — Retrieve documentation/code examples for a specific library

---

## When to Use

Invoke this skill whenever you need:

| Scenario | Example |
|----------|---------|
| Library API documentation | "How does Prisma handle nested writes?" |
| Version-specific code examples | "Next.js 14 middleware syntax" |
| Framework setup/configuration | "Configure Vite with React + TypeScript" |
| Integration patterns | "Supabase auth with Next.js App Router" |
| Package compatibility info | "Drizzle ORM version requirements" |

**Triggers in other skills:**
- `research.md` — Step 3 External Research: library/framework involved
- `writing-plans` — Phase 1.2 Research Decision: high-risk API/library topic
- `compatibility-check` — Pre-flight: checking version docs for new dependencies
- `architecture-enforcement` — Looking up framework-specific conventions

---

## Usage Pattern

### Step 1: Resolve Library ID

```
Call: mcp_context7_resolve-library-id
  libraryName: "[library name]"
  query: "[your specific question or task]"
```

Pick the most relevant result based on name match, description, and snippet count.

### Step 2: Query Documentation

```
Call: mcp_context7_query-docs
  libraryId: "[resolved ID from Step 1]"
  query: "[specific question or task]"
```

> **Tip — Skip Step 1**: If you already know the library ID (e.g., `/vercel/next.js`, `/prisma/prisma`), call `query-docs` directly.

> **Tip — Version-specific**: Include version in your query: `"Next.js 14 app router middleware"` — Context7 will match the correct version.

---

## Fallback Strategy

If Context7 is unavailable or limit is reached:

```
FALLBACK ORDER:
1. Context7 MCP (primary — always try first)
   ↓ if unavailable / rate-limited / library not found
2. Official documentation URL (read_url_content)
   ↓ if URL not accessible
3. Web search (search_web) — "site:docs.[library].com [query]"
   ↓ as last resort
4. Training knowledge (with explicit caveat that it may be outdated)
```

**Detecting limit/unavailability:**
- Tool returns error or empty result → activate fallback immediately
- Library not found in Context7 → try official docs URL directly
- Do not retry Context7 more than once per session if limit is hit

**When falling back, always announce:**
> "Context7 not available for this library — falling back to [web search / official docs]."

---

## Integration

**This skill is invoked by:**
- `research.md` workflow — Step 3: External research, before web search
- `writing-plans` skill — Phase 1.2 Research Decision (library/API topics)
- `compatibility-check` skill — Step 3: Pre-flight compatibility check
- `architecture-enforcement` skill — Framework convention lookup

**This skill pairs with:**
- `compatibility-check` — Context7 for docs, then compatibility-check for version conflict analysis
- `systematic-debugging` — Use Context7 to verify correct API usage when debugging library-related bugs

---

## Example Prompts

```txt
# With explicit trigger:
"Implement JWT refresh token rotation with better-auth. use context7"

# With library ID:
"Set up Drizzle ORM with PostgreSQL. use library /drizzle-team/drizzle-orm"

# Version-specific:
"React 19 concurrent features — use context7"
```

---

## Do Not Use Context7 When

- The question is about **project-specific business logic** (not a library)
- The library is **private/internal** (not in Context7's index)
- You only need **general programming concepts** (not library-specific)
- The question is about **configuration files specific to the project** (use codebase search instead)
