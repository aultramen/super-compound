## Workflow Integration

- `/sc-explore`: use `brainstorming` and this skill; output BRD or BRD summary, then route to `/sc-prd`.
- `/sc-prd`: use `prd-generator` and this skill; consume BRD, output PRD, then route to `/sc-plan`.
- `/sc-plan`: use `writing-plans`, `issue-workflow`, `plan-verification`, and this skill; consume PRD, output FSD plus goal issue pointers.
- `/sc-work`: use `executing-plans`, `context-engineering`, `test-driven-development`, and `verification-before-completion`; execute only referenced approved FSD goals.
