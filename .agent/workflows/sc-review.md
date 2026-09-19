---
description: "Review code changes against the requested spec and engineering standards."
---

# Review Workflow

Use this after implementation or when reviewing a diff/branch.

This route remains strictly read-only. Approval to remediate a finding selects
an owning workflow; it never converts review into implementation.

## Steps

1. Load `skills/code-review/SKILL.md`.
2. Identify review scope: current diff, branch, files, or user-specified target.
3. Identify the spec source: user request, BRD, PRD, FSD, goal issue pointer, linked accepted ADR, or acceptance criteria.
4. Review the spec axis first: missing behavior, incorrect behavior, or scope creep.
5. Review the standards axis: security, architecture, tests, maintainability, performance, and docs. Load only the applicable sections of `docs/engineering-standards.md`, or the project's `CODING_STANDARDS.md` when one exists; standards are enforced here, not during implementation, so implementation context stays small.
6. For PR readiness, load `skills/git-workflow-operation/SKILL.md` and review the PR checklist/template, but do not commit or push unless routed through `/sc-go`.
7. Verify each claim against the diff or a command result; name the claims that could not be verified and why.
   Check tier consistency: when the diff touches full-tier paths (schema, migrations, API, auth, billing; the same patterns `git-workflow.mjs` previews warn on) without a cited PRD/FSD, report a finding `ESCALATE: T2` with `/sc-plan` as owner.
8. If complete evidence exceeds the chat envelope, save it to
   `docs/reviews/YYYY-MM-DD-<scope>.md` and return the path; never omit a
   finding to satisfy an output cap. Then run
   `node .agent/tools/doc-lint.mjs <artifact>` and adjudicate its findings
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
