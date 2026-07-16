import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalDirectories = [
  "context",
  "workflows",
  "skills",
  "templates",
  "rules",
  "agents",
  "hooks",
  "tools",
];

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function walkFiles(root, current = root) {
  const files = [];

  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(root, absolute));
    } else if (entry.isFile()) {
      files.push(normalizePath(relative(root, absolute)));
    }
  }

  return files.sort();
}

function walkCanonicalFiles(root) {
  return walkFiles(root).filter((path) => {
    const segments = path.split("/");
    return !segments.includes("__pycache__") && !/\.(?:pyc|pyo)$/i.test(path);
  });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function runInstaller(codexHome, ...extraArguments) {
  return runInstallerFrom(repoRoot, codexHome, process.env, ...extraArguments);
}

function runInstallerFrom(sourceRoot, codexHome, env, ...extraArguments) {
  const sourceInstaller = join(sourceRoot, ".codex", "install-super-compound.ps1");
  return spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      sourceInstaller,
      "-CodexHome",
      codexHome,
      ...extraArguments,
    ],
    { cwd: sourceRoot, encoding: "utf8", env },
  );
}

test("routes through a compact workflow contract before full workflow detail", () => {
  const adapterSkill = readFileSync(join(repoRoot, ".codex", "SKILL.md"), "utf8");
  const compactRoute = ".agent/context/workflows/sc-X.contract.md";
  const fallbackCompactRoute = "references/context/workflows/sc-X.contract.md";

  assert.match(
    adapterSkill,
    /^description:.*Super Compound.*\.agent.*workflow/im,
  );
  assert.match(adapterSkill, /never\s+preload/i);
  assert.notEqual(adapterSkill.indexOf(compactRoute), -1);
  assert.match(adapterSkill, /full workflow only/i);
  assert.notEqual(adapterSkill.indexOf(fallbackCompactRoute), -1);
  assert.match(adapterSkill, /fallback.*\.agent\/.*references\//i);
  assert.doesNotMatch(adapterSkill, /routing-index\.md/i);
});

test("bundles runtime tools referenced by fallback contracts and skills", () => {
  assert.equal(canonicalDirectories.includes("tools"), true);
  for (const tool of [
    "git-workflow.mjs",
    "work-package.mjs",
    "token-benchmark.mjs",
  ]) {
    assert.equal(existsSync(join(repoRoot, ".agent", "tools", tool)), true);
  }
});

test("installs an exact, hashed Codex bundle from canonical .agent sources", (t) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "super-compound-codex-"));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

  const codexHome = join(temporaryRoot, "codex-home");
  const result = runInstaller(codexHome);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const target = join(codexHome, "skills", "super-compound");
  const expected = new Map([
    ["SKILL.md", sha256(join(repoRoot, ".codex", "SKILL.md"))],
  ]);

  for (const directory of canonicalDirectories) {
    const sourceRoot = join(repoRoot, ".agent", directory);
    for (const path of walkCanonicalFiles(sourceRoot)) {
      expected.set(
        `references/${directory}/${path}`,
        sha256(join(sourceRoot, path)),
      );
    }
  }

  const actualFiles = walkFiles(target).filter((path) => path !== "manifest.json");
  assert.deepEqual(actualFiles, [...expected.keys()].sort());
  assert.equal(actualFiles.some((path) => path.includes("/__pycache__/")), false);

  for (const [path, expectedHash] of expected) {
    assert.equal(sha256(join(target, path)), expectedHash, path);
  }

  const manifest = JSON.parse(readFileSync(join(target, "manifest.json"), "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.algorithm, "SHA256");
  assert.deepEqual(
    manifest.files,
    [...expected]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([path, hash]) => ({ path, sha256: hash })),
  );
  assert.doesNotMatch(
    JSON.stringify(manifest),
    new RegExp(repoRoot.replaceAll("\\", "\\\\"), "i"),
  );

  const installedSkill = readFileSync(join(target, "SKILL.md"), "utf8");
  assert.ok(
    installedSkill.indexOf(".agent/context/workflows/sc-X.contract.md") <
      installedSkill.indexOf("references/context/workflows/sc-X.contract.md"),
    "the live contract must precede the bundled fallback",
  );
  assert.match(
    installedSkill,
    /bare.*context.*workflows.*skills.*templates.*rules.*agents.*hooks.*tools.*references\//is,
  );
  assert.match(installedSkill, /workflow-(?:local|relative).*sc-\*\.md.*references\/workflows\//is);

  const compactResearch = join(
    target,
    "references",
    "context",
    "workflows",
    "sc-research.contract.md",
  );
  const fullResearch = join(target, "references", "workflows", "sc-research.md");
  const context7Skill = join(
    target,
    "references",
    "skills",
    "context7-docs",
    "SKILL.md",
  );
  assert.equal(statSync(compactResearch).isFile(), true);
  assert.equal(statSync(fullResearch).isFile(), true);
  assert.match(readFileSync(fullResearch, "utf8"), /skills\/context7-docs\/SKILL\.md/);
  assert.equal(statSync(context7Skill).isFile(), true);

  const uiReadinessReference = join(
    target,
    "references",
    "skills",
    "agentic-delivery",
    "references",
    "ui-contract-readiness.md",
  );
  assert.equal(statSync(uiReadinessReference).isFile(), true);
  assert.match(readFileSync(uiReadinessReference, "utf8"), /READY_FOR_SLICE/);

  for (const [relativePath, marker] of [
    ["references/workflows/sc-prd.md", /experience_baseline_status/],
    ["references/workflows/sc-ui.md", /PRD_CHANGE_REQUIRED/],
    ["references/workflows/sc-plan.md", /FIRST_VERTICAL_SLICE/],
    ["references/templates/agentic-delivery/skeletons/PRD-Skeleton.md", /UI Experience Gate/],
    ["references/templates/agentic-delivery/skeletons/FSD-Skeleton.md", /Screen & Interaction Contract/],
  ]) {
    assert.match(readFileSync(join(target, ...relativePath.split("/")), "utf8"), marker);
  }

  const installedExplore = readFileSync(
    join(target, "references", "workflows", "sc-explore.md"),
    "utf8",
  );
  assert.match(installedExplore, /sc-research\.md/);
  assert.equal(statSync(join(target, "references", "workflows", "sc-research.md")).isFile(), true);
  assert.equal(statSync(join(target, "manifest.json")).isFile(), true);
});

