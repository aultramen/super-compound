import { isDeepStrictEqual } from "node:util";

const SUPPORTED_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$defs",
  "$ref",
  "title",
  "description",
  "type",
  "const",
  "enum",
  "properties",
  "propertyNames",
  "required",
  "additionalProperties",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "format",
  "anyOf",
  "allOf",
  "oneOf",
  "not",
]);

const SCHEMA_MAP_KEYWORDS = new Set(["$defs", "properties"]);
const SCHEMA_ARRAY_KEYWORDS = new Set(["anyOf", "allOf", "oneOf"]);
const SCHEMA_VALUE_KEYWORDS = new Set([
  "additionalProperties",
  "items",
  "not",
  "propertyNames",
]);
const SUPPORTED_TYPES = new Set([
  "null",
  "boolean",
  "object",
  "array",
  "number",
  "integer",
  "string",
]);
const SUPPORTED_FORMATS = new Set(["date-time"]);
const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const MAX_SCHEMA_DEPTH = 64;
const MAX_SCHEMA_COLLECTION_SIZE = 256;
const MAX_SCHEMA_TEXT_LENGTH = 4096;
const MAX_INSTANCE_COLLECTION_SIZE = 10_000;
const MAX_INSTANCE_STRING_LENGTH = 1_000_000;
const MAX_INSTANCE_NODE_COUNT = 100_000;

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function pathFor(parent, key) {
  return parent === "$" ? `$.${key}` : `${parent}.${key}`;
}

function inspectJsonInstance(value, errors) {
  const active = new Set();
  const stack = [{ kind: "visit", value, path: "$", depth: 0 }];
  let visited = 0;

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame.kind === "exit") {
      active.delete(frame.value);
      continue;
    }

    visited += 1;
    if (visited > MAX_INSTANCE_NODE_COUNT) {
      errors.push("$: instance exceeds the supported node bound.");
      return;
    }
    if (frame.depth > MAX_SCHEMA_DEPTH) {
      errors.push(`${frame.path}: instance nesting exceeds the supported depth.`);
      continue;
    }

    if (frame.value === null || typeof frame.value === "boolean") {
      continue;
    }
    if (typeof frame.value === "string") {
      if (frame.value.length > MAX_INSTANCE_STRING_LENGTH) {
        errors.push(`${frame.path}: string exceeds the supported length bound.`);
      }
      continue;
    }
    if (typeof frame.value === "number") {
      if (!Number.isFinite(frame.value)) {
        errors.push(`${frame.path}: number must be finite.`);
      } else if (Number.isInteger(frame.value) && !Number.isSafeInteger(frame.value)) {
        errors.push(`${frame.path}: integer must be a safe integer.`);
      }
      continue;
    }

    const collection = Array.isArray(frame.value) || isPlainObject(frame.value);
    if (!collection) {
      errors.push(`${frame.path}: value must be plain JSON data.`);
      continue;
    }
    if (active.has(frame.value)) {
      errors.push(`${frame.path}: instance must be acyclic.`);
      continue;
    }

    const entries = Array.isArray(frame.value)
      ? frame.value.map((entry, index) => [index, entry])
      : Object.entries(frame.value);
    if (entries.length > MAX_INSTANCE_COLLECTION_SIZE) {
      errors.push(`${frame.path}: collection exceeds the supported collection bound.`);
      continue;
    }

    active.add(frame.value);
    stack.push({ kind: "exit", value: frame.value });
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, entry] = entries[index];
      if (
        typeof key === "string" &&
        key.length > MAX_INSTANCE_STRING_LENGTH
      ) {
        errors.push(`${frame.path}: object key exceeds the supported length bound.`);
        continue;
      }
      stack.push({
        kind: "visit",
        value: entry,
        path: Array.isArray(frame.value)
          ? `${frame.path}[${key}]`
          : pathFor(frame.path, key),
        depth: frame.depth + 1,
      });
    }
  }
}

