import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const legacyFullSkill = Object.freeze({
  sha256: "8f9c68acc3492fbfbe5a2a0bfdf985e2c234c4e9c6e3f5ab7731eaaed09f5a50",
  whitespaceWords: 2288,
  estimatedTokens: 4331,
});

const presetRoutes = [
  ["Next.js Fullstack", "references/presets.md#preset-1-nextjs-fullstack", "### Preset 1: Next.js Fullstack"],
  ["React + Express", "references/presets.md#preset-2-react--express", "### Preset 2: React + Express"],
  ["Vue / Nuxt Fullstack", "references/presets.md#preset-3-vue--nuxt-fullstack", "### Preset 3: Vue / Nuxt Fullstack"],
  ["Python FastAPI", "references/presets.md#preset-4-python-fastapi", "### Preset 4: Python FastAPI"],
  ["Python Django", "references/presets.md#preset-5-python-django", "### Preset 5: Python Django"],
  ["Go Gin", "references/presets.md#preset-6-go-gin", "### Preset 6: Go Gin"],
  ["PHP Laravel", "references/presets.md#preset-7-php-laravel", "### Preset 7: PHP Laravel"],
  ["SvelteKit Fullstack", "references/presets.md#preset-8-sveltekit-fullstack", "### Preset 8: SvelteKit Fullstack"],
  ["React Native (Mobile)", "references/presets.md#preset-9-react-native-mobile", "### Preset 9: React Native (Mobile)"],
  ["General (Blank)", "references/presets.md#preset-10-general-blank", "### Preset 10: General (Blank)"],
];

const frameworkRoutes = [
  ["Next.js", "references/nextjs.md", "### Next.js (App Router) — Modular"],
  ["Express", "references/http-security.md", "## Universal Security Architecture"],
  ["React + Vite", "references/react-vite.md", "### React + Vite — Layered"],
  ["Vue / Nuxt 3", "references/nuxt.md", "### Vue / Nuxt 3 — Modular"],
  ["Python FastAPI", "references/fastapi.md", "### Python FastAPI — Clean Architecture"],
  ["Python Django", "references/django.md", "### Python Django — MVC + Service Layer"],
  ["Go Gin", "references/go-gin.md", "### Go Gin — Standard Go Layout"],
  ["PHP Laravel", "references/laravel.md", "### PHP Laravel — MVC + Service Layer"],
  ["SvelteKit", "references/sveltekit.md", "### SvelteKit — Modular"],
  ["React Native / Expo", "references/react-native.md", "### React Native (Expo) — Modular"],
];

const detailedSectionHashes = new Map([
  ["references/presets.md", "71ee3611496deffdadbca55fa37236c67f430f4fa77c3c27c8f518768a7895ca"],
  ["references/nextjs.md", "f1437586e21019f9db35fbfdc061c4c8350d1734c29a4b44bc1045f0126f1181"],
  ["references/react-vite.md", "83b85980fa682b063ae653168d16d7dee90baec6d7201b3e0951f16a1c31c032"],
  ["references/nuxt.md", "d0fc2183ef914e682a62c8a5a315ae9777270631b6c20dd2aedfdf1ff524a986"],
  ["references/fastapi.md", "41d64d55b1b83a5564b6aeb3727dcbb6312c4d83e7634d2fddd290d34532734c"],
  ["references/django.md", "cec3a9a64eb824462a0e263471c70bc45232539f98dfb45ed4a797f1b622ad87"],
  ["references/go-gin.md", "606c1ee7a6e4d19979ea404d5a6c5b47d9dbf0b9db0fcae4cb7ad127fa50de80"],
  ["references/laravel.md", "5f2e717f9913a266834182b942a91d2a539473b386fbace69c2806af880c45c9"],
  ["references/sveltekit.md", "012557eee88f9aa368c8337484a752a15fefca28217114469e434561079609ad"],
  ["references/react-native.md", "1a78a24295523e63ea2e323397ac9a2cb392a9597be167a3fe0a73bf8a75d7a5"],
  ["references/http-security.md", "9c8c9ed80f00daad6f0ba1f7f95a4c2fb217df46dedebab2758454e010608745"],
]);

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

function whitespaceWords(text) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function estimatedTokens(text) {
  return Math.ceil(text.length / 4);
}

function sha256(text) {
  return createHash("sha256").update(normalizeNewlines(text)).digest("hex");
}

async function read(relativePath) {
  return normalizeNewlines(
    await readFile(path.join(skillDir, relativePath), "utf8"),
  );
}

test("compact skill routes every supported preset and framework to an existing reference", async () => {
  const skill = await read("SKILL.md");

  for (const [label, target, heading] of [...presetRoutes, ...frameworkRoutes]) {
    assert.ok(skill.includes(`(${target})`), `missing route for ${label}`);
    const reference = await read(target.split("#", 1)[0]);
    assert.ok(reference.includes(heading), `missing target heading for ${label}`);
  }
});

test("compact skill retains explicit placement, dependency, review, and security gates", async () => {
  const skill = await read("SKILL.md");

  assert.match(skill, /Placement gate:/);
  assert.match(skill, /Dependency gate:/);
  assert.match(skill, /Security gate:/);
  assert.match(skill, /P1 Critical/);
  assert.match(skill, /references\/http-security\.md/);
});

test("all detailed legacy sections are preserved byte-for-byte after newline normalization", async () => {
  for (const [relativePath, expectedHash] of detailedSectionHashes) {
    const content = await read(relativePath);
    assert.equal(sha256(content), expectedHash, relativePath);
  }
});

test("compact SKILL stays within 500 whitespace-delimited words", async () => {
  const skill = await read("SKILL.md");

  assert.ok(
    whitespaceWords(skill) <= 500,
    `SKILL.md has ${whitespaceWords(skill)} words; expected at most 500`,
  );
});

test("Next.js placement branch is materially smaller than the legacy full skill", async (t) => {
  const skill = await read("SKILL.md");
  const nextjs = await read("references/nextjs.md");
  const activePath = `${skill}\n${nextjs}`;
  const measurement = {
    legacy: legacyFullSkill,
    activeNextjs: {
      whitespaceWords: whitespaceWords(activePath),
      estimatedTokens: estimatedTokens(activePath),
    },
  };

  t.diagnostic(JSON.stringify(measurement));
  assert.ok(
    measurement.activeNextjs.estimatedTokens < legacyFullSkill.estimatedTokens * 0.4,
    "expected at least 60% estimated-token reduction for the Next.js placement branch",
  );
});
