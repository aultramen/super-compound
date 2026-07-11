import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const specs = {
  "agentic-delivery": {
    frontmatter:
      '---\nname: agentic-delivery\ndescription: "Use when following the Super Compound BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION delivery path, artifact traceability, FSD authority, optional ADR handling, zero context bloat issue slicing, or OPEN-* stop conditions."\n---',
    references: {
      "templates-and-outputs.md": "532d3e532cdf5b3ce3628abff9b67c448c60d26b3409a8963fa1b6d26c0b96bd",
      "authority-and-adr.md": "2bca7520c4b11237fe99f8e53f3083f97c4bef88692876d147a4b4c103e22943",
      "qualified-references.md": "a1ea8d7a7e653e5df729540aa1fc42a0a839237051efc52485f200f36a07e228",
      "context-and-issue-pointers.md": "7dd6cec6bd32ea8428d796e46704a8deafa928de30209cb72fa0f28db85f8d88",
      "open-stop-conditions.md": "eff4e4880df0d1f1a60a43d86b97e1403d1c48df6a183a76b85d11759a2d3938",
      "workflow-integration.md": "8d77ac27debf5773b11306c62cc218b1942858bed13c781975c534033a800ee5",
    },
    invariants: [
      /BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION/,
      /FSD authority/,
      /\.agent\/templates\/agentic-delivery\/skeletons\/Issue-Pointer-Skeleton\.md/,
      /OPEN-\* gate:/,
    ],
  },
  "issue-workflow": {
    frontmatter:
      '---\nname: issue-workflow\ndescription: "Use when /sc-plan needs FSD GOAL-* packets turned into lightweight issue pointers, local Markdown Kanban boards, blocker DAGs, or multi-agent task contracts."\n---',
    references: {
      "zero-context.md": "ff8f306457e45a42bd0e0f5e68d0e3aa96344842bc18a8fda5eb028f7094cc4a",
      "process.md": "7d7d96f53b14c96097f4d8a8175a5df9d95237b6d7828bc69bae62fba83cac59",
      "status-and-done.md": "eaec9a69434c2e720043680211b9fbe1d1995e8dc25f8b32068b728e29c34264",
    },
    invariants: [
      /Issue files are references, not specifications/,
      /\.agent\/templates\/agentic-delivery\/skeletons\/Issue-Pointer-Skeleton\.md/,
      /DAG gate:/,
      /OPEN-\*/,
    ],
  },
  "plan-verification": {
    frontmatter:
      '---\nname: plan-verification\ndescription: "Use when an FSD and goal issue board need requirement coverage, goal quality, dependency DAG, sizing, and verification validated before execution."\n---',
    references: {
      "coverage-and-dependencies.md": "6a5368eeaea2c1641be9f532ad1977f3a24d541603daa78e293bad3ea7750ae1",
      "links-scope-and-must-haves.md": "d73c1b53afe2bab7a3b5bd8221b3ef62f1705490eb18abba300d6f1218157b7d",
      "sizing.md": "449d2058678489910fbd8d56e839bcd132db1025927ad267f94c2b52d559edb0",
      "tests-and-decisions.md": "efa3114f5c8eee1ce150d94c5f2bc0a7d0e574c7e2030bd7781d632641ab1017",
      "verification-process.md": "769f27e3b85743a43c8f52bd043966d8717350afca860c3115d12a51d402705d",
      "revision-rules.md": "541a5a8061f13aeeb69156486bd4f63d7b48766c30a69c1f99824f7ece66c97a",
    },
    invariants: [
      /Decision gate:/,
      /approved `TDEC-\*`.*linked `ACCEPTED` ADR.*exact ID.*`GOAL-\*`.*`TEST-\*`/s,
      /Fuzzy text similarity.*never.*blocking/is,
      /nine verification dimensions/i,
    ],
  },
  "parallel-execution": {
    frontmatter:
      '---\nname: parallel-execution\ndescription: "Use when a plan or issue board has 5+ independent tasks that don\'t share files. Dispatches multiple agents working simultaneously in isolated git worktrees. Requires no unresolved blockers or file-level dependencies."\n---',
    references: {
      "prerequisites-and-selection.md": "fed1536b19e634d5a4e4700f7f13907d8e93f47651609cc0334349eb6e5e967a",
      "process.md": "a491dd3c640bdef68ac5926d631152e403ca3eac72d57864433cb19389281c7b",
      "red-flags.md": "b8e1b1fbb3fef8c6ca9e9759a082ee370d5635cb27293fc7116a1920a84b6166",
    },
    invariants: [
      /5\+ independent/,
      /One shared file = sequential/,
      /Approval gate:/,
      /Integration gate:/,
    ],
  },
  "todo-management": {
    frontmatter:
      '---\nname: todo-management\ndescription: "Use when ideas or tasks surface during work and must be captured, tracked, and routed without losing current-task focus."\n---',
    references: {
      "capture.md": "9bfbc1f13a47237a3ff24410ebb76d944e5f9d6ce9e3cd08f98c0ef26e2009b5",
      "review-and-routing.md": "6665bdf8cb47131752bfbfa920694646492db77feb018991c74eb002294eda63",
      "cross-reference.md": "b7b7561a3a25a010e1691d7c507c5fd385db33c4f71b885479f65e60b0cdec5b",
      "quick-capture.md": "5329fe4a2d0244f5388a968ba76da691675ff9e58d104f5f0e34f3c47998efa8",
      "principles-and-red-flags.md": "5fbe59f500d5b13a6666304650279d1b81f255a606599752bf30871d5163daff",
    },
    invariants: [
      /Focus gate:/,
      /30 seconds/,
      /capture.*not.*act/is,
      /STATE\.md/,
    ],
  },
  "context7-docs": {
    frontmatter:
      '---\nname: context7-docs\ndescription: "Use when you need up-to-date library/API documentation, code examples, version-specific guides, or framework conventions. Wraps the Context7 MCP tools with a clear usage pattern and fallback strategy."\n---',
    references: {
      "when-to-use.md": "4a0628014e94557d5db09e64b4fa3dfff21edd95b715b5bc642f084482539ce1",
      "usage-pattern.md": "ca7a50bbe7e2efc4a44768a6bd71be5b6aa05c6a9eb2cbd3094c875ab319e247",
      "fallback.md": "d6f65be204a39fc3cba81ce4db97131857cd449ad4733ee93bfa3523e2ee3480",
      "examples.md": "4d4bcd900a132c48baa814dd3ed3fd00ff36e518c501f14a659f9d8b1ab94e13",
      "exclusions.md": "99d40e6cdafa14dae8454ce9cf372171890f30cb1096e1dbccdac2ec8145d32f",
    },
    invariants: [
      /Search-before-missing gate:/,
      /resolve-library-id/,
      /query-docs/,
      /official documentation/i,
    ],
  },
  "git-workflow-operation": {
    frontmatter:
      '---\nname: git-workflow-operation\ndescription: "Use when starting Git work, preparing commits, pushing branches, opening Pull Requests, or coordinating optional git worktrees."\n---',
    references: {
      "configuration-and-safety.md": "781b514cf75e46f00c75bf2ed0933d3c93c2854ada1afd92fa1f84f055b8fd25",
      "commands-and-branches.md": "0f149a66d865a89ea5e6d4548e8b265709a0e3d64f36b4869ba279e6e5aba236",
      "touchpoints-and-red-flags.md": "403ef44895b70d61776c3e012075033254ecc32d36cd70f6a98da074fc447150",
    },
    invariants: [
      /Preview gate:/,
      /Approval gate:/,
      /protected base/,
      /Sensitive-file gate:/,
    ],
  },
  brainstorming: {
    frontmatter:
      '---\nname: brainstorming\ndescription: "Use when creative product, feature, UI, or behavior work needs intent, requirements, constraints, or design explored before implementation."\n---',
    references: {
      "local-context.md": "4f4e589b57040e890219e10f0fb79121d84fefd8d5d4798ea08e4e7de63af545",
      "questions-and-options.md": "0615c0423efbdd7aa6f455b3d1e974aeb55de18d20aac66e3f8a6808fd283e4b",
      "capture.md": "c6269d2032dd6f4dedbb61579cc84965ce2813d80cae7a82281f625579baf7af",
      "ui-and-visual.md": "5ec57d9d3ffd0a22f7a9e0bd4c7bbaee7a1fd07e65a11bcd760b4f2ba0a68531",
      "red-flags-and-next.md": "c79f3fe76480fb8f6996405ea62cfc5c43e605116774328f94b2bc13e108101f",
    },
    invariants: [
      /Context-before-questions gate:/,
      /one concise question per turn/i,
      /2-3 approaches/,
      /Plan gate:/,
    ],
  },
  "interface-design": {
    frontmatter:
      '---\nname: interface-design\ndescription: "Use when building, redesigning, or reviewing frontend UI: pages, components, dashboards, landing pages, mobile screens, charts, and interaction states."\n---',
    references: {
      "retrieval-workflow.md": "6d73c5506b0fe0f2aa71c1e2a0d42d61deef920b8ca42b2c5365b1b84b6c0c52",
      "catalog.md": "a3fd67ddc0d9ea57345e0e6f2f13dcc41d2653e7a33c0e19903262b43b97fa36",
      "implementation-and-checklist.md": "0a2e8479e430ded19527925538976f7e5526ffba6bc2d2c10b1467ca72283e0c",
    },
    invariants: [
      /Retrieval gate:/,
      /scripts\/search\.py/,
      /do not.*preload.*data\/\*\*\/\*\.csv/is,
      /Search-before-missing gate:/,
      /Provenance gate:/,
      /UPSTREAM\.json/,
    ],
  },
};

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

