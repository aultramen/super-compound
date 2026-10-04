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
      "templates-and-outputs.md": "cec84629151a691f394f780c32997795bedb04a8650073a4ca3230d37a9e9a73",
      "authority-and-adr.md": "2bca7520c4b11237fe99f8e53f3083f97c4bef88692876d147a4b4c103e22943",
      "qualified-references.md": "bc5f8b87bb0333347f291087ae7a28858b5326ebfd12c09094e5532f21c110eb",
      "context-and-issue-pointers.md": "68c0d02211cd46b95845c2555e0d680075e61e72d3793eae3678a07d69cf8b1d",
      "open-stop-conditions.md": "09dd7d956a1372ea50668f57554110a3f3811d6948a287580aa933c0d1a378eb",
      "workflow-integration.md": "f87b17f9408f92302ede79f584b1a6043b4c789c22ebfaadc6f2d749f9789f2c",
      "ui-contract-readiness.md": "092304b0d5f163388deeb91533a456612a95839bf027cde219db02422deb4c36",
    },
    invariants: [
      /BRD -> PRD -> FSD -> GOAL -> IMPLEMENTATION -> VERIFICATION/,
      /FSD authority/,
      /\.agent\/templates\/agentic-delivery\/skeletons\/Issue-Pointer-Skeleton\.md/,
      /OPEN-\* gate:/,
      /UI delivery gate:/,
    ],
  },
  "issue-workflow": {
    frontmatter:
      '---\nname: issue-workflow\ndescription: "Use when /sc-plan needs FSD GOAL-* packets turned into lightweight issue pointers, local Markdown Kanban boards, blocker DAGs, or multi-agent task contracts."\n---',
    references: {
      "zero-context.md": "60efe561a41dcf40ffe1f9fe88f94b64aebad51fb2ac7dd5b50d6b54a15007e7",
      "process.md": "8d17a3a7fe0b47e9e98b38eb5d3783888d02327c040d6dee82cf7ef8d81eb617",
      "status-and-done.md": "6a13d0ab2b0bf3e6fcacadbab6c622eedea4809002c27e93116d49ffbac8c4a4",
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
      "coverage-and-dependencies.md": "16bea51fefafeca4ba4d4e4186e7cf7f52105f33fe7deb22f4e6394115fd4347",
      "links-scope-and-must-haves.md": "d73c1b53afe2bab7a3b5bd8221b3ef62f1705490eb18abba300d6f1218157b7d",
      "sizing.md": "449d2058678489910fbd8d56e839bcd132db1025927ad267f94c2b52d559edb0",
      "tests-and-decisions.md": "67d42a7fe47a0ce7627c095591efb18fba30d1cf29ea9763df95319d19c30149",
      "verification-process.md": "317e90c15c0fc29310ea86ec13425cc098c60eab6cda7a970913a02421362019",
      "revision-rules.md": "541a5a8061f13aeeb69156486bd4f63d7b48766c30a69c1f99824f7ece66c97a",
    },
    invariants: [
      /Decision gate:/,
      /approved `TDEC-\*`.*linked `ACCEPTED` ADR.*exact ID.*`GOAL-\*`.*`TEST-\*`/s,
      /Fuzzy text similarity.*never.*blocking/is,
      /ten verification dimensions/i,
    ],
  },
  "parallel-execution": {
    frontmatter:
      '---\nname: parallel-execution\ndescription: "Use when a plan or issue board has 2+ independent execution streams whose time saving exceeds coordination overhead. Dispatches agents in isolated git worktrees only after required delivery gates pass."\n---',
    references: {
      "prerequisites-and-selection.md": "8a7e33dff083bebe087052ff3db563c7b005ac3aa9aa9ef01abc2581eaa585a9",
      "process.md": "d357242fd34d22eeb5a2f61ad5db751b8c0ea691597599dc8e431e76b64ad2bc",
      "red-flags.md": "ecad3bab78490c5196d0f4b58eb8f789eabd6873e95de08938dd3c2fcecce7af",
    },
    invariants: [
      /2\+ independent execution streams/,
      /first vertical slice.*verified/is,
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
      "quick-capture.md": "01a98a370818bc5ac722dd0642fb37e1542b50a511cb50b10eea9c0c41cb4d9d",
      "principles-and-red-flags.md": "fdc23bd1975d6540b750fd6809b45141e15d3615177231697e4dea039b7f3fa8",
    },
    invariants: [
      /Focus gate:/,
      /same turn/,
      /capture.*not.*act/is,
      /STATE\.md/,
    ],
  },
  "context7-docs": {
    frontmatter:
      '---\nname: context7-docs\ndescription: "Use when you need up-to-date library/API documentation, code examples, version-specific guides, or framework conventions. Wraps the Context7 MCP tools with a clear usage pattern and fallback strategy."\n---',
    references: {
      "when-to-use.md": "8f3679e93cf0b19203328aee2f3303f32361560c3b24c41d0da1ce09a5aaf797",
      "usage-pattern.md": "3c7fc48689316a2fd3927e245e9788f500124e6211f70674c5ba5ed55745e34f",
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
      "configuration-and-safety.md": "8c4580293a98ff4c746d864848ab036cfb9181cc8f477bedf8fa971a67457b4e",
      "commands-and-branches.md": "07eca489b0ead058109149674b57ee558fde767bd78856e7b0d6ef95c85901d9",
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
      "questions-and-options.md": "635179013449f99a421f89628f8a426f8435aab7244695fbae9cec8f9aebb437",
      "capture.md": "c716169a240bb4b1eddb153e38956398b3a4c4813c899a5163e4f19a9a6c033e",
      "ui-and-visual.md": "5ec57d9d3ffd0a22f7a9e0bd4c7bbaee7a1fd07e65a11bcd760b4f2ba0a68531",
      "red-flags-and-next.md": "23d7b575d662f5daaddc493460bfa52449d0c29cb8608eafec339de53ad9222a",
    },
    invariants: [
      /Context-before-questions gate:/,
      /consequential decisions/i,
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
      "implementation-and-checklist.md": "fc26e206fb980a9e923be8fc08e1ae645ce8575e16b2f8369d557346012f091a",
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

test("wave 3 routers preserve frontmatter and retain navigable structure", async () => {
  for (const [skill, spec] of Object.entries(specs)) {
    const content = await readSkillFile(skill, "SKILL.md");
    assert.equal(frontmatter(content), spec.frontmatter, `${skill} frontmatter`);
    assert.match(content, /^## \S/m);
  }
});

test("wave 3 routers link every pinned detail reference", async () => {
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
