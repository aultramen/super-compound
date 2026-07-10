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
      "privacy-by-design.md": "a68ec5518d83baea42280c20ada6537950f7616a99912812f754ceb72d4784a7",
      "regulatory-reference.md": "6d212f93d4ada6db260089211b10f6649a5c125b6c2966334c2cef52d9304d78",
      "implementation-patterns.md": "f024fdb7c9e8916be14b6bedb86733adbf41a041953846049726eea25ee2056a",
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
      "input-validation.md": "c35873781f2dd84244ccdf96d9cd17e8fa46f3cb78c7974a74bb84f0251a153c",
      "cryptography.md": "c670f72789248235a34779966dca9d74837fdd7e023d4e581762d4bf735602b6",
      "decision-tree.md": "8c3a24572c903523de544ea6ffbf9b9a5739a3aee62fccd5048cff92b64212cf",
      "red-flags.md": "6697e86523f3968b76f176d706af028ff352e6aa0c77e0f84b8e3542ce13322c",
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
      "stride.md": "858f89dc292fd51dee2b3f6beeb7363071143baa7d5bff8f44db0f7f6e854311",
      "attack-trees.md": "dccc47198c1949ca1ba5a66aad843f392c975f2aaea7b24115eab380e9054a26",
      "trust-boundaries.md": "97ea4f18ea9951a1a4204fb986cfe92558a3f5239f70d179ed7182478b0cd3d6",
      "document-template.md": "0806ea7f979e80e0347e9351463d705290fa292d6cf445d9ec76ece283a6ef8e",
      "process.md": "8ce636a3ca362ca80397aead9a9875e7ab5a18627c218bbeb4d094ee68ee350a",
      "red-flags.md": "0851b8f87ecbedf5ae9886a8c3ce8b348edabcf20c0686c40b8b6791b4698b83",
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
      "owasp.md": "8475ced508efbc56eda0a9b26f3fbd99a83a72ce903e09f976121d873fe244f0",
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
