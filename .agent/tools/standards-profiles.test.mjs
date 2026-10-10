import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const checker = path.join(repoRoot, ".agent/standards/tools/python-boundaries.py");

async function runBoundaryCheck(t, source, mapping = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-python-boundaries-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "app/domain"), { recursive: true });
  await writeFile(path.join(root, "app/domain/service.py"), source);
  await writeFile(path.join(root, "boundaries.json"), JSON.stringify({
    schema: "python_boundaries_v1",
    sourceRoots: ["app"],
    rules: [{ from: "app.domain", forbidden: ["fastapi", "app.api"] }],
    ...mapping,
  }));
  return spawnSync(process.env.SC_PYTHON_BINARY ?? "python", [
    checker, "--root", root, "--config", "boundaries.json",
  ], { encoding: "utf8" });
}

test("Python boundary gate rejects an inserted forbidden framework import", async (t) => {
  const result = await runBoundaryCheck(t, "from fastapi import FastAPI\n");
  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "failed");
  assert.equal(report.filesChecked, 1);
  assert.equal(report.violations[0].import, "fastapi");
});

test("Python boundary gate resolves relative imports without forbidding unrelated names", async (t) => {
  const rejected = await runBoundaryCheck(t, "from ..api import router\n");
  assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
  assert.equal(JSON.parse(rejected.stdout).violations[0].import, "app.api");
  const accepted = await runBoundaryCheck(t, "import math\nimport fastapi_helpers\n");
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  assert.deepEqual(JSON.parse(accepted.stdout).violations, []);
});

test("every Python boundary rule must map a discovered module even without imports", async (t) => {
  const typo = { from: "app.domian", forbidden: ["fastapi"] };
  const mapped = { from: "app.domain", forbidden: ["fastapi"] };
  for (const rules of [[typo], [mapped, typo]]) {
    const result = await runBoundaryCheck(t, "VALUE = 1\n", { rules });
    assert.equal(result.status, 2, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "error");
    assert.match(report.error, /app\.domian.*matches no discovered Python modules/);
  }
  const valid = await runBoundaryCheck(t, "VALUE = 1\n", { rules: [mapped] });
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  assert.deepEqual(JSON.parse(valid.stdout).mappedRules, [{ from: "app.domain", modules: 1 }]);
});

test("pytest adapter derives a passing outcome from real JUnit test cases", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-pytest-outcome-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "junit.xml");
  const output = path.join(root, "outcome.json");
  await writeFile(input, '<testsuites><testsuite tests="2"><testcase name="first"/><testcase name="second"/></testsuite></testsuites>');
  const result = spawnSync(process.env.SC_PYTHON_BINARY ?? "python", [
    path.join(repoRoot, ".agent/standards/tools/pytest-outcome.py"),
    "--input", input, "--output", output,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(output, "utf8"));
  assert.equal(report.schema, "standards_check_outcome_v1");
  assert.equal(report.status, "pass");
  assert.match(report.observed, /2 testcase outcomes/);
  assert.deepEqual(report.counts, { total: 2, passed: 2, failed: 0, skipped: 0 });
});

test("Vitest adapter derives outcomes from assertion records", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-vitest-outcome-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "vitest.json");
  const output = path.join(root, "outcome.json");
  await writeFile(input, JSON.stringify({ success: true, numTotalTests: 1,
    testResults: [{ assertionResults: [{ status: "passed", fullName: "route validates request" }] }] }));
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, ".agent/standards/tools/vitest-outcome.mjs"),
    "--input", input, "--output", output,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(output, "utf8"));
  assert.equal(report.schema, "standards_check_outcome_v1");
  assert.equal(report.status, "pass");
  assert.match(report.observed, /1 assertion outcomes/);
  assert.deepEqual(report.counts, { total: 1, passed: 1, failed: 0, skipped: 0 });
});

test("standards bundles provide scoped mandatory checks with valid normative source anchors", async () => {
  for (const [file, checks] of [
    ["core.json", ["review", "test", "security"]],
    ["profiles/nextjs-typescript.json", ["format", "lint", "type", "architecture"]],
    ["profiles/fastapi-python.json", ["format", "lint", "type", "architecture"]],
  ]) {
    const bundle = JSON.parse(await readFile(path.join(repoRoot, ".agent/standards", file), "utf8"));
    assert.equal(bundle.schema, "standards_bundle_v1");
    assert.equal(bundle.version, "1.0.0");
    assert.equal(bundle.adoption, "candidate");
    assert.deepEqual(bundle.rules.filter((rule) => rule.level === "mandatory").map((rule) => rule.check).sort(), checks.sort());
    assert.equal(new Set(bundle.rules.map((rule) => rule.id)).size, bundle.rules.length);
    for (const rule of bundle.rules) {
      assert.ok(rule.owner && rule.source);
      const [source, anchor] = rule.source.split("#");
      const text = await readFile(path.join(repoRoot, source), "utf8");
      assert.ok(text.includes(`id="${anchor}"`) || text.includes(`# ${anchor.replaceAll("-", " ")}`), rule.source);
    }
  }
});

test("Python manifest evidence ignores commented declarations and reports literal dependencies", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-python-manifest-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "pyproject.toml");
  const tool = path.join(repoRoot, ".agent/standards/tools/python-manifest.py");
  await writeFile(input, '# fastapi==9.9.9\n[project]\nname="example"\ndependencies=["httpx==0.28.1"]\n');
  let result = spawnSync(process.env.SC_PYTHON_BINARY ?? "python", [tool, "--input", input], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).dependencies, { httpx: "==0.28.1" });
  await writeFile(input, '[project]\ndependencies=["fastapi[standard]==0.141.1", "httpx>=0.28,<1"]\n');
  result = spawnSync(process.env.SC_PYTHON_BINARY ?? "python", [tool, "--input", input], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).dependencies, { fastapi: "==0.141.1", httpx: ">=0.28,<1" });
});

