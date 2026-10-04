#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {isActiveAsset} from './active-assets.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const tests = fs.readdirSync(directory).filter(name => name.endsWith(".test.mjs")
  && isActiveAsset(`.agent/tools/${name}`)
  && (process.argv.includes('--include-install') || name !== "codex-install.test.mjs")).sort().map(name => path.join(directory, name));
const env = {...process.env};
delete env.NODE_TEST_CONTEXT;
const result = spawnSync(process.execPath, ["--test", ...tests], {stdio: "inherit", env});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
