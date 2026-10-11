---
description: "Review code changes against the requested spec and engineering standards."
---

# Review Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this after implementation or when reviewing a diff/branch.

This route remains strictly read-only. Approval to remediate a finding selects
an owning workflow; it never converts review into implementation.


## Example

Input: `/sc-review`.
Prerequisite: Diff/files and the request or approved specification.
Result and next action: Read-only findings with evidence and owners; remediation goes to /sc-work or /sc-debug within authority.

## Steps

1. Load `skills/code-review/SKILL.md`.
2. Identify review scope: current diff, branch, files, or user-specified target. Apply reviewer economics from `.agent/skills/code-review/references/findings-and-self-review.md`.
3. Identify the spec source: user request, BRD, PRD, FSD, goal issue pointer, linked accepted ADR, or acceptance criteria.
4. Review the spec axis first: missing behavior, incorrect behavior, or scope creep.
5. Review the standards axis: security, architecture, tests, maintainability,
   performance, and docs. Use `.agent/context/standards.contract.md` for the
   changed scopes and independently inspect pinned mandatory-check/manual-review
   evidence. Cite rule ID, profile/version and affected scope for findings;
   legacy projects retain repository conventions. Implementation preflight
   applies the same constraints, review verifies them independently.
6. For PR readiness, load `skills/git-workflow-operation/SKILL.md` and review the PR checklist/template, but do not commit or push unless routed through `/sc-go`.
7. Apply `verification-before-completion` to each claim: inspect actual evidence,
   current identity/provenance, and coverage of the goal, requirements, and every
   acceptance criterion. A diff proves edits, not working behavior; a successful
   build/deployment command alone cannot prove the requested outcome. Open manual
   artifacts and inspect recorded observations rather than trusting file existence
   or a worker's report. Name unsupported claims and validation owners. This
   read-only route does not silently rerun the owner's recipe or grant completion.
   Check tier consistency: sensitive paths signal inspection of the actual diff, compatibility, access, data, and side effects. Report `ESCALATE: T2` only for material semantic/risk changes outside authority; contract-preserving maintenance stays light.
8. Persist opened findings or complete evidence exceeding the chat envelope in
   `docs/reviews/YYYY-MM-DD-<scope>.md`, using the finding/adjudication rules from
   that reference. Return the path; never omit a finding to satisfy an output cap. Then run
   `node .agent/tools/doc-lint.mjs <artifact> --advisory` and adjudicate its findings
   (advisory).
9. Assign each remediation owner:
   - business scope or policy -> `/sc-explore`;
   - product requirement gap -> `/sc-prd`;
   - FSD, ADR, or goal authority gap -> `/sc-plan`;
   - reproduced defect -> `/sc-debug`;
   - approved goal implementation -> `/sc-work`;
   - branch, commit, push, or PR action -> `/sc-go`.

## Output

- Findings first, ordered by severity.
- File/line references where available.
- Open questions and residual test gaps.
- Exact next owner for every actionable finding.
- Deferred findings with their owner and durable sink (`docs/todos/YYYY-MM-DD-<slug>.md` or `docs/STATE.md` Deferred Ideas); nothing is parked silently.
- The durable review report follows `.agent/context/output-style.md`.
- A completion claim includes `Evidence of Completion` with what/how, actual
  results/evidence locators, and acceptance mapping; missing proof stays incomplete.
