# Loop Runtime v2 Cutover Status and Owner Runbook

Date: 2026-08-06
Authority context: `FSD-LER2@1.1.0#GOAL-019`, `#TEST-019`
Evidence: `.scratch/loop-runtime/recovery/LER2-RECOVERY-IMPLEMENTATION-01/release-cutover-receipt.json` (receipt digest `sha256:cb2410d16a411d05aaffd0b51a87f0444d3c6e7f4b2ab666ea814a50af84d87e`)

This document records the current proven state of the Loop Runtime v2 cutover and the human-owned steps that remain. It is a status record and runbook, not BRD, PRD, FSD, verifier, or approval authority. It cannot authorize any mode transition by itself.

## Current proven state

- GOAL-001 through GOAL-018 are verified with digest-bound evidence under `.scratch/loop-runtime/recovery/LER2-RECOVERY-IMPLEMENTATION-01/`.
- GOAL-019 pre-canary evidence passed: three clean-reset full-suite attempts (501 tests each, zero failures), 124 fault/recovery checks per attempt, three migration and hook-security passes, paired OBSERVE traces for all 17 routes, 10 background pilots, 6 fake external fault points, and a token benchmark minimum reduction of 90.05%.
- The GOAL-019 verdict is `APPROVAL_REQUIRED` with `goal_met: false`. This is the fail-closed designed outcome while the live canary and host attestation remain outstanding; local evidence never substitutes for production host attestation.
- The project runtime mode is `OBSERVE` (`config_version: 2`, `mode_version: 1`), matching the receipt's recommended mode. `external_write_policy` remains `DENY`.

## Remaining human-owned gates

Each gate below requires a host-proven human actor. Neither a model nor a worker may perform, renew, or simulate any of them.

1. `LIVE_BOUNDED_ENFORCE_CANARY_REQUIRED`: run one bounded, low-risk live canary under `ENFORCE` conditions on the production host.
2. `HOST_CAPABILITY_ATTESTATION_REQUIRED`: produce a fresh WSL2 host capability attestation (60-minute maximum evidence window) bound to the canonical repository root, native `ext4` workspace, and exact verifier/interceptor digests.
3. `OWNER_MODE_TRANSITION_APPROVAL_REQUIRED` and `EFFECTIVE_MODE_TRANSITION_REQUIRED`: the owner performs the mode transition with current digests and versions:

   ```bash
   node .agent/tools/loop-run.mjs mode transition \
     --expected-digest sha256:<current config digest from `mode show`> \
     --expected-config-version <current> \
     --expected-mode-version <current> \
     --target ENFORCE \
     --input-file <candidate.json> \
     --owner-actor <host-verified-owner> \
     --owner-attestation HOST_OWNER_ACTION
   ```

   Read the current digest and versions with `node .agent/tools/loop-run.mjs mode show` immediately before the transition; a stale digest fails closed.

4. `PRODUCTION_HOST_ATTESTATION_VERIFICATION_REQUIRED`: verify the attestation independently before relying on any `ENFORCE` claim.
5. `EXTERNAL_WRITE_POLICY_REMAINS_DENY`: host enablement does not add a provider operation; external writes stay denied until separately and explicitly authorized.

## Reporting rule

Until every gate above passes, all public documentation and status output must continue to report `OBSERVE` as the proven mode. Whole-framework `ENFORCE` claims additionally require attributable paired full and compact traces for all 17 routes plus fresh durability, recovery, security, budget, and release evidence, per `docs/loop-runtime-v2.md`.
