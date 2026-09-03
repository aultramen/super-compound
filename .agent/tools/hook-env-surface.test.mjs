import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Pins the hook environment surface: a hook that reads a variable the README
// does not document fails here, so operators can always see every knob.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HOOKS_DIR = path.join(ROOT, ".agent", "hooks");
const README = path.join(HOOKS_DIR, "README.md");
const ENV_READ_PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]+)/g,
  /\benv\.([A-Z][A-Z0-9_]+)/g,
  /readPositiveInteger\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g,
];

async function hookSources() {
  const files = [];
  for (const dir of [HOOKS_DIR, path.join(HOOKS_DIR, "lib")]) {
    for (const name of await readdir(dir)) {
      if (name.endsWith(".js") && name !== "test-hooks-security.js") {
        files.push(path.join(dir, name));
      }
    }
  }
  return files.sort();
}

test("every environment variable a hook reads is documented in .agent/hooks/README.md", async () => {
  const readme = await readFile(README, "utf8");
  const documented = new Set(
    [...readme.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((match) => match[1]),
  );
  const read = new Map();
  for (const file of await hookSources()) {
    const source = await readFile(file, "utf8");
    for (const pattern of ENV_READ_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        if (!read.has(match[1])) read.set(match[1], path.relative(ROOT, file));
      }
    }
  }
  assert.ok(read.size >= 8, `expected the hooks to read env vars, found ${read.size}`);
  const missing = [...read].filter(([name]) => !documented.has(name));
  assert.deepEqual(
    missing.map(([name, file]) => `${name} (${file})`),
    [],
    "undocumented hook env vars: add a row to .agent/hooks/README.md",
  );
});
