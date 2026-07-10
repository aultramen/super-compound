---
name: context7-docs
description: "Use when you need up-to-date library/API documentation, code examples, version-specific guides, or framework conventions. Wraps the Context7 MCP tools with a clear usage pattern and fallback strategy."
---

# Context7 Docs

## Overview

Use Context7 for current, version-specific library and framework documentation rather than relying on stale API memory.

**Announce:** "I'm using the context7-docs skill to fetch up-to-date documentation."

Logical capabilities (the host may expose them under a namespaced tool name):

- `resolve-library-id` finds the Context7 library ID.
- `query-docs` retrieves documentation and code examples.

## Reference Router

- Decide whether the request is a Context7 case: [when to use](references/when-to-use.md)
- Resolve the library and make a focused query: [usage pattern](references/usage-pattern.md)
- Handle missing libraries, limits, and unavailable tools: [fallback](references/fallback.md)
- See concise invocation forms: [examples](references/examples.md)
- Exclude project logic, private libraries, and generic concepts: [exclusions](references/exclusions.md)

Load usage only for an applicable library question. Load fallback only after the primary attempt fails.

## Mandatory Gates

- **Applicability gate:** Use Context7 for public library/API docs, version-specific examples, framework setup, integrations, conventions, and compatibility information. Search the repository instead for project-specific logic or configuration.
- **Search-before-missing gate:** Do not claim documentation or a library is missing before retrieval. If the exact library ID is known, use the host-exposed `query-docs` capability directly. Otherwise use `resolve-library-id`, select by name, description, and snippet relevance, then query the resolved ID.
- **Query gate:** Include the exact task, API surface, and version when known. Retrieve only the documentation needed for the decision; do not flood context with broad library pages.
- **Evidence gate:** Distinguish retrieved documentation from inference. Preserve the library ID, version context, and the relevant source-supported conclusion in the answer or plan.
- **Fallback gate:** On error, empty result, rate limit, or no library match, fall back in order to official documentation, targeted official-site web search, then training knowledge with an explicit outdatedness caveat. Announce the fallback and do not retry a session limit more than once.

## Integration

Invoked by `sc-research.md`, `writing-plans`, `compatibility-check`, and `architecture-enforcement`. Pair with `compatibility-check` for version conflicts and `systematic-debugging` for suspected API misuse.
