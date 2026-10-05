import { createHash, randomUUID } from "node:crypto";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readBoundedFile,
  resolveRepositoryPath,
  withOwnerLock,
  writeFileAtomic,
} from "./file-state.mjs";
import { assertValidValue } from "./schema-validator.mjs";

const CONTRACT_VERSION = "2.0.0";
const PLAN_SCHEMA = "loop_runtime_migration_plan_v2";
const CONFIG_PATH = ".agent/context/project-config.json";
const CONFIG_SCHEMA_PATH = ".agent/context/schemas/project-config-v2.schema.json";
const LEDGER_SCHEMA_PATH = ".agent/context/schemas/work-package-ledger-v2.schema.json";
const LEGACY_CONFIG_PATH = ".agent/rules/project-config.md";
const CONFIG_REVIEW_PATH = ".scratch/loop-runtime-v2/migration-config-review.json";
const LEDGER_ROOT = ".scratch/work-packages";
const MIGRATION_ROOT = ".scratch/loop-runtime-v2/migrations";
const MIGRATION_LOCK = `${MIGRATION_ROOT}/migration.lock`;
const AUTHORITY_ROOTS = [
  "docs/prd",
  "docs/fsd",
];
const SCRATCH_ROOT = ".scratch";
const LEGACY_EFFECT_ROOTS = [
  ".scratch/loop-runtime-v1",
  ".scratch/loop-runs-v1",
];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PLAN_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 512;
const MAX_AGGREGATE_BYTES = 32 * 1024 * 1024;
const MAX_AUTHORITY_HEADER_BYTES = 16 * 1024;
const MAX_AUTHORITY_HEADER_LINES = 64;
const AUTHORITY_VERSION_FIELD = "Artifact contract version";
const AUTHORITY_VERSION_FIELD_SIGNATURE = "artifactcontractversion";
const CANONICAL_HUMAN_AUTHORITY_VERSION_LINES = new Set([
  `${AUTHORITY_VERSION_FIELD}: \`2.0.0\``,
  `- ${AUTHORITY_VERSION_FIELD}: \`2.0.0\``,
]);
const CANONICAL_YAML_AUTHORITY_VERSION_LINE = 'artifact_contract_version: "2.0.0"';
const YAML_AUTHORITY_PREFIXES = ["docs/prd/", "docs/fsd/"];
const RAW_HTML_LITERAL_TAGS = new Set(["pre", "script", "style", "textarea"]);
// CommonMark 0.31.2 type-6 tags; notably, `source` can interrupt a paragraph.
const RAW_HTML_TYPE_SIX_TAGS = new Set([
  "address", "article", "aside", "base", "basefont", "blockquote", "body",
  "caption", "center", "col", "colgroup", "dd", "details", "dialog", "dir",
  "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form",
  "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head",
  "header", "hr", "html", "iframe", "legend", "li", "link", "main", "menu",
  "menuitem", "nav", "noframes", "ol", "optgroup", "option", "p", "param",
  "search", "section", "source", "summary", "table", "tbody", "td", "tfoot",
  "th", "thead", "title", "tr", "track", "ul",
]);
const MAX_RAW_HTML_DEPTH = 32;
const HTML_VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);
const ACTIVE_LEGACY_STATUSES = new Set([
  "RUNNING",
  "OBSERVED",
  "VERIFYING",
  "RESUMING",
  "in-progress",
]);
const ACTIVE_LEGACY_RUN_STATES = new Set([
  "READY",
  "PAUSED",
  "RUNNING",
  "OBSERVED",
  "VERIFYING",
  "RESUMING",
  "IN-PROGRESS",
]);
const TERMINAL_LEGACY_RUN_STATES = new Set([
  "SUCCESS",
  "PASS",
  "COMPLETE",
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "FAILURE",
  "ERROR",
  "NO_PROGRESS",
  "BUDGET_EXHAUSTED",
  "TIMEOUT",
  "POLICY_STOP",
  "FATAL",
  "CANCELLED",
]);

function defaultConfigCandidate() {
  return {
    schema: "project_config_v2",
    contract_version: CONTRACT_VERSION,
    config_version: 1,
    mode_version: 0,
    mode: "DISABLED",
    policy: {
      max_iterations: 100,
      max_runtime_minutes: 180,
      max_no_progress_iterations: 5,
      max_tokens: null,
      max_cost_micro: null,
      approval_ttl_minutes: 60,
      allowlisted_operations: ["source-write", "work"],
      credential_scopes: [],
      required_gates: ["fresh-verifier", "human-budget-confirmation"],
      risk: "MEDIUM",
      isolation: "WORKTREE",
      expires_at: "9999-12-31T23:59:59.999999999Z",
    },
    background_aggregate_policy: {
      max_workers: 2,
      max_reserved_tokens: null,
      max_reserved_runtime_ms: 21_600_000,
      max_remote_calls: 0,
      max_reviewers: 2,
    },
    billing_currency: "USD",
    retention: {
      run_metadata_days: 30,
      audit_evidence_days: 90,
      legal_hold_behavior: "PRESERVE",
    },
    telemetry: {
      enabled: false,
      persistence_required: false,
      redaction_revision: null,
      retention_days: null,
      max_file_bytes: null,
    },
    risk: {
      default_profile: "MEDIUM",
      maximum_autonomy: "INTERACTIVE",
      external_write_policy: "DENY",
    },
    write_classification: {
      runtime_audit_prefixes: [
        ".scratch/loop-runs/",
        ".scratch/loop-queue/",
        ".scratch/loop-runtime/",
        ".scratch/work-packages/",
      ],
      authority_prefixes: [
        ".agent/evals/",
        "docs/brd/",
        "docs/fsd/",
        "docs/prd/",
        "docs/research/",
      ],
      authority_exact_paths: [],
      unknown_path_class: "implementation_write",
    },
    capability_requirements: {
      enforce: ["DURABLE_LOCAL_STATE", "HARD_WRITE_INTERCEPTION"],
      background: [
        "FINITE_NO_PROGRESS_CAP",
        "FINITE_RUNTIME_CAP",
        "ISOLATED_WORKTREE",
        "LEASE_RECOVERY",
      ],
      external_write: [
        "AUTHORITATIVE_READBACK",
        "COMPENSATION",
        "DURABLE_INTENT",
        "IDEMPOTENCY",
      ],
    },
    artifact_authority: {
      required_contract_version: CONTRACT_VERSION,
      execution_authority_types: ["PRD", "FSD", "ISSUE", "EVAL"],
      legacy_action: "REPLAN_REQUIRED",
    },
  };
}

function classifyLegacyOutcome(effect) {
  const values = [effect?.status, effect?.outcome]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toUpperCase());
  if (values.length === 0) return "UNKNOWN_LEGACY_OUTCOME";
  const explicitUnknown = new Set(["UNKNOWN", "UNKNOWN_OUTCOME", "AMBIGUOUS"]);
  const supported = new Set([
    ...explicitUnknown,
    ...ACTIVE_LEGACY_RUN_STATES,
    ...TERMINAL_LEGACY_RUN_STATES,
  ]);
  if (values.some((value) => explicitUnknown.has(value) || !supported.has(value))) {
    return "UNKNOWN_LEGACY_OUTCOME";
  }
  if (values.some((value) => ACTIVE_LEGACY_RUN_STATES.has(value))) {
    return "ACTIVE_V1_REPLAN_REQUIRED";
  }
  if (values.every((value) => TERMINAL_LEGACY_RUN_STATES.has(value))) {
    return "LEGACY_REPLAN_REQUIRED";
  }
  return "UNKNOWN_LEGACY_OUTCOME";
}

