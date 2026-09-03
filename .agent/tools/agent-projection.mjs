#!/usr/bin/env node
/**
 * agent-projection - project .agent/agents/*.md into .claude/agents/*.md.
 *
 * Claude Code discovers subagents only from .claude/agents/, and no host
 * reads a model from .agent/agents/ frontmatter. The prompt stays in
 * .agent/agents/<name>.md; the per-host model lives in
 * .agent/context/agent-models.json. This tool joins the two into one native
 * Claude Code subagent file per agent. Output is deterministic: same input,
 * byte-identical files.
 *
 * Usage: node .agent/tools/agent-projection.mjs [--check] [--root <repo-root>]
 *   default  write .claude/agents/*.md and print the files written (exit 0)
 *   --check  write nothing; exit 1 and list missing/drifted files
 *   exit 2   agent-models.json is invalid (message on stderr)
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./knowledge-search.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const AGENTS_DIR = path.join(".agent", "agents");
const MODELS_FILE = path.join(".agent", "context", "agent-models.json");
const OUT_DIR = path.join(".claude", "agents");
const CLAUDE_HOST = "claude-code";
const CLAUDE_MODELS = new Set(["inherit", "sonnet", "opus", "haiku"]);

export class MappingError extends Error {}

function listAgents(root) {
  return fs
    .readdirSync(path.join(root, AGENTS_DIR))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3))
    .sort();
}

export function loadModels(root, names) {
  const hosts = JSON.parse(fs.readFileSync(path.join(root, MODELS_FILE), "utf8")).hosts ?? {};
  const errors = [];
  if (!hosts[CLAUDE_HOST]) errors.push(`missing host "${CLAUDE_HOST}"`);
  for (const [host, models] of Object.entries(hosts)) {
    for (const name of names) {
      if (!(name in models)) errors.push(`${host}: missing agent "${name}"`);
    }
    for (const [name, model] of Object.entries(models)) {
      if (!names.includes(name)) errors.push(`${host}: unknown agent "${name}"`);
      if (host === CLAUDE_HOST && !CLAUDE_MODELS.has(model)) {
        errors.push(`${host}: "${name}" model "${model}" not in ${[...CLAUDE_MODELS].join("|")}`);
      }
    }
  }
  if (errors.length > 0) throw new MappingError(`${MODELS_FILE}: ${errors.join("; ")}`);
  return hosts;
}

function render(name, raw, model) {
  const { meta } = parseFrontmatter(raw);
  if (!meta.tools) throw new MappingError(`${AGENTS_DIR}/${name}.md: frontmatter has no tools`);
  const tools = JSON.parse(meta.tools).join(", ");
  // The projected body is a pointer, not a copy: `.agent/agents/<name>.md`
  // stays the single canonical prompt (the framework audit rejects duplicated
  // paragraphs across files), and the subagent reads it with its own Read tool.
  return `---\nname: ${name}\ndescription: ${meta.description}\ntools: ${tools}\nmodel: ${model}\n---\n\nRead \`${AGENTS_DIR}/${name}.md\` in this project first and follow it as your adapter; it is the canonical prompt for this agent.\n`;
}

export function projectAgents({ root = REPO_ROOT, write = true } = {}) {
  const names = listAgents(root);
  const models = loadModels(root, names)[CLAUDE_HOST];
  const written = [];
  const drifted = [];
  for (const name of names) {
    const raw = fs.readFileSync(path.join(root, AGENTS_DIR, `${name}.md`), "utf8");
    const content = render(name, raw, models[name]);
    const relative = path.join(OUT_DIR, `${name}.md`);
    const target = path.join(root, relative);
    if (write) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
      written.push(relative);
      continue;
    }
    if (!fs.existsSync(target)) drifted.push(`${relative} (missing)`);
    else if (fs.readFileSync(target, "utf8") !== content) drifted.push(`${relative} (drifted)`);
  }
  return { names, written, drifted };
}

function main(argv) {
  const args = argv.slice(2);
  const check = args.includes("--check");
  const rootIndex = args.indexOf("--root");
  const root = rootIndex === -1 ? REPO_ROOT : path.resolve(args[rootIndex + 1]);
  let result;
  try {
    result = projectAgents({ root, write: !check });
  } catch (error) {
    if (!(error instanceof MappingError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  if (!check) {
    process.stdout.write(`${result.written.join("\n")}\n`);
    return 0;
  }
  if (result.drifted.length === 0) {
    process.stdout.write(`${OUT_DIR}/ is up to date (${result.names.length} agents)\n`);
    return 0;
  }
  process.stderr.write(
    `${OUT_DIR}/ is stale; run: npm run agents:project\n${result.drifted.map((f) => `  ${f}`).join("\n")}\n`,
  );
  return 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main(process.argv));
}