function isBoundedJsonValue(value, depth = 0, seen = new Set()) {
  if (depth > MAX_SCHEMA_DEPTH) {
    return false;
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return typeof value !== "string" || value.length <= MAX_INSTANCE_STRING_LENGTH;
  }
  if (typeof value === "number") {
    return (
      Number.isFinite(value) &&
      (!Number.isInteger(value) || Number.isSafeInteger(value))
    );
  }
  if (typeof value !== "object" || seen.has(value)) {
    return false;
  }

  seen.add(value);
  let valid;
  if (Array.isArray(value)) {
    valid =
      value.length <= MAX_SCHEMA_COLLECTION_SIZE &&
      value.every((entry) => isBoundedJsonValue(entry, depth + 1, seen));
  } else if (isPlainObject(value)) {
    const entries = Object.entries(value);
    valid =
      entries.length <= MAX_SCHEMA_COLLECTION_SIZE &&
      entries.every(
        ([key, entry]) =>
          key.length <= MAX_SCHEMA_TEXT_LENGTH &&
          isBoundedJsonValue(entry, depth + 1, seen),
      );
  } else {
    valid = false;
  }
  seen.delete(value);
  return valid;
}

function hasDeepDuplicates(values) {
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (isDeepStrictEqual(values[left], values[right])) {
        return true;
      }
    }
  }
  return false;
}

function inspectNonNegativeInteger(node, keyword, path, errors) {
  if (!Object.hasOwn(node, keyword)) {
    return;
  }
  const value = node[keyword];
  if (!Number.isSafeInteger(value)) {
    errors.push(`${path}: ${keyword} must be a safe integer.`);
  } else if (value < 0) {
    errors.push(`${path}: ${keyword} must be a non-negative integer.`);
  } else if (value > MAX_INSTANCE_COLLECTION_SIZE && keyword.endsWith("Items")) {
    errors.push(`${path}: ${keyword} exceeds the supported collection bound.`);
  } else if (value > MAX_INSTANCE_STRING_LENGTH && keyword.endsWith("Length")) {
    errors.push(`${path}: ${keyword} exceeds the supported string bound.`);
  }
}

function inspectFiniteNumber(node, keyword, path, errors) {
  if (!Object.hasOwn(node, keyword)) {
    return;
  }
  const value = node[keyword];
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > Number.MAX_SAFE_INTEGER
  ) {
    errors.push(`${path}: ${keyword} must be a finite number in the safe range.`);
  }
}

