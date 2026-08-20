import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const WORKFLOWS_DIR = path.join(ROOT, ".agent", "workflows");
const CONTRACTS_DIR = path.join(ROOT, ".agent", "context", "workflows");
const COMMANDS_DIR = path.join(ROOT, ".claude", "commands");

async function listNames(dir, suffix) {
  return (await readdir(dir))
    .filter((file) => file.endsWith(suffix))
    .map((file) => file.slice(0, -suffix.length))
    .sort();
}

test("workflows, contracts, and Claude commands stay in exact 1:1:1 pairing", async () => {
  const workflows = (await listNames(WORKFLOWS_DIR, ".md")).filter((name) =>
    name.startsWith("sc-"),
  );
  const contracts = await listNames(CONTRACTS_DIR, ".contract.md");
  const commands = await listNames(COMMANDS_DIR, ".md");

  assert.ok(workflows.length > 0, "no sc-* workflows found");
  assert.deepEqual(
    contracts,
    workflows,
    "every sc-* workflow needs exactly one contract, and no contract may lack a workflow",
  );
  assert.deepEqual(
    commands,
    workflows,
    "every sc-* workflow needs exactly one .claude/commands entry, and no command may lack a workflow",
  );
});

test("each Claude command routes contract-first to its own paths", async () => {
  const commands = await listNames(COMMANDS_DIR, ".md");

  for (const name of commands) {
    const text = await readFile(path.join(COMMANDS_DIR, `${name}.md`), "utf8");
    assert.ok(
      text.includes(`.agent/context/workflows/${name}.contract.md`),
      `${name}.md must read its own contract first`,
    );
    assert.ok(
      text.includes(`.agent/workflows/${name}.md`),
      `${name}.md must escalate only to its own workflow`,
    );
    const contractRefs =
      text.match(/\.agent\/context\/workflows\/[a-z0-9-]+\.contract\.md/gu) ?? [];
    for (const ref of contractRefs) {
      assert.equal(
        ref,
        `.agent/context/workflows/${name}.contract.md`,
        `${name}.md references a foreign contract`,
      );
    }
    assert.match(text, /\$ARGUMENTS/u, `${name}.md must forward $ARGUMENTS`);
  }
});
