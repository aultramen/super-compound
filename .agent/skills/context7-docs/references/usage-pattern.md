## Usage Pattern

### Step 1: Resolve Library ID

```
Capability: resolve-library-id
  libraryName: "[library name]"
  query: "[your specific question or task]"
```

Pick the most relevant result based on name match, description, and snippet count.

### Step 2: Query Documentation

```
Capability: query-docs
  libraryId: "[resolved ID from Step 1]"
  query: "[specific question or task]"
```

> **Tip — Skip Step 1**: If you already know the library ID (e.g., `/vercel/next.js`, `/prisma/prisma`), call `query-docs` directly.

> **Tip — Version-specific**: Include the installed major in your query: `"<library> <major> <topic>"` — Context7 will match the correct version.

Use the namespaced tool name actually exposed by the current host; the logical
capability names above are portable across MCP clients.

---
