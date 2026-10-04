# AI Context and Output Decisions

Load only when the product invokes AI at runtime. Agentic development alone does not require an AI subsystem. This is authoring/verification guidance, not a new API, mandatory runtime schema, or migration of approved artifacts.

## Inputs

The PRD states allowed information and product policy; the FSD specifies the exact prompt/tool contract within it. Keep existing classification, redaction, delimiting, injection defenses, limits, and data-egress decisions.

For conversation, event, or document context record actor/source attribution and source versions, chronology (event order/time plus uncertainty), selected boundaries and omitted material, and truncation method/limits with an explicit indication when context is incomplete. Preserve who said/did what and in what order; never flatten separate actors into a single claim. Only authorized context is eligible. Do not log raw sensitive prompts merely to prove attribution.

## Output-language policy

An explicit product requirement controls the language. If it says to follow input language, derive it from the selected context rather than unselected history, agent instructions, or interface chrome. Define mixed, empty, and ambiguous input behavior plus allowed explicit overrides in the PRD; carry that rule into the FSD and evals. Do not silently guess a universal language policy.

## Output and recovery

Reuse the feature's versioned schema, validation, source/evidence checks, authority boundary, and fallback. Quarantine malformed output; no authoritative persistence or success claim without valid output and the required gate. Define review/edit/confirm/regenerate controls only as required by product behavior/risk; avoid a universal Summary/Result/Status layout. Regeneration and retries preserve safe draft/selection and must not duplicate side effects. Product confirmation does not grant permission for the coding agent to change requirements.

## Proving cases

Map acceptance/evals to the selected actor/source and chronology, selection/truncation boundaries, language policy and its mixed/empty/ambiguous cases, malformed/stale output, provider failure, safe recovery, and retry effects where relevant. Mark genuinely inapplicable concerns with a reason.
