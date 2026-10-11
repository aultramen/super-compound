import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

try {
  const { values } = parseArgs({ options: {
    input: { type: "string" }, output: { type: "string" },
  } });
  if (!values.input || !values.output) throw new Error("--input and --output are required");
  const input = await realpath(values.input);
  const output = await realpath(values.output).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return path.resolve(values.output);
  });
  if (input === output) throw new Error("input and output must be different files");
  const source = JSON.parse((await readFile(input, "utf8")).replace(/^\uFEFF/u, ""));
  if (!Array.isArray(source.testResults)) throw new Error("missing Vitest testResults array");
  const counts = { total: 0, passed: 0, failed: 0, skipped: 0 };
  for (const suite of source.testResults) {
    if (!Array.isArray(suite.assertionResults)) throw new Error("missing assertionResults array");
    for (const assertion of suite.assertionResults) {
      if (assertion.status === "passed") counts.passed += 1;
      else if (assertion.status === "failed") counts.failed += 1;
      else if (["pending", "todo", "skipped"].includes(assertion.status)) counts.skipped += 1;
      else throw new Error(`unsupported assertion status: ${assertion.status}`);
      counts.total += 1;
    }
  }
  if (source.numTotalTests !== counts.total) throw new Error("Vitest summary disagrees with observed assertions");
  for (const [name, count] of [["numPassedTests", counts.passed], ["numFailedTests", counts.failed]]) {
    if (source[name] !== undefined && source[name] !== count) {
      throw new Error("Vitest summary disagrees with observed assertions");
    }
  }
  for (const name of ["numPendingTests", "numTodoTests", "numFailedTestSuites", "numRuntimeErrorTestSuites"]) {
    if (source[name] !== undefined && (!Number.isInteger(source[name]) || source[name] < 0)) {
      throw new Error(`invalid Vitest summary count: ${name}`);
    }
    if (source[name] > 0 && counts.failed === 0 && counts.skipped === 0) {
      throw new Error("Vitest summary reports failures or skips absent from observed assertions");
    }
  }
  const status = !counts.total || counts.failed || source.success !== true
    ? "fail" : counts.skipped ? "skip" : "pass";
  const report = {
    schema: "standards_check_outcome_v1", status,
    observed: `Parsed ${counts.total} assertion outcomes: ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped`,
    counts,
  };
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.exitCode = status === "pass" ? 0 : 1;
} catch (error) {
  process.stderr.write(`Vitest outcome error: ${error.message}\n`);
  process.exitCode = 2;
}
