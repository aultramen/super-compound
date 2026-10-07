# Learned Knowledge

## Summary

Records reusable observations, evidence, and corrective actions for this project. Lessons remain advisory until adopted by an authoritative decision.

Confirmed reusable preferences, conventions, and patterns.
Contract: `.agent/skills/state-management/references/file-contracts.md`.
Read the Quick Reference table before starting a task; open a full entry only
when its rule matches the task at hand.

Confidence ladder: 1 observation = `inferred`; 3+ consistent observations =
`observed`; explicit user statement = `confirmed`. Never delete a learning -
mark it `SUPERSEDED by <ref>`. The same correction must never be needed twice.

Caps: 30 entries or ~30 KB. On overflow, move superseded and lowest-confidence
entries to `docs/archive/KNOWLEDGE_ARCHIVE.md`. Archive, never delete.

Promotion: when one category or prevention rule recurs 3+ times at `observed`
or `confirmed`, flag `PATTERN` and route it to `/sc-evolve` for a draft
framework proposal (human-approved).

## Quick Reference

| ID | Topic | Action rule |
| --- | --- | --- |
| LRN-2026-09-02-001 | contract shadowing | IF wiring a behavior into an sc-* workflow THEN add its spine to the paired contract in the same change and extend the spine test. |
| LRN-2026-09-02-002 | shared contract headroom | IF a route contract needs tokens THEN trim `.codex/SKILL.md` or rewrite token-neutral; never raise the 90% gate. |
| LRN-2026-09-03-001 | absolute route budgets | IF a route contract needs tokens THEN add them and re-adopt that route's absolute budget in `token-benchmark.mjs` (measured after + 40); the 90% ratio is reported, not a gate. |
| LRN-2026-09-20-001 | prose-only gates | IF a rule is enforced only by prose the model reads THEN back it with a test, CI check, or tool, or delete it. |
| LRN-2026-10-06-001 | pilot write capability preflight | IF a pilot will measure implementation or resume THEN require the selected-build test and bounded write probe without bypassing effective policy; stop after the first invalid A/A control or execution failure, retain evidence, and mark runtime benefit unproven. |


## LRN-2026-09-02-001 - contract shadowing
- Learning: the contract-first route (`.claude/commands/` then `.agent/context/workflows/`) never loads the full workflow body, so behavior wired only into a workflow never fires.
- Confidence: confirmed
- Applies to: framework
- Action rule: IF wiring a behavior into an sc-* workflow THEN add its spine to the paired contract in the same change and extend the spine test.
- Source: verified experiment (Wave 2 wired six workflows; 0 entries in 13 days; 16 of 18 contracts silent)

## LRN-2026-09-02-002 - shared contract headroom
- Learning: `.codex/SKILL.md` sits in every route's benchmark after-set; each token trimmed there frees one token in all 18 routes.
- Confidence: confirmed
- Applies to: framework
- Action rule: IF a route contract needs tokens THEN trim `.codex/SKILL.md` or rewrite token-neutral; never raise the 90% gate.
- Source: verified experiment (104 to 92 tokens; sc-review margin 1 to 13)
- Status: SUPERSEDED by LRN-2026-09-03-001 (2026-09-03); the ratio gate no longer exists for routes.

## LRN-2026-09-03-001 - absolute route budgets
- Learning: the route gate is an absolute after-token budget (measured after + 40, re-adopted on every deliberate contract change); the 90% reduction against the frozen baseline is reported only. Under the old ratio gate six routes had 0-6 tokens of headroom and no contract could gain a sentence.
- Confidence: confirmed
- Applies to: framework
- Action rule: IF a route contract needs tokens THEN add them and re-adopt that route's absolute budget in `token-benchmark.mjs` (measured after + 40); the 90% ratio is reported, not a gate.
- Source: verified experiment (Wave 4 A: sc-status 224/264, sc-compound 215/255, sc-pause 200/240 after the contract fixes the ratio gate had blocked)
- Status: SUPERSEDED by LRN-2026-09-20-001 (2026-09-20); routes use the ratio gate again with the Codex stub measured once at startup.

## LRN-2026-09-20-001 - prose-only gates
- Learning: Loop Runtime v2 wrote 28k lines of gate tooling, yet no hook could deny an Edit, the admission library had no CLI, and the Git tool had no gate; the only enforcement was contract prose, which blocked compliant models (OBSERVE forbade writes) and cost tokens for the rest.
- Confidence: confirmed
- Applies to: framework
- Action rule: IF a rule is enforced only by prose the model reads THEN back it with a test, CI check, or tool, or delete it.
- Source: verified experiment (2026-09-20 audit: 27 gates on /sc-work, 9 tool-backed, none reachable in the shipped mode; removal left every suite green)

<!-- Entry format (append below, newest last):

## LRN-YYYY-MM-DD-NNN - <learning topic>
- Learning: <confirmed pattern>
- Confidence: confirmed | observed | inferred
- Applies to: <scope: global | project | framework>
- Action rule: IF <condition> THEN <action>
- Source: <user statement | repeated observation | verified experiment>
-->

## LRN-2026-10-06-001 - pilot write capability preflight
- Learning: Successful reads, real test execution, requested workspace-write and model exit zero do not establish effective implementation capability. Live workers declined writes; this does not prove an OS-level rejection. Require actual bounded write evidence before counted trials and preserve failed controls.
- Applies to: framework
- Action rule: IF a pilot will measure implementation or resume THEN require the selected-build test and bounded write probe without bypassing effective policy; stop after the first invalid A/A control or execution failure, retain evidence, and mark runtime benefit unproven.
- Source: Repeated live observations and verified local protocol-v3/control-stop regressions; no runtime savings claim
- Confidence: observed
- Origin: framework-enhancement-20261006:pilot-capability
- Revision: v3-write-probe-and-control-stop
- Status: active
- Evidence: .agent/tools/codex-pilot.mjs@5a0738cc1eec8faf11140ee63a1b2f7104c9f83beb17b4cd185fc7e5b05a0009, .agent/tools/codex-pilot.test.mjs@d1c76f31ce0eaed7d139af0259ad2917b00e4f7b9a2a8c10260b7ecc00f81b0d, .agent/skills/eval-harness/references/paired-experiments.md@e7b3a7e1042601dcadf666e1322603f2000d28d66ed86df6c7cba646ac6b6345
- Outcome: verified

