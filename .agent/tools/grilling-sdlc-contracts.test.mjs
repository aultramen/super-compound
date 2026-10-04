import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("explore carries consequential batched decisions without mandatory questionnaire", async () => {
  for (const path of [".agent/context/workflows/sc-explore.contract.md", ".agent/workflows/sc-explore.md", ".agent/skills/brainstorming/SKILL.md"]) {
    const text = await read(path);
    assert.match(text, /consequential.*decisions|decisions.*consequential/i, path);
    assert.match(text, /recommend/i, path);
    assert.doesNotMatch(text, /one (?:concise )?question per turn/i, path);
  }
  const protocol = await read(".agent/skills/brainstorming/references/questions-and-options.md");
  for (const marker of [/prerequisites/i, /partial answers/i, /descendants/i, /not.*approval/i, /Trade-off:/, /OPEN-\*/, /concrete specification/i]) assert.match(protocol, marker);
  for (const name of ["prd-generator", "writing-plans", "triage-workflow", "codebase-design"]) {
    assert.match(await read(`.agent/skills/${name}/SKILL.md`), /brainstorming.*questions-and-options/);
  }
  assert.doesNotMatch(await read("WALKTHROUGH.md"), /Ask one concise question at a time/);
  assert.match(await read(".agent/skills/brainstorming/references/grilling-MIT.txt"), /Copyright \(c\) 2026 Matt Pocock/);
});

test("light execution activates preflight and preserves alternative authority", async () => {
  for (const path of [".agent/context/workflows/sc-work.contract.md", ".agent/workflows/sc-work.md", ".agent/skills/executing-plans/references/authority-and-workspace.md"]) {
    const text = await read(path);
    for (const marker of [/current flow/i, /reusable pattern/i, /affected boundaries/i, /proving checks/i]) assert.match(text, marker, path);
  }
  const guidance = await read(".agent/skills/executing-plans/references/authority-and-workspace.md");
  assert.match(guidance, /current approach.*alternative.*benefit.*impact.*recommendation/is);
  assert.match(guidance, /reversible.*(?:no|without).*approval/is);
  assert.match(guidance, /acceptance.*owner/is);
});

test("conditional AI context authoring survives compact and full artifact paths", async () => {
  for (const path of ["skeletons/PRD-Skeleton.md", "skeletons/FSD-Skeleton.md", "PRD-Agentic-Ready-Reusable-Template.md", "FSD-Agentic-AI-Ready-Template.md"]) {
    const text = await read(`.agent/templates/agentic-delivery/${path}`);
    for (const marker of [/actor\/source attribution/i, /chronology/i, /selection/i, /truncation/i, /output-language policy/i]) assert.match(text, marker, path);
  }
  const policy = await read(".agent/skills/prd-generator/references/ai-context-and-output.md");
  for (const marker of [/mixed/i, /empty/i, /ambiguous/i, /selected context/i, /explicit product requirement/i, /malformed/i, /regenerate/i]) assert.match(policy, marker);
});

test("recovery and live evidence link the actual verification owners", async () => {
  assert.match(await read(".agent/skills/interface-design/references/implementation-and-checklist.md"), /draft.*selection/is);
  assert.match(await read(".agent/skills/integration-checking/SKILL.md"), /duplicate side effects/i);
  for (const path of [".agent/skills/verification-before-completion/SKILL.md", ".agent/skills/integration-checking/SKILL.md", ".agent/agents/e2e-runner.md"]) assert.match(await read(path), /live-verification\.md/, path);
  const live = await read(".agent/skills/verification-before-completion/references/live-verification.md");
  for (const marker of [/revision/i, /environment/i, /command/i, /after.*change/is, /variable names/i, /never.*values/i, /assertions/i, /unavailable/i, /stale/i]) assert.match(live, marker);
});

test("new references resolve and changed routers retain structure", async () => {
  for (const name of ["brainstorming", "executing-plans", "prd-generator", "writing-plans", "triage-workflow", "codebase-design", "domain-modeling", "integration-checking", "interface-design", "verification-before-completion"]) {
    const path = `.agent/skills/${name}/SKILL.md`;
    const text = await read(path);
    assert.match(text, /## (?:Summary|Overview|Purpose)/, path);
    for (const [, target] of text.matchAll(/\]\(([^)#]+)\)/g)) {
      if (target.includes("://")) continue;
      await readFile(new URL(target, new URL(path, root)), "utf8");
    }
  }
});
