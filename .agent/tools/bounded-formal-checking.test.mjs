import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withLedgerLock } from "./work-package.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE = new URL("./work-package.mjs", import.meta.url);
const SCRATCH = path.join(ROOT, ".scratch/r07-bounded-checking-20261107");
const IDS = ["A1", "A2", "B1", "B2"];
const BOUNDS = { actors: 2, requestsPerActor: 2, ledgerKeys: 1, stateCap: 250000 };
const EXPECTATIONS = {
  schema: "r07_model_expectations_v1",
  target: ".agent/tools/work-package.mjs#withLedgerLock",
  queueSourceSha256: "e7aae09c52915259901ee9db223cb9ba6e035ec9eddeb10648f15142aad26855",
  bounds: BOUNDS,
  expected: { target: "PASS", "unconditional-tail-delete": "FAIL", "poisoned-predecessor": "FAIL", "state-cap-control": "INCONCLUSIVE" },
  predicates: {
    mutualExclusion: "At most one callback is running for the normalized ledger path.",
    finiteRejectionRecovery: "Every finalized request invoked its callback exactly once, including requests queued after rejection.",
    closure: "Explore all reachable states without a depth cutoff; state-cap exhaustion is INCONCLUSIVE.",
  },
  replay: "Full source copies retain original API and relative dependencies; one synchronous observation hook acknowledges actual queue publication. The production import is tested separately without instrumentation.",
};
const MUTATIONS = {
  "unconditional-tail-delete": [
    "if (ledgerQueues.get(key) === run) ledgerQueues.delete(key);",
    "ledgerQueues.delete(key);",
  ],
  "poisoned-predecessor": [
    "const run = previous.catch(() => {}).then(() =>",
    "const run = previous.then(() =>",
  ],
};
const HOOK = [
  "ledgerQueues.set(key, run);",
  "ledgerQueues.set(key, run);\n  globalThis[Symbol.for('super-compound.r07.enqueue')]?.(key);",
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const initialState = () => ({ tail: null, requests: IDS.map(() => ({ phase: "absent", predecessor: null, outcome: null, invocations: 0 })) });
const violations = (state) => [
  ...(state.requests.filter((request) => request.phase === "running").length > 1 ? ["mutualExclusion"] : []),
  ...(state.requests.some((request) => request.phase === "finalized" && request.invocations !== 1) ? ["finiteRejectionRecovery"] : []),
];

function replaceOnce(source, [before, after]) {
  assert.equal(source.split(before).length - 1, 1, `source correspondence: ${before}`);
  return source.replace(before, after);
}

// This is a finite protocol model, not an implementation of Promise or filesystem scheduling.
function successors(state, variant) {
  const steps = [];
  const add = (index, kind, change, outcome) => {
    const next = structuredClone(state);
    change(next.requests[index], next);
    steps.push({ state: next, event: { request: IDS[index], kind, ...(outcome ? { outcome } : {}) } });
  };
  // Internal transitions come first so shortest witnesses prefer realizable drained-microtask order.
  for (let index = 0; index < IDS.length; index++) {
    const request = state.requests[index];
    if (request.phase === "queued" && (request.predecessor === null || state.requests[request.predecessor].phase === "finalized")) {
      const poisoned = variant === "poisoned-predecessor" && request.predecessor !== null && state.requests[request.predecessor].outcome === "rejection";
      add(index, poisoned ? "propagate-rejection" : "start", (next) => {
        next.phase = poisoned ? "settled" : "running";
        next.invocations = poisoned ? 0 : 1;
        if (poisoned) next.outcome = "rejection";
      });
    }
    if (request.phase === "settled") add(index, "finalize", (next, whole) => {
      next.phase = "finalized";
      if (variant === "unconditional-tail-delete" || whole.tail === index) whole.tail = null;
    });
  }
  for (let index = 0; index < IDS.length; index++) {
    const request = state.requests[index];
    if (request.phase === "absent" && (index % 2 === 0 || state.requests[index - 1].phase === "finalized")) {
      add(index, "enqueue", (next, whole) => {
        next.phase = "queued";
        next.predecessor = whole.tail;
        whole.tail = index;
      });
    }
    if (request.phase === "running") for (const outcome of ["success", "rejection"]) {
      add(index, "settle", (next) => { next.phase = "settled"; next.outcome = outcome; }, outcome);
    }
  }
  return steps;
}

function explore(variant, stateCap = BOUNDS.stateCap) {
  const initial = initialState();
  const nodes = [{ state: initial, parent: -1, event: null, depth: 0 }];
  const seen = new Set([JSON.stringify(initial)]);
  const counterexamples = {};
  const counterexampleStates = {};
  const witnesses = {};
  let transitions = 0, terminalStates = 0, maximumRunning = 0, maximumDepth = 0, capped = false, capBoundary = null;
  const trace = (index) => {
    const events = [];
    for (; nodes[index].parent !== -1; index = nodes[index].parent) events.push(nodes[index].event);
    return events.reverse();
  };
  const witness = (name, index) => { if (!Object.hasOwn(witnesses, name)) witnesses[name] = trace(index); };
  const statesFor = (index) => {
    const states = [];
    for (; index !== -1; index = nodes[index].parent) states.push(nodes[index].state);
    return states.reverse();
  };
  let visited = 0;
  for (let cursor = 0; cursor < nodes.length; cursor++) {
    visited++;
    const { state } = nodes[cursor];
    maximumDepth = Math.max(maximumDepth, nodes[cursor].depth);
    const running = state.requests.filter((request) => request.phase === "running").length;
    maximumRunning = Math.max(maximumRunning, running);
    for (const property of violations(state)) if (!counterexamples[property]) {
      counterexamples[property] = trace(cursor);
      counterexampleStates[property] = statesFor(cursor);
    }
    if (state.requests.some((request) => request.outcome === "rejection" && request.invocations === 1)) witness("callbackRejection", cursor);
    if (state.requests.some((request) => request.phase === "queued" && request.predecessor !== null && state.requests[request.predecessor].phase === "running")) witness("queuedBehindRunning", cursor);
    if ([1, 3].some((index) => state.requests[index].phase !== "absent")) witness("sameActorSecondRequest", cursor);
    if (state.requests.some((request) => request.phase === "finalized" && request.invocations === 1 && request.predecessor !== null && state.requests[request.predecessor].outcome === "rejection")) witness("recoveredAfterRejectedPredecessor", cursor);
    const next = successors(state, variant);
    if (next.length === 0) {
      terminalStates++;
      assert.ok(state.requests.every((request) => request.phase === "finalized"), "terminating callbacks must permit full drain");
      witness("allFourFinalized", cursor);
    }
    for (const [stepIndex, step] of next.entries()) {
      transitions++;
      const key = JSON.stringify(step.state);
      if (seen.has(key)) continue;
      if (seen.size >= stateCap) {
        capped = true;
        capBoundary = { state, event: step.event, successorState: step.state, unexploredSuccessorCandidates: next.length - stepIndex };
        break;
      }
      seen.add(key);
      nodes.push({ ...step, parent: cursor, depth: nodes[cursor].depth + 1 });
    }
    if (capped) break;
  }
  return {
    variant, verdict: capped ? "INCONCLUSIVE" : Object.keys(counterexamples).length ? "FAIL" : "PASS",
    closureComplete: !capped, depthCutoff: null, stateCap, states: seen.size, visited, transitions, terminalStates,
    maximumRunning, maximumDepth, pendingFrontierStates: nodes.length - visited, capBoundary,
    warnings: capped ? ["State cap exhausted; reachable closure is incomplete and no PASS is issued."] : [],
    counterexamples, counterexampleStates, witnesses,
  };
}

function validateReplay(result, model, property) {
  let state = initialState();
  const events = [], states = [state], inferredEvents = [];
  const accept = (event) => {
    const step = successors(state, model.variant).find((candidate) => JSON.stringify(candidate.event) === JSON.stringify(event));
    assert.ok(step, `runtime replay diverged from model: ${JSON.stringify(event)}`);
    state = step.state;
    events.push(event);
    states.push(state);
  };
  for (const observed of result.events) {
    if (observed.kind === "finalize" && !result.outcomes[observed.request].invoked) {
      assert.equal(result.outcomes[observed.request].status, "rejected");
      const inferred = { request: observed.request, kind: "propagate-rejection" };
      accept(inferred);
      inferredEvents.push({ event: inferred, evidence: "Callback was never invoked and outer promise rejected after its rejected predecessor finalized." });
    }
    accept({ request: observed.request, kind: observed.kind, ...(observed.kind === "settle" ? { outcome: observed.outcome } : {}) });
    if (property && violations(state).includes(property)) break;
  }
  if (property) assert.ok(violations(state).includes(property), `runtime witness must exhibit ${property}`);
  else assert.deepEqual(violations(state), []);
  return {
    variant: model.variant, property: property || null, modelValidatedPrefix: events, states, inferredEvents,
    shortestAbstractTraceExactlyReplayed: property ? JSON.stringify(events) === JSON.stringify(model.counterexamples[property]) : null,
    relationship: property ? "A realizable model-validated witness of the same violation; the shortest abstract trace is retained separately and may order enqueue/settle differently." : "Real source-copy observations form a valid nonviolating model trace.",
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

// Each replay uses an isolated full source copy; only the synchronous publication observation is added.
async function replay(api, ledgerPath, scenario, variant, observeEnqueue) {
  const events = [], requests = new Map(), active = new Set();
  let maximumRunning = 0, publication;
  const begin = async (id) => {
    const entered = deferred(), gate = deferred(), published = deferred();
    publication = () => { events.push({ request: id, kind: "enqueue" }); published.resolve(); };
    const request = { entered, gate, invoked: false };
    requests.set(id, request);
    request.finished = api(id.endsWith("2") ? `${path.dirname(ledgerPath)}/./${path.basename(ledgerPath)}` : ledgerPath, async () => {
      request.invoked = true;
      active.add(id);
      maximumRunning = Math.max(maximumRunning, active.size);
      events.push({ request: id, kind: "start" });
      entered.resolve();
      const outcome = await gate.promise;
      active.delete(id);
      events.push({ request: id, kind: "settle", outcome });
      if (outcome === "rejection") throw new Error(`callback rejection ${id}`);
      return id;
    }).then(
      () => { events.push({ request: id, kind: "finalize", outcome: "success" }); return "fulfilled"; },
      () => { events.push({ request: id, kind: "finalize", outcome: "rejection" }); return "rejected"; },
    );
    await published.promise;
    publication = undefined;
    return request;
  };
  const settle = async (id, outcome) => {
    requests.get(id).gate.resolve(outcome);
    return requests.get(id).finished;
  };
  observeEnqueue(() => publication?.());
  try {
    const first = await begin("A1");
    await first.entered.promise;
    const second = await begin("B1");
    await settle("A1", scenario === "rejection" ? "rejection" : "success");
    if (scenario === "rejection") {
      if (variant === "poisoned-predecessor") await second.finished;
      else { await second.entered.promise; await settle("B1", "success"); }
    } else {
      await second.entered.promise;
      const retry = await begin("A2");
      if (variant === "unconditional-tail-delete") await retry.entered.promise;
      await settle("B1", "success");
      await retry.entered.promise;
      await settle("A2", "success");
    }
    const outcomes = {};
    for (const [id, request] of requests) outcomes[id] = { invoked: request.invoked, status: await request.finished };
    return { scenario, variant, maximumRunning, outcomes, events };
  } finally {
    observeEnqueue(undefined);
    for (const request of requests.values()) request.gate.resolve("success");
    await Promise.all([...requests.values()].map((request) => request.finished));
  }
}

async function productionBehavior(ledgerPath) {
  const events = [], active = new Set();
  let maximumRunning = 0;
  const actor = async (name) => {
    const results = [];
    for (const ordinal of [1, 2]) {
      const id = `${name}${ordinal}`;
      const outcome = await Promise.allSettled([withLedgerLock(ledgerPath, async () => {
        active.add(id);
        maximumRunning = Math.max(maximumRunning, active.size);
        events.push({ request: id, kind: "start" });
        await new Promise(setImmediate);
        active.delete(id);
        events.push({ request: id, kind: "settle", outcome: id === "A1" ? "rejection" : "success" });
        if (id === "A1") throw new Error("intentional callback rejection");
      })]);
      results.push({ request: id, status: outcome[0].status });
    }
    return results;
  };
  const outcomes = (await Promise.all([actor("A"), actor("B")])).flat();
  return { instrumented: false, scheduleClaim: "Sampled API smoke with callbacks spanning an event-loop turn; no enqueue acknowledgment or serialization sensitivity claim.", maximumRunning, events, outcomes };
}

async function sourceIdentity(url, seen = new Map()) {
  if (seen.has(url.href)) return seen;
  const bytes = await readFile(url);
  const source = bytes.toString("utf8");
  seen.set(url.href, { path: fileURLToPath(url), sha256: sha256(bytes), bytes: bytes.length });
  for (const match of source.matchAll(/\bfrom\s*(["'])(\.[^"']+)\1/g)) await sourceIdentity(new URL(match[2], url), seen);
  return seen;
}

function gitIdentity(paths) {
  return {
    head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
    scopedInventory: execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths.map((file) => path.relative(ROOT, file))], { cwd: ROOT, encoding: "utf8" }),
  };
}

test("bounded ledger queue checking binds closure, broken controls, and real API replays", { timeout: 20000 }, async () => {
  const reportPath = path.resolve(process.env.R07_REPORT_PATH || path.join(SCRATCH, "model-report.json"));
  const startedAt = new Date().toISOString();
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ schema: "r07_bounded_checking_v1", root: ROOT, startedAt, verdict: "INCONCLUSIVE", phase: "setup", modelExecuted: false }, null, 2)}\n`);
  try {
  await mkdir(SCRATCH, { recursive: true });
  const expectationsPath = path.join(SCRATCH, "model-expectations.json");
  try { await writeFile(expectationsPath, `${JSON.stringify(EXPECTATIONS, null, 2)}\n`, { flag: "wx" }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  const frozen = await readFile(expectationsPath);
  const before = [...(await sourceIdentity(SOURCE)).values()];
  const checkerBefore = await readFile(fileURLToPath(import.meta.url));
  const source = await readFile(SOURCE, "utf8");
  const queueStart = source.indexOf("export async function withLedgerLock(");
  const queueSource = source.slice(queueStart, source.indexOf("\nfunction reportSkeleton", queueStart)).replace(/\r\n/g, "\n").trim();
  const identityPaths = [...before.map((file) => file.path), fileURLToPath(import.meta.url), expectationsPath];
  const temporary = await mkdtemp(path.join(tmpdir(), "sc-r07-"));
  const report = {
    schema: "r07_bounded_checking_v1", startedAt, phase: "qualification", root: ROOT, command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)],
    gitBefore: gitIdentity(identityPaths), configurationSha256: sha256(JSON.stringify(BOUNDS)),
    environment: { node: process.version, platform: process.platform, architecture: process.arch },
    expectations: { path: expectationsPath, sha256: sha256(frozen), value: EXPECTATIONS }, bounds: BOUNDS,
    assumptions: ["One process and one module instance own one normalized ledger path.", "Actors issue their second request only after their first outer promise finalizes.", "Every invoked callback terminates with the supplied success or rejection; mkdir succeeds.", "Enqueue atomically captures/publishes tail after mkdir; older await-run finalization precedes successor callback or rejection propagation.", "The abstract transition system overapproximates remaining Promise/IO ordering; exact source-copy replay records the realizable causal witness separately."],
    exclusions: ["No unbounded, fairness, cross-process, crash-durability, filesystem-atomicity, ledger-content, or arbitrary callback correctness proof.", "The publication hook is synchronous and observational; the unchanged production import has separate sampled behavioral evidence."],
    correspondence: { queueSource, queueSourceSha256: sha256(queueSource), enqueue: "work-package.mjs:1369-1375 (mkdir, normalized key, predecessor, promise chain, tail)", startAndSettlement: "work-package.mjs:1372-1374 (callback or inherited rejection)", finalize: "work-package.mjs:1376-1379 (outer await and conditional tail cleanup)", mutationPatches: MUTATIONS, observationPatch: HOOK },
    sourceBefore: before, checkerBefore: { sha256: sha256(checkerBefore), bytes: checkerBefore.length },
    models: [], replays: [], replayCorrespondence: [], replaySources: [],
  };
  try {
    assert.deepEqual(JSON.parse(frozen), EXPECTATIONS, "expectations are frozen before model execution");
    assert.equal(sha256(queueSource), EXPECTATIONS.queueSourceSha256, "queue changed: review model/source correspondence before updating its frozen digest");
    report.phase = "model";
    report.models = ["target", ...Object.keys(MUTATIONS)].map((variant) => explore(variant));
    report.capControl = explore("target", 1);
    for (const model of report.models) {
      assert.equal(model.verdict, EXPECTATIONS.expected[model.variant]);
      assert.equal(model.closureComplete, true);
      assert.ok(model.terminalStates > 0);
      for (const name of ["callbackRejection", "queuedBehindRunning", "sameActorSecondRequest", "allFourFinalized"]) assert.ok(model.witnesses[name], `${model.variant}: ${name}`);
    }
    assert.ok(report.models[0].witnesses.recoveredAfterRejectedPredecessor);
    assert.equal(report.models[1].counterexamples.mutualExclusion.length > 0, true);
    assert.equal(report.models[2].counterexamples.finiteRejectionRecovery.length > 0, true);
    assert.equal(report.capControl.verdict, "INCONCLUSIVE");
    assert.equal(report.capControl.closureComplete, false);
    report.phase = "source-copy-replay";
    for (const variant of ["target", ...Object.keys(MUTATIONS)]) {
      const mutation = MUTATIONS[variant];
      const mutated = mutation ? replaceOnce(source, mutation) : source;
      const observed = replaceOnce(mutated, HOOK);
      const importRewrites = [];
      const copy = observed.replace(/\bfrom\s*(["'])(\.[^"']+)\1/g, (full, quote, relative) => {
        const replacement = `from ${quote}${new URL(relative, SOURCE).href}${quote}`;
        importRewrites.push({ before: full, after: replacement });
        return replacement;
      });
      const copyPath = path.join(temporary, `${variant}.mjs`);
      await writeFile(copyPath, copy);
      report.replaySources.push({ variant, source: copy, sha256: sha256(copy), mutation: mutation || null, mutationSha256: sha256(JSON.stringify(mutation || null)), hookSha256: sha256(JSON.stringify(HOOK)), importRewrites });
      const api = (await import(pathToFileURL(copyPath).href)).withLedgerLock;
      const hookKey = Symbol.for("super-compound.r07.enqueue");
      const observe = (listener) => { if (listener) globalThis[hookKey] = listener; else delete globalThis[hookKey]; };
      const scenario = variant === "poisoned-predecessor" ? "rejection" : "cleanup";
      report.replays.push(await replay(api, path.join(temporary, `${variant}-ledger.json`), scenario, variant, observe));
      if (variant === "target") report.replays.push(await replay(api, path.join(temporary, "target-rejection-ledger.json"), "rejection", variant, observe));
    }
    const cleanupTarget = report.replays.find((result) => result.variant === "target" && result.scenario === "cleanup");
    const cleanupMutant = report.replays.find((result) => result.variant === "unconditional-tail-delete");
    const rejectionTarget = report.replays.find((result) => result.variant === "target" && result.scenario === "rejection");
    const rejectionMutant = report.replays.find((result) => result.variant === "poisoned-predecessor");
    assert.equal(cleanupTarget.maximumRunning, 1);
    assert.equal(cleanupMutant.maximumRunning, 2);
    assert.equal(rejectionTarget.outcomes.B1.invoked, true);
    assert.equal(rejectionTarget.outcomes.B1.status, "fulfilled");
    assert.equal(rejectionMutant.outcomes.B1.invoked, false);
    assert.equal(rejectionMutant.outcomes.B1.status, "rejected");
    for (const result of report.replays) report.replayCorrespondence.push(validateReplay(
      result, report.models.find((model) => model.variant === result.variant),
      result.variant === "unconditional-tail-delete" ? "mutualExclusion" : result.variant === "poisoned-predecessor" ? "finiteRejectionRecovery" : null,
    ));
    report.phase = "production-api-smoke";
    report.productionBehavior = await productionBehavior(path.join(temporary, "production-ledger.json"));
    assert.equal(report.productionBehavior.maximumRunning, 1);
    assert.equal(report.productionBehavior.events.filter((event) => event.kind === "start").length, 4);
    assert.equal(report.productionBehavior.outcomes.filter((outcome) => outcome.status === "rejected").length, 1);
    report.phase = "complete";
    report.verdict = "PASS";
  } catch (error) {
    report.verdict = "FAIL";
    report.error = { name: error.name, message: error.message };
    throw error;
  } finally {
    report.sourceAfter = [...(await sourceIdentity(SOURCE)).values()];
    report.gitAfter = gitIdentity(identityPaths);
    report.expectationsAfter = { sha256: sha256(await readFile(expectationsPath)) };
    const checkerAfter = await readFile(fileURLToPath(import.meta.url));
    report.checkerAfter = { sha256: sha256(checkerAfter), bytes: checkerAfter.length };
    report.sourceUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter) && report.checkerBefore.sha256 === report.checkerAfter.sha256 && report.expectations.sha256 === report.expectationsAfter.sha256;
    if (!report.sourceUnchanged) report.verdict = "FAIL";
    report.finishedAt = new Date().toISOString();
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    const cleanupPath = path.resolve(temporary);
    assert.equal(path.dirname(cleanupPath), path.resolve(tmpdir()));
    assert.ok(path.basename(cleanupPath).startsWith("sc-r07-"));
    await rm(cleanupPath, { recursive: true, force: true });
    assert.equal(report.sourceUnchanged, true, "production/model inputs changed during checking");
  }
  } catch (error) {
    const stored = JSON.parse(await readFile(reportPath, "utf8"));
    await writeFile(reportPath, `${JSON.stringify({
      ...stored, verdict: "FAIL", status: stored.phase === "setup" ? "setup-failed" : "verification-failed", finishedAt: new Date().toISOString(),
      error: { name: error.name, message: error.message, ...(error.stderr ? { stderr: error.stderr.toString() } : {}) },
    }, null, 2)}\n`);
    throw error;
  }
});
