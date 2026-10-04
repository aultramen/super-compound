# Read-Depth Scaling

Read depth follows the host context window actually available, not curiosity.
Pick the column for the current window and stay at that depth.

| Source | Small window (~200k) | Large window (>=1M) |
| --- | --- | --- |
| Subagent reports (`reportPath`) | Frontmatter/summary lines only; open one section only to adjudicate a finding | Full body permitted |
| Workflow routes | Contract files under `.agent/context/workflows/` only | Contract first; full workflow only for a named uncovered detail |
| Agent definitions under `.agent/agents/` | Never read bodies the host auto-loads | Same; resident text is never reloaded |
| BRD/PRD/FSD/ADR | Qualified refs plus the section under active edit | Section-on-demand still applies |

## Rules

- Contract-over-workflow is existing policy: `.agent/context/routing-index.md`
  escalates from a route contract to the full workflow only for a named detail
  the contract does not cover. Window size never overrides that order.
- Never read agent definition bodies under `.agent/agents/` when the host auto-loads them;
  re-reading resident text buys nothing and spends budget.
- At small windows, treat every full-body read as a spend decision: name the
  single fact the read supplies before opening the file.

## Output Tier At Intake

Choose a concise return format independently from investigation depth.
Complexity, risk, uncertainty, separability, and available host capacity determine
reads and delegation; a short answer never limits required evidence.

| Tier | Choose when | Spend allowed |
| --- | --- | --- |
| Direct | The answer is known or one targeted read settles it | No subagents; a few reads |
| Chat brief | The result fits the route's return cap in `.agent/context/token-budget-gates.md` | Investigation/delegation proportional to complexity and risk; summarize evidence |
| Durable artifact | Evidence exceeds the chat envelope or another route consumes it | Subagents and full fan-out; evidence on disk |