function decodePointerSegment(segment) {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

function resolveLocalReference(rootSchema, reference) {
  if (reference === "#") {
    return rootSchema;
  }
  if (!reference.startsWith("#/")) {
    return undefined;
  }

  let value = rootSchema;
  for (const rawSegment of reference.slice(2).split("/")) {
    const segment = decodePointerSegment(rawSegment);
    if (!isPlainObject(value) || !Object.hasOwn(value, segment)) {
      return undefined;
    }
    value = value[segment];
  }
  return value;
}

function inspectSchemaNode(node, rootSchema, path, errors, seen, depth = 0) {
  if (!isPlainObject(node)) {
    errors.push(`${path}: schema node must be an object.`);
    return;
  }
  if (depth > MAX_SCHEMA_DEPTH) {
    errors.push(`${path}: schema nesting exceeds the supported depth.`);
    return;
  }
  if (seen.has(node)) {
    return;
  }
  seen.add(node);

  for (const keyword of Object.keys(node)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) {
      errors.push(`${path}: unsupported keyword \`${keyword}\`.`);
    }
  }

  if (Object.hasOwn(node, "$schema") && node.$schema !== DRAFT_2020_12) {
    errors.push(`${path}: only JSON Schema Draft 2020-12 is supported.`);
  }
  for (const keyword of ["$id", "title", "description"]) {
    if (
      Object.hasOwn(node, keyword) &&
      (typeof node[keyword] !== "string" ||
        node[keyword].length === 0 ||
        node[keyword].length > MAX_SCHEMA_TEXT_LENGTH)
    ) {
      errors.push(`${path}: ${keyword} must be a bounded non-empty string.`);
    }
  }
  if (Object.hasOwn(node, "type")) {
    const types = Array.isArray(node.type) ? node.type : [node.type];
    if (
      types.length === 0 ||
      new Set(types).size !== types.length ||
      types.some((type) => !SUPPORTED_TYPES.has(type))
    ) {
      errors.push(`${path}: type contains an unsupported type.`);
    }
  }
  if (
    Object.hasOwn(node, "const") &&
    !isBoundedJsonValue(node.const)
  ) {
    errors.push(
      `${path}: const must be a bounded JSON value with finite numbers and safe integers.`,
    );
  }
  if (Object.hasOwn(node, "enum")) {
    if (!Array.isArray(node.enum) || node.enum.length === 0) {
      errors.push(`${path}: enum must be a non-empty array.`);
    } else if (node.enum.length > MAX_SCHEMA_COLLECTION_SIZE) {
      errors.push(`${path}: enum exceeds the supported collection bound.`);
    } else if (node.enum.some((value) => !isBoundedJsonValue(value))) {
      errors.push(
        `${path}: enum entries must be bounded JSON values with finite numbers and safe integers.`,
      );
    } else if (hasDeepDuplicates(node.enum)) {
      errors.push(`${path}: enum entries must be unique.`);
    }
  }
  if (Object.hasOwn(node, "required")) {
    if (!Array.isArray(node.required)) {
      errors.push(`${path}: required must be an array of strings.`);
    } else if (
      node.required.length > MAX_SCHEMA_COLLECTION_SIZE ||
      node.required.some(
        (entry) =>
          typeof entry !== "string" ||
          entry.length === 0 ||
          entry.length > MAX_SCHEMA_TEXT_LENGTH,
      )
    ) {
      errors.push(`${path}: required must contain bounded non-empty strings.`);
    } else if (new Set(node.required).size !== node.required.length) {
      errors.push(`${path}: required entries must be unique.`);
    }
  }
  if (
    Object.hasOwn(node, "additionalProperties") &&
    typeof node.additionalProperties !== "boolean" &&
    !isPlainObject(node.additionalProperties)
  ) {
    errors.push(`${path}: additionalProperties must be a boolean or schema object.`);
  }
  for (const keyword of ["items", "not", "propertyNames"]) {
    if (Object.hasOwn(node, keyword) && !isPlainObject(node[keyword])) {
      errors.push(`${path}: ${keyword} must be a schema object.`);
    }
  }
  for (const keyword of ["minItems", "maxItems", "minLength", "maxLength"]) {
    inspectNonNegativeInteger(node, keyword, path, errors);
  }
  if (
    Number.isSafeInteger(node.minItems) &&
    Number.isSafeInteger(node.maxItems) &&
    node.minItems > node.maxItems
  ) {
    errors.push(`${path}: minItems must not exceed maxItems.`);
  }
  if (
    Number.isSafeInteger(node.minLength) &&
    Number.isSafeInteger(node.maxLength) &&
    node.minLength > node.maxLength
  ) {
    errors.push(`${path}: minLength must not exceed maxLength.`);
  }
  if (
    Object.hasOwn(node, "uniqueItems") &&
    typeof node.uniqueItems !== "boolean"
  ) {
    errors.push(`${path}: uniqueItems must be a boolean.`);
  }
  for (const keyword of [
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
  ]) {
    inspectFiniteNumber(node, keyword, path, errors);
  }
  if (
    typeof node.multipleOf === "number" &&
    Number.isFinite(node.multipleOf) &&
    node.multipleOf <= 0
  ) {
    errors.push(`${path}: multipleOf must be positive.`);
  }
  if (
    typeof node.minimum === "number" &&
    typeof node.maximum === "number" &&
    node.minimum > node.maximum
  ) {
    errors.push(`${path}: minimum must not exceed maximum.`);
  }
  if (
    typeof node.exclusiveMinimum === "number" &&
    typeof node.exclusiveMaximum === "number" &&
    node.exclusiveMinimum >= node.exclusiveMaximum
  ) {
    errors.push(`${path}: exclusiveMinimum must be less than exclusiveMaximum.`);
  }
  if (
    typeof node.minimum === "number" &&
    typeof node.exclusiveMaximum === "number" &&
    node.minimum >= node.exclusiveMaximum
  ) {
    errors.push(`${path}: minimum must be less than exclusiveMaximum.`);
  }
  if (
    typeof node.exclusiveMinimum === "number" &&
    typeof node.maximum === "number" &&
    node.exclusiveMinimum >= node.maximum
  ) {
    errors.push(`${path}: exclusiveMinimum must be less than maximum.`);
  }
  if (
    Object.hasOwn(node, "format") &&
    typeof node.format !== "string"
  ) {
    errors.push(`${path}: format must be a string.`);
  } else if (
    Object.hasOwn(node, "format") &&
    !SUPPORTED_FORMATS.has(node.format)
  ) {
    errors.push(`${path}: unsupported format \`${String(node.format)}\`.`);
  }

  if (Object.hasOwn(node, "$ref")) {
    if (
      typeof node.$ref !== "string" ||
      node.$ref.length > MAX_SCHEMA_TEXT_LENGTH ||
      !node.$ref.startsWith("#")
    ) {
      errors.push(`${path}: nonlocal $ref is forbidden.`);
    } else {
      const target = resolveLocalReference(rootSchema, node.$ref);
      if (target === undefined) {
        errors.push(`${path}: local $ref \`${node.$ref}\` does not resolve.`);
      } else if (!isPlainObject(target)) {
        errors.push(`${path}: local $ref \`${node.$ref}\` must resolve to a schema object.`);
      }
    }
  }

  if (Object.hasOwn(node, "pattern")) {
    if (typeof node.pattern !== "string") {
      errors.push(`${path}: pattern must be a string.`);
    } else if (node.pattern.length > MAX_SCHEMA_TEXT_LENGTH) {
      errors.push(`${path}: pattern exceeds the supported length.`);
    } else {
      try {
        new RegExp(node.pattern, "u");
      } catch {
        errors.push(`${path}: pattern is not a valid regular expression.`);
      }
    }
  }

  for (const keyword of SCHEMA_MAP_KEYWORDS) {
    if (!Object.hasOwn(node, keyword)) {
      continue;
    }
    const map = node[keyword];
    if (!isPlainObject(map)) {
      errors.push(`${pathFor(path, keyword)}: must be an object.`);
      continue;
    }
    if (Object.keys(map).length > MAX_SCHEMA_COLLECTION_SIZE) {
      errors.push(`${pathFor(path, keyword)}: exceeds the supported entry bound.`);
      continue;
    }
    for (const [key, child] of Object.entries(map)) {
      if (key.length > MAX_SCHEMA_TEXT_LENGTH) {
        errors.push(
          `${pathFor(path, keyword)}: key exceeds the supported length bound.`,
        );
        continue;
      }
      inspectSchemaNode(
        child,
        rootSchema,
        pathFor(pathFor(path, keyword), key),
        errors,
        seen,
        depth + 1,
      );
    }
  }

  for (const keyword of SCHEMA_ARRAY_KEYWORDS) {
    if (!Object.hasOwn(node, keyword)) {
      continue;
    }
    const children = node[keyword];
    if (!Array.isArray(children) || children.length === 0) {
      errors.push(`${pathFor(path, keyword)}: must be a non-empty array.`);
      continue;
    }
    if (children.length > MAX_SCHEMA_COLLECTION_SIZE) {
      errors.push(`${pathFor(path, keyword)}: exceeds the supported entry bound.`);
      continue;
    }
    children.forEach((child, index) => {
      inspectSchemaNode(
        child,
        rootSchema,
        `${pathFor(path, keyword)}[${index}]`,
        errors,
        seen,
        depth + 1,
      );
    });
  }

  for (const keyword of SCHEMA_VALUE_KEYWORDS) {
    if (!Object.hasOwn(node, keyword)) {
      continue;
    }
    const child = node[keyword];
    if (keyword === "additionalProperties" && typeof child === "boolean") {
      continue;
    }
    if (!isPlainObject(child)) {
      continue;
    }
    inspectSchemaNode(
      child,
      rootSchema,
      pathFor(path, keyword),
      errors,
      seen,
      depth + 1,
    );
  }
}

