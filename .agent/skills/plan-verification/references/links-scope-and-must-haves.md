### 4. Key Links

For key component connections:

- Are API endpoints that frontend calls specified in the FSD?
- Are database changes specified before code that uses them?
- Are shared types or interfaces specified before modules that import them?
- If missing, flag: `Key link missing: <A> depends on <B> which is not in the plan`.

### 5. Scope Sanity

Evaluate overall scope:

- Is the plan achievable in the likely timeframe?
- Are there more than 20 tasks that need phase splitting?
- Are there tasks that are separate features?
- If concerning, flag: `Scope concern: <description>`.

### 6. Must-Haves Derivation

From the goal, derive what must exist:

- Working endpoint, page, workflow, or capability
- Error handling for critical paths
- User-facing validation when relevant
- If missing, flag: `Must-have missing: <description>`.
