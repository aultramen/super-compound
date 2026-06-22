---
description: "Review code changes against the requested spec and engineering standards."
---

# Review Workflow

Use this after implementation or when reviewing a diff/branch.

## Steps

1. Load `skills/code-review/SKILL.md`.
2. Identify review scope: current diff, branch, files, or user-specified target.
3. Identify the spec source: user request, BRD, PRD, FSD, goal issue pointer, linked accepted ADR, or acceptance criteria.
4. Review the spec axis first: missing behavior, incorrect behavior, or scope creep.
5. Review the standards axis: security, architecture, tests, maintainability, performance, and docs.
6. Verify claims when practical.

## Output

- Findings first, ordered by severity.
- File/line references where available.
- Open questions and residual test gaps.