test("verifies drift, repairs stale files, and makes a clean reinstall a no-op", (t) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "super-compound-codex-"));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

  const codexHome = join(temporaryRoot, "codex-home");
  const firstInstall = runInstaller(codexHome);
  assert.equal(firstInstall.status, 0, `${firstInstall.stdout}\n${firstInstall.stderr}`);

  const target = join(codexHome, "skills", "super-compound");
  const staleFile = join(target, "references", "workflows", "stale.md");
  mkdirSync(dirname(staleFile), { recursive: true });
  writeFileSync(staleFile, "stale\n");

  const staleVerification = runInstaller(codexHome, "-VerifyOnly");
  assert.notEqual(staleVerification.status, 0);
  assert.match(
    `${staleVerification.stdout}\n${staleVerification.stderr}`,
    /verification.*stale|unexpected.*stale/i,
  );
  assert.equal(
    readFileSync(staleFile, "utf8"),
    "stale\n",
    "verification must be read-only",
  );

  const repair = runInstaller(codexHome);
  assert.equal(repair.status, 0, `${repair.stdout}\n${repair.stderr}`);
  assert.equal(existsSync(staleFile), false);

  const manifestPath = join(target, "manifest.json");
  const manifestBefore = readFileSync(manifestPath, "utf8");
  const manifestMtimeBefore = statSync(manifestPath).mtimeMs;
  const secondInstall = runInstaller(codexHome);
  assert.equal(
    secondInstall.status,
    0,
    `${secondInstall.stdout}\n${secondInstall.stderr}`,
  );
  assert.match(secondInstall.stdout, /already current/i);
  assert.equal(readFileSync(manifestPath, "utf8"), manifestBefore);
  assert.equal(statSync(manifestPath).mtimeMs, manifestMtimeBefore);

  const cleanVerification = runInstaller(codexHome, "-VerifyOnly");
  assert.equal(
    cleanVerification.status,
    0,
    `${cleanVerification.stdout}\n${cleanVerification.stderr}`,
  );
  assert.match(cleanVerification.stdout, /verified/i);

  const installedWorkflow = join(target, "references", "workflows", "sc-init.md");
  writeFileSync(installedWorkflow, "tampered\n");
  const tamperedVerification = runInstaller(codexHome, "-VerifyOnly");
  assert.notEqual(tamperedVerification.status, 0);
  assert.match(
    `${tamperedVerification.stdout}\n${tamperedVerification.stderr}`,
    /verification.*hash|hash.*mismatch/i,
  );

  const tamperRepair = runInstaller(codexHome);
  assert.equal(tamperRepair.status, 0, `${tamperRepair.stdout}\n${tamperRepair.stderr}`);
  assert.equal(
    sha256(installedWorkflow),
    sha256(join(repoRoot, ".agent", "workflows", "sc-init.md")),
  );
});