function authorityHeaderMetadataLines(text) {
  const sourceLines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (text.endsWith("\n")) sourceLines.pop();
  const entries = [];
  let bytes = 0;
  let metadataSectionSeen = false;
  let fence = null;
  const htmlStack = [];
  let opaqueHtml = null;
  let pendingHtmlTag = null;
  let blankTerminatedHtmlBlock = false;
  let malformedRawHtml = false;
  let codeSpanTicks = null;
  let lazyContainerParagraph = false;
  let standaloneBoundary = true;
  let setextParagraphStart = null;
  const hasInitialFrontmatter = sourceLines[0] === "---";
  let inFrontmatter = hasInitialFrontmatter;

  function openingFence(line) {
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
    if (!match || (match[1][0] === "`" && match[2].includes("`"))) return null;
    return { character: match[1][0], length: match[1].length };
  }

  function closesFence(line) {
    const match = /^ {0,3}(`{3,}|~{3,})[ \t]*$/u.exec(line);
    return match !== null
      && match[1][0] === fence.character
      && match[1].length >= fence.length;
  }

  function levelTwoHeadingContent(line) {
    const match = /^ {0,3}##(?=$|[ \t])/u.exec(line);
    if (!match) return null;
    return line
      .slice(match[0].length)
      .trim()
      .replace(/[ \t]+#+[ \t]*$/u, "")
      .trim();
  }

  function updateCodeSpanState(line) {
    const activeAtStart = codeSpanTicks !== null;
    for (let cursor = 0; cursor < line.length;) {
      if (line[cursor] !== "`") {
        cursor += 1;
        continue;
      }
      let end = cursor + 1;
      while (line[end] === "`") end += 1;
      const runLength = end - cursor;
      if (codeSpanTicks === null) codeSpanTicks = runLength;
      else if (codeSpanTicks === runLength) codeSpanTicks = null;
      cursor = end;
    }
    return activeAtStart;
  }

  function startsLazyContainer(line) {
    return /^ {0,3}(?:>[ \t]?|(?:[-+*]|\d{1,9}[.)])[ \t]+)/u.test(line);
  }

  function startsOpaqueHtml(line, cursor) {
    const tail = line.slice(cursor);
    if (tail.startsWith("<!--")) return { close: "-->", quoteAware: false, length: 4 };
    if (tail.startsWith("<![CDATA[")) return { close: "]]>", quoteAware: false, length: 9 };
    if (tail.startsWith("<?")) return { close: "?>", quoteAware: false, length: 2 };
    if (/^<![A-Z]/u.test(tail)) return { close: ">", quoteAware: false, length: 2 };
    return null;
  }

  function looksLikeHtmlTag(line, cursor) {
    return /^<\/?[A-Za-z][A-Za-z0-9-]*(?=\s|\/?>|$)/u.test(line.slice(cursor));
  }

  function isCompleteTypeSevenTag(line, cursor) {
    const tail = line.slice(cursor);
    if (/^<\/[A-Za-z][A-Za-z0-9-]*[ \t]*>[ \t]*$/u.test(tail)) return true;
    return /^<[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z_:][A-Za-z0-9_.:-]*(?:[ \t]*=[ \t]*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*[ \t]*\/?>[ \t]*$/u
      .test(tail);
  }

  function applyHtmlTag(token) {
    const closing = /^<\/([A-Za-z][A-Za-z0-9-]*)\s*>$/u.exec(token);
    if (closing) {
      const tag = closing[1].toLowerCase();
      if (htmlStack.length === 0 || htmlStack.at(-1) !== tag) {
        malformedRawHtml = true;
        return;
      }
      htmlStack.pop();
      return;
    }

    const opening = /^<([A-Za-z][A-Za-z0-9-]*)(?:\s[\s\S]*?)?\s*\/?>$/u.exec(token);
    if (!opening) {
      malformedRawHtml = true;
      return;
    }
    const tag = opening[1].toLowerCase();
    if (HTML_VOID_TAGS.has(tag) || /\/\s*>$/u.test(token)) return;
    if (htmlStack.length >= MAX_RAW_HTML_DEPTH) {
      malformedRawHtml = true;
      return;
    }
    htmlStack.push(tag);
  }

  function consumeOpaqueHtml(line, cursor) {
    if (!opaqueHtml.quoteAware) {
      const end = line.indexOf(opaqueHtml.close, cursor);
      if (end === -1) return { cursor: line.length, closed: false };
      const next = end + opaqueHtml.close.length;
      const closingLineIsRaw = opaqueHtml.block;
      opaqueHtml = null;
      return { cursor: next, closed: true, closingLineIsRaw };
    }
    for (let index = cursor; index < line.length; index += 1) {
      const character = line[index];
      if (opaqueHtml.quote) {
        if (character === opaqueHtml.quote) opaqueHtml.quote = null;
      } else if (character === '"' || character === "'") {
        opaqueHtml.quote = character;
      } else if (character === ">") {
        opaqueHtml = null;
        return { cursor: index + 1, closed: true };
      }
    }
    return { cursor: line.length, closed: false };
  }

  function consumePendingHtmlTag(line, cursor) {
    for (let index = cursor; index < line.length; index += 1) {
      const character = line[index];
      pendingHtmlTag.buffer += character;
      if (pendingHtmlTag.quote) {
        if (character === pendingHtmlTag.quote) pendingHtmlTag.quote = null;
      } else if (character === '"' || character === "'") {
        pendingHtmlTag.quote = character;
      } else if (character === ">") {
        const token = pendingHtmlTag.buffer;
        pendingHtmlTag = null;
        applyHtmlTag(token);
        return { cursor: index + 1, closed: true };
      }
    }
    pendingHtmlTag.buffer += "\n";
    return { cursor: line.length, closed: false };
  }

  function literalClose(line, cursor) {
    const match = /<\/(?:pre|script|style|textarea)>/iu.exec(line.slice(cursor));
    if (!match) return null;
    return { start: cursor + match.index, end: cursor + match.index + match[0].length };
  }

  function scrubRawHtml(line) {
    let visible = "";
    let cursor = 0;
    while (cursor < line.length) {
      if (opaqueHtml) {
        const consumed = consumeOpaqueHtml(line, cursor);
        cursor = consumed.cursor;
        if (consumed.closingLineIsRaw) return visible;
        if (consumed.closed && htmlStack.length === 0) visible += " ";
        continue;
      }
      if (pendingHtmlTag) {
        const consumed = consumePendingHtmlTag(line, cursor);
        cursor = consumed.cursor;
        if (consumed.closed && htmlStack.length === 0) visible += " ";
        continue;
      }

      const top = htmlStack.at(-1);
      if (top && RAW_HTML_LITERAL_TAGS.has(top)) {
        const closing = literalClose(line, cursor);
        if (!closing) return visible;
        htmlStack.pop();
        return visible;
      }

      const nextTag = line.indexOf("<", cursor);
      if (nextTag === -1) {
        if (htmlStack.length === 0) visible += line.slice(cursor);
        return visible;
      }
      if (htmlStack.length === 0) visible += line.slice(cursor, nextTag);
      cursor = nextTag;

      const opaque = startsOpaqueHtml(line, cursor);
      const atBlockPosition = visible.trim() === "" && visible.length <= 3;
      if (opaque && (htmlStack.length > 0 || atBlockPosition || opaque.close === "-->")) {
        if (htmlStack.length === 0) visible += " ";
        opaqueHtml = {
          ...opaque,
          quote: null,
          block: htmlStack.length === 0 && atBlockPosition,
        };
        cursor += opaque.length;
        continue;
      }
      if (looksLikeHtmlTag(line, cursor) && (htmlStack.length > 0 || atBlockPosition)) {
        if (htmlStack.length === 0 && atBlockPosition) {
          const tag = /^<\/?([A-Za-z][A-Za-z0-9-]*)/u
            .exec(line.slice(cursor))?.[1]
            .toLowerCase();
          const literal = tag && RAW_HTML_LITERAL_TAGS.has(tag);
          const typeSix = tag && RAW_HTML_TYPE_SIX_TAGS.has(tag);
          const typeSeven = standaloneBoundary && isCompleteTypeSevenTag(line, cursor);
          if (!literal && !typeSix && !typeSeven) {
            visible += "<";
            cursor += 1;
            continue;
          }
          if (!literal) blankTerminatedHtmlBlock = true;
        }
        if (htmlStack.length === 0) visible += " ";
        pendingHtmlTag = { buffer: "", quote: null };
        continue;
      }

      if (htmlStack.length === 0) visible += "<";
      cursor += 1;
    }
    return visible;
  }

  for (const [index, line] of sourceLines.entries()) {
    if (index >= MAX_AUTHORITY_HEADER_LINES) {
      return { entries, complete: false };
    }
    const lineBytes = Buffer.byteLength(line, "utf8") + (index === 0 ? 0 : 1);
    if (bytes + lineBytes > MAX_AUTHORITY_HEADER_BYTES) {
      return { entries, complete: false };
    }
    bytes += lineBytes;

    if (fence) {
      if (closesFence(line)) {
        fence = null;
        standaloneBoundary = true;
      }
      continue;
    }
    if (blankTerminatedHtmlBlock && /^[ \t]*$/u.test(line)) {
      if (opaqueHtml || pendingHtmlTag || htmlStack.length > 0) {
        malformedRawHtml = true;
      }
      opaqueHtml = null;
      pendingHtmlTag = null;
      htmlStack.length = 0;
      blankTerminatedHtmlBlock = false;
      codeSpanTicks = null;
      lazyContainerParagraph = false;
      standaloneBoundary = true;
      setextParagraphStart = null;
      continue;
    }
    const wasInBlankTerminatedHtmlBlock = blankTerminatedHtmlBlock;
    const scrubbedLine = scrubRawHtml(line);
    const visibleLine = wasInBlankTerminatedHtmlBlock || blankTerminatedHtmlBlock
      ? ""
      : scrubbedLine;
    fence = openingFence(visibleLine);
    if (fence) {
      codeSpanTicks = null;
      lazyContainerParagraph = false;
      setextParagraphStart = null;
      continue;
    }
    if (hasInitialFrontmatter && index === 0) continue;
    if (inFrontmatter && visibleLine === "---") {
      inFrontmatter = false;
      standaloneBoundary = true;
      setextParagraphStart = null;
      continue;
    }
    const setextLevelTwo = !inFrontmatter && /^ {0,3}-+[ \t]*$/u.test(visibleLine);
    if (setextLevelTwo && setextParagraphStart !== null) {
      entries.length = setextParagraphStart;
    }
    const levelTwoHeading = setextLevelTwo
      ? ""
      : inFrontmatter ? null : levelTwoHeadingContent(visibleLine);
    if (levelTwoHeading !== null) {
      codeSpanTicks = null;
      lazyContainerParagraph = false;
      setextParagraphStart = null;
      if (!metadataSectionSeen && levelTwoHeading === "Metadata") {
        metadataSectionSeen = true;
        standaloneBoundary = true;
        entries.push({ line: visibleLine, context: "DIRECT" });
        continue;
      }
      return {
        entries,
        complete: !opaqueHtml
          && !pendingHtmlTag
          && htmlStack.length === 0
          && !malformedRawHtml,
      };
    }
    const blankLine = /^[ \t]*$/u.test(visibleLine);
    if (!inFrontmatter && blankLine) {
      codeSpanTicks = null;
      lazyContainerParagraph = false;
      setextParagraphStart = null;
    }
    const startsContainer = inFrontmatter ? false : startsLazyContainer(visibleLine);
    const standaloneLine = inFrontmatter || standaloneBoundary || startsContainer;
    const inContainer = inFrontmatter
      ? false
      : lazyContainerParagraph && !startsContainer;
    const inCodeSpan = inFrontmatter ? false : updateCodeSpanState(visibleLine);
    const entryIndex = entries.length;
    entries.push({
      line: visibleLine,
      context: inFrontmatter
        ? "YAML_FRONTMATTER"
        : inCodeSpan ? "CODE_SPAN"
          : inContainer ? "CONTAINER"
            : standaloneLine ? "DIRECT" : "PARAGRAPH_CONTINUATION",
    });
    if (!inFrontmatter && !blankLine && startsContainer) {
      lazyContainerParagraph = true;
    }
    if (!inFrontmatter) {
      const atxHeading = /^ {0,3}#{1,6}(?=$|[ \t])/u.test(visibleLine);
      if (blankLine || startsContainer || inContainer || atxHeading) {
        setextParagraphStart = null;
      } else if (standaloneBoundary) {
        setextParagraphStart = entryIndex;
      }
      standaloneBoundary = blankLine
        || atxHeading;
    }
  }
  return {
    entries,
    complete: !opaqueHtml
      && !pendingHtmlTag
      && htmlStack.length === 0
      && !malformedRawHtml
      && fence === null
      && codeSpanTicks === null
      && !inFrontmatter,
  };
}

