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
  "data-privacy": {
    frontmatter:
      '---\nname: data-privacy\ndescription: "Use when processing personal data (PII), implementing consent mechanisms, or handling data subject requests. Covers GDPR, UU PDP Indonesia, and privacy-by-design principles."\n---',
    references: {
      "privacy-by-design.md": "9d4f0f7852056be3b7a1decdc1578ff272fc23d7f5569e75ff4c29d06355fd8f",
      "regulatory-reference.md": "b4ca468b5df1b0093827f3098815b0957e1a462d41496a5f0e8def166ac74c2f",
      "implementation-patterns.md": "ffb11e436148f04e6f5df20037dd9ff247139b46f05a0d8d6327185852722657",
      "dpia-template.md": "de1cbd13a824bf1b125e8cc9402ad0dc6af29533b3263e51107d2aa50f863c67",
      "review-checklists.md": "8d7ae22cae84dc613fe386eac92f445c45a7eb6b7c74ae4136ad73937f524974",
      "red-flags.md": "28b4d6574d0c57d7e5d1661a51043138b5dac6957d70f1ffc3e39937fe9a22c8",
    },
    headings: [
      "## Overview",
      "## Modes",
      "## Privacy-by-Design Principles",
      "## Regulatory Quick Reference",
      "## Implementation Patterns",
      "## Data Protection Impact Assessment (DPIA) Template",
      "## Privacy Checklist",
      "## Red Flags",
      "## Integration",
    ],
    invariants: [
      /STOP gate:.*legal basis/s,
      /DPIA gate:/,
      /verify identity/i,
      /Evidence gate:/,
    ],
  },
  "secure-code-patterns": {
    frontmatter:
      '---\nname: secure-code-patterns\ndescription: "Use when implementing input validation, cryptography, data encryption, or secure data handling. Covers allowlist validation, context encoding, password hashing, encryption at rest\/transit, and JWT security."\n---',
    references: {
      "input-validation.md": "8ce9db41057b24acc0e9656a139c4ab8955182130d14db189b0ac8e5703fff5e",
      "cryptography.md": "b828876eae60a2c548c7730af149fdd2dae5977a8556ca41a8fa2de7a96af240",
      "decision-tree.md": "92a78a3781317a4efc4809313456c8421185e15b213068d0a7d9618d71ea649f",
      "red-flags.md": "5503e5c4bd902a94ca74059f815e08d5fc615d65992c9cb3d9cda37413c18428",
    },
    headings: [
      "## Overview",
      "## Part 1: Input Validation",
      "## Part 2: Cryptography",
      "## Decision Tree: Which Pattern Do I Need?",
      "## Red Flags",
      "## Integration",
    ],
    invariants: [
      /STOP gate:/,
      /server-side validation/i,
      /allowlist/i,
      /Never roll your own crypto/i,
      /Fail closed/i,
      /Evidence gate:/,
    ],
  },
  "threat-modeling": {
    frontmatter:
      '---\nname: threat-modeling\ndescription: "Use when designing features that handle sensitive data, authentication, or external integrations and need STRIDE, attack-tree, or trust-boundary analysis."\n---',
    references: {
      "stride.md": "b2a38f4eb5b8428a7722256df60c513710c48c25feafdc7dfc484465130030a4",
      "attack-trees.md": "5a4a87a383ecbe8015b7fd3744e4a7f800cbd438b15409f66771ed977b60ed2a",
      "trust-boundaries.md": "24f2dd2fc77fb2a7945ca240838f4418704d17cdde9fa1020a7f5a788a2414bc",
      "document-template.md": "0806ea7f979e80e0347e9351463d705290fa292d6cf445d9ec76ece283a6ef8e",
      "process.md": "7b18d63bc86626e0b90e77d680b33ae531ae245becca0bcff67eb9298690c0a2",
      "red-flags.md": "df55923b8b78ffec29c5f17567d27faba6a0df05b2ee0bd25b2176dcde315ba0",
    },
    headings: [
      "## Overview",
      "## Modes",
      "## STRIDE Framework",
      "## Attack Tree Analysis",
      "## Trust Boundary Analysis",
      "## Threat Model Document Template",
      "## The Process",
      "## Red Flags",
      "## Integration",
    ],
    invariants: [
      /STOP gate:/,
      /all six STRIDE categories/i,
      /trust boundaries/i,
      /owner.*treatment.*acceptance/i,
      /Evidence gate:/,
    ],
  },
  "security-audit": {
    frontmatter:
      '---\nname: security-audit\ndescription: "Use when auditing code for security vulnerabilities, reviewing auth flows, checking OWASP Top 10 risks, validating secrets handling, or assessing dependency and agent-surface security."\n---',
    references: {
      "owasp.md": "179da9dc1d6adffa09ce4882e876b00821d66d8e3bf43d603f0ae7581d620647",
      "secrets.md": "3d60df1bf26c6c69976e1958f76e31e42aac3e8b6f6123c7181d6b057a42a829",
      "supply-chain.md": "d15ac415a557856a0e4c5da305bdd77edffb7440461c96852edca0c1e83b30c8",
      "agent-surface.md": "ce7c233651c026dd36e4ba488eec19c95a117b1c8828de563fa7f8cdbddd9877",
      "reporting.md": "786739b9d3c25f066fa4c806b5c0dc7ca3e6dbe87f036e9a96c9ae9ab4cd865c",
    },
    headings: [
      "## Purpose",
      "## Modes",
      "## Routing",
      "## OWASP Checklist",
      "## Secrets Handling",
      "## Dependency And Supply-Chain Checks",
      "## Agent Surface Checks",
      "## Evidence Format",
      "## Verification",
      "## Related Skills",
    ],
    invariants: [
      /Secret gate:/,
      /never print.*secret/i,
      /Finding gate:/,
      /file:line/,
      /Fix gate:.*original exploit path/s,
      /P0/,
    ],
  },
  "compatibility-check": {
    frontmatter:
      '---\nname: compatibility-check\ndescription: "Use when introducing dependencies or auditing runtime support, peer conflicts, deprecations, vulnerability posture, and rollback risk."\n---',
    references: {
      "inspection-surface.md": "5b0da19c6090488af88fc81a6d7005f433d7e9102ce6f1614ac236ec009c22d1",
      "preflight.md": "f7e9115fd5b0c4b064035ba40fbca2541a32e7e3c3f4cce6f7dc5a088f597ed8",
      "audit.md": "e3304579bd43dc4b63cd72361e0150005a24a39c7da78018e799d093b63832d1",
      "commands.md": "ffb4081d25994084826c5b93274b8dae5d54145e18c5e3387cf77897a01a3f24",
      "reporting.md": "5ab4f5ca1746fb16b871c728f34e3284d4be5990b02137a8fab406cd0689130a",
      "red-flags.md": "89052331f598b5ecb63ef678f93f45e8ee9a996a81188b2df02af5b9fa375d81",
    },
    headings: [
      "## Purpose",
      "## Modes",
      "## What To Inspect",
      "## Pre-Flight Steps",
      "## Audit Steps",
      "## Common Commands",
      "## Severity",
      "## Report Format",
      "## Red Flags",
      "## Related Skills",
    ],
    invariants: [
      /Mutation gate:.*read-only/s,
      /STOP gate:/,
      /Evidence gate:/,
      /missing.*report.*limitation/i,
      /rollback/i,
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

function countMarkdownHeading(text, heading) {
  let fenced = false;
  let count = 0;

  for (const line of text.split("\n")) {
    if (/^\s*```/u.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && line.trimEnd() === heading) count += 1;
  }

  return count;
}

async function readSkillFile(skill, relativePath) {
  return normalizeNewlines(
    await readFile(path.join(skillsRoot, skill, relativePath), "utf8"),
  );
}

test("risk skill routers preserve frontmatter and stay within 500 words", async () => {
  for (const [skill, spec] of Object.entries(specs)) {
    const content = await readSkillFile(skill, "SKILL.md");
    assert.equal(frontmatter(content), spec.frontmatter, `${skill} frontmatter`);
    assert.ok(
      whitespaceWords(content) <= 500,
      `${skill}/SKILL.md has ${whitespaceWords(content)} words`,
    );
  }
});

test("all detailed sections are routed, preserved, and covered exactly once", async () => {
  for (const [skill, spec] of Object.entries(specs)) {
    const router = await readSkillFile(skill, "SKILL.md");
    const documents = [router];

    for (const [reference, expectedHash] of Object.entries(spec.references)) {
      assert.ok(
        router.includes(`(references/${reference})`),
        `${skill} does not route references/${reference}`,
      );
      const content = await readSkillFile(skill, `references/${reference}`);
      assert.equal(sha256(content), expectedHash, `${skill}/${reference}`);
      documents.push(content);
    }

    for (const heading of spec.headings) {
      const occurrences = documents.reduce(
        (count, document) => count + countMarkdownHeading(document, heading),
        0,
      );
      assert.equal(occurrences, 1, `${skill} legacy heading: ${heading}`);
    }
  }
});

test("compact routers retain risk-critical stop and evidence gates", async () => {
  for (const [skill, spec] of Object.entries(specs)) {
    const content = await readSkillFile(skill, "SKILL.md");
    for (const invariant of spec.invariants) {
      assert.match(content, invariant, `${skill}: ${invariant}`);
    }
  }
});
