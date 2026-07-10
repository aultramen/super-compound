# Checkpoint Types

## Trigger routing

| Situation | Type |
| --- | --- |
| Missing business rule or unavailable fact | `needs_info` |
| Outcome-changing choice among valid approaches | `needs_decision` |
| Destructive, irreversible, production migration, or high-impact action | `needs_confirmation` |
| Browser-, device-, account-, or environment-only verification | `needs_testing` |
| Missing API key, token, or service access | `needs_credentials` |
| User must deploy, restart, or configure external infrastructure | `needs_deployment_action` |
| Human judgment is required for code, design, architecture, or user-facing UX | `needs_review` |

Do not checkpoint routine naming, sensible test data, import order, convention-governed file organization, or equivalent reversible approaches. Make the choice and record it when useful.

## Formats

### `needs_info`

State what information is missing, why it changes the work, what research or inference was attempted, and one or two specific questions.

### `needs_decision`

State the decision and impact. Compare options in a Pros/Cons table, recommend one with reasons, and ask for a named selection or alternative.

### `needs_confirmation`

Name the exact action, scope, likely impact, reversibility and rollback. Ask for an explicit yes/no before acting.

### `needs_testing`

Name the scenario, provide numbered steps, state the expected result, and ask for observed behavior or errors.

### `needs_credentials`

Name the service, credential type, acquisition instructions, approved local destination, and environment variable. Say explicitly: never paste secrets in chat.

### `needs_deployment_action`

Name the external action and why it cannot be automated. Give bounded instructions and say what work resumes afterward.

### `needs_review`

List the files, design, or architecture to review, the important review questions, and the response that approves continuation or requests revision.

Every format must include sufficient context to answer without reconstructing the entire session.
