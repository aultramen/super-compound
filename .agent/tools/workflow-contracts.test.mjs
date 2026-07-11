import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DEFAULT_SCENARIOS } from "./token-benchmark.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readRepositoryFile(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

const PUBLIC_ROUTES = [
  "sc-init",
  "sc-status",
  "sc-geniusloop",
  "sc-explore",
  "sc-research",
  "sc-prd",
  "sc-plan",
  "sc-eval",
  "sc-go",
  "sc-work",
  "sc-debug",
  "sc-review",
  "sc-audit",
  "sc-compound",
  "sc-pause",
  "sc-launch",
  "sc-ui",
];

test("sc-research remains a conditional advisory evidence workflow", async () => {
  const [
    workflow,
    contract,
    skeleton,
    explore,
    prd,
    plan,
    launch,
    readme,
    walkthrough,
    operatingContract,
  ] = await Promise.all([
      readRepositoryFile(".agent/workflows/sc-research.md"),
      readRepositoryFile(".agent/context/workflows/sc-research.contract.md"),
      readRepositoryFile(".agent/templates/research/Research-Note-Skeleton.md"),
      readRepositoryFile(".agent/workflows/sc-explore.md"),
      readRepositoryFile(".agent/workflows/sc-prd.md"),
      readRepositoryFile(".agent/workflows/sc-plan.md"),
      readRepositoryFile(".agent/workflows/sc-launch.md"),
      readRepositoryFile("README.md"),
      readRepositoryFile("WALKTHROUGH.md"),
      readRepositoryFile("SUPER-COMPOUND.md"),
    ]);

  assert.match(workflow, /^## Use When$/m);
  assert.match(workflow, /^## Do Not Use$/m);
  assert.match(workflow, /docs\/research\/YYYY-MM-DD-<slug>\.md/);
  assert.match(workflow, /advisory evidence/i);
  assert.match(workflow, /not (?:business, product, or implementation )?authority/i);
  for (const route of [
    "/sc-explore",
    "/sc-prd",
    "/sc-plan",
    "/sc-audit",
    "/sc-debug",
  ]) {
    assert.match(workflow, new RegExp(route.replace("/", "\\/")));
  }

  assert.match(contract, /conditional/i);
  assert.match(contract, /advisory/i);
  assert.match(contract, /Research-Note-Skeleton\.md/);

  assert.match(skeleton, /Decision consumer/i);
  assert.match(skeleton, /As of/i);
  assert.match(skeleton, /Confidence/i);
  assert.match(skeleton, /Refresh trigger/i);
  assert.match(skeleton, /evidence only/i);

  assert.match(launch, /conditional evidence gate/i);
  assert.match(readme, /^## Explore vs Research$/m);
  assert.match(
    readme,
    /\/sc-explore Add tenant usage analytics[\s\S]*\/sc-research Can the current event store[\s\S]*\/sc-prd/,
  );
  assert.match(walkthrough, /^## 3A\. Research \(Conditional\)$/m);
  assert.match(walkthrough, /Return routing matters:[\s\S]*\/sc-prd/);
  assert.match(operatingContract, /^## Explore vs Research$/m);

  assert.match(explore, /OPEN-RESEARCH-\*/);
  assert.match(prd, /run a targeted `sc-research\.md`, then resume here/i);
  assert.match(plan, /Research recommendations are evidence only/i);

  const scenario = DEFAULT_SCENARIOS.find(({ name }) => name === "sc-research");
  assert.ok(scenario, "missing sc-research benchmark scenario");
  assert.deepEqual(
    scenario.after,
    [
      ".codex/SKILL.md",
      ".agent/context/workflows/sc-research.contract.md",
    ],
    "sc-research must defer its optional output skeleton until a durable note is needed",
  );
});

test("compact routing is one-way and keeps mutation guardrails", async () => {
  const [dispatch, routing, goContract, ...workflows] = await Promise.all([
    readRepositoryFile(".agent/context/workflow-dispatch.md"),
    readRepositoryFile(".agent/context/routing-index.md"),
    readRepositoryFile(".agent/context/workflows/sc-go.contract.md"),
    ...PUBLIC_ROUTES.map((route) =>
      readRepositoryFile(`.agent/workflows/${route}.md`),
    ),
  ]);

  for (const route of PUBLIC_ROUTES) {
    assert.match(dispatch, new RegExp(`\\b${route}\\b`));
  }
  assert.match(routing, /dispatch.*once|one-time dispatch/i);
  assert.match(routing, /already resident|only when.*changed/i);

  PUBLIC_ROUTES.forEach((route, index) => {
    assert.doesNotMatch(
      workflows[index],
      new RegExp(`context/workflows/${route}\\.contract\\.md`),
      `${route} full workflow must not reload its compact contract`,
    );
  });

  assert.match(goContract, /explicit.*user intent/i);
  assert.match(goContract, /fresh preview/i);
  for (const operation of [
    "force-push",
    "delete a branch",
    "remove a worktree",
    "reset",
    "clean",
  ]) {
    assert.match(goContract, new RegExp(operation, "i"));
  }
});

test("public lifecycle examples review and audit before Git delivery", async () => {
  const [readme, walkthrough] = await Promise.all([
    readRepositoryFile("README.md"),
    readRepositoryFile("WALKTHROUGH.md"),
  ]);

  for (const publicDoc of [readme, walkthrough]) {
    assert.match(
      publicDoc,
      /\/sc-work[^\n]*\n\/sc-review[^\n]*\n\/sc-audit[^\n]*\n\/sc-go commit[^\n]*\n\/sc-go push[^\n]*\n\/sc-go pr/i,
    );
  }
});

test("workflow contracts preserve authority, bounded input, and durable evidence", async () => {
  const [
    status,
    statusContract,
    ui,
    uiContract,
    launch,
    launchContract,
    reviewContract,
    evalContract,
    initContract,
    exploreContract,
    planContract,
    budget,
    walkthrough,
    operatingContract,
  ] = await Promise.all([
    readRepositoryFile(".agent/workflows/sc-status.md"),
    readRepositoryFile(".agent/context/workflows/sc-status.contract.md"),
    readRepositoryFile(".agent/workflows/sc-ui.md"),
    readRepositoryFile(".agent/context/workflows/sc-ui.contract.md"),
    readRepositoryFile(".agent/workflows/sc-launch.md"),
    readRepositoryFile(".agent/context/workflows/sc-launch.contract.md"),
    readRepositoryFile(".agent/context/workflows/sc-review.contract.md"),
    readRepositoryFile(".agent/context/workflows/sc-eval.contract.md"),
    readRepositoryFile(".agent/context/workflows/sc-init.contract.md"),
    readRepositoryFile(".agent/context/workflows/sc-explore.contract.md"),
    readRepositoryFile(".agent/context/workflows/sc-plan.contract.md"),
    readRepositoryFile(".agent/context/token-budget-gates.md"),
    readRepositoryFile("WALKTHROUGH.md"),
    readRepositoryFile("SUPER-COMPOUND.md"),
  ]);

  for (const text of [status, statusContract]) {
    assert.match(text, /metadata|header/i);
    assert.match(text, /selected|one ready issue/i);
    assert.match(text, /do not read.*all|without reading.*bodies/i);
  }
  for (const route of PUBLIC_ROUTES) {
    assert.match(status, new RegExp(`\\/${route}\\b`));
  }

  for (const text of [ui, uiContract, operatingContract]) {
    assert.match(text, /fuzzy.*\/sc-explore|\/sc-explore.*fuzzy/is);
    assert.match(text, /approved.*\/sc-plan|\/sc-plan.*approved/is);
    assert.match(text, /approved (?:FSD )?goal|GOAL-\*/i);
    assert.match(text, /review.*read-only|read-only.*review/is);
  }

  for (const text of [launch, launchContract]) {
    assert.match(text, /one active stage|one stage at a time/i);
    assert.match(text, /artifact path/i);
    assert.match(text, /blockers/i);
    assert.match(text, /next route/i);
  }

  assert.match(reviewContract, /spec.*first.*standards|spec-first/is);
  assert.match(evalContract, /commit.*push.*PR|commit\/push\/PR/i);
  assert.match(initContract, /read-only by default/i);
  assert.match(exploreContract, /throwaway|non-production/i);
  assert.match(planContract, /\.agent\/templates\/agentic-delivery\/skeletons\/FSD-Skeleton\.md/);

  for (const sink of [
    "docs/geniusloop/",
    ".agent/evals/",
    "docs/reviews/",
    "docs/audits/",
  ]) {
    assert.match(budget, new RegExp(sink.replaceAll("/", "\\/")));
  }
  assert.match(budget, /never omit.*findings|do not enforce.*without.*sink/is);
  assert.doesNotMatch(
    walkthrough,
    /\/sc-pause[\s\S]{0,300}active FSD.*goal progress/i,
  );
});

test("pause and launch persist one canonical durable state with a pointer-only handoff", async () => {
  const [
    stateSkill,
    pause,
    pauseContract,
    launch,
    launchContract,
    hookIndex,
    sessionEnd,
    walkthrough,
    operatingContract,
    invariants,
  ] = await Promise.all([
    readRepositoryFile(".agent/skills/state-management/SKILL.md"),
    readRepositoryFile(".agent/workflows/sc-pause.md"),
    readRepositoryFile(".agent/context/workflows/sc-pause.contract.md"),
    readRepositoryFile(".agent/workflows/sc-launch.md"),
    readRepositoryFile(".agent/context/workflows/sc-launch.contract.md"),
    readRepositoryFile(".agent/context/hook-index.md"),
    readRepositoryFile(".agent/hooks/session-end.js"),
    readRepositoryFile("WALKTHROUGH.md"),
    readRepositoryFile("SUPER-COMPOUND.md"),
    readRepositoryFile(".agent/context/workflow-invariants.json"),
  ]);

  for (const text of [stateSkill, pause, pauseContract]) {
    assert.match(text, /docs\/STATE\.md/);
    assert.match(text, /\.continue-here\.md/);
    assert.match(text, /short pointer|pointer.*state/i);
  }
  for (const text of [pause, pauseContract, launch, launchContract]) {
    assert.match(text, /update|persist/i);
    assert.match(text, /docs\/STATE\.md/);
  }
  assert.match(hookIndex, /session-end` \| (?:emit|print).*checklist/i);
  assert.doesNotMatch(hookIndex, /session-end` \| persist session state/i);
  assert.match(sessionEnd, /does not mutate project files/i);
  for (const text of [walkthrough, operatingContract]) {
    assert.match(text, /STATE\.md.*canonical|canonical.*STATE\.md/is);
    assert.match(text, /\.continue-here\.md.*pointer|pointer.*\.continue-here\.md/is);
  }

  const routes = JSON.parse(invariants).routes;
  assert.match(routes["sc-pause"].evidenceSink, /docs\/STATE\.md/);
  assert.match(routes["sc-launch"].evidenceSink, /docs\/STATE\.md/);
});

test("genius loop dispatches Brain without implementation orchestration or sidecar mutations", async () => {
  const [
    workflow,
    contract,
    skillIndex,
    brainstorming,
    domain,
    invariants,
    operatingContract,
    walkthrough,
  ] =
    await Promise.all([
      readRepositoryFile(".agent/workflows/sc-geniusloop.md"),
      readRepositoryFile(".agent/context/workflows/sc-geniusloop.contract.md"),
      readRepositoryFile(".agent/context/skill-index.md"),
      readRepositoryFile(".agent/skills/brainstorming/SKILL.md"),
      readRepositoryFile(".agent/skills/domain-modeling/SKILL.md"),
      readRepositoryFile(".agent/context/workflow-invariants.json"),
      readRepositoryFile("SUPER-COMPOUND.md"),
      readRepositoryFile("WALKTHROUGH.md"),
    ]);

  assert.doesNotMatch(workflow, /skills\/subagent-orchestration\/SKILL\.md/);
  assert.match(workflow, /dispatch.*Brain.*direct|direct.*Brain/is);
  assert.match(workflow, /advisory read-only mode/i);
  assert.match(contract, /only permitted mutation.*docs\/geniusloop|docs\/geniusloop.*only permitted mutation/is);
  assert.doesNotMatch(skillIndex, /subagent-orchestration.*Brain evaluation/i);
  for (const publicDoc of [operatingContract, walkthrough]) {
    assert.doesNotMatch(
      publicDoc,
      /\/sc-geniusloop[^\n]*subagent-orchestration/i,
    );
    assert.match(publicDoc, /dispatch.*(?:Brain|brain).*(?:direct|read-only)|(?:direct|read-only).*dispatch.*(?:Brain|brain)/is);
  }

  for (const skill of [brainstorming, domain]) {
    assert.match(skill, /^## Advisory Read-only Mode$/m);
    assert.match(skill, /do not (?:write|update|create)|skip.*(?:capture|mutation)/i);
  }

  const genius = JSON.parse(invariants).routes["sc-geniusloop"];
  assert.equal(genius.mutation, "geniusloop-report-only");
  assert.match(genius.evidenceSink, /docs\/geniusloop/);
});

test("ui work has explicit read-only and sc-work implementation modes", async () => {
  const [workflow, contract, readme, operatingContract, walkthrough] = await Promise.all([
    readRepositoryFile(".agent/workflows/sc-ui.md"),
    readRepositoryFile(".agent/context/workflows/sc-ui.contract.md"),
    readRepositoryFile("README.md"),
    readRepositoryFile("SUPER-COMPOUND.md"),
    readRepositoryFile("WALKTHROUGH.md"),
  ]);

  for (const text of [workflow, contract]) {
    assert.match(text, /design|review/i);
    assert.match(text, /read-only/i);
    assert.match(text, /approved BRD.*\/sc-prd|\/sc-prd.*approved BRD/is);
    assert.match(text, /approved PRD.*\/sc-plan|\/sc-plan.*approved PRD/is);
    assert.match(text, /approved FSD.*GOAL.*\/sc-work|\/sc-work.*approved FSD.*GOAL/is);
  }
  assert.doesNotMatch(workflow, /^\d+\. Implement /m);
  assert.match(workflow, /hand off to `?\/sc-work/i);
  assert.match(readme, /design-only|read-only design/i);
  assert.match(readme, /\/sc-work <approved-goal>|\/sc-work GOAL-/i);
  assert.match(operatingContract, /implementation.*only.*\/sc-work|\/sc-work.*implementation/is);
  assert.doesNotMatch(operatingContract, /^- UI work -> `?\/sc-ui`?$/m);
  assert.match(
    operatingContract,
    /UI design\/review.*\/sc-ui.*approved UI implementation.*\/sc-work/i,
  );
  assert.doesNotMatch(walkthrough, /Build the actual requested UI/i);
});

test("downstream approval and eval gates consume durable artifacts, not chat drafts", async () => {
  const [explore, exploreContract, prd, prdContract, evalFlow, evalContract, readme] =
    await Promise.all([
      readRepositoryFile(".agent/workflows/sc-explore.md"),
      readRepositoryFile(".agent/context/workflows/sc-explore.contract.md"),
      readRepositoryFile(".agent/workflows/sc-prd.md"),
      readRepositoryFile(".agent/context/workflows/sc-prd.contract.md"),
      readRepositoryFile(".agent/workflows/sc-eval.md"),
      readRepositoryFile(".agent/context/workflows/sc-eval.contract.md"),
      readRepositoryFile("README.md"),
    ]);

  for (const text of [explore, exploreContract]) {
    assert.match(text, /chat draft|draft.*chat/i);
    assert.match(text, /before.*\/sc-prd.*docs\/brd|docs\/brd.*before.*\/sc-prd/is);
  }
  for (const text of [prd, prdContract]) {
    assert.match(text, /chat draft|draft.*chat/i);
    assert.match(text, /before.*\/sc-plan.*docs\/prd|docs\/prd.*before.*\/sc-plan/is);
  }
  for (const text of [evalFlow, evalContract]) {
    assert.match(text, /consum|gate/i);
    assert.match(text, /\.agent\/evals\/<feature>\.md/);
    assert.match(text, /must|require/i);
  }
  assert.match(readme, /approved BRD.*durable|durable.*approved BRD/is);
  assert.match(readme, /approved PRD.*durable|durable.*approved PRD/is);
});

test("review and audit stay read-only and hand remediation to an owning workflow", async () => {
  const [
    review,
    reviewContract,
    audit,
    auditContract,
    securitySkill,
    compatibilitySkill,
    invariants,
    readme,
    walkthrough,
    operatingContract,
  ] = await Promise.all([
    readRepositoryFile(".agent/workflows/sc-review.md"),
    readRepositoryFile(".agent/context/workflows/sc-review.contract.md"),
    readRepositoryFile(".agent/workflows/sc-audit.md"),
    readRepositoryFile(".agent/context/workflows/sc-audit.contract.md"),
    readRepositoryFile(".agent/skills/security-audit/SKILL.md"),
    readRepositoryFile(".agent/skills/compatibility-check/SKILL.md"),
    readRepositoryFile(".agent/context/workflow-invariants.json"),
    readRepositoryFile("README.md"),
    readRepositoryFile("WALKTHROUGH.md"),
    readRepositoryFile("SUPER-COMPOUND.md"),
  ]);

  for (const text of [review, reviewContract, audit, auditContract]) {
    assert.match(text, /strictly read-only|remain(?:s)? read-only/i);
    for (const route of ["/sc-explore", "/sc-prd", "/sc-plan", "/sc-debug", "/sc-work", "/sc-go"]) {
      assert.match(text, new RegExp(route.replace("/", "\\/")));
    }
  }
  assert.match(audit, /select.*submode|submode.*select/is);
  assert.match(audit, /security-audit\/SKILL\.md` for security/i);
  assert.match(audit, /compatibility-check\/SKILL\.md` only for/i);
  for (const publicDoc of [readme, walkthrough, operatingContract]) {
    assert.match(publicDoc, /audit.*(?:always|strictly|never fix).*read-only|audit.*never fix|never.*fixes inside.*audit/is);
    assert.doesNotMatch(publicDoc, /audit mode is read-only unless/i);
  }
  assert.match(operatingContract, /select only the matching submode branch/i);
  assert.match(operatingContract, /never preload every audit skill/i);
  for (const skill of [securitySkill, compatibilitySkill]) {
    assert.match(skill, /caller boundary|inside `?\/sc-audit/i);
    assert.match(skill, /transition|route/i);
  }

  const routes = JSON.parse(invariants).routes;
  assert.equal(routes["sc-review"].mutation, "read-only");
  assert.equal(routes["sc-audit"].mutation, "read-only");
});

test("debug preserves non-trivial investigation evidence behind the chat budget", async () => {
  const [workflow, contract, budget, invariants, readme] = await Promise.all([
    readRepositoryFile(".agent/workflows/sc-debug.md"),
    readRepositoryFile(".agent/context/workflows/sc-debug.contract.md"),
    readRepositoryFile(".agent/context/token-budget-gates.md"),
    readRepositoryFile(".agent/context/workflow-invariants.json"),
    readRepositoryFile("README.md"),
  ]);
  const sink = /docs\/debug\/YYYY-MM-DD-<slug>\.md/;

  for (const text of [workflow, contract, budget, readme]) {
    assert.match(text, sink);
  }
  assert.match(workflow, /reproduction|root cause/i);
  assert.match(workflow, /chat envelope|output cap/i);
  assert.match(JSON.parse(invariants).routes["sc-debug"].evidenceSink, /docs\/debug/);
});

test("every compact skill contract is reachable from runtime routing", async () => {
  const contractDirectory = path.join(ROOT, ".agent", "context", "skills");
  const contracts = (await readdir(contractDirectory))
    .filter((file) => file.endsWith(".contract.md"))
    .sort();
  const routingSurfaces = await Promise.all([
    readRepositoryFile(".agent/context/routing-index.md"),
    readRepositoryFile(".agent/context/skill-index.md"),
    ...PUBLIC_ROUTES.map((route) =>
      readRepositoryFile(`.agent/context/workflows/${route}.contract.md`),
    ),
  ]);
  const combined = routingSurfaces.join("\n");

  assert.ok(contracts.length > 0);
  for (const file of contracts) {
    assert.match(
      combined,
      new RegExp(`\\.agent/context/skills/${file.replaceAll(".", "\\.")}`),
      `unreachable compact skill contract: ${file}`,
    );
  }
});

test("all public routes satisfy the machine-readable quality invariant manifest", async () => {
  const manifest = JSON.parse(
    await readRepositoryFile(".agent/context/workflow-invariants.json"),
  );
  assert.equal(manifest.schema, "workflow_invariants_v1");
  assert.deepEqual(Object.keys(manifest.routes), PUBLIC_ROUTES);

  for (const route of PUBLIC_ROUTES) {
    const spec = manifest.routes[route];
    const [workflow, contract] = await Promise.all([
      readRepositoryFile(`.agent/workflows/${route}.md`),
      readRepositoryFile(`.agent/context/workflows/${route}.contract.md`),
    ]);
    for (const field of ["authority", "mutation", "evidenceSink"]) {
      assert.ok(spec[field], `${route}: missing ${field}`);
    }
    assert.ok(
      Array.isArray(spec.nextOwners) && spec.nextOwners.length > 0,
      `${route}: missing nextOwners`,
    );
    for (const owner of spec.nextOwners) {
      assert.ok(
        PUBLIC_ROUTES.includes(owner) ||
          ["caller", "dynamic-public-route", "stage-next-route"].includes(owner),
        `${route}: invalid next owner ${owner}`,
      );
    }
    for (const marker of spec.workflowMarkers) {
      assert.match(workflow, new RegExp(marker, "i"), `${route} workflow: ${marker}`);
    }
    for (const marker of spec.contractMarkers) {
      assert.match(contract, new RegExp(marker, "i"), `${route} contract: ${marker}`);
    }
  }
});
