# Approved implementation scope

Implement the approved Evidence-Based Definition of Done plan for Super Compound.

No Evidence = Not Done. Completion requires actual verification of the goal, requirements and every acceptance criterion; execution of a step alone is insufficient. Use task-relevant proof and include Evidence of Completion (what, how, evidence and AC coverage).

The accepted design uses canonical agent policy and existing deterministic local gates, permits separate real same-agent verification with coordinator inspection of delegated work, and permits compact light-task proof without BRD/PRD/FSD or a swarm ledger. Preserve current workflows, enums, history and advisory hooks; add no runtime-v2 subsystem or dependency.

## AC-01

All tasks require real goal, requirement and complete acceptance evidence plus Evidence of Completion.

## AC-02

The shared completion gate rejects missing, partial, failed, skipped, wrong-scope and stale proof and admits actual passing outcomes.

## AC-03

Goal and receipt verification and dependency release require adequate outcome evidence; drift cannot return completion.

## AC-04

Checkpoint/resume and first-slice scale-out require current outcome proof rather than historical status.

## AC-05

Light tasks and generated/installed adapters can evaluate actual proof without formal delivery artifacts or a swarm ledger.

## AC-06

A completed run proves its combined goal and rejects failed, absent or unrelated aggregate proof.

## AC-07

Current framework sources pass the local and installation-inclusive suites, preserving existing workflows, hooks and delivery compatibility.

## AC-08

The final Evidence of Completion report maps actual executed and inspected evidence to every acceptance criterion.
