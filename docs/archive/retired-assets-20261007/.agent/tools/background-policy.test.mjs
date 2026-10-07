import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertCanonicalBackgroundPolicyAuthority,
  computeBackgroundAggregateEpochDigest,
  computeBackgroundRunAggregatePolicyDigest,
  createCanonicalBackgroundPolicyAuthority,
} from "./background-policy.mjs";

const D1 = `sha256:${"1".repeat(64)}`;
const D2 = `sha256:${"2".repeat(64)}`;
const D3 = `sha256:${"3".repeat(64)}`;

const POLICY = Object.freeze({
  max_workers: 2,
  max_reserved_tokens: null,
  max_reserved_runtime_ms: 21_600_000,
  max_remote_calls: 0,
  max_reviewers: 2,
});

test("TEST-014 canonical background policy authority is opaque and root-bound", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "background-policy-root-"));
  const otherRoot = await mkdtemp(path.join(tmpdir(), "background-policy-other-"));
  try {
    const authority = createCanonicalBackgroundPolicyAuthority(root, {
      now: () => "2026-07-22T05:10:00.000Z",
    });
    assert.doesNotThrow(() =>
      assertCanonicalBackgroundPolicyAuthority(authority, root),
    );
    for (const fake of [null, {}, Object.freeze({}), async () => true]) {
      assert.throws(
        () => assertCanonicalBackgroundPolicyAuthority(fake, root),
        /BACKGROUND_POLICY_AUTHORITY_UNTRUSTED/,
      );
    }
    assert.throws(
      () => assertCanonicalBackgroundPolicyAuthority(authority, otherRoot),
      /BACKGROUND_POLICY_AUTHORITY_ROOT_MISMATCH/,
    );
  } finally {
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(otherRoot, { recursive: true, force: true }),
    ]);
  }
});

test("TEST-014 aggregate digest is domain-separated and authority-bound", () => {
  const input = {
    shared_aggregate_policy: POLICY,
    project_config_digest: D1,
    operation_inventory_digest: D3,
  };
  const digest = computeBackgroundAggregateEpochDigest(input);
  assert.match(digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(digest, computeBackgroundAggregateEpochDigest(input));
  assert.equal(
    digest,
    computeBackgroundAggregateEpochDigest(input),
    "the shared aggregate epoch must not drift across per-run policy digests",
  );
  assert.notEqual(
    digest,
    computeBackgroundAggregateEpochDigest({
      ...input,
      shared_aggregate_policy: { ...POLICY, max_workers: 3 },
    }),
  );
  const firstRun = computeBackgroundRunAggregatePolicyDigest({
    run_id: "run-1",
    policy_digest: D1,
    aggregate_epoch_digest: digest,
    aggregate_policy: POLICY,
  });
  assert.notEqual(
    firstRun,
    computeBackgroundRunAggregatePolicyDigest({
      run_id: "run-2",
      policy_digest: D2,
      aggregate_epoch_digest: digest,
      aggregate_policy: { ...POLICY, max_workers: 1 },
    }),
  );
});
