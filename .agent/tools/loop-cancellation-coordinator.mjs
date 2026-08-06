const REQUEST_FIELDS = Object.freeze([
  "run_id",
  "expected_run_version",
  "queue_item_id",
  "expected_queue_version",
  "background_dispatches",
  "actor_ref",
  "reason_ref",
  "evidence_digest",
  "freshness",
]);

const DISPATCH_FIELDS = Object.freeze(["dispatch_id", "expected_version"]);
const FRESHNESS_FIELDS = Object.freeze([
  "authority_digest",
  "project_config_digest",
  "verifier_digest",
  "eval_definition_digest",
]);
const MAX_BACKGROUND_DISPATCHES = 64;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const BACKGROUND_STOPPED_STATES = new Set([
  "CANCELLED",
  "CANCEL_REQUESTED",
  "COMPLETED",
  "UNKNOWN_OUTCOME",
  "RECONCILED",
]);

function fail(code) {
  throw new TypeError(code);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, fields) {
  return (
    isObject(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function nonNegativeVersion(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validIdentifier(value) {
  return typeof value === "string" && STABLE_ID.test(value);
}

function validDigest(value) {
  return typeof value === "string" && DIGEST.test(value);
}

function clone(value, code = "INVALID_LOOP_CANCELLATION_REQUEST") {
  try {
    return structuredClone(value);
  } catch {
    fail(code);
  }
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function validFreshness(value) {
  return (
    exactFields(value, FRESHNESS_FIELDS) &&
    FRESHNESS_FIELDS.every((field) => validDigest(value[field]))
  );
}

function validateRequest(input) {
  const request = clone(input);
  if (
    !exactFields(request, REQUEST_FIELDS) ||
    !validIdentifier(request.run_id) ||
    !nonNegativeVersion(request.expected_run_version) ||
    !validIdentifier(request.queue_item_id) ||
    !nonNegativeVersion(request.expected_queue_version) ||
    !validIdentifier(request.actor_ref) ||
    !validIdentifier(request.reason_ref) ||
    !validDigest(request.evidence_digest) ||
    !validFreshness(request.freshness) ||
    !Array.isArray(request.background_dispatches) ||
    request.background_dispatches.length > MAX_BACKGROUND_DISPATCHES
  ) {
    fail("INVALID_LOOP_CANCELLATION_REQUEST");
  }
  const dispatchIds = new Set();
  for (const dispatch of request.background_dispatches) {
    if (
      !exactFields(dispatch, DISPATCH_FIELDS) ||
      !validIdentifier(dispatch.dispatch_id) ||
      !nonNegativeVersion(dispatch.expected_version) ||
      dispatchIds.has(dispatch.dispatch_id)
    ) {
      fail("INVALID_LOOP_CANCELLATION_REQUEST");
    }
    dispatchIds.add(dispatch.dispatch_id);
  }
  return request;
}

function runCancellationMatches(state) {
  return (
    (state?.status === "CANCELLED" &&
      state.terminal_reason === "CANCELLED_BEFORE_ACTION_INTENT") ||
    (state?.status === "UNKNOWN_OUTCOME" &&
      state.terminal_reason === "CANCEL_AFTER_ACTION_INTENT")
  );
}

function queueCancellationMatches(item, request) {
  return (
    new Set(["CANCELLED", "CANCEL_REQUESTED"]).has(item?.state) &&
    item.cancellation?.actor_ref === request.actor_ref &&
    item.cancellation?.reason_ref === request.reason_ref
  );
}

function backgroundCancellationMatches(record, request) {
  return (
    new Set(["CANCELLED", "CANCEL_REQUESTED"]).has(record?.state) &&
    record.cancellation?.evidence_digest === request.evidence_digest
  );
}

function backgroundIsStopped(record) {
  return BACKGROUND_STOPPED_STATES.has(record?.state);
}

function assertRunPreflight(view, request) {
  if (
    view?.contract?.run_id !== request.run_id ||
    !isObject(view.state) ||
    (!runCancellationMatches(view.state) &&
      view.state.version !== request.expected_run_version)
  ) {
    fail("LOOP_CANCELLATION_RUN_BINDING_CONFLICT");
  }
}

function assertQueuePreflight(item, request) {
  if (
    item?.queue_item_id !== request.queue_item_id ||
    item?.run_binding?.run_id !== request.run_id ||
    (!queueCancellationMatches(item, request) &&
      item.version !== request.expected_queue_version)
  ) {
    fail("LOOP_CANCELLATION_QUEUE_BINDING_CONFLICT");
  }
  if (
    new Set(["CANCELLED", "CANCEL_REQUESTED"]).has(item.state) &&
    !queueCancellationMatches(item, request)
  ) {
    fail("LOOP_CANCELLATION_QUEUE_CONFLICT");
  }
}

function assertBackgroundPreflight(record, dispatch, request) {
  if (
    record?.dispatch_id !== dispatch.dispatch_id ||
    record?.run_binding?.run_id !== request.run_id ||
    record?.queue_binding?.queue_item_id !== request.queue_item_id ||
    (!backgroundIsStopped(record) &&
      record.version !== dispatch.expected_version)
  ) {
    fail("LOOP_CANCELLATION_BACKGROUND_BINDING_CONFLICT");
  }
}

function assertDependencies(dependencies) {
  if (
    !isObject(dependencies) ||
    typeof dependencies.loopRunController?.show !== "function" ||
    typeof dependencies.loopRunController?.apply !== "function" ||
    typeof dependencies.loopQueue?.show !== "function" ||
    typeof dependencies.loopQueue?.cancel !== "function" ||
    typeof dependencies.backgroundExecutionStore?.show !== "function" ||
    typeof dependencies.backgroundExecutionStore?.listForRunQueue !== "function" ||
    typeof dependencies.backgroundExecutionStore?.apply !== "function" ||
    typeof dependencies.writeRunCancellationInput !== "function"
  ) {
    fail("LOOP_CANCELLATION_DEPENDENCY_INVALID");
  }
}

function validInputFile(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    /^[A-Za-z]:[\\/]/u.test(value) ||
    value.startsWith("/") ||
    value.startsWith("\\")
  ) {
    return false;
  }
  return !value
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => segment === "..");
}

export function createLoopCancellationCoordinator(dependencies) {
  assertDependencies(dependencies);
  const {
    loopRunController,
    loopQueue,
    backgroundExecutionStore,
    writeRunCancellationInput,
  } = dependencies;

  return Object.freeze({
    async cancel(input) {
      const request = validateRequest(input);
      const [runView, queueItem, discoveredBackgroundRecords] = await Promise.all([
        loopRunController.show({ runId: request.run_id }),
        loopQueue.show(request.queue_item_id),
        backgroundExecutionStore.listForRunQueue(
          request.run_id,
          request.queue_item_id,
        ),
      ]);

      assertRunPreflight(runView, request);
      assertQueuePreflight(queueItem, request);
      if (
        !Array.isArray(discoveredBackgroundRecords) ||
        discoveredBackgroundRecords.length > MAX_BACKGROUND_DISPATCHES
      ) {
        fail("LOOP_CANCELLATION_BACKGROUND_EXACT_SET_MISMATCH");
      }
      const requestedIds = request.background_dispatches
        .map((dispatch) => dispatch.dispatch_id)
        .sort();
      const discoveredIds = discoveredBackgroundRecords
        .map((record) => record.dispatch_id)
        .sort();
      if (JSON.stringify(requestedIds) !== JSON.stringify(discoveredIds)) {
        fail("LOOP_CANCELLATION_BACKGROUND_EXACT_SET_MISMATCH");
      }
      const discoveredById = new Map(
        discoveredBackgroundRecords.map((record) => [record.dispatch_id, record]),
      );
      const backgroundRecords = request.background_dispatches.map((dispatch) =>
        discoveredById.get(dispatch.dispatch_id),
      );
      request.background_dispatches.forEach((dispatch, index) => {
        assertBackgroundPreflight(backgroundRecords[index], dispatch, request);
      });

      let appliedBackgroundDispatches = 0;
      const backgroundResults = new Map();
      for (let index = 0; index < request.background_dispatches.length; index += 1) {
        const dispatch = request.background_dispatches[index];
        const current = backgroundRecords[index];
        if (backgroundIsStopped(current)) {
          backgroundResults.set(current.dispatch_id, current);
          continue;
        }
        let durable;
        try {
          const result = await backgroundExecutionStore.apply(dispatch.dispatch_id, {
            expected_version: dispatch.expected_version,
            command: "CANCEL",
            authorization: null,
            evidence_digest: request.evidence_digest,
            outcome: null,
          });
          durable = result.record;
        } catch (error) {
          durable = await backgroundExecutionStore.show(dispatch.dispatch_id);
          if (!backgroundCancellationMatches(durable, request)) throw error;
        }
        appliedBackgroundDispatches += Number(durable.version !== current.version);
        backgroundResults.set(durable.dispatch_id, durable);
      }

      let durableQueue = queueItem;
      let queueApplied = false;
      if (!queueCancellationMatches(queueItem, request)) {
        try {
          durableQueue = await loopQueue.cancel(request.queue_item_id, {
            expected_version: request.expected_queue_version,
            actor_ref: request.actor_ref,
            reason_ref: request.reason_ref,
          });
        } catch (error) {
          durableQueue = await loopQueue.show(request.queue_item_id);
          if (!queueCancellationMatches(durableQueue, request)) throw error;
        }
        queueApplied = durableQueue.version !== queueItem.version;
      }

      const postQueueRecords = await backgroundExecutionStore.listForRunQueue(
        request.run_id,
        request.queue_item_id,
      );
      if (
        !Array.isArray(postQueueRecords) ||
        postQueueRecords.length > MAX_BACKGROUND_DISPATCHES
      ) {
        fail("LOOP_CANCELLATION_BACKGROUND_EXACT_SET_MISMATCH");
      }
      for (const current of postQueueRecords) {
        if (backgroundIsStopped(current)) {
          backgroundResults.set(current.dispatch_id, current);
          continue;
        }
        let durable;
        try {
          const result = await backgroundExecutionStore.apply(current.dispatch_id, {
            expected_version: current.version,
            command: "CANCEL",
            authorization: null,
            evidence_digest: request.evidence_digest,
            outcome: null,
          });
          durable = result.record;
        } catch (error) {
          durable = await backgroundExecutionStore.show(current.dispatch_id);
          if (!backgroundCancellationMatches(durable, request)) throw error;
        }
        appliedBackgroundDispatches += Number(durable.version !== current.version);
        backgroundResults.set(durable.dispatch_id, durable);
      }

      let durableRun = runView.state;
      let runApplied = false;
      if (!runCancellationMatches(runView.state)) {
        const inputFile = await writeRunCancellationInput(
          deepFreeze({
            run_id: request.run_id,
            reason_ref: request.reason_ref,
            evidence_digest: request.evidence_digest,
            freshness: clone(request.freshness),
          }),
        );
        if (!validInputFile(inputFile)) {
          fail("LOOP_CANCELLATION_INPUT_FILE_INVALID");
        }
        try {
          const result = await loopRunController.apply({
            runId: request.run_id,
            expectedVersion: request.expected_run_version,
            command: "CANCEL",
            inputFile,
          });
          durableRun = result.state;
        } catch (error) {
          durableRun = (
            await loopRunController.show({ runId: request.run_id })
          ).state;
          if (!runCancellationMatches(durableRun)) throw error;
        }
        runApplied = durableRun.version !== runView.state.version;
      }

      const finalBackgroundRecords =
        await backgroundExecutionStore.listForRunQueue(
          request.run_id,
          request.queue_item_id,
        );
      for (const record of finalBackgroundRecords) {
        backgroundResults.set(record.dispatch_id, record);
      }
      const orderedBackgroundResults = [...backgroundResults.values()].sort(
        (left, right) => left.dispatch_id.localeCompare(right.dispatch_id),
      );
      const converged =
        runCancellationMatches(durableRun) &&
        queueCancellationMatches(durableQueue, request) &&
        orderedBackgroundResults.every((record) => backgroundIsStopped(record));
      if (!converged) fail("LOOP_CANCELLATION_NOT_CONVERGED");

      return deepFreeze({
        schema: "loop_cancellation_result_v2",
        contract_version: "2.0.0",
        run_id: request.run_id,
        queue_item_id: request.queue_item_id,
        converged: true,
        requires_reconciliation:
          durableRun.status === "UNKNOWN_OUTCOME" ||
          durableQueue.state === "CANCEL_REQUESTED" ||
          orderedBackgroundResults.some(
            (record) => record.state === "CANCEL_REQUESTED",
          ),
        applied: {
          background_dispatches: appliedBackgroundDispatches,
          queue: queueApplied,
          run: runApplied,
        },
        run: {
          state: durableRun.status,
          version: durableRun.version,
          terminal_reason: durableRun.terminal_reason,
        },
        queue: {
          state: durableQueue.state,
          version: durableQueue.version,
        },
        background_dispatches: orderedBackgroundResults.map((record) => ({
          dispatch_id: record.dispatch_id,
          state: record.state,
          version: record.version,
        })),
      });
    },
  });
}