function schemaChildren(node, path) {
  const children = [];
  for (const keyword of SCHEMA_MAP_KEYWORDS) {
    const map = node[keyword];
    if (!isPlainObject(map)) {
      continue;
    }
    for (const [key, child] of Object.entries(map)) {
      if (key.length <= MAX_SCHEMA_TEXT_LENGTH && isPlainObject(child)) {
        children.push([child, pathFor(pathFor(path, keyword), key)]);
      }
    }
  }
  for (const keyword of SCHEMA_ARRAY_KEYWORDS) {
    const array = node[keyword];
    if (!Array.isArray(array)) {
      continue;
    }
    array.forEach((child, index) => {
      if (isPlainObject(child)) {
        children.push([child, `${pathFor(path, keyword)}[${index}]`]);
      }
    });
  }
  for (const keyword of SCHEMA_VALUE_KEYWORDS) {
    const child = node[keyword];
    if (isPlainObject(child)) {
      children.push([child, pathFor(path, keyword)]);
    }
  }
  return children;
}

function detectReferenceCycles(
  node,
  rootSchema,
  path,
  visiting,
  resolvedDepths,
  errors,
  depth = 0,
) {
  if (depth > MAX_SCHEMA_DEPTH) {
    errors.push(
      `${path}: schema/reference traversal exceeds the supported depth.`,
    );
    return MAX_SCHEMA_DEPTH + 1;
  }
  if (!isPlainObject(node)) {
    return 0;
  }

  const resolvedDepth = resolvedDepths.get(node);
  if (resolvedDepth !== undefined) {
    if (depth + resolvedDepth > MAX_SCHEMA_DEPTH) {
      errors.push(
        `${path}: schema/reference traversal exceeds the supported depth.`,
      );
      return MAX_SCHEMA_DEPTH + 1;
    }
    return resolvedDepth;
  }
  visiting.add(node);
  let longestDepth = 0;

  if (typeof node.$ref === "string" && node.$ref.startsWith("#")) {
    const target = resolveLocalReference(rootSchema, node.$ref);
    if (isPlainObject(target)) {
      if (visiting.has(target)) {
        errors.push(`${path}: cyclic local $ref \`${node.$ref}\` is unsupported.`);
      } else {
        const targetDepth = detectReferenceCycles(
          target,
          rootSchema,
          `${path}.$ref(${node.$ref})`,
          visiting,
          resolvedDepths,
          errors,
          depth + 1,
        );
        if (targetDepth > MAX_SCHEMA_DEPTH) {
          visiting.delete(node);
          return targetDepth;
        }
        longestDepth = Math.max(longestDepth, targetDepth + 1);
      }
    }
  }

  for (const [child, childPath] of schemaChildren(node, path)) {
    if (visiting.has(child)) {
      errors.push(`${childPath}: cyclic schema node is unsupported.`);
    } else {
      const childDepth = detectReferenceCycles(
        child,
        rootSchema,
        childPath,
        visiting,
        resolvedDepths,
        errors,
        depth + 1,
      );
      if (childDepth > MAX_SCHEMA_DEPTH) {
        visiting.delete(node);
        return childDepth;
      }
      longestDepth = Math.max(longestDepth, childDepth + 1);
    }
  }

  visiting.delete(node);
  resolvedDepths.set(node, longestDepth);
  return longestDepth;
}