function hasCanonicalAuthorityContract(text, authorityPath) {
  const header = authorityHeaderMetadataLines(text);
  if (!header.complete) return false;
  const declarations = header.entries
    .filter(({ line }) => line
      .toLowerCase()
      .replace(/[^a-z0-9]/gu, "")
      .includes(AUTHORITY_VERSION_FIELD_SIGNATURE));
  if (declarations.length !== 1) return false;
  const declaration = declarations[0];
  if (CANONICAL_HUMAN_AUTHORITY_VERSION_LINES.has(declaration.line)) {
    return declaration.context === "DIRECT";
  }
  return declaration.line === CANONICAL_YAML_AUTHORITY_VERSION_LINE
    && declaration.context === "YAML_FRONTMATTER"
    && YAML_AUTHORITY_PREFIXES.some((prefix) => authorityPath.startsWith(prefix));
}

function fail(code, detail) {
  throw new Error(`${code}: ${detail}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, keys, label) {
  if (!isObject(value)) fail("INVALID_PLAN", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("INVALID_PLAN", `${label} fields must be exactly ${expected.join(", ")}`);
  }
}

function assertAllowedKeys(value, allowed, required, label) {
  if (!isObject(value)) fail("INVALID_PLAN", `${label} must be an object`);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) fail("INVALID_PLAN", `${label}.${key} is not allowed`);
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail("INVALID_PLAN", `${label}.${key} is required`);
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail("INVALID_JSON", `${label}: ${error.message}`);
  }
}

function digest(content) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function canonicalJson(value, state = { ancestors: new Set(), nodes: 0 }, depth = 0) {
  state.nodes += 1;
  if (depth > 64 || state.nodes > 100_000) {
    fail("INVALID_JSON_VALUE", "canonical JSON exceeds depth or node limits");
  }
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("INVALID_JSON_VALUE", "numbers must be safe integers");
    return String(value);
  }
  if (typeof value !== "object") fail("INVALID_JSON_VALUE", `unsupported ${typeof value}`);
  if (state.ancestors.has(value)) fail("INVALID_JSON_VALUE", "cyclic value");
  state.ancestors.add(value);
  let serialized;
  if (Array.isArray(value)) {
    serialized = `[${value.map((item) => canonicalJson(item, state, depth + 1)).join(",")}]`;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      fail("INVALID_JSON_VALUE", "objects must be plain JSON objects");
    }
    serialized = `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], state, depth + 1)}`)
      .join(",")}}`;
  }
  state.ancestors.delete(value);
  return serialized;
}

function digestJson(value) {
  return digest(Buffer.from(canonicalJson(value), "utf8"));
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function canonicalDocument(value) {
  return `${canonicalJson(value)}\n`;
}

function assertRepositoryPathSyntax(candidate, label) {
  if (
    typeof candidate !== "string"
    || !candidate
    || candidate.length > 4096
    || candidate.startsWith("/")
    || candidate.includes("\\")
    || /[:\0-\x1f\x7f]/u.test(candidate)
    || candidate.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    fail("PATH_CONFINEMENT", `${label} is not a safe repository path`);
  }
  return candidate;
}

function assertDigest(value, label) {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value)) {
    fail("INVALID_PLAN", `${label} must be a sha256 digest`);
  }
}

function toRepositoryPath(root, candidate, label) {
  if (typeof candidate !== "string" || !candidate.trim() || /[\0\r\n]/u.test(candidate)) {
    fail("INVALID_LEGACY_LEDGER", `${label} must be a non-empty path`);
  }
  const absolute = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail("PATH_CONFINEMENT", `${label} resolves outside the repository`);
  }
  const normalized = relative.replaceAll("\\", "/");
  if (normalized.split("/").some((part) => part === "." || part === ".." || !part)) {
    fail("PATH_CONFINEMENT", `${label} is not a normalized repository path`);
  }
  return normalized;
}

async function optionalInfo(root, candidate) {
  const absolute = await resolveRepositoryPath(root, candidate, {
    label: "Migration path",
  });
  const info = await lstat(absolute).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (info?.isSymbolicLink()) fail("SYMLINK_REJECTED", candidate);
  return info;
}

async function readOptionalFile(root, candidate, maxBytes = MAX_FILE_BYTES) {
  const info = await optionalInfo(root, candidate);
  if (!info) return null;
  if (!info.isFile()) fail("NOT_A_FILE", candidate);
  return readBoundedFile(root, candidate, { encoding: "utf8", maxBytes });
}

async function walkFiles(
  root,
  candidate,
  predicate = () => true,
  maxFiles = MAX_FILES,
  budget = { entriesSeen: 0, filesSeen: 0 },
) {
  const startingInfo = await optionalInfo(root, candidate);
  if (!startingInfo) return [];
  if (!startingInfo.isDirectory()) fail("NOT_A_DIRECTORY", candidate);
  const results = [];

  async function visit(relativeDirectory) {
    const absoluteDirectory = await resolveRepositoryPath(root, relativeDirectory, {
      label: "Migration scan directory",
    });
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      budget.entriesSeen += 1;
      if (budget.entriesSeen > maxFiles) fail("SCAN_LIMIT_EXCEEDED", `${maxFiles} entries`);
      const relative = path.posix.join(
        relativeDirectory.replaceAll("\\", "/"),
        entry.name,
      );
      if (entry.isSymbolicLink()) fail("SYMLINK_REJECTED", relative);
      if (entry.isDirectory()) {
        await visit(relative);
      } else if (entry.isFile() && predicate(relative)) {
        results.push(relative);
        budget.filesSeen += 1;
        if (budget.filesSeen > maxFiles) fail("SCAN_LIMIT_EXCEEDED", `${maxFiles} files`);
      } else if (!entry.isFile()) {
        fail("UNSUPPORTED_FILE_TYPE", relative);
      }
    }
  }

  await visit(candidate);
  return results;
}

async function scratchIssueFiles(root, maxFiles) {
  const scratchInfo = await optionalInfo(root, SCRATCH_ROOT);
  if (!scratchInfo) return [];
  if (!scratchInfo.isDirectory()) fail("NOT_A_DIRECTORY", SCRATCH_ROOT);
  const absoluteScratch = await resolveRepositoryPath(root, SCRATCH_ROOT, {
    label: "Migration scratch directory",
  });
  const featureEntries = await readdir(absoluteScratch, { withFileTypes: true });
  featureEntries.sort((left, right) => left.name.localeCompare(right.name));
  const budget = { entriesSeen: 0, filesSeen: 0 };
  const results = [];

  for (const entry of featureEntries) {
    budget.entriesSeen += 1;
    if (budget.entriesSeen > maxFiles) fail("SCAN_LIMIT_EXCEEDED", `${maxFiles} entries`);
    const featurePath = path.posix.join(SCRATCH_ROOT, entry.name);
    if (entry.isSymbolicLink()) fail("SYMLINK_REJECTED", featurePath);
    if (!entry.isDirectory()) {
      if (!entry.isFile()) fail("UNSUPPORTED_FILE_TYPE", featurePath);
      continue;
    }
    const issueRoot = path.posix.join(featurePath, "issues");
    if (!await optionalInfo(root, issueRoot)) continue;
    results.push(...await walkFiles(
      root,
      issueRoot,
      (file) => file.endsWith(".md"),
      maxFiles,
      budget,
    ));
  }
  return results;
}

function validPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validateConfig(config, schema) {
  if (!isObject(config) || config.schema !== "project_config_v2") {
    return "project_config_v2 is required";
  }
  if (config.contract_version !== CONTRACT_VERSION || !isObject(config.policy)) {
    return "contract_version 2.0.0 and policy are required";
  }
  for (const field of [
    "max_iterations",
    "max_runtime_minutes",
    "max_no_progress_iterations",
  ]) {
    if (!validPositiveInteger(config.policy[field])) {
      return `${field} must be finite and positive`;
    }
  }
  for (const field of ["max_tokens", "max_cost_micro"]) {
    if (config.policy[field] !== null && !validPositiveInteger(config.policy[field])) {
      return `${field} must be null or finite and positive`;
    }
  }
  if (!["DISABLED", "OBSERVE", "ENFORCE", "HALTED"].includes(config.mode)) {
    return "mode is invalid";
  }
  if (schema) {
    try {
      assertValidValue(config, schema, "project config migration candidate");
    } catch (error) {
      return error.message;
    }
  }
  return null;
}

function configSourceStateDigest(configText, legacyText) {
  return digestJson({
    machine_config: configText === null ? null : digest(Buffer.from(configText, "utf8")),
    legacy_markdown: legacyText === null ? null : digest(Buffer.from(legacyText, "utf8")),
  });
}

function validateConfigReview(review, sourceStateDigest, configSchema) {
  try {
    assertExactKeys(
      review,
      [
        "schema",
        "contract_version",
        "source_state_digest",
        "candidate",
        "candidate_digest",
        "reviewed_by",
        "reviewed_at",
      ],
      "config migration review",
    );
  } catch (error) {
    return { error: error.message };
  }
  if (
    review.schema !== "project_config_migration_review_v2"
    || review.contract_version !== CONTRACT_VERSION
    || review.source_state_digest !== sourceStateDigest
    || typeof review.reviewed_by !== "string"
    || !review.reviewed_by.trim()
    || review.reviewed_by.length > 200
    || /[\0\r\n]/u.test(review.reviewed_by)
    || typeof review.reviewed_at !== "string"
    || !Number.isFinite(Date.parse(review.reviewed_at))
  ) {
    return { error: "review identity, timestamp, version, or source binding is invalid" };
  }
  const configError = validateConfig(review.candidate, configSchema);
  if (configError || review.candidate?.mode !== "DISABLED") {
    return { error: configError ?? "reviewed migration config must use DISABLED mode" };
  }
  const candidateDigest = digest(Buffer.from(canonicalDocument(review.candidate), "utf8"));
  if (review.candidate_digest !== candidateDigest) {
    return { error: "candidate_digest does not match the reviewed candidate" };
  }
  return { candidate: review.candidate, candidateDigest };
}

