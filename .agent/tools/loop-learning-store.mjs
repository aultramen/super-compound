import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  assertExpectedVersion,
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import {
  compactLearningRecords,
  digestJson,
  normalizeGeniusLoopOutcome,
} from "./loop-learning-model.mjs";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_PROJECTION_BYTES = 1_048_576;
const MAX_RECORDS = 10_000;

function assertDigest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
}

function projectionPayload(projection) {
  const { projection_digest: ignored, ...payload } = projection;
  return payload;
}

function outcomeModelInput(outcome) {
  const {
    schema: ignoredSchema,
    contract_version: ignoredVersion,
    ...input
  } = outcome;
  return input;
}

function verifyProjection(projection, { schema, runId, collection }) {
  if (
    projection === null ||
    typeof projection !== "object" ||
    Array.isArray(projection) ||
    projection.schema !== schema ||
    projection.contract_version !== "2.0.0" ||
    projection.run_id !== runId ||
    !Number.isSafeInteger(projection.version) ||
    projection.version < 1 ||
    !Array.isArray(projection[collection]) ||
    projection[collection].length > MAX_RECORDS ||
    digestJson(projectionPayload(projection)) !== projection.projection_digest
  ) {
    throw new Error("LEARNING_PROJECTION_CORRUPT");
  }
  assertDigest(projection.bound_run_head_digest, "bound run head digest");
  assertDigest(projection.source_event_digest, "source event digest");
  if (collection === "records") {
    compactLearningRecords(projection.records);
  } else {
    for (const outcome of projection.outcomes) {
      if (
        JSON.stringify(normalizeGeniusLoopOutcome(outcomeModelInput(outcome))) !==
        JSON.stringify(outcome)
      ) {
        throw new Error("LEARNING_PROJECTION_CORRUPT");
      }
    }
  }
  return projection;
}

async function readJson(root, candidate) {
  const content = await readBoundedFile(root, candidate, {
    maxBytes: MAX_PROJECTION_BYTES,
    encoding: "utf8",
    label: "learning projection",
  });
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("LEARNING_PROJECTION_CORRUPT");
  }
}

function isMissing(error) {
  return (
    error?.code === "ENOENT" ||
    /File does not exist|ENOENT/u.test(error instanceof Error ? error.message : "")
  );
}

function pathsFor(runId) {
  const directory = `.scratch/loop-runs/${runId}`;
  return {
    learning: `${directory}/learning.json`,
    outcome: `${directory}/outcome.json`,
    learningLock: `${directory}/learning.lock`,
    outcomeLock: `${directory}/outcome.lock`,
    patterns: ".scratch/loop-runtime/verified-patterns",
    patternLock: ".scratch/loop-runtime/verified-patterns.lock",
  };
}

async function readOptionalProjection(root, candidate, metadata) {
  try {
    return verifyProjection(await readJson(root, candidate), metadata);
  } catch (error) {
    if (isMissing(error)) {
      return null;
    }
    throw error;
  }
}

async function writeProjection({
  root,
  candidate,
  lock,
  schema,
  runId,
  collection,
  values,
  expectedVersion,
  runHeadDigest,
  sourceEventDigest,
}) {
  if (
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    !Array.isArray(values) ||
    values.length > MAX_RECORDS
  ) {
    throw new Error("Learning projection input is invalid.");
  }
  assertDigest(runHeadDigest, "run head digest");
  assertDigest(sourceEventDigest, "source event digest");
  if (collection === "records") {
    compactLearningRecords(values);
  } else {
    for (const outcome of values) {
      normalizeGeniusLoopOutcome(outcomeModelInput(outcome));
    }
  }
  return withOwnerLock(root, lock, async ({ assertOwnership }) => {
    const current = await readOptionalProjection(root, candidate, {
      schema,
      runId,
      collection,
    });
    assertExpectedVersion(current?.version ?? 0, expectedVersion, "learning projection version");
    const payload = {
      schema,
      contract_version: "2.0.0",
      run_id: runId,
      version: expectedVersion + 1,
      bound_run_head_digest: runHeadDigest,
      source_event_digest: sourceEventDigest,
      [collection]: values.map((value) => structuredClone(value)),
    };
    const projection = {
      ...payload,
      projection_digest: digestJson(payload),
    };
    await writeFileAtomic(root, candidate, `${JSON.stringify(projection)}\n`, {
      maxBytes: MAX_PROJECTION_BYTES,
      assertOwnership,
      label: "learning projection",
    });
    return Object.freeze(structuredClone(projection));
  });
}

function verifyPatternProjection(projection) {
  if (
    projection === null ||
    typeof projection !== "object" ||
    projection.schema !== "verified_pattern_projection_v2" ||
    projection.contract_version !== "2.0.0" ||
    !projection.pattern ||
    digestJson(projectionPayload(projection)) !== projection.projection_digest
  ) {
    throw new Error("LEARNING_PROJECTION_CORRUPT");
  }
  assertDigest(projection.promotion_event_digest, "promotion event digest");
  return projection;
}