export function validateSchemaDefinition(schema) {
  const errors = [];
  inspectSchemaNode(schema, schema, "$", errors, new Set());
  if (isPlainObject(schema)) {
    detectReferenceCycles(schema, schema, "$", new Set(), new Map(), errors);
  }
  return { valid: errors.length === 0, errors };
}

function valueTypeMatches(value, expectedType) {
  switch (expectedType) {
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return isPlainObject(value);
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number";
    case "string":
    case "boolean":
      return typeof value === expectedType;
    default:
      return false;
  }
}

export function rfc3339UtcSortKey(value) {
  if (typeof value !== "string") {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/u.exec(
    value,
  );
  if (match === null) {
    return null;
  }
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    fractionText = "",
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!(
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59
  )) {
    return null;
  }
  return `${yearText}${monthText}${dayText}${hourText}${minuteText}${secondText}${fractionText.padEnd(9, "0")}`;
}

export function isRfc3339UtcDateTime(value) {
  return rfc3339UtcSortKey(value) !== null;
}

function matchesDateTime(value) {
  return isRfc3339UtcDateTime(value);
}

function decimalParts(value) {
  const [coefficient, exponentText = "0"] = Math.abs(value)
    .toString()
    .toLowerCase()
    .split("e");
  const [whole, fraction = ""] = coefficient.split(".");
  const exponent = Number(exponentText);
  return {
    integer: BigInt(`${whole}${fraction}`),
    scale: fraction.length - exponent,
  };
}

