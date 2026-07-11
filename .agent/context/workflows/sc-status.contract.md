# /sc-status Runtime Contract

Read present handoff/state/progress and issue metadata without reading all issue bodies;
then open only the selected issue. Add read-only Git state. Return
position, blockers, checks, Git, and one exact `/sc-*` route. Send
`OPEN-RESEARCH-*` through `/sc-research`; use `/sc-geniusloop` only if no ready
work, handoff, blocker, or failing check.
