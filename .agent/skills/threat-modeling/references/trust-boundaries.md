## Trust Boundary Analysis

Draw the system's own data flows and mark every point where the trust level
changes: client to application, application to data store, application to
external service, and, in this repository, host to agent hook or tool.

**At every boundary, ask:**
1. Is data validated before crossing?
2. Is the connection encrypted?
3. Is the caller authenticated and authorized?
4. Are responses validated before use?

---
