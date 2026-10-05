---
name: super-compound
description: Use Super Compound .agent workflows for /sc-* commands or plain-language requests to set up, fix a bug, make a small change, deliver a feature, review, resume work, or ask for guidance.
---

Route intent: setup -> sc-init setup; bug -> sc-debug; small change -> sc-work;
full feature delivery -> sc-launch; resume -> sc-status; review -> sc-review; consultation -> sc-hints.
Clear implementation, debugging, review and resume requests select their owner directly; hints is guidance only. Explicit /sc-* commands select their named route. Preserve read-only scope and
existing authorization; natural-language routing adds no approval or write authority.

.agent/context/workflows/sc-X.contract.md before
references/context/workflows/sc-X.contract.md; full workflow only if needed, never preloaded
Fallback: .agent/ and bare context workflows skills templates rules agents evals hooks tools under references/; workflow-relative sc-*.md under references/workflows/