test("refuses a destination reparse point that escapes CODEX_HOME", (t) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "super-compound-codex-"));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

  const codexHome = join(temporaryRoot, "codex-home");
  const skillsRoot = join(codexHome, "skills");
  const outsideRoot = join(temporaryRoot, "outside");
  const sentinel = join(outsideRoot, "sentinel.txt");
  mkdirSync(codexHome, { recursive: true });
  mkdirSync(outsideRoot, { recursive: true });
  writeFileSync(sentinel, "preserve\n");
  symlinkSync(outsideRoot, skillsRoot, "junction");

  const result = runInstaller(codexHome);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /reparse point|path confinement/i);
  assert.equal(readFileSync(sentinel, "utf8"), "preserve\n");
  assert.equal(existsSync(join(outsideRoot, "super-compound")), false);
});

test("failed staged update preserves the previous verified installation", (t) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "super-compound-codex-"));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

  const sourceRoot = join(temporaryRoot, "source");
  const codexHome = join(temporaryRoot, "codex-home");
  mkdirSync(sourceRoot, { recursive: true });
  cpSync(join(repoRoot, ".agent"), join(sourceRoot, ".agent"), { recursive: true });
  cpSync(join(repoRoot, ".codex"), join(sourceRoot, ".codex"), { recursive: true });

  const first = runInstallerFrom(sourceRoot, codexHome, process.env);
  assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
  const target = join(codexHome, "skills", "super-compound");
  const installedSkill = join(target, "SKILL.md");
  const previousSkill = readFileSync(installedSkill, "utf8");
  const previousManifest = readFileSync(join(target, "manifest.json"), "utf8");

  const sourceSkill = join(sourceRoot, ".codex", "SKILL.md");
  writeFileSync(sourceSkill, `${readFileSync(sourceSkill, "utf8")}\n# staged-v2\n`);
  const failed = runInstallerFrom(
    sourceRoot,
    codexHome,
    { ...process.env, SUPER_COMPOUND_INSTALL_FAIL_AFTER_STAGE: "1" },
  );
  assert.notEqual(failed.status, 0, `${failed.stdout}\n${failed.stderr}`);
  assert.match(`${failed.stdout}\n${failed.stderr}`, /injected.*stage/i);
  assert.equal(readFileSync(installedSkill, "utf8"), previousSkill);
  assert.equal(readFileSync(join(target, "manifest.json"), "utf8"), previousManifest);

  writeFileSync(sourceSkill, previousSkill);
  const verification = runInstallerFrom(
    sourceRoot,
    codexHome,
    process.env,
    "-VerifyOnly",
  );
  assert.equal(verification.status, 0, `${verification.stdout}\n${verification.stderr}`);
});