test("Next.js reference service and route validate input without a server", () => {
  const example = path.join(repoRoot, ".agent/standards/examples/nextjs-typescript");
  const code = `import assert from 'node:assert/strict';
    import { greeting } from './src/lib/services/greeting.ts';
    import { GET } from './src/app/api/greeting/route.ts';
    assert.equal(greeting('  Ada  '), 'Hello, Ada!');
    assert.throws(() => greeting('   '), RangeError);
    const good = GET(new Request('http://localhost/api/greeting?name=Ada'));
    assert.equal(good.status, 200);
    assert.deepEqual(await good.json(), { message: 'Hello, Ada!' });
    const bad = GET(new Request('http://localhost/api/greeting?name=%20%20'));
    assert.equal(bad.status, 422);
    assert.deepEqual(await bad.json(), { error: 'Name must contain 1 to 50 characters.' });`;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code], {
    cwd: example, encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("pytest adapter rejects unrelated XML instead of inventing observed tests", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-pytest-invalid-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "junit.xml");
  const output = path.join(root, "outcome.json");
  await writeFile(input, '<unrelated><testcase name="not a test run"/></unrelated>');
  const result = spawnSync(process.env.SC_PYTHON_BINARY ?? "python", [
    path.join(repoRoot, ".agent/standards/tools/pytest-outcome.py"),
    "--input", input, "--output", output,
  ], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stderr || result.stdout);
});

test("test adapters never pass empty, failed, skipped or contradictory outcomes", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-test-outcomes-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const scenarios = [
    ["pytest", '<testsuite tests="0"/>', 1, "fail"],
    ["pytest", '<testsuite tests="1"><testcase><skipped/></testcase></testsuite>', 1, "skip"],
    ["pytest", '<testsuite tests="1"><testcase><error/></testcase></testsuite>', 1, "fail"],
    ["pytest", '<testsuite tests="4"><testcase/></testsuite>', 2],
    ["pytest", '<testsuite tests="1" skipped="1"><testcase/></testsuite>', 2],
    ["pytest", '<testsuite tests="1" failures="1"><testcase/></testsuite>', 2],
    ["vitest", { success: true, numTotalTests: 0, testResults: [] }, 1, "fail"],
    ["vitest", { success: true, numTotalTests: 1, testResults: [{ assertionResults: [{ status: "pending" }] }] }, 1, "skip"],
    ["vitest", { success: false, numTotalTests: 1, testResults: [{ assertionResults: [{ status: "failed" }] }] }, 1, "fail"],
    ["vitest", { success: true, numTotalTests: 4, testResults: [{ assertionResults: [{ status: "passed" }] }] }, 2],
    ["vitest", { success: true, numTotalTests: 1, numPendingTests: 1, testResults: [{ assertionResults: [{ status: "passed" }] }] }, 2],
    ["vitest", { success: true, numTotalTests: 1, numFailedTests: 1, testResults: [{ assertionResults: [{ status: "passed" }] }] }, 2],
  ];
  for (const [index, [kind, fixture, exit, status]] of scenarios.entries()) {
    const input = path.join(root, `source-${index}`);
    const output = path.join(root, `outcome-${index}.json`);
    await writeFile(input, typeof fixture === "string" ? fixture : JSON.stringify(fixture));
    const python = kind === "pytest";
    const result = spawnSync(python ? process.env.SC_PYTHON_BINARY ?? "python" : process.execPath, [
      path.join(repoRoot, `.agent/standards/tools/${python ? "pytest-outcome.py" : "vitest-outcome.mjs"}`),
      "--input", input, "--output", output,
    ], { encoding: "utf8" });
    assert.equal(result.status, exit, `${kind}: ${result.stderr || result.stdout}`);
    if (status) assert.equal(JSON.parse(await readFile(output, "utf8")).status, status);
  }
});

test("Python boundary checks fail on invalid mapping, escaping scope and malformed source", async (t) => {
  for (const [source, mapping] of [
    ["import math\n", { rules: [] }],
    ["import math\n", { sourceRoots: [".."] }],
    ["def broken(:\n", {}],
  ]) {
    const result = await runBoundaryCheck(t, source, mapping);
    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).status, "error");
  }
});

test("Poetry ranges stay literal and conflicting or malformed manifest evidence is rejected", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-poetry-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "pyproject.toml");
  const tool = path.join(repoRoot, ".agent/standards/tools/python-manifest.py");
  for (const [source, expectedExit] of [
    ['[tool.poetry.dependencies]\npython="^3.12"\nfastapi={version="^0.141.1"}\n', 0],
    ['[project]\ndependencies=["fastapi==0.141.1"]\n[tool.poetry.dependencies]\nfastapi="^0.143"\n', 2],
    ['[project\n', 2],
  ]) {
    await writeFile(input, source);
    const result = spawnSync(process.env.SC_PYTHON_BINARY ?? "python", [tool, "--input", input], { encoding: "utf8" });
    assert.equal(result.status, expectedExit, result.stderr || result.stdout);
    if (!expectedExit) assert.deepEqual(JSON.parse(result.stdout).dependencies, { fastapi: "^0.141.1" });
  }
});
