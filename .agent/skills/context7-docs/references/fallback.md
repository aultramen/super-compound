## Fallback Strategy

If Context7 is unavailable or limit is reached:

```
FALLBACK ORDER:
1. Context7 MCP (primary — always try first)
   ↓ if unavailable / rate-limited / library not found
2. Host capability that reads the library's official documentation URL
   ↓ if direct official documentation is not accessible
3. Host search capability restricted to the library's official site
   ↓ as last resort
4. Training knowledge (with explicit caveat that it may be outdated)
```

**Detecting limit/unavailability:**
- Tool returns error or empty result → activate fallback immediately
- Library not found in Context7 → try official docs URL directly
- Do not retry Context7 more than once per session if limit is hit

**When falling back, always announce:**
> "Context7 not available for this library — falling back to [official docs / official-site search]."

---
