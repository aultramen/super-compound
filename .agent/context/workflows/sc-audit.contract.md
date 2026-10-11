# /sc-audit Runtime Contract

Standards: `.agent/context/standards.contract.md`; inspect scoped pins/evidence,
exceptions/drift and administrator-owned merge protection; report limits.

Purpose: strictly read-only security, compatibility, compliance, agent-surface, and release-readiness audit.

knowledge-search.mjs "<scope>" first; Accepted decisions bind through authority; observed lessons are advisory.
Scope risk, inspect the relevant surfaces, run safe checks, and report confirmed
findings, risks, and assumptions by severity. Release checks inspect Git state
read-only. Select skills by submode; never apply fixes inside audit, even after
approval. Route scope to `/sc-explore`, product gaps to `/sc-prd`, authority to
`/sc-plan`, defects to `/sc-debug`, approved goal fixes to `/sc-work`, and Git
actions to `/sc-go`. If evidence exceeds the return envelope, save it to
`docs/audits/YYYY-MM-DD-<scope>.md`; never omit a finding.
Checkpoint automatically and continue; /sc-pause is only for actual stops.

Human input/approval: .agent/context/checkpoint.contract.md