function frontmatter(text) {
  return text.match(/^---\n[\s\S]*?\n---/u)?.[0] ?? "";
}

function whitespaceWords(text) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function sha256(text) {
  return createHash("sha256").update(normalizeNewlines(text)).digest("hex");
}

async function readSkillFile(skill, relativePath) {
  return normalizeNewlines(
    await readFile(path.join(skillsRoot, skill, relativePath), "utf8"),
  );
}

test("wave 3 routers preserve frontmatter and stay within 500 words", async () => {
  for (const [skill, spec] of Object.entries(specs)) {
    const content = await readSkillFile(skill, "SKILL.md");
    assert.equal(frontmatter(content), spec.frontmatter, `${skill} frontmatter`);
    assert.ok(
      whitespaceWords(content) <= 500,
      `${skill}/SKILL.md has ${whitespaceWords(content)} words`,
    );
  }
});

test("wave 3 routers link every losslessly preserved detail reference", async () => {
  for (const [skill, spec] of Object.entries(specs)) {
    const router = await readSkillFile(skill, "SKILL.md");
    for (const [reference, expectedHash] of Object.entries(spec.references)) {
      assert.ok(
        router.includes(`(references/${reference})`),
        `${skill} does not route references/${reference}`,
      );
      const content = await readSkillFile(skill, `references/${reference}`);
      assert.equal(sha256(content), expectedHash, `${skill}/${reference}`);
    }
  }
});

test("wave 3 compact routers retain required invariant markers", async () => {
  for (const [skill, spec] of Object.entries(specs)) {
    const content = await readSkillFile(skill, "SKILL.md");
    for (const invariant of spec.invariants) {
      assert.match(content, invariant, `${skill}: ${invariant}`);
    }
  }
});