export function createLoopLearningStore({ root, runId }) {
  if (typeof root !== "string" || !RUN_ID_PATTERN.test(runId ?? "")) {
    throw new Error("Learning store root or run ID is invalid.");
  }
  const paths = pathsFor(runId);
  return Object.freeze({
    async writeLearningProjection({
      expectedVersion,
      runHeadDigest,
      sourceEventDigest,
      records,
    }) {
      return writeProjection({
        root,
        candidate: paths.learning,
        lock: paths.learningLock,
        schema: "iteration_learning_projection_v2",
        runId,
        collection: "records",
        values: records,
        expectedVersion,
        runHeadDigest,
        sourceEventDigest,
      });
    },

    async readLearningProjection({ expectedRunHeadDigest } = {}) {
      const projection = verifyProjection(await readJson(root, paths.learning), {
        schema: "iteration_learning_projection_v2",
        runId,
        collection: "records",
      });
      if (
        expectedRunHeadDigest !== undefined &&
        projection.bound_run_head_digest !== expectedRunHeadDigest
      ) {
        throw new Error("LEARNING_PROJECTION_STALE");
      }
      return Object.freeze(structuredClone(projection));
    },

    async readLearningProjectionOptional() {
      const projection = await readOptionalProjection(root, paths.learning, {
        schema: "iteration_learning_projection_v2",
        runId,
        collection: "records",
      });
      return projection === null
        ? null
        : Object.freeze(structuredClone(projection));
    },

    async writeOutcomeProjection({
      expectedVersion,
      runHeadDigest,
      sourceEventDigest,
      outcomes,
    }) {
      return writeProjection({
        root,
        candidate: paths.outcome,
        lock: paths.outcomeLock,
        schema: "geniusloop_outcome_projection_v2",
        runId,
        collection: "outcomes",
        values: outcomes,
        expectedVersion,
        runHeadDigest,
        sourceEventDigest,
      });
    },

    async readOutcomeProjection({ expectedRunHeadDigest } = {}) {
      const projection = verifyProjection(await readJson(root, paths.outcome), {
        schema: "geniusloop_outcome_projection_v2",
        runId,
        collection: "outcomes",
      });
      if (
        expectedRunHeadDigest !== undefined &&
        projection.bound_run_head_digest !== expectedRunHeadDigest
      ) {
        throw new Error("LEARNING_PROJECTION_STALE");
      }
      return Object.freeze(structuredClone(projection));
    },

    async readOutcomeProjectionOptional() {
      const projection = await readOptionalProjection(root, paths.outcome, {
        schema: "geniusloop_outcome_projection_v2",
        runId,
        collection: "outcomes",
      });
      return projection === null
        ? null
        : Object.freeze(structuredClone(projection));
    },

    async publishVerifiedPattern({ pattern, promotionEventDigest }) {
      assertDigest(pattern?.dedupe_key, "pattern dedupe key");
      assertDigest(promotionEventDigest, "promotion event digest");
      const candidate = `${paths.patterns}/${pattern.dedupe_key.slice(7)}.json`;
      return withOwnerLock(root, paths.patternLock, async ({ assertOwnership }) => {
        let existing = null;
        try {
          existing = verifyPatternProjection(await readJson(root, candidate));
        } catch (error) {
          if (!isMissing(error)) {
            throw error;
          }
        }
        const payload = {
          schema: "verified_pattern_projection_v2",
          contract_version: "2.0.0",
          promotion_event_digest: promotionEventDigest,
          pattern: structuredClone(pattern),
        };
        const projection = {
          ...payload,
          projection_digest: digestJson(payload),
        };
        if (existing !== null) {
          if (JSON.stringify(existing) !== JSON.stringify(projection)) {
            throw new Error("PATTERN_PUBLICATION_CONFLICT");
          }
          return Object.freeze({ idempotent: true, projection: existing });
        }
        await writeFileAtomic(root, candidate, `${JSON.stringify(projection)}\n`, {
          maxBytes: MAX_PROJECTION_BYTES,
          assertOwnership,
          label: "verified pattern projection",
        });
        return Object.freeze({ idempotent: false, projection });
      });
    },

    async listVerifiedPatterns() {
      const absolute = await resolveRepositoryPath(root, paths.patterns, {
        label: "verified pattern directory",
      });
      let names;
      try {
        names = await readdir(absolute);
      } catch (error) {
        if (isMissing(error)) {
          return [];
        }
        throw error;
      }
      if (names.length > 1_000) {
        throw new Error("Verified pattern inventory exceeds the bounded limit.");
      }
      const patterns = [];
      for (const name of names.sort()) {
        if (!/^[a-f0-9]{64}\.json$/u.test(name)) {
          throw new Error("LEARNING_PROJECTION_CORRUPT");
        }
        const projection = verifyPatternProjection(
          await readJson(root, path.posix.join(paths.patterns, name)),
        );
        patterns.push(structuredClone(projection.pattern));
      }
      return patterns;
    },
  });
}
