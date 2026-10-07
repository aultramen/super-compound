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
      // Reviewed authoring revision; prior hash is retained in blueprint-document.responses.json baseline.
      "templates-and-outputs.md": "f025dfe20fd036fcfe1402ed3627bcbf32715cf3edfe224a0fe56ec0a24fd5b9",
      "authority-and-adr.md": "9aef59e4f9c21fe16aaba0537464a578e12b214c56a29e5e53833c45d644c9ff",
      "qualified-references.md": "bc5f8b87bb0333347f291087ae7a28858b5326ebfd12c09094e5532f21c110eb",
      // Completion locators remain pointers; all-AC proof adds no authority or status enum.
      "context-and-issue-pointers.md": "58b6fc8affb70d297c65cff5b8114ee47cdeccd55e5973cb21c168c1ec85c1ab",
      "open-stop-conditions.md": "8f172287ee50e5619dac9c40700e2cf85b10d403ed9778f52dbcc9df347d089a",
      "workflow-integration.md": "8f3e2ed1b91440a45c41f5b4b55095ecf0e3031cf777b138f30272dbbe3ccefc",
      "ui-contract-readiness.md": "48d64c07c120731d522049075eff511f149be4deac6101d04e75fe8fd1700dc0",
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
      "process.md": "68221c113365764007bc7f143f3e9ae989ee6a04d8e42c5e61777ff9e25cbfa9",
      // Existing issue grammar retained; actual outcome proof now gates done/verified.
      "status-and-done.md": "12f981a5f8cf89dbb46ed7372c6166fdeb960d9b2ad10d06100f5cabb002a01b",
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
      "coverage-and-dependencies.md": "e0c77f317c0b4915d8185b64c5c1da50b9fd64c536708ddf7da05cd391a568fa",
      "links-scope-and-must-haves.md": "d73c1b53afe2bab7a3b5bd8221b3ef62f1705490eb18abba300d6f1218157b7d",
      "sizing.md": "449d2058678489910fbd8d56e839bcd132db1025927ad267f94c2b52d559edb0",
      "tests-and-decisions.md": "cae52add5bb14a16a3937acc9c397992c60fbdca85029fe0fec494fd11240e83",
      "verification-process.md": "6593bf3baf3db739e7ca5c745543b2c07c0fc75f3b3c80e23c98c703674caeec",
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
      "prerequisites-and-selection.md": "4a1b420c619a6d3430833508305e46b677d5fe95619e0dccf726af55f01cea93",
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
      "questions-and-options.md": "55deecb66d543dadf0f684ca36fa3194395461153105978b843e71db5af295e3",
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
      "retrieval-workflow.md": "5e5cd0a5d7798cd90ed757ac980d8fa9c14071ea33ecd327806112bc02ff25c1",
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
