import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(skillDir, "..", "..", "..");

const legacyFullSkill = Object.freeze({
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

const expectedPresetValues = [
  {
    name: "Next.js Fullstack",
    values: {
      project_type: "fullstack", api_style: "rest",
      "frontend.framework": "nextjs", "frontend.language": "typescript", "frontend.styling": "tailwind", "frontend.component_library": "shadcn",
      "backend.framework": "nextjs", "backend.language": "typescript", "backend.orm": "prisma",
      "database.primary": "postgresql", "database.cache": "none", "database.migration_tool": "prisma-migrate",
      "runtime.package_manager": "pnpm", "runtime.container": "docker", "runtime.deployment": "docker-compose",
      "commands.dev": "pnpm dev", "commands.test": "pnpm vitest run", "commands.lint": "pnpm eslint . && pnpm tsc --noEmit", "commands.format": "pnpm prettier --write .", "commands.build": "pnpm build", "commands.migrate": "pnpm prisma migrate dev",
      "conventions.architecture": "modular",
    },
  },
  {
    name: "React + Express",
    values: {
      project_type: "fullstack", api_style: "rest",
      "frontend.framework": "react", "frontend.language": "typescript", "frontend.styling": "tailwind", "frontend.component_library": "shadcn",
      "backend.framework": "express", "backend.language": "typescript", "backend.orm": "prisma",
      "database.primary": "postgresql", "database.cache": "redis", "database.migration_tool": "prisma-migrate",
      "runtime.package_manager": "pnpm", "runtime.container": "docker", "runtime.deployment": "docker-compose",
      "commands.dev": "pnpm dev", "commands.test": "pnpm vitest run && pnpm jest --passWithNoTests", "commands.lint": "pnpm eslint .", "commands.format": "pnpm prettier --write .", "commands.build": "pnpm build", "commands.migrate": "pnpm prisma migrate dev",
      "conventions.architecture": "layered",
    },
  },
  {
    name: "Vue / Nuxt Fullstack",
    values: {
      project_type: "fullstack", api_style: "rest",
      "frontend.framework": "nuxtjs", "frontend.language": "typescript", "frontend.styling": "tailwind", "frontend.component_library": "none",
      "backend.framework": "nuxtjs", "backend.language": "typescript", "backend.orm": "prisma",
      "database.primary": "postgresql", "database.cache": "none", "database.migration_tool": "prisma-migrate",
      "runtime.package_manager": "pnpm", "runtime.container": "docker", "runtime.deployment": "docker-compose",
      "commands.dev": "pnpm dev", "commands.test": "pnpm vitest run", "commands.lint": "pnpm eslint . && pnpm nuxi typecheck", "commands.format": "pnpm prettier --write .", "commands.build": "pnpm build", "commands.migrate": "pnpm prisma migrate dev",
      "conventions.architecture": "modular",
    },
  },
  {
    name: "Python FastAPI",
    values: {
      project_type: "backend", api_style: "rest", "frontend.framework": "none",
      "backend.framework": "fastapi", "backend.language": "python", "backend.orm": "sqlalchemy",
      "database.primary": "postgresql", "database.cache": "redis", "database.migration_tool": "alembic",
      "runtime.package_manager": "uv", "runtime.container": "docker", "runtime.deployment": "docker-compose",
      "commands.dev": "uvicorn app.main:app --reload", "commands.test": "pytest -v --cov", "commands.lint": "ruff check . && mypy .", "commands.format": "ruff format .", "commands.build": "docker build -t app .", "commands.migrate": "alembic upgrade head",
      "conventions.architecture": "clean",
    },
  },
  {
    name: "Python Django",
    values: {
      project_type: "fullstack", api_style: "rest", "frontend.framework": "none",
      "backend.framework": "django", "backend.language": "python", "backend.orm": "django-orm",
      "database.primary": "postgresql", "database.cache": "redis", "database.migration_tool": "django-migrate",
      "runtime.package_manager": "uv", "runtime.container": "docker", "runtime.deployment": "docker-compose",
      "commands.dev": "python manage.py runserver", "commands.test": "pytest -v --cov", "commands.lint": "ruff check . && mypy .", "commands.format": "ruff format .", "commands.build": "docker build -t app .", "commands.migrate": "python manage.py migrate",
      "conventions.architecture": "mvc",
    },
  },
  {
    name: "Go Gin",
    values: {
      project_type: "backend", api_style: "rest", "frontend.framework": "none",
      "backend.framework": "gin", "backend.language": "go", "backend.orm": "gorm",
      "database.primary": "postgresql", "database.cache": "redis", "database.migration_tool": "goose",
      "runtime.package_manager": "go-mod", "runtime.container": "docker", "runtime.deployment": "docker-compose",
      "commands.dev": "air", "commands.test": "go test ./... -v -cover", "commands.lint": "golangci-lint run", "commands.format": "gofmt -w .", "commands.build": "go build -o bin/app ./cmd/server", "commands.migrate": "goose -dir migrations postgres $DB_URL up",
      "conventions.architecture": "clean",
    },
  },
  {
    name: "PHP Laravel",
    values: {
      project_type: "fullstack", api_style: "rest",
      "frontend.framework": "none", "frontend.language": "javascript", "frontend.styling": "tailwind",
      "backend.framework": "laravel", "backend.language": "php", "backend.orm": "eloquent",
      "database.primary": "mysql", "database.cache": "redis", "database.migration_tool": "artisan",
      "runtime.package_manager": "npm", "runtime.container": "docker", "runtime.deployment": "docker-compose",
      "commands.dev": "php artisan serve & npm run dev", "commands.test": "php artisan test --parallel", "commands.lint": "vendor/bin/phpstan analyse && vendor/bin/pint --test", "commands.format": "vendor/bin/pint", "commands.build": "npm run build", "commands.migrate": "php artisan migrate",
      "conventions.architecture": "mvc",
    },
  },
  {
    name: "SvelteKit Fullstack",
    values: {
      project_type: "fullstack", api_style: "rest",
      "frontend.framework": "svelte", "frontend.language": "typescript", "frontend.styling": "tailwind", "frontend.component_library": "none",
      "backend.framework": "svelte", "backend.language": "typescript", "backend.orm": "drizzle",
      "database.primary": "sqlite", "database.cache": "none", "database.migration_tool": "drizzle-kit",
      "runtime.package_manager": "pnpm", "runtime.container": "none", "runtime.deployment": "none",
      "commands.dev": "pnpm dev", "commands.test": "pnpm vitest run", "commands.lint": "pnpm eslint . && pnpm svelte-check", "commands.format": "pnpm prettier --write .", "commands.build": "pnpm build", "commands.migrate": "pnpm drizzle-kit push",
      "conventions.architecture": "modular",
    },
  },
  {
    name: "React Native (Mobile)",
    values: {
      project_type: "mobile", api_style: "rest",
      "frontend.framework": "react", "frontend.language": "typescript", "frontend.styling": "styled-components",
      "backend.framework": "none", "database.primary": "sqlite", "database.cache": "none",
      "runtime.package_manager": "pnpm", "runtime.container": "none", "runtime.deployment": "none",
      "commands.dev": "npx expo start", "commands.test": "pnpm jest --passWithNoTests", "commands.lint": "pnpm eslint . && pnpm tsc --noEmit", "commands.format": "pnpm prettier --write .", "commands.build": "npx eas build --platform all",
      "conventions.architecture": "modular",
    },
  },
];

const preservedPresetValues = [
  { "frontend.bundler": "turbopack", "backend.api_docs": "none", "auth.method": "jwt", "auth.provider": "better-auth", "commands.seed": "pnpm prisma db seed", "commands.container_up": "docker compose up -d" },
  { "frontend.bundler": "vite", "backend.api_docs": "swagger", "auth.method": "jwt", "auth.provider": "passport", "commands.seed": "pnpm prisma db seed", "commands.container_up": "docker compose up -d" },
  { "frontend.bundler": "vite", "backend.api_docs": "none", "auth.method": "session", "auth.provider": "custom", "commands.seed": "pnpm prisma db seed", "commands.container_up": "docker compose up -d" },
  { "backend.api_docs": "swagger", "auth.method": "jwt", "auth.provider": "custom", "commands.seed": "python -m app.seeds", "commands.container_up": "docker compose up -d" },
  { "backend.api_docs": "swagger", "auth.method": "session", "auth.provider": "custom", "commands.seed": "python manage.py loaddata fixtures/*.json", "commands.container_up": "docker compose up -d" },
  { "backend.api_docs": "swagger", "auth.method": "jwt", "auth.provider": "custom", "commands.seed": "go run ./cmd/seed", "commands.container_up": "docker compose up -d" },
  { "frontend.bundler": "vite", "backend.api_docs": "swagger", "auth.method": "session", "auth.provider": "custom", "commands.seed": "php artisan db:seed", "commands.container_up": "docker compose up -d" },
  { "frontend.bundler": "vite", "backend.api_docs": "none", "auth.method": "session", "auth.provider": "custom", "commands.seed": "pnpm tsx scripts/seed.ts" },
  { "frontend.bundler": "metro", "auth.method": "jwt", "auth.provider": "custom" },
];

const obsoleteFlatKeys = new Set([
  "container", "package_manager", "dev_command", "test_command",
  "lint_command", "format_command", "build_command", "migrate_command",
  "seed_command", "docker_command", "architecture",
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

async function read(relativePath) {
  return normalizeNewlines(
    await readFile(path.join(skillDir, relativePath), "utf8"),
  );
}

async function readRepo(relativePath) {
  return normalizeNewlines(
    await readFile(path.join(repoRoot, relativePath), "utf8"),
  );
}

function scalarValue(source) {
  const value = source.replace(/\s+#.*$/u, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseYamlMapping(source) {
  const values = new Map();
  let parent = null;

  for (const line of source.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^(\s*)([A-Za-z_][\w-]*):(?:\s*(.*))?$/u.exec(line);
    if (!match) continue;
    const [, indentation, key, rawValue = ""] = match;

    if (indentation.length === 0) {
      const value = scalarValue(rawValue);
      values.set(key, value);
      parent = value ? null : key;

      if (value.startsWith("{") && value.endsWith("}")) {
        for (const entry of value.slice(1, -1).split(",")) {
          const child = /^\s*([A-Za-z_][\w-]*):\s*(.+?)\s*$/u.exec(entry);
          assert.ok(child, `invalid inline mapping entry: ${entry}`);
          values.set(`${key}.${child[1]}`, scalarValue(child[2]));
        }
      }
      continue;
    }

    if (indentation.length === 2 && parent) {
      values.set(`${parent}.${key}`, scalarValue(rawValue));
    }
  }

  return values;
}

function fencedYaml(source) {
  const match = /```yaml\n([\s\S]*?)\n```/u.exec(source);
  assert.ok(match, "missing YAML code fence");
  return match[1];
}

function presetDocuments(source) {
  return [...source.matchAll(
    /^### Preset (\d+): ([^\n]+)\n\n```yaml\n([\s\S]*?)\n```/gmu,
  )].map((match) => ({
    number: Number(match[1]),
    name: match[2],
    values: parseYamlMapping(match[3]),
  }));
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

test("all nine concrete presets conform to the current nested project-config schema", async () => {
  const presets = presetDocuments(await read("references/presets.md"));
  const projectConfig = parseYamlMapping(
    fencedYaml(await readRepo(".agent/rules/project-config.md")),
  );

  assert.equal(presets.length, 9);

  for (const [index, preset] of presets.entries()) {
    const expected = expectedPresetValues[index];
    assert.equal(preset.number, index + 1);
    assert.equal(preset.name, expected.name);

    for (const group of ["runtime", "commands", "conventions", "auth"]) {
      assert.ok(preset.values.has(group), `${preset.name}: missing ${group}`);
    }

    for (const key of obsoleteFlatKeys) {
      assert.ok(!preset.values.has(key), `${preset.name}: obsolete flat key ${key}`);
    }

    for (const key of preset.values.keys()) {
      assert.ok(projectConfig.has(key), `${preset.name}: unsupported schema key ${key}`);
    }

    for (const [key, value] of Object.entries(expected.values)) {
      assert.equal(preset.values.get(key), value, `${preset.name}: ${key}`);
    }
    for (const [key, value] of Object.entries(preservedPresetValues[index])) {
      assert.equal(
        preset.values.get(key),
        value,
        `${preset.name}: preserved ${key}`,
      );
    }
  }
});

test("project-config links to the canonical architecture-enforcement skill path", async () => {
  const projectConfig = await readRepo(".agent/rules/project-config.md");

  assert.match(
    projectConfig,
    /\.agent\/skills\/architecture-enforcement\/SKILL\.md/u,
  );
  assert.doesNotMatch(
    projectConfig,
    /(?<!\.agent\/)skills\/architecture-enforcement\/SKILL\.md/u,
  );
});

test("TDD mode resolves from conventions.tdd_mode in project-config", async () => {
  const modes = await readRepo(
    ".agent/skills/test-driven-development/references/modes-and-exceptions.md",
  );

  assert.match(modes, /`\.agent\/rules\/project-config\.md`/u);
  assert.match(modes, /`conventions\.tdd_mode`/u);
  assert.doesNotMatch(modes, /SUPER-COMPOUND\.md project configuration/u);
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