function mapBaselineDirty(root, value, label) {
  if (value === false) return {};
  if (!isObject(value)) {
    fail("INVALID_LEGACY_LEDGER", `${label}.baselineDirty must be false or an object`);
  }
  return Object.fromEntries(
    Object.entries(value)
      .map(([candidate, oldDigest]) => [
        toRepositoryPath(root, candidate, `${label}.baselineDirty path`),
        String(oldDigest).slice(0, 256),
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function mapLegacyGoal(root, goalId, goal) {
  if (!isObject(goal)) fail("INVALID_LEGACY_LEDGER", `${goalId} must be an object`);
  if (ACTIVE_LEGACY_STATUSES.has(goal.status)) {
    return { blocker: { code: "ACTIVE_V1_REPLAN_REQUIRED", goal: goalId } };
  }
  if (!["ready", "implemented", "verified"].includes(goal.status)) {
    return { blocker: { code: "LEGACY_GOAL_REPLAN_REQUIRED", goal: goalId } };
  }
  const converted = {
    status: goal.status === "ready" ? "ready" : "implemented",
    briefPath: toRepositoryPath(root, goal.briefPath, `${goalId}.briefPath`),
    reportPath: toRepositoryPath(root, goal.reportPath, `${goalId}.reportPath`),
    pathsPath: toRepositoryPath(root, goal.pathsPath, `${goalId}.pathsPath`),
    reviewPackagePath: toRepositoryPath(
      root,
      goal.reviewPackagePath,
      `${goalId}.reviewPackagePath`,
    ),
    scopeDigest: goal.scopeDigest,
    baselineDirty: mapBaselineDirty(root, goal.baselineDirty, goalId),
    verification: goal.status === "ready"
      ? String(goal.verification || "pending")
      : "REPLAN_REQUIRED: legacy verification is stale; fresh verification required",
  };
  if (goal.status !== "ready") converted.requiresFreshVerification = true;
  return { converted };
}

function mapLegacyLedger(root, ledger, ledgerPath) {
  if (!isObject(ledger) || ledger.schema !== "work_package_ledger_v1") {
    fail("INVALID_LEGACY_LEDGER", ledgerPath);
  }
  if (typeof ledger.runId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(ledger.runId)) {
    fail("INVALID_LEGACY_LEDGER", `${ledgerPath} has an invalid runId`);
  }
  if (!isObject(ledger.goals)) fail("INVALID_LEGACY_LEDGER", `${ledgerPath}.goals`);
  const blockers = [];
  const goals = {};
  for (const goalId of Object.keys(ledger.goals).sort()) {
    const mapped = mapLegacyGoal(root, goalId, ledger.goals[goalId]);
    if (mapped.blocker) blockers.push({ ...mapped.blocker, path: ledgerPath });
    else goals[goalId] = mapped.converted;
  }
  return {
    blockers,
    candidate: blockers.length === 0
      ? { schema: "work_package_ledger_v2", runId: ledger.runId, ledgerVersion: 1, goals }
      : null,
  };
}

function assertGoalCandidate(goal, label) {
  const allowed = [
    "status", "briefPath", "reportPath", "pathsPath", "reviewPackagePath",
    "scopeDigest", "baselineDirty", "verification", "expectedEvidence", "evidence",
    "requiresFreshVerification", "statusReason", "recovery",
  ];
  const required = [
    "status", "briefPath", "reportPath", "pathsPath", "reviewPackagePath",
    "scopeDigest", "baselineDirty", "verification",
  ];
  assertAllowedKeys(goal, allowed, required, label);
  for (const field of ["briefPath", "reportPath", "pathsPath", "reviewPackagePath"]) {
    assertRepositoryPathSyntax(goal[field], `${label}.${field}`);
  }
  if (!isObject(goal.baselineDirty)) fail("INVALID_PLAN", `${label}.baselineDirty must be an object`);
  for (const candidate of Object.keys(goal.baselineDirty)) {
    assertRepositoryPathSyntax(candidate, `${label}.baselineDirty`);
  }
}

function assertLedgerCandidate(candidate, label) {
  assertExactKeys(candidate, ["schema", "runId", "ledgerVersion", "goals"], label);
  if (candidate.schema !== "work_package_ledger_v2" || !isObject(candidate.goals)) {
    fail("INVALID_PLAN", `${label} is not a v2 ledger`);
  }
  for (const [goalId, goal] of Object.entries(candidate.goals)) {
    assertGoalCandidate(goal, `${label}.goals.${goalId}`);
  }
}

function assertPlan(plan) {
  assertExactKeys(
    plan,
    ["schema", "contract_version", "payload", "payload_digest"],
    "migration plan",
  );
  if (plan.schema !== PLAN_SCHEMA || plan.contract_version !== CONTRACT_VERSION) {
    fail("INVALID_PLAN", `${PLAN_SCHEMA} ${CONTRACT_VERSION} is required`);
  }
  assertDigest(plan.payload_digest, "payload_digest");
  assertExactKeys(
    plan.payload,
    [
      "plan_id", "generated_at", "source_manifest", "config", "ledgers",
      "authority_findings", "blockers",
    ],
    "migration plan payload",
  );
  if (digestJson(plan.payload) !== plan.payload_digest) {
    fail("PLAN_DIGEST_MISMATCH", "payload does not match payload_digest");
  }
  if (!Array.isArray(plan.payload.source_manifest)
      || !Array.isArray(plan.payload.ledgers)
      || !Array.isArray(plan.payload.authority_findings)
      || !Array.isArray(plan.payload.blockers)) {
    fail("INVALID_PLAN", "payload lists are required");
  }
  if ([
    plan.payload.source_manifest,
    plan.payload.ledgers,
    plan.payload.authority_findings,
    plan.payload.blockers,
  ].some((items) => items.length > MAX_FILES)) {
    fail("INVALID_PLAN", `plan lists may contain at most ${MAX_FILES} entries`);
  }
  if (
    typeof plan.payload.plan_id !== "string"
    || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(plan.payload.plan_id)
    || typeof plan.payload.generated_at !== "string"
    || !Number.isFinite(Date.parse(plan.payload.generated_at))
  ) {
    fail("INVALID_PLAN", "plan_id or generated_at is invalid");
  }

  const manifestByPath = new Map();
  for (const [index, entry] of plan.payload.source_manifest.entries()) {
    assertExactKeys(entry, ["path", "digest", "bytes", "kind"], `source_manifest[${index}]`);
    assertRepositoryPathSyntax(entry.path, `source_manifest[${index}].path`);
    assertDigest(entry.digest, `source_manifest[${index}].digest`);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || entry.bytes > MAX_FILE_BYTES) {
      fail("INVALID_PLAN", `source_manifest[${index}].bytes is invalid`);
    }
    if (![
      "CONFIG",
      "CONFIG_REVIEW",
      "LEGACY_CONFIG",
      "SCHEMA",
      "LEDGER",
      "AUTHORITY",
      "LEGACY_EFFECT",
    ].includes(entry.kind)) {
      fail("INVALID_PLAN", `source_manifest[${index}].kind is invalid`);
    }
    if (manifestByPath.has(entry.path)) fail("INVALID_PLAN", `duplicate manifest path ${entry.path}`);
    manifestByPath.set(entry.path, entry);
  }
  const manifestPaths = plan.payload.source_manifest.map(({ path: candidate }) => candidate);
  if (JSON.stringify(manifestPaths) !== JSON.stringify([...manifestPaths].sort())) {
    fail("INVALID_PLAN", "source_manifest must be sorted by path");
  }

  if (plan.payload.config.action === "PRESERVE") {
    assertExactKeys(plan.payload.config, ["action", "target_path", "digest"], "config");
    assertDigest(plan.payload.config.digest, "config.digest");
    const source = manifestByPath.get(plan.payload.config.target_path);
    if (plan.payload.config.target_path !== CONFIG_PATH || source?.digest !== plan.payload.config.digest) {
      fail("INVALID_PLAN", "config is not linked to its source manifest entry");
    }
  } else if (plan.payload.config.action === "REVIEW_REQUIRED") {
    assertExactKeys(
      plan.payload.config,
      [
        "action",
        "target_path",
        "source_digest",
        "source_state_digest",
        "candidate",
        "candidate_digest",
        "review_path",
      ],
      "config",
    );
    if (plan.payload.config.target_path !== CONFIG_PATH
        || plan.payload.config.review_path !== CONFIG_REVIEW_PATH
        || !isObject(plan.payload.config.candidate)) {
      fail("INVALID_PLAN", "unreviewed config proposal is invalid");
    }
    if (plan.payload.config.source_digest !== null) {
      assertDigest(plan.payload.config.source_digest, "config.source_digest");
    }
    assertDigest(plan.payload.config.source_state_digest, "config.source_state_digest");
    assertDigest(plan.payload.config.candidate_digest, "config.candidate_digest");
    if (digest(Buffer.from(canonicalDocument(plan.payload.config.candidate), "utf8"))
        !== plan.payload.config.candidate_digest) {
      fail("INVALID_PLAN", "config candidate digest is invalid");
    }
  } else if (plan.payload.config.action === "WRITE") {
    assertExactKeys(
      plan.payload.config,
      [
        "action",
        "target_path",
        "source_digest",
        "source_state_digest",
        "target_digest",
        "candidate",
        "candidate_digest",
        "review_path",
        "review_digest",
        "reviewed_by",
        "reviewed_at",
      ],
      "config",
    );
    const reviewSource = manifestByPath.get(plan.payload.config.review_path);
    const machineSource = manifestByPath.get(CONFIG_PATH);
    if (
      plan.payload.config.target_path !== CONFIG_PATH
      || plan.payload.config.review_path !== CONFIG_REVIEW_PATH
      || reviewSource?.kind !== "CONFIG_REVIEW"
      || reviewSource.digest !== plan.payload.config.review_digest
      || !isObject(plan.payload.config.candidate)
      || plan.payload.config.candidate.mode !== "DISABLED"
      || plan.payload.config.candidate_digest !== plan.payload.config.target_digest
      || (plan.payload.config.source_digest === null
        ? machineSource !== undefined
        : machineSource?.digest !== plan.payload.config.source_digest)
    ) {
      fail("INVALID_PLAN", "reviewed config write is not source-bound");
    }
    for (const field of [
      "source_state_digest",
      "target_digest",
      "candidate_digest",
      "review_digest",
    ]) {
      assertDigest(plan.payload.config[field], `config.${field}`);
    }
    if (plan.payload.config.source_digest !== null) {
      assertDigest(plan.payload.config.source_digest, "config.source_digest");
    }
    if (digest(Buffer.from(canonicalDocument(plan.payload.config.candidate), "utf8"))
        !== plan.payload.config.target_digest) {
      fail("INVALID_PLAN", "reviewed config target digest is invalid");
    }
  } else {
    fail("INVALID_PLAN", "config.action is invalid");
  }

  const operationPaths = new Set();
  for (const [index, operation] of plan.payload.ledgers.entries()) {
    assertExactKeys(
      operation,
      ["path", "source_digest", "target_digest", "candidate"],
      `ledgers[${index}]`,
    );
    assertRepositoryPathSyntax(operation.path, `ledgers[${index}].path`);
    assertDigest(operation.source_digest, `ledgers[${index}].source_digest`);
    assertDigest(operation.target_digest, `ledgers[${index}].target_digest`);
    assertLedgerCandidate(operation.candidate, `ledgers[${index}].candidate`);
    if (operationPaths.has(operation.path)) fail("INVALID_PLAN", `duplicate operation ${operation.path}`);
    operationPaths.add(operation.path);
    const source = manifestByPath.get(operation.path);
    if (source?.kind !== "LEDGER" || source.digest !== operation.source_digest) {
      fail("INVALID_PLAN", `operation ${operation.path} is not linked to its source`);
    }
    if (digest(Buffer.from(canonicalDocument(operation.candidate), "utf8")) !== operation.target_digest) {
      fail("INVALID_PLAN", `operation ${operation.path} target digest is invalid`);
    }
  }
  const orderedOperations = plan.payload.ledgers.map(({ path: candidate }) => candidate);
  if (JSON.stringify(orderedOperations) !== JSON.stringify([...orderedOperations].sort())) {
    fail("INVALID_PLAN", "ledger operations must be sorted by path");
  }
  for (const [index, finding] of plan.payload.authority_findings.entries()) {
    assertExactKeys(finding, ["code", "path"], `authority_findings[${index}]`);
    assertRepositoryPathSyntax(finding.path, `authority_findings[${index}].path`);
    if (finding.code !== "REPLAN_REQUIRED" || manifestByPath.get(finding.path)?.kind !== "AUTHORITY") {
      fail("INVALID_PLAN", `authority_findings[${index}] is invalid`);
    }
  }
  for (const [index, blocker] of plan.payload.blockers.entries()) {
    assertAllowedKeys(blocker, ["code", "path", "detail", "goal"], ["code"], `blockers[${index}]`);
    if (typeof blocker.code !== "string" || !/^[A-Z][A-Z0-9_]{1,63}$/u.test(blocker.code)) {
      fail("INVALID_PLAN", `blockers[${index}].code is invalid`);
    }
    if (blocker.path !== undefined) assertRepositoryPathSyntax(blocker.path, `blockers[${index}].path`);
  }
  return plan;
}

function manifestEntry(candidate, content, kind) {
  return {
    path: candidate,
    digest: digest(Buffer.from(content, "utf8")),
    bytes: Buffer.byteLength(content),
    kind,
  };
}

async function buildScan(root, dependencies) {
  const manifest = [];
  const blockers = [];
  const ledgers = [];
  const authorityFindings = [];
  const limits = dependencies.limits;
  let aggregateBytes = 0;
  const readForScan = async (candidate, optional = false) => {
    const info = await optionalInfo(root, candidate);
    if (!info) {
      if (optional) return null;
      fail("MISSING_MIGRATION_INPUT", candidate);
    }
    if (!info.isFile()) fail("NOT_A_FILE", candidate);
    const text = await readBoundedFile(root, candidate, {
      encoding: "utf8",
      maxBytes: limits.maxFileBytes,
    });
    aggregateBytes += Buffer.byteLength(text);
    if (aggregateBytes > limits.maxAggregateBytes) {
      fail("SCAN_AGGREGATE_LIMIT", `${limits.maxAggregateBytes} bytes`);
    }
    return text;
  };

  const configSchemaText = await readForScan(CONFIG_SCHEMA_PATH, true);
  const ledgerSchemaText = await readForScan(LEDGER_SCHEMA_PATH, true);
  const configSchema = configSchemaText ? parseJson(configSchemaText, CONFIG_SCHEMA_PATH) : null;
  const ledgerSchema = ledgerSchemaText ? parseJson(ledgerSchemaText, LEDGER_SCHEMA_PATH) : null;
  for (const [schemaPath, schemaText] of [
    [CONFIG_SCHEMA_PATH, configSchemaText],
    [LEDGER_SCHEMA_PATH, ledgerSchemaText],
  ]) {
    if (schemaText === null) blockers.push({ code: "MIGRATION_SCHEMA_REQUIRED", path: schemaPath });
    else manifest.push(manifestEntry(schemaPath, schemaText, "SCHEMA"));
  }

  const configText = await readForScan(CONFIG_PATH, true);
  const legacyConfigText = await readForScan(LEGACY_CONFIG_PATH, true);
  const configReviewText = await readForScan(CONFIG_REVIEW_PATH, true);
  if (configText !== null) manifest.push(manifestEntry(CONFIG_PATH, configText, "CONFIG"));
  if (legacyConfigText !== null) {
    manifest.push(manifestEntry(LEGACY_CONFIG_PATH, legacyConfigText, "LEGACY_CONFIG"));
  }
  if (configReviewText !== null) {
    manifest.push(manifestEntry(CONFIG_REVIEW_PATH, configReviewText, "CONFIG_REVIEW"));
  }

  let parsedConfig;
  let configError = "project_config_v2 is required";
  if (configText !== null) {
    try {
      parsedConfig = JSON.parse(configText);
      configError = validateConfig(parsedConfig, configSchema);
    } catch (error) {
      configError = `machine config JSON is invalid: ${error.message}`;
    }
  }

  let config;
  if (!configError) {
    config = {
      action: "PRESERVE",
      target_path: CONFIG_PATH,
      digest: digest(Buffer.from(configText, "utf8")),
    };
    if (parsedConfig.mode === "ENFORCE") {
      blockers.push({ code: "MIGRATION_REQUIRES_NON_ENFORCE_MODE", path: CONFIG_PATH });
    }
  } else {
    const sourceStateDigest = configSourceStateDigest(configText, legacyConfigText);
    const proposedCandidate = defaultConfigCandidate();
    if (!configSchema) fail("MIGRATION_SCHEMA_REQUIRED", CONFIG_SCHEMA_PATH);
    assertValidValue(proposedCandidate, configSchema, "default migration config candidate");
    const proposedDigest = digest(Buffer.from(canonicalDocument(proposedCandidate), "utf8"));
    config = {
      action: "REVIEW_REQUIRED",
      target_path: CONFIG_PATH,
      source_digest: configText === null ? null : digest(Buffer.from(configText, "utf8")),
      source_state_digest: sourceStateDigest,
      candidate: proposedCandidate,
      candidate_digest: proposedDigest,
      review_path: CONFIG_REVIEW_PATH,
    };

    let reviewResult = { error: configReviewText === null ? "human review is missing" : null };
    let review;
    if (configReviewText !== null) {
      try {
        review = JSON.parse(configReviewText);
        reviewResult = validateConfigReview(review, sourceStateDigest, configSchema);
      } catch (error) {
        reviewResult = { error: `review JSON is invalid: ${error.message}` };
      }
    }
    if (reviewResult.candidate) {
      config = {
        action: "WRITE",
        target_path: CONFIG_PATH,
        source_digest: configText === null ? null : digest(Buffer.from(configText, "utf8")),
        source_state_digest: sourceStateDigest,
        target_digest: reviewResult.candidateDigest,
        candidate: reviewResult.candidate,
        candidate_digest: reviewResult.candidateDigest,
        review_path: CONFIG_REVIEW_PATH,
        review_digest: digest(Buffer.from(configReviewText, "utf8")),
        reviewed_by: review.reviewed_by,
        reviewed_at: review.reviewed_at,
      };
    } else {
      blockers.push({
        code: "CONFIG_REVIEW_REQUIRED",
        path: CONFIG_PATH,
        detail: `${configError}; ${reviewResult.error}`,
      });
    }
  }

  for (const ledgerPath of await walkFiles(
    root,
    LEDGER_ROOT,
    (file) => file.endsWith("/ledger.json"),
    limits.maxFiles,
  )) {
    const text = await readForScan(ledgerPath);
    const sourceDigest = digest(Buffer.from(text, "utf8"));
    manifest.push(manifestEntry(ledgerPath, text, "LEDGER"));
    const parsed = parseJson(text, ledgerPath);
    if (parsed.schema === "work_package_ledger_v2") {
      try {
        if (!ledgerSchema) fail("MIGRATION_SCHEMA_REQUIRED", LEDGER_SCHEMA_PATH);
        assertValidValue(parsed, ledgerSchema, ledgerPath);
      } catch (error) {
        blockers.push({ code: "INVALID_V2_LEDGER", path: ledgerPath, detail: error.message });
      }
      continue;
    }
    if (parsed.schema !== "work_package_ledger_v1") {
      blockers.push({ code: "UNSUPPORTED_LEDGER_VERSION", path: ledgerPath });
      continue;
    }
    const mapped = mapLegacyLedger(root, parsed, ledgerPath);
    blockers.push(...mapped.blockers);
    if (mapped.candidate) {
      if (!ledgerSchema) fail("MIGRATION_SCHEMA_REQUIRED", LEDGER_SCHEMA_PATH);
      try {
        assertValidValue(mapped.candidate, ledgerSchema, `${ledgerPath} migration candidate`);
      } catch (error) {
        fail("CANDIDATE_SCHEMA_INVALID", error.message);
      }
      for (const goal of Object.values(mapped.candidate.goals)) {
        for (const candidate of [
          goal.briefPath,
          goal.reportPath,
          goal.pathsPath,
          goal.reviewPackagePath,
          ...Object.keys(goal.baselineDirty),
        ]) {
          await resolveRepositoryPath(root, candidate, { label: "Ledger candidate path" });
        }
      }
      const targetText = canonicalDocument(mapped.candidate);
      ledgers.push({
        path: ledgerPath,
        source_digest: sourceDigest,
        target_digest: digest(Buffer.from(targetText, "utf8")),
        candidate: mapped.candidate,
      });
    }
  }

  const authorityPaths = [];
  for (const authorityRoot of AUTHORITY_ROOTS) {
    authorityPaths.push(...await walkFiles(
      root,
      authorityRoot,
      (file) => file.endsWith(".md"),
      limits.maxFiles,
    ));
  }
  authorityPaths.push(...await scratchIssueFiles(root, limits.maxFiles));
  authorityPaths.sort((left, right) => left.localeCompare(right));
  for (const authorityPath of authorityPaths) {
    const text = await readForScan(authorityPath);
    manifest.push(manifestEntry(authorityPath, text, "AUTHORITY"));
    if (!hasCanonicalAuthorityContract(text, authorityPath)) {
      authorityFindings.push({ code: "REPLAN_REQUIRED", path: authorityPath });
    }
  }

  for (const legacyRoot of LEGACY_EFFECT_ROOTS) {
    for (const effectPath of await walkFiles(
      root,
      legacyRoot,
      () => true,
      limits.maxFiles,
    )) {
      const text = await readForScan(effectPath);
      manifest.push(manifestEntry(effectPath, text, "LEGACY_EFFECT"));
      let effect;
      try {
        effect = JSON.parse(text);
      } catch {
        blockers.push({ code: "UNKNOWN_LEGACY_OUTCOME", path: effectPath });
        continue;
      }
      blockers.push({ code: classifyLegacyOutcome(effect), path: effectPath });
    }
  }

  if (manifest.length > limits.maxFiles) {
    fail("SCAN_LIMIT_EXCEEDED", `${limits.maxFiles} files`);
  }

  manifest.sort((left, right) => left.path.localeCompare(right.path));
  ledgers.sort((left, right) => left.path.localeCompare(right.path));
  authorityFindings.sort((left, right) => left.path.localeCompare(right.path));
  blockers.sort((left, right) => `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`));
  const payload = {
    plan_id: dependencies.planId(),
    generated_at: dependencies.now(),
    source_manifest: manifest,
    config,
    ledgers,
    authority_findings: authorityFindings,
    blockers,
  };
  return {
    schema: PLAN_SCHEMA,
    contract_version: CONTRACT_VERSION,
    payload,
    payload_digest: digestJson(payload),
  };
}

async function readPlan(root, planFile) {
  const text = await readBoundedFile(root, planFile, {
    encoding: "utf8",
    maxBytes: MAX_PLAN_BYTES,
    label: "Migration plan",
  });
  return assertPlan(parseJson(text, planFile));
}

function migrationOperations(plan) {
  const operations = plan.payload.ledgers.map((entry) => ({ kind: "LEDGER", ...entry }));
  if (plan.payload.config.action === "WRITE") {
    operations.push({
      kind: "CONFIG",
      path: plan.payload.config.target_path,
      source_digest: plan.payload.config.source_digest,
      target_digest: plan.payload.config.target_digest,
      candidate: plan.payload.config.candidate,
    });
  }
  return operations.sort((left, right) => left.path.localeCompare(right.path));
}

function operationByPath(plan, candidate) {
  return migrationOperations(plan).find((entry) => entry.path === candidate);
}

function operationTargetContract(operation) {
  if (operation.kind === "LEDGER") {
    return {
      schema: "work_package_ledger_v2",
      run_id: operation.candidate.runId,
      minimum_ledger_version: operation.candidate.ledgerVersion,
    };
  }
  return {
    schema: "project_config_v2",
    minimum_config_version: operation.candidate.config_version,
    minimum_mode_version: operation.candidate.mode_version,
    mode: operation.candidate.mode,
  };
}

async function loadMigrationSchemas(root) {
  const [configText, ledgerText] = await Promise.all([
    readBoundedFile(root, CONFIG_SCHEMA_PATH, { encoding: "utf8", maxBytes: MAX_FILE_BYTES }),
    readBoundedFile(root, LEDGER_SCHEMA_PATH, { encoding: "utf8", maxBytes: MAX_FILE_BYTES }),
  ]);
  return {
    config: parseJson(configText, CONFIG_SCHEMA_PATH),
    ledger: parseJson(ledgerText, LEDGER_SCHEMA_PATH),
  };
}

async function classifyOperationValue(root, operation, schemas) {
  const current = await readOptionalFile(root, operation.path);
  if (current === null) return operation.source_digest === null ? "SOURCE" : "MISSING";
  const currentDigest = digest(Buffer.from(current, "utf8"));
  if (operation.source_digest !== null && currentDigest === operation.source_digest) {
    return "SOURCE";
  }
  if (currentDigest === operation.target_digest) return "TARGET";
  let parsed;
  try {
    parsed = JSON.parse(current);
  } catch {
    return "INVALID";
  }
  try {
    if (operation.kind === "LEDGER") {
      assertValidValue(parsed, schemas.ledger, operation.path);
      if (
        parsed.runId === operation.candidate.runId
        && parsed.ledgerVersion > operation.candidate.ledgerVersion
      ) {
        return "FORWARD";
      }
      return "INVALID";
    }
    if (validateConfig(parsed, schemas.config)) return "INVALID";
    if (operation.candidate === null) return "FORWARD";
    if (
      parsed.config_version > operation.candidate.config_version
      && parsed.mode_version >= operation.candidate.mode_version
      && (
        parsed.mode === operation.candidate.mode
        || parsed.mode_version > operation.candidate.mode_version
      )
    ) {
      return "FORWARD";
    }
  } catch {
    return "INVALID";
  }
  return "INVALID";
}

function operationFromPreimage(entry) {
  if (entry.target_contract.schema === "work_package_ledger_v2") {
    return {
      kind: "LEDGER",
      path: entry.source_path,
      source_digest: entry.source_digest,
      target_digest: entry.target_digest,
      candidate: {
        runId: entry.target_contract.run_id,
        ledgerVersion: entry.target_contract.minimum_ledger_version,
      },
    };
  }
  return {
    kind: "CONFIG",
    path: entry.source_path,
    source_digest: entry.source_digest,
    target_digest: entry.target_digest,
    candidate:
      Object.hasOwn(entry.target_contract, "minimum_config_version")
        ? {
            config_version: entry.target_contract.minimum_config_version,
            mode_version: entry.target_contract.minimum_mode_version,
            mode: entry.target_contract.mode,
          }
        : null,
  };
}

function assertStoredTargetContract(contract, label) {
  if (contract?.schema === "project_config_v2") {
    if (Object.keys(contract).length === 1) {
      assertExactKeys(contract, ["schema"], label);
      return;
    }
    assertExactKeys(
      contract,
      [
        "schema",
        "minimum_config_version",
        "minimum_mode_version",
        "mode",
      ],
      label,
    );
    if (
      !Number.isSafeInteger(contract.minimum_config_version)
      || contract.minimum_config_version < 1
      || !Number.isSafeInteger(contract.minimum_mode_version)
      || contract.minimum_mode_version < 0
      || !["DISABLED", "OBSERVE", "ENFORCE", "HALTED"].includes(contract.mode)
    ) {
      fail("MIGRATION_STATE_CORRUPT", `${label} is invalid`);
    }
    return;
  }
  if (contract?.schema === "work_package_ledger_v2") {
    assertExactKeys(
      contract,
      ["schema", "run_id", "minimum_ledger_version"],
      label,
    );
    if (
      typeof contract.run_id !== "string"
      || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(contract.run_id)
      || !Number.isSafeInteger(contract.minimum_ledger_version)
      || contract.minimum_ledger_version < 0
    ) {
      fail("MIGRATION_STATE_CORRUPT", `${label} is invalid`);
    }
    return;
  }
  fail("MIGRATION_STATE_CORRUPT", `${label} is invalid`);
}

async function assertNoDrift(root, plan, dependencies, allowTargets = false) {
  const current = await buildScan(root, dependencies);
  const schemas = await loadMigrationSchemas(root);
  const configOperation = operationByPath(plan, CONFIG_PATH);
  const configState = configOperation
    ? await classifyOperationValue(root, configOperation, schemas)
    : null;
  const configAtTarget = allowTargets
    && plan.payload.config.action === "WRITE"
    && current.payload.config.action === "PRESERVE"
    && ["TARGET", "FORWARD"].includes(configState);
  if (!configAtTarget
      && canonicalJson(plan.payload.config) !== canonicalJson(current.payload.config)) {
    fail("PLAN_SOURCE_MISMATCH", "config");
  }
  for (const field of ["authority_findings", "blockers"]) {
    if (canonicalJson(plan.payload[field]) !== canonicalJson(current.payload[field])) {
      fail("PLAN_SOURCE_MISMATCH", field);
    }
  }
  const expectedPaths = plan.payload.source_manifest.map(({ path: candidate }) => candidate);
  let currentPaths = current.payload.source_manifest.map(({ path: candidate }) => candidate);
  if (configAtTarget && plan.payload.config.source_digest === null) {
    currentPaths = currentPaths.filter((candidate) => candidate !== CONFIG_PATH);
  }
  if (JSON.stringify(expectedPaths) !== JSON.stringify(currentPaths)) {
    fail("SOURCE_MEMBERSHIP_DRIFT", "scanned file membership changed after scan");
  }
  for (const expected of plan.payload.source_manifest) {
    const actual = current.payload.source_manifest.find(({ path: candidate }) => candidate === expected.path);
    const operation = operationByPath(plan, expected.path);
    if (!actual) {
      fail("SOURCE_DIGEST_DRIFT", expected.path);
    }
    if (!operation && actual.digest !== expected.digest) fail("SOURCE_DIGEST_DRIFT", expected.path);
    const operationState = operation
      ? await classifyOperationValue(root, operation, schemas)
      : null;
    if (operation && operationState === "SOURCE") {
      const currentOperation = operationByPath(current, expected.path);
      if (!currentOperation || canonicalJson(currentOperation) !== canonicalJson(operation)) {
        fail("PLAN_CANDIDATE_MISMATCH", expected.path);
      }
    } else if (operation && ["TARGET", "FORWARD"].includes(operationState)) {
      if (!allowTargets) fail("UNTRACKED_TARGET_STATE", expected.path);
    } else if (operation) {
      fail("SOURCE_DIGEST_DRIFT", expected.path);
    }
  }
  for (const currentOperation of current.payload.ledgers) {
    if (!operationByPath(plan, currentOperation.path)) {
      fail("PLAN_CANDIDATE_MISMATCH", currentOperation.path);
    }
  }
}

async function readApplyState(root, statePath) {
  const text = await readOptionalFile(root, statePath);
  return text === null ? null : parseJson(text, statePath);
}

function assertApplyState(state, plan, statePath) {
  try {
    assertExactKeys(
      state,
      [
        "schema",
        "contract_version",
        "plan_digest",
        "preimage_manifest_digest",
        "status",
        "completed",
      ],
      "migration apply state",
    );
  } catch (error) {
    fail("MIGRATION_STATE_CORRUPT", `${statePath}: ${error.message}`);
  }
  if (
    state.schema !== "loop_runtime_migration_apply_state_v2"
    || state.contract_version !== CONTRACT_VERSION
    || state.plan_digest !== plan.payload_digest
    || !["APPLYING", "COMPLETE"].includes(state.status)
    || !Array.isArray(state.completed)
    || new Set(state.completed).size !== state.completed.length
  ) {
    fail("MIGRATION_STATE_CORRUPT", statePath);
  }
  try {
    assertDigest(state.preimage_manifest_digest, "state.preimage_manifest_digest");
  } catch (error) {
    fail("MIGRATION_STATE_CORRUPT", `${statePath}: ${error.message}`);
  }
  const operationPaths = new Set(migrationOperations(plan).map(({ path: candidate }) => candidate));
  if (state.completed.some((candidate) => !operationPaths.has(candidate))) {
    fail("MIGRATION_STATE_CORRUPT", `${statePath} contains an unknown operation`);
  }
  if (state.status === "COMPLETE" && state.completed.length !== operationPaths.size) {
    fail("MIGRATION_STATE_CORRUPT", `${statePath} is incomplete but marked COMPLETE`);
  }
}

function assertPreimageManifest(manifest, plan, manifestPath, stateDirectory) {
  try {
    assertExactKeys(
      manifest,
      ["schema", "contract_version", "plan_digest", "preimages"],
      "migration preimage manifest",
    );
  } catch (error) {
    fail("MIGRATION_STATE_CORRUPT", `${manifestPath}: ${error.message}`);
  }
  if (
    manifest.schema !== "loop_runtime_migration_preimage_manifest_v2"
    || manifest.contract_version !== CONTRACT_VERSION
    || manifest.plan_digest !== plan.payload_digest
    || !Array.isArray(manifest.preimages)
    || manifest.preimages.length !== migrationOperations(plan).length
  ) {
    fail("MIGRATION_STATE_CORRUPT", manifestPath);
  }
  for (const [index, entry] of manifest.preimages.entries()) {
    try {
      assertExactKeys(
        entry,
        [
          "source_path",
          "backup_path",
          "source_digest",
          "target_digest",
          "target_contract",
        ],
        `preimages[${index}]`,
      );
      assertStoredTargetContract(entry.target_contract, `preimages[${index}].target_contract`);
      if (entry.backup_path !== null) {
        assertRepositoryPathSyntax(entry.backup_path, `preimages[${index}].backup_path`);
      }
    } catch (error) {
      fail("MIGRATION_STATE_CORRUPT", `${manifestPath}: ${error.message}`);
    }
    const operation = migrationOperations(plan)[index];
    if (
      entry.source_path !== operation.path
      || entry.source_digest !== operation.source_digest
      || entry.target_digest !== operation.target_digest
      || canonicalJson(entry.target_contract) !== canonicalJson(operationTargetContract(operation))
      || (entry.source_digest === null
        ? entry.backup_path !== null
        : !entry.backup_path?.startsWith(`${stateDirectory}/preimages/`))
    ) {
      fail("MIGRATION_STATE_CORRUPT", manifestPath);
    }
  }
}

async function assertStoredPreimages(root, manifest) {
  for (const entry of manifest.preimages) {
    if (entry.source_digest === null) {
      if (entry.backup_path !== null) fail("MIGRATION_STATE_CORRUPT", "missing-source backup");
      continue;
    }
    const backup = await readOptionalFile(root, entry.backup_path);
    if (backup === null || digest(Buffer.from(backup, "utf8")) !== entry.source_digest) {
      fail("MIGRATION_STATE_CORRUPT", entry.backup_path);
    }
  }
}

async function assertOperationAtTarget(root, operation, schemas) {
  const state = await classifyOperationValue(root, operation, schemas);
  if (state === "SOURCE") fail("ROLLBACK_FORBIDDEN", operation.path);
  if (!["TARGET", "FORWARD"].includes(state)) fail("SOURCE_DIGEST_DRIFT", operation.path);
}

async function withTargetLocks(root, operations, dependencies, callback) {
  const ownershipAssertions = [];
  const acquire = async (index) => {
    if (index === operations.length) {
      return callback(async () => {
        for (const assertOwnership of ownershipAssertions) await assertOwnership();
      });
    }
    const operation = operations[index];
    const target = await resolveRepositoryPath(root, operation.path, {
      label: "Migration target",
    });
    return withOwnerLock(
      path.dirname(target),
      `${target}.lock`,
      async ({ assertOwnership }) => {
        ownershipAssertions.push(assertOwnership);
        try {
          return await acquire(index + 1);
        } finally {
          ownershipAssertions.pop();
        }
      },
      dependencies.targetLockOptions,
    );
  };
  return acquire(0);
}

async function applyPlan(root, plan, dependencies) {
  if (plan.payload.blockers.length > 0) {
    fail("MIGRATION_BLOCKED", plan.payload.blockers.map(({ code }) => code).join(", "));
  }
  const migrationId = plan.payload_digest.slice("sha256:".length);
  const stateDirectory = `${MIGRATION_ROOT}/${migrationId}`;
  const statePath = `${stateDirectory}/apply-state.json`;
  const manifestPath = `${stateDirectory}/preimages/manifest.json`;
  const schemas = await loadMigrationSchemas(root);
  const stateBeforeLock = await readApplyState(root, statePath);
  if (stateBeforeLock) assertApplyState(stateBeforeLock, plan, statePath);
  await assertNoDrift(root, plan, dependencies, stateBeforeLock !== null);
  return withOwnerLock(root, MIGRATION_LOCK, async ({
    assertOwnership: assertMigrationOwnership,
  }) => withTargetLocks(
    root,
    migrationOperations(plan),
    dependencies,
    async (assertTargetOwnership) => {
      const assertOwnership = async () => {
        await assertMigrationOwnership();
        await assertTargetOwnership();
      };
    let state = await readApplyState(root, statePath);
    await assertNoDrift(root, plan, dependencies, state !== null);
    if (state) {
      assertApplyState(state, plan, statePath);
      const manifestText = await readOptionalFile(root, manifestPath, MAX_PLAN_BYTES);
      if (manifestText === null) fail("MIGRATION_STATE_CORRUPT", `missing ${manifestPath}`);
      if (digest(Buffer.from(manifestText, "utf8")) !== state.preimage_manifest_digest) {
        fail("MIGRATION_STATE_CORRUPT", `${manifestPath} digest mismatch`);
      }
      const storedManifest = parseJson(manifestText, manifestPath);
      assertPreimageManifest(storedManifest, plan, manifestPath, stateDirectory);
      await assertStoredPreimages(root, storedManifest);
    }
    if (state?.status === "COMPLETE") {
      for (const operation of migrationOperations(plan)) {
        await assertOperationAtTarget(root, operation, schemas);
      }
      return {
        status: "NOOP_ALREADY_APPLIED",
        completed_operations: state.completed.length,
        state_dir: stateDirectory,
      };
    }

    if (!state) {
      const preimages = [];
      for (const [index, operation] of migrationOperations(plan).entries()) {
        const current = await readOptionalFile(root, operation.path);
        const currentDigest = current === null ? null : digest(Buffer.from(current, "utf8"));
        if (currentDigest !== operation.source_digest) {
          fail("SOURCE_DIGEST_DRIFT", operation.path);
        }
        const backupPath = current === null
          ? null
          : `${stateDirectory}/preimages/${String(index).padStart(4, "0")}.json`;
        if (backupPath !== null) {
          await writeFileAtomic(root, backupPath, current, {
            maxBytes: MAX_FILE_BYTES,
            assertOwnership,
          });
        }
        preimages.push({
          source_path: operation.path,
          backup_path: backupPath,
          source_digest: operation.source_digest,
          target_digest: operation.target_digest,
          target_contract: operationTargetContract(operation),
        });
      }
      const preimageManifestDocument = prettyJson({
        schema: "loop_runtime_migration_preimage_manifest_v2",
        contract_version: CONTRACT_VERSION,
        plan_digest: plan.payload_digest,
        preimages,
      });
      await writeFileAtomic(root, manifestPath, preimageManifestDocument, {
        maxBytes: MAX_PLAN_BYTES,
        assertOwnership,
      });
      state = {
        schema: "loop_runtime_migration_apply_state_v2",
        contract_version: CONTRACT_VERSION,
        plan_digest: plan.payload_digest,
        preimage_manifest_digest: digest(Buffer.from(preimageManifestDocument, "utf8")),
        status: "APPLYING",
        completed: [],
      };
      await writeFileAtomic(root, statePath, prettyJson(state), {
        maxBytes: MAX_PLAN_BYTES,
        assertOwnership,
      });
    }

    assertApplyState(state, plan, statePath);
    for (const operation of migrationOperations(plan)) {
      if (state.completed.includes(operation.path)) {
        await assertOperationAtTarget(root, operation, schemas);
        continue;
      }
      const current = await readOptionalFile(root, operation.path);
      const currentDigest = current === null ? null : digest(Buffer.from(current, "utf8"));
      const operationState = await classifyOperationValue(root, operation, schemas);
      if (operationState === "SOURCE") {
        await writeFileAtomic(root, operation.path, canonicalDocument(operation.candidate), {
          maxBytes: MAX_FILE_BYTES,
          assertOwnership,
          assertBeforeReplace: async () => {
            await dependencies.beforeTargetReplaceCheck?.(operation);
            const latest = await readOptionalFile(root, operation.path);
            const latestDigest = latest === null ? null : digest(Buffer.from(latest, "utf8"));
            if (latestDigest !== currentDigest) fail("CAS_CONFLICT", operation.path);
          },
        });
        await dependencies.afterTargetWrite?.(operation);
      } else if (!["TARGET", "FORWARD"].includes(operationState)) {
        fail("SOURCE_DIGEST_DRIFT", operation.path);
      }
      state.completed.push(operation.path);
      await writeFileAtomic(root, statePath, prettyJson(state), {
        maxBytes: MAX_PLAN_BYTES,
        assertOwnership,
      });
    }
    state.status = "COMPLETE";
    await writeFileAtomic(root, statePath, prettyJson(state), {
      maxBytes: MAX_PLAN_BYTES,
      assertOwnership,
    });
    return {
      status: "APPLIED",
      completed_operations: state.completed.length,
      state_dir: stateDirectory,
    };
    },
  ));
}

async function migrationCheckpointBlockers(root, dependencies) {
  const blockers = [];
  const schemas = await loadMigrationSchemas(root);
  const files = await walkFiles(
    root,
    MIGRATION_ROOT,
    () => true,
    dependencies.limits.maxFiles,
  );
  const migrationIds = new Set();
  for (const candidate of files) {
    const suffix = candidate.slice(`${MIGRATION_ROOT}/`.length);
    const migrationId = suffix.split("/")[0];
    if (migrationId !== "migration.lock") migrationIds.add(migrationId);
  }

  for (const migrationId of [...migrationIds].sort()) {
    const statePath = `${MIGRATION_ROOT}/${migrationId}/apply-state.json`;
    const manifestPath = `${MIGRATION_ROOT}/${migrationId}/preimages/manifest.json`;
    try {
      const stateText = await readOptionalFile(root, statePath, MAX_PLAN_BYTES);
      const manifestText = await readOptionalFile(root, manifestPath, MAX_PLAN_BYTES);
      if (stateText === null || manifestText === null) {
        blockers.push({ code: "INCOMPLETE_MIGRATION", path: statePath });
        continue;
      }
      const state = parseJson(stateText, statePath);
      const manifest = parseJson(manifestText, manifestPath);
      assertExactKeys(
        state,
        [
          "schema",
          "contract_version",
          "plan_digest",
          "preimage_manifest_digest",
          "status",
          "completed",
        ],
        "stored migration state",
      );
      assertExactKeys(
        manifest,
        ["schema", "contract_version", "plan_digest", "preimages"],
        "stored preimage manifest",
      );
      if (
        state.schema !== "loop_runtime_migration_apply_state_v2"
        || manifest.schema !== "loop_runtime_migration_preimage_manifest_v2"
        || state.contract_version !== CONTRACT_VERSION
        || manifest.contract_version !== CONTRACT_VERSION
        || state.plan_digest !== manifest.plan_digest
        || state.plan_digest !== `sha256:${migrationId}`
        || !Array.isArray(state.completed)
        || !Array.isArray(manifest.preimages)
      ) {
        fail("MIGRATION_STATE_CORRUPT", statePath);
      }
      assertDigest(state.preimage_manifest_digest, "stored state preimage_manifest_digest");
      if (digest(Buffer.from(manifestText, "utf8")) !== state.preimage_manifest_digest) {
        fail("MIGRATION_STATE_CORRUPT", `${manifestPath} digest mismatch`);
      }
      if (state.status !== "COMPLETE") {
        blockers.push({ code: "INCOMPLETE_MIGRATION", path: statePath });
        continue;
      }
      const completed = new Set(state.completed);
      if (completed.size !== state.completed.length || completed.size !== manifest.preimages.length) {
        fail("MIGRATION_STATE_CORRUPT", statePath);
      }
      const seenSources = new Set();
      for (const entry of manifest.preimages) {
        assertExactKeys(
          entry,
          [
            "source_path",
            "backup_path",
            "source_digest",
            "target_digest",
            "target_contract",
          ],
          "stored preimage",
        );
        assertStoredTargetContract(entry.target_contract, "stored preimage target_contract");
        assertRepositoryPathSyntax(entry.source_path, "stored preimage source_path");
        if (entry.backup_path !== null) {
          assertRepositoryPathSyntax(entry.backup_path, "stored preimage backup_path");
        }
        if (entry.source_digest !== null) {
          assertDigest(entry.source_digest, "stored preimage source_digest");
        }
        assertDigest(entry.target_digest, "stored preimage target_digest");
        if (seenSources.has(entry.source_path) || !completed.has(entry.source_path)) {
          fail("MIGRATION_STATE_CORRUPT", statePath);
        }
        seenSources.add(entry.source_path);
        if (entry.source_digest === null) {
          if (entry.backup_path !== null) fail("MIGRATION_STATE_CORRUPT", statePath);
        } else {
          const backup = await readOptionalFile(root, entry.backup_path);
          if (backup === null || digest(Buffer.from(backup, "utf8")) !== entry.source_digest) {
            fail("MIGRATION_STATE_CORRUPT", entry.backup_path);
          }
        }
        const currentState = await classifyOperationValue(
          root,
          operationFromPreimage(entry),
          schemas,
        );
        if (currentState === "SOURCE") {
          blockers.push({ code: "ROLLBACK_FORBIDDEN", path: entry.source_path });
        } else if (!["TARGET", "FORWARD"].includes(currentState)) {
          blockers.push({ code: "MIGRATION_TARGET_DRIFT", path: entry.source_path });
        }
      }
    } catch (error) {
      blockers.push({ code: "CORRUPT_MIGRATION_STATE", path: statePath, detail: error.message });
    }
  }
  return blockers;
}

async function verifyRepository(root, dependencies) {
  const scan = await buildScan(root, dependencies);
  const blockers = [...scan.payload.blockers, ...scan.payload.authority_findings];
  for (const ledger of scan.payload.ledgers) {
    blockers.push({ code: "LEGACY_LEDGER_REMAINS", path: ledger.path });
  }
  if (scan.payload.config.action !== "PRESERVE") {
    blockers.push({ code: "CONFIG_REVIEW_REQUIRED", path: CONFIG_PATH });
  }
  blockers.push(...await migrationCheckpointBlockers(root, dependencies));
  blockers.sort((left, right) => `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`));
  return {
    schema: "loop_runtime_migration_verification_v2",
    contract_version: CONTRACT_VERSION,
    verified_at: dependencies.now(),
    ready_for_enforce: blockers.length === 0,
    blockers,
  };
}

export function createLoopV2Migrator(repositoryRoot, overrides = {}) {
  const root = path.resolve(repositoryRoot);
  const dependencies = {
    now: overrides.now ?? (() => new Date().toISOString()),
    planId: overrides.planId ?? randomUUID,
    afterTargetWrite: overrides.afterTargetWrite,
    beforeTargetReplaceCheck: overrides.beforeTargetReplaceCheck,
    targetLockOptions: overrides.targetLockOptions,
    limits: {
      maxFileBytes: overrides.limits?.maxFileBytes ?? MAX_FILE_BYTES,
      maxAggregateBytes: overrides.limits?.maxAggregateBytes ?? MAX_AGGREGATE_BYTES,
      maxFiles: overrides.limits?.maxFiles ?? MAX_FILES,
    },
  };
  for (const [label, value] of Object.entries(dependencies.limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) fail("INVALID_LIMIT", label);
  }
  return {
    scan: () => buildScan(root, dependencies),
    async apply({ planFile } = {}) {
      if (typeof planFile !== "string" || !planFile.trim()) {
        fail("USAGE", "apply requires --plan <path>");
      }
      return applyPlan(root, await readPlan(root, planFile), dependencies);
    },
    verify: () => verifyRepository(root, dependencies),
  };
}

export function parseMigrationArgs(argv) {
  if (argv.length === 1 && ["scan", "verify"].includes(argv[0])) {
    return { command: argv[0] };
  }
  if (argv.length === 3 && argv[0] === "apply" && argv[1] === "--plan" && argv[2]) {
    return { command: "apply", planFile: argv[2] };
  }
  fail("USAGE", "scan | apply --plan <path> | verify");
}

export async function runMigrationCli(argv, options = {}) {
  const parsed = parseMigrationArgs(argv);
  const migrator = createLoopV2Migrator(options.root ?? process.cwd(), options.dependencies);
  if (parsed.command === "scan") return migrator.scan();
  if (parsed.command === "verify") return migrator.verify();
  return migrator.apply({ planFile: parsed.planFile });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  runMigrationCli(process.argv.slice(2))
    .then((result) => process.stdout.write(prettyJson(result)))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