function isExactMultiple(value, multiple) {
  const left = decimalParts(value);
  const right = decimalParts(multiple);
  const scale = Math.max(left.scale, right.scale, 0);
  const scaledValue = left.integer * 10n ** BigInt(scale - left.scale);
  const scaledMultiple = right.integer * 10n ** BigInt(scale - right.scale);
  return scaledValue % scaledMultiple === 0n;
}

function canonicalValue(value, depth = 0, active = new Set()) {
  if (depth > MAX_SCHEMA_DEPTH) {
    throw new RangeError("instance nesting exceeds the supported depth");
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return `string:${JSON.stringify(value)}`;
  }
  if (typeof value === "number") {
    return `number:${Object.is(value, -0) ? "0" : String(value)}`;
  }
  if (typeof value === "boolean") {
    return `boolean:${String(value)}`;
  }
  if (typeof value !== "object" || active.has(value)) {
    throw new TypeError("instance is not a bounded acyclic JSON value");
  }

  active.add(value);
  let result;
  if (Array.isArray(value)) {
    result = `array:[${value
      .map((entry) => canonicalValue(entry, depth + 1, active))
      .join(",")}]`;
  } else if (isPlainObject(value)) {
    result = `object:{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalValue(value[key], depth + 1, active)}`,
      )
      .join(",")}}`;
  } else {
    throw new TypeError("instance is not a plain JSON value");
  }
  active.delete(value);
  return result;
}

function validateComposed(value, schemas, rootSchema, path, mode, errors) {
  const branchResults = schemas.map((schema) => {
    const branchErrors = [];
    validateNode(value, schema, rootSchema, path, branchErrors);
    return branchErrors;
  });
  const passes = branchResults.filter((branchErrors) => branchErrors.length === 0).length;

  if (mode === "allOf" && passes !== schemas.length) {
    errors.push(`${path}: must satisfy every allOf branch.`);
  } else if (mode === "anyOf" && passes === 0) {
    errors.push(`${path}: must satisfy at least one anyOf branch.`);
  } else if (mode === "oneOf" && passes !== 1) {
    errors.push(`${path}: must satisfy exactly one oneOf branch.`);
  }
}

function validateNode(value, schema, rootSchema, path, errors) {
  if (Object.hasOwn(schema, "$ref")) {
    const target = resolveLocalReference(rootSchema, schema.$ref);
    if (target !== undefined) {
      validateNode(value, target, rootSchema, path, errors);
    }
  }

  for (const mode of ["allOf", "anyOf", "oneOf"]) {
    if (Object.hasOwn(schema, mode)) {
      validateComposed(value, schema[mode], rootSchema, path, mode, errors);
    }
  }

  if (Object.hasOwn(schema, "not")) {
    const notErrors = [];
    validateNode(value, schema.not, rootSchema, path, notErrors);
    if (notErrors.length === 0) {
      errors.push(`${path}: must not satisfy the prohibited schema.`);
    }
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    errors.push(`${path}: number must be finite.`);
    return;
  }

  if (typeof value === "string" && value.length > MAX_INSTANCE_STRING_LENGTH) {
    errors.push(`${path}: string exceeds the supported length bound.`);
    return;
  }
  if (Array.isArray(value) && value.length > MAX_INSTANCE_COLLECTION_SIZE) {
    errors.push(`${path}: array exceeds the supported collection bound.`);
    return;
  }
  if (
    isPlainObject(value) &&
    Object.keys(value).length > MAX_INSTANCE_COLLECTION_SIZE
  ) {
    errors.push(`${path}: object exceeds the supported collection bound.`);
    return;
  }
  if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
    errors.push(`${path}: integer must be a safe integer.`);
    return;
  }

  if (Object.hasOwn(schema, "type")) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((type) => valueTypeMatches(value, type))) {
      errors.push(`${path}: must have type ${expected.join(" or ")}.`);
      return;
    }
  }

  if (Object.hasOwn(schema, "const") && !isDeepStrictEqual(value, schema.const)) {
    errors.push(`${path}: must equal constant ${JSON.stringify(schema.const)}.`);
  }
  if (
    Object.hasOwn(schema, "enum") &&
    !schema.enum.some((candidate) => isDeepStrictEqual(value, candidate))
  ) {
    errors.push(`${path}: must equal one of the enumerated values.`);
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && [...value].length < schema.minLength) {
      errors.push(`${path}: string is shorter than minLength ${schema.minLength}.`);
    }
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) {
      errors.push(`${path}: string is longer than maxLength ${schema.maxLength}.`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) {
      errors.push(`${path}: string does not match required pattern.`);
    }
    if (schema.format === "date-time" && !matchesDateTime(value)) {
      errors.push(`${path}: string must be an RFC 3339 UTC date-time.`);
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: number must be >= ${schema.minimum}.`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: number must be <= ${schema.maximum}.`);
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(`${path}: number must be > ${schema.exclusiveMinimum}.`);
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push(`${path}: number must be < ${schema.exclusiveMaximum}.`);
    }
    if (
      schema.multipleOf !== undefined &&
      !isExactMultiple(value, schema.multipleOf)
    ) {
      errors.push(`${path}: number must be a multiple of ${schema.multipleOf}.`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: array has fewer than ${schema.minItems} items.`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: array has more than ${schema.maxItems} items.`);
    }
    if (schema.uniqueItems === true) {
      const canonicalItems = new Set();
      try {
        for (const entry of value) {
          const canonical = canonicalValue(entry);
          if (canonicalItems.has(canonical)) {
            errors.push(`${path}: array items must be unique.`);
            break;
          }
          canonicalItems.add(canonical);
        }
      } catch {
        errors.push(`${path}: array items must be bounded acyclic JSON values.`);
      }
    }
    if (isPlainObject(schema.items)) {
      value.forEach((item, index) => {
        validateNode(item, schema.items, rootSchema, `${path}[${index}]`, errors);
      });
    }
  }

  if (isPlainObject(value)) {
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    if (isPlainObject(schema.propertyNames)) {
      for (const key of Object.keys(value)) {
        validateNode(
          key,
          schema.propertyNames,
          rootSchema,
          `${path} property name ${JSON.stringify(key)}`,
          errors,
        );
      }
    }
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) {
        errors.push(`${path}: missing required property \`${required}\`.`);
      }
    }
    for (const [key, childValue] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        validateNode(childValue, properties[key], rootSchema, pathFor(path, key), errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: unknown property \`${key}\`.`);
      } else if (isPlainObject(schema.additionalProperties)) {
        validateNode(
          childValue,
          schema.additionalProperties,
          rootSchema,
          pathFor(path, key),
          errors,
        );
      }
    }
  }
}

export function validateValue(value, schema) {
  const definition = validateSchemaDefinition(schema);
  if (!definition.valid) {
    return {
      valid: false,
      errors: definition.errors.map((error) => `schema: ${error}`),
    };
  }

  const errors = [];
  inspectJsonInstance(value, errors);
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  validateNode(value, schema, schema, "$", errors);
  return { valid: errors.length === 0, errors };
}

export function assertValidValue(value, schema, label = "value") {
  const result = validateValue(value, schema);
  if (!result.valid) {
    throw new TypeError(`${label} failed schema validation:\n${result.errors.join("\n")}`);
  }
  return value;
}

export function parseJsonDocument(text, schema, label = "document") {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new TypeError(`${label} is not valid JSON.`);
  }
  return assertValidValue(value, schema, label);
}

export const SUPPORTED_SCHEMA_KEYWORDS = Object.freeze(
  [...SUPPORTED_KEYWORDS].sort(),
);

export const SUPPORTED_SCHEMA_FORMATS = Object.freeze(
  [...SUPPORTED_FORMATS].sort(),
);
