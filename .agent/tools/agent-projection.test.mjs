import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MappingError, projectAgents } from "./agent-projection.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const TOOL = path.join(ROOT, ".agent", "tools", "agent-projection.mjs");
const AGENTS = ["architect", "brain", "build-fixer", "code-reviewer", "doc-updater", "e2e-runner"];
const CLAUDE_MODELS = ["inherit", "sonnet", "opus", "haiku"];

const ALPHA_BODY = "\n# Alpha\n\nBody line one.\n\n- bullet\n";
const GOOD = {
  schema: "agent_models_v1",
  hosts: {
    "claude-code": { alpha: "inherit", beta: "sonnet" },
    codex: { alpha: "inherit", beta: "gpt-x" },
  },
};

function fixture(mapping) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-projection-"));
  fs.mkdirSync(path.join(root, ".agent", "agents"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agent", "context"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".agent", "agents", "alpha.md"),
    `---\nname: alpha\ndescription: Alpha agent.\ntools: ["Read", "Grep"]\n---\n${ALPHA_BODY}`,
  );
  fs.writeFileSync(
    path.join(root, ".agent", "agents", "beta.md"),
    '---\nname: beta\ndescription: Beta agent.\ntools: ["Bash"]\n---\n\nBeta body.\n',
  );
  fs.writeFileSync(path.join(root, ".agent", "context", "agent-models.json"), JSON.stringify(mapping));
  return root;
}

function run(root, ...flags) {
  return spawnSync(process.execPath, [TOOL, "--root", root, ...flags], { encoding: "utf8" });
}

test("projects prompt plus claude-code model into .claude/agents deterministically", () => {
  const root = fixture(GOOD);
  const first = projectAgents({ root });
  assert.deepEqual(first.written, [".claude/agents/alpha.md", ".claude/agents/beta.md"]);

  const alpha = fs.readFileSync(path.join(root, ".claude", "agents", "alpha.md"), "utf8");
  assert.equal(
    alpha,
    "---\nname: alpha\ndescription: Alpha agent.\ntools: Read, Grep\nmodel: inherit\n---\n\nRead `.agent/agents/alpha.md` in this project first and follow it as your adapter; it is the canonical prompt for this agent.\n",
  );
  assert.equal(alpha.includes(ALPHA_BODY.trim()), false, "body is a pointer, never a copy");
  const beta = fs.readFileSync(path.join(root, ".claude", "agents", "beta.md"), "utf8");
  assert.match(beta, /^---\nname: beta\ndescription: Beta agent\.\ntools: Bash\nmodel: sonnet\n---\n\nRead `\.agent\/agents\/beta\.md`/u);

  projectAgents({ root });
  assert.equal(fs.readFileSync(path.join(root, ".claude", "agents", "alpha.md"), "utf8"), alpha);
  assert.deepEqual(projectAgents({ root, write: false }).drifted, []);
  assert.equal(run(root, "--check").status, 0);
});

test("--check reports missing and drifted files without writing", () => {
  const root = fixture(GOOD);
  const missing = run(root, "--check");
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /alpha\.md \(missing\)/u);
  assert.match(missing.stderr, /beta\.md \(missing\)/u);
  assert.equal(fs.existsSync(path.join(root, ".claude")), false);

  assert.equal(run(root).status, 0);
  fs.appendFileSync(path.join(root, ".claude", "agents", "beta.md"), "edited\n");
  const drifted = run(root, "--check");
  assert.equal(drifted.status, 1);
  assert.match(drifted.stderr, /beta\.md \(drifted\)/u);
  assert.doesNotMatch(drifted.stderr, /alpha\.md/u);
});

test("mapping validation rejects omitted, unknown, and invalid entries with exit 2", () => {
  const cases = [
    [{ hosts: { "claude-code": { alpha: "inherit" }, codex: GOOD.hosts.codex } }, /claude-code: missing agent "beta"/u],
    [{ hosts: { "claude-code": GOOD.hosts["claude-code"], codex: { alpha: "inherit" } } }, /codex: missing agent "beta"/u],
    [{ hosts: { "claude-code": { ...GOOD.hosts["claude-code"], gamma: "opus" }, codex: GOOD.hosts.codex } }, /unknown agent "gamma"/u],
    [{ hosts: { "claude-code": { alpha: "inherit", beta: "gpt-x" }, codex: GOOD.hosts.codex } }, /"beta" model "gpt-x" not in/u],
    [{ hosts: { codex: GOOD.hosts.codex } }, /missing host "claude-code"/u],
  ];
  for (const [mapping, expected] of cases) {
    const root = fixture(mapping);
    assert.throws(() => projectAgents({ root, write: false }), MappingError);
    const result = run(root, "--check");
    assert.equal(result.status, 2);
    assert.match(result.stderr, expected);
    assert.equal(fs.existsSync(path.join(root, ".claude")), false);
  }
});

test("repository .claude/agents is in sync with .agent/agents and the mapping", () => {
  const result = spawnSync(process.execPath, [TOOL, "--check"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const files = fs.readdirSync(path.join(ROOT, ".claude", "agents")).sort();
  assert.deepEqual(files, AGENTS.map((name) => `${name}.md`));
});

test("repository mapping covers exactly the six agents for both hosts with valid Claude values", () => {
  const mapping = JSON.parse(fs.readFileSync(path.join(ROOT, ".agent", "context", "agent-models.json"), "utf8"));
  assert.equal(mapping.schema, "agent_models_v1");
  assert.deepEqual(Object.keys(mapping.hosts).sort(), ["claude-code", "codex"]);
  for (const host of Object.values(mapping.hosts)) {
    assert.deepEqual(Object.keys(host).sort(), AGENTS);
  }
  for (const model of Object.values(mapping.hosts["claude-code"])) {
    assert.ok(CLAUDE_MODELS.includes(model), `invalid claude-code model ${model}`);
  }
  for (const name of AGENTS) {
    const source = fs.readFileSync(path.join(ROOT, ".agent", "agents", `${name}.md`), "utf8");
    assert.doesNotMatch(source, /^model:/mu, `${name}.md still carries a model line; the mapping is the source of truth`);
  }
});
