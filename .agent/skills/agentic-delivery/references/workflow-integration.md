## Workflow Integration

- `/sc-explore`: use `brainstorming` and this skill; output BRD or isolated throwaway decision evidence, then route to `/sc-prd`.
- `/sc-prd`: use `prd-generator` and this skill; create a PRD draft. UI-bearing drafts route through read-only `/sc-ui` validation before PRD approval and `/sc-plan`.
- `/sc-ui`: return evidence or a classified change route; accepted decisions must be absorbed by the owning PRD or FSD.
- `/sc-plan`: use `writing-plans`, `issue-workflow`, `plan-verification`, and this skill; consume the approved PRD, prove UI/API readiness, and output FSD plus contract-enabler/first-slice/scale-out pointers where applicable.
- `/sc-work`: use `executing-plans`, `context-engineering`, `test-driven-development`, `integration-checking`, and `verification-before-completion`; execute only referenced approved FSD goals and prove a real first slice before scale-out.
