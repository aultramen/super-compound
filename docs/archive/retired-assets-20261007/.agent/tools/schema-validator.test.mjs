import assert from "node:assert/strict";
import test from "node:test";

const validatorUrl = new URL("./schema-validator.mjs", import.meta.url);

function makeLocalReferenceChain(length, { cycle = false } = {}) {
  const definitions = {};
  for (let index = 0; index < length; index += 1) {
    definitions[`node${index}`] =
      index === length - 1
        ? cycle
          ? { $ref: "#/$defs/node0" }
          : { type: "string" }
        : { $ref: `#/$defs/node${index + 1}` };
  }
  return { $defs: definitions, $ref: "#/$defs/node0" };
}

function makeReverseOrderedLocalReferenceChain(length) {
  const definitions = {};
  for (let index = length - 1; index >= 0; index -= 1) {
    definitions[`node${index}`] =
      index === length - 1
        ? { type: "string" }
        : { $ref: `#/$defs/node${index + 1}` };
  }
  return { $defs: definitions, $ref: "#/$defs/node0" };
}

function makeReverseOrderedGroupedReferenceChain(length, groupSize = 250) {
  const referenceFor = (index) =>
    `#/$defs/group${Math.floor(index / groupSize)}/$defs/node${index}`;
  const groups = {};
  const groupCount = Math.ceil(length / groupSize);

  for (let groupIndex = groupCount - 1; groupIndex >= 0; groupIndex -= 1) {
    const definitions = {};
    const first = groupIndex * groupSize;
    const end = Math.min(length, first + groupSize);
    for (let index = end - 1; index >= first; index -= 1) {
      definitions[`node${index}`] =
        index === length - 1
          ? { type: "string" }
          : { $ref: referenceFor(index + 1) };
    }
    groups[`group${groupIndex}`] = { $defs: definitions };
  }

  return {
    type: "object",
    $defs: groups,
    properties: { value: { $ref: referenceFor(0) } },
    required: ["value"],
    additionalProperties: false,
  };
}

test("schema definitions reject unsupported keywords and nonlocal references recursively", async () => {
  const { validateSchemaDefinition } = await import(validatorUrl);
  const supported = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    $defs: {
      identifier: {
        type: "string",
        minLength: 1,
        pattern: "^[a-z0-9_-]+$",
      },
    },
    properties: {
      id: { $ref: "#/$defs/identifier" },
    },
    required: ["id"],
    additionalProperties: false,
  };

  assert.deepEqual(validateSchemaDefinition(supported), {
    valid: true,
    errors: [],
  });

  const unsupported = structuredClone(supported);
  unsupported.properties.id.if = { const: "special" };
  const unsupportedResult = validateSchemaDefinition(unsupported);
  assert.equal(unsupportedResult.valid, false);
  assert.match(unsupportedResult.errors.join("\n"), /unsupported keyword `if`/i);
  assert.match(unsupportedResult.errors.join("\n"), /properties\.id/i);

  const nonlocal = structuredClone(supported);
  nonlocal.properties.id = { $ref: "https://example.invalid/id.schema.json" };
  const nonlocalResult = validateSchemaDefinition(nonlocal);
  assert.equal(nonlocalResult.valid, false);
  assert.match(nonlocalResult.errors.join("\n"), /nonlocal \$ref/i);

  const missingLocalTarget = structuredClone(supported);
  missingLocalTarget.properties.id = { $ref: "#/$defs/missing" };
  const missingResult = validateSchemaDefinition(missingLocalTarget);
  assert.equal(missingResult.valid, false);
  assert.match(missingResult.errors.join("\n"), /does not resolve/i);

  const nonSchemaTarget = {
    title: "not-a-schema",
    type: "object",
    properties: { value: { $ref: "#/title" } },
    required: ["value"],
    additionalProperties: false,
  };
  const nonSchemaResult = validateSchemaDefinition(nonSchemaTarget);
  assert.equal(nonSchemaResult.valid, false);
  assert.match(nonSchemaResult.errors.join("\n"), /must resolve to a schema object/i);
});

test("propertyNames validates object keys with the same bounded schema rules", async () => {
  const { validateSchemaDefinition, validateValue } = await import(validatorUrl);
  const schema = {
    type: "object",
    propertyNames: {
      type: "string",
      pattern: "^[a-z][a-z0-9_-]{0,31}$",
    },
    additionalProperties: { type: "string" },
  };

  assert.deepEqual(validateSchemaDefinition(schema), { valid: true, errors: [] });
  assert.deepEqual(validateValue({ safe_key: "value" }, schema), {
    valid: true,
    errors: [],
  });
  const invalid = validateValue({ "../escape": "value" }, schema);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /property name|pattern/i);

  const malformed = validateSchemaDefinition({
    type: "object",
    propertyNames: true,
  });
  assert.equal(malformed.valid, false);
  assert.match(malformed.errors.join("\n"), /propertyNames.*schema object/i);
});

test("schema const and enum values reject unsafe integers recursively while preserving finite fractions", async () => {
  const { validateSchemaDefinition } = await import(validatorUrl);
  const unsafeInteger = Number.MAX_SAFE_INTEGER + 1;

  for (const [label, schema] of [
    ["top-level const", { const: unsafeInteger }],
    ["nested const", { const: { limits: [1, { value: unsafeInteger }] } }],
    ["top-level enum", { enum: [unsafeInteger] }],
    ["nested enum", { enum: [{ limits: [1, { value: unsafeInteger }] }] }],
  ]) {
    let result;
    assert.doesNotThrow(() => {
      result = validateSchemaDefinition(schema);
    }, label);
    assert.equal(result.valid, false, label);
    assert.match(result.errors.join("\n"), /safe integer/i, label);
  }

  for (const [label, schema] of [
    ["fractional const", { const: { ratio: 1.25 } }],
    ["fractional enum", { enum: [0.5, { ratio: -2.75 }] }],
  ]) {
    assert.deepEqual(
      validateSchemaDefinition(schema),
      { valid: true, errors: [] },
      label,
    );
  }
});

test("schema maps reject overlong keys without throwing and retain bounded local-reference behavior", async () => {
  const { validateSchemaDefinition } = await import(validatorUrl);
  const maximumKey = "k".repeat(4096);
  const overlongKey = "k".repeat(4097);

  for (const keyword of ["properties", "$defs"]) {
    assert.deepEqual(
      validateSchemaDefinition({ [keyword]: { [maximumKey]: { type: "string" } } }),
      { valid: true, errors: [] },
      `${keyword} accepts a key at the bound`,
    );

    let result;
    assert.doesNotThrow(() => {
      result = validateSchemaDefinition({
        [keyword]: { [overlongKey]: { type: "string" } },
      });
    }, keyword);
    assert.equal(result.valid, false, keyword);
    assert.match(result.errors.join("\n"), /key.*length bound/i, keyword);
    assert.equal(result.errors.join("\n").includes(overlongKey), false, keyword);
  }

  const escapedPointer = {
    $defs: { "segment/with~tokens": { type: "string" } },
    $ref: "#/$defs/segment~1with~0tokens",
  };
  assert.deepEqual(validateSchemaDefinition(escapedPointer), {
    valid: true,
    errors: [],
  });
});

test("overdeep supported schemas return a structured depth error without exhausting the call stack", async () => {
  const { validateSchemaDefinition } = await import(validatorUrl);
  let schema = { type: "string" };
  for (let depth = 0; depth < 10_000; depth += 1) {
    schema = { type: "array", items: schema };
  }

  let result;
  assert.doesNotThrow(() => {
    result = validateSchemaDefinition(schema);
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /nesting.*depth/i);
});

test("long local-reference chains fail closed without escaping the public validator", async () => {
  const { validateSchemaDefinition, validateValue } = await import(validatorUrl);
  const longCycle = makeLocalReferenceChain(96, { cycle: true });

  let cycleValueResult;
  assert.doesNotThrow(() => {
    cycleValueResult = validateValue("value", longCycle);
  });
  assert.equal(cycleValueResult.valid, false);
  assert.match(cycleValueResult.errors.join("\n"), /schema:.*(?:cyclic|reference).*depth|schema:.*cyclic/i);

  const cycleDefinition = validateSchemaDefinition(longCycle);
  assert.equal(cycleDefinition.valid, false);
  assert.match(cycleDefinition.errors.join("\n"), /(?:cyclic|reference).*depth|cyclic/i);

  const boundaryChain = makeLocalReferenceChain(64);
  assert.deepEqual(validateSchemaDefinition(boundaryChain), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(validateValue("value", boundaryChain), {
    valid: true,
    errors: [],
  });

  const overBoundaryChain = makeLocalReferenceChain(65);
  let overBoundaryResult;
  assert.doesNotThrow(() => {
    overBoundaryResult = validateValue("value", overBoundaryChain);
  });
  assert.equal(overBoundaryResult.valid, false);
  assert.match(overBoundaryResult.errors.join("\n"), /schema:.*reference.*depth/i);
});

test("reverse-ordered reference depth is exact at both public seams with shallow recursion controls", async () => {
  const { validateSchemaDefinition, validateValue } = await import(validatorUrl);
  const boundarySchema = makeReverseOrderedLocalReferenceChain(64);
  assert.deepEqual(validateSchemaDefinition(boundarySchema), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(validateValue("value", boundarySchema), {
    valid: true,
    errors: [],
  });

  const schema = makeReverseOrderedLocalReferenceChain(65);

  const definitionResult = validateSchemaDefinition(schema);
  let valueResult;
  assert.doesNotThrow(() => {
    valueResult = validateValue({ value: "value" }, schema);
  });

  assert.equal(definitionResult.valid, false);
  assert.match(definitionResult.errors.join("\n"), /reference.*depth/i);
  assert.equal(valueResult.valid, false);
  assert.match(valueResult.errors.join("\n"), /schema:.*reference.*depth/i);

  const shallowRecursion = makeLocalReferenceChain(1, { cycle: true });
  const shallowDefinitionResult = validateSchemaDefinition(shallowRecursion);
  let shallowValueResult;
  assert.doesNotThrow(() => {
    shallowValueResult = validateValue("value", shallowRecursion);
  });
  assert.equal(shallowDefinitionResult.valid, false);
  assert.match(shallowDefinitionResult.errors.join("\n"), /cyclic/i);
  assert.equal(shallowValueResult.valid, false);
  assert.match(shallowValueResult.errors.join("\n"), /schema:.*cyclic/i);
});

test("grouped 10000-link reference chains remain bounded at both public seams", async () => {
  const { validateSchemaDefinition, validateValue } = await import(validatorUrl);
  const schema = makeReverseOrderedGroupedReferenceChain(10_000);

  const definitionResult = validateSchemaDefinition(schema);
  let valueResult;
  assert.doesNotThrow(() => {
    valueResult = validateValue({ value: "value" }, schema);
  });

  assert.equal(definitionResult.valid, false);
  assert.match(definitionResult.errors.join("\n"), /reference.*depth/i);
  assert.equal(valueResult.valid, false);
  assert.match(valueResult.errors.join("\n"), /schema:.*reference.*depth/i);
});

test("value validation is strict about discriminators, fields, nulls, and numeric safety", async () => {
  const { validateValue } = await import(validatorUrl);
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    $defs: {
      safePositiveInteger: {
        type: "integer",
        minimum: 1,
        maximum: Number.MAX_SAFE_INTEGER,
      },
    },
    properties: {
      schema: { const: "sample_v2" },
      count: { $ref: "#/$defs/safePositiveInteger" },
      optional_limit: {
        type: ["integer", "null"],
        minimum: 1,
        maximum: Number.MAX_SAFE_INTEGER,
      },
      confirmed_at: { type: "string", format: "date-time" },
    },
    required: ["schema", "count", "confirmed_at"],
    additionalProperties: false,
  };

  assert.deepEqual(
    validateValue(
      {
        schema: "sample_v2",
        count: 3,
        optional_limit: null,
        confirmed_at: "2026-07-17T04:00:00.000Z",
      },
      schema,
    ),
    { valid: true, errors: [] },
  );

  for (const [label, value, expected] of [
    [
      "v1 discriminator",
      { schema: "sample_v1", count: 3, confirmed_at: "2026-07-17T04:00:00.000Z" },
      /must equal constant/i,
    ],
    [
      "unknown field",
      {
        schema: "sample_v2",
        count: 3,
        confirmed_at: "2026-07-17T04:00:00.000Z",
        surprise: true,
      },
      /unknown property `surprise`/i,
    ],
    [
      "mandatory null",
      { schema: "sample_v2", count: null, confirmed_at: "2026-07-17T04:00:00.000Z" },
      /must have type integer/i,
    ],
    [
      "unsafe integer",
      {
        schema: "sample_v2",
        count: Number.MAX_SAFE_INTEGER + 1,
        confirmed_at: "2026-07-17T04:00:00.000Z",
      },
      /safe integer/i,
    ],
    [
      "non-finite number",
      { schema: "sample_v2", count: Number.POSITIVE_INFINITY, confirmed_at: "2026-07-17T04:00:00.000Z" },
      /finite/i,
    ],
  ]) {
    const result = validateValue(value, schema);
    assert.equal(result.valid, false, label);
    assert.match(result.errors.join("\n"), expected, label);
  }
});

test("the documented subset rejects other drafts, unknown types or formats, and recursive refs", async () => {
  const { validateSchemaDefinition } = await import(validatorUrl);

  for (const [label, schema, expected] of [
    [
      "other draft",
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "string",
      },
      /draft 2020-12/i,
    ],
    [
      "unknown type",
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "function",
      },
      /unsupported type/i,
    ],
    [
      "unknown format",
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "string",
        format: "email",
      },
      /unsupported format/i,
    ],
    [
      "recursive ref",
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        $defs: {
          node: { $ref: "#/$defs/node" },
        },
        properties: {
          node: { $ref: "#/$defs/node" },
        },
        additionalProperties: false,
      },
      /cyclic local \$ref/i,
    ],
  ]) {
    const result = validateSchemaDefinition(schema);
    assert.equal(result.valid, false, label);
    assert.match(result.errors.join("\n"), expected, label);
  }
});

test("supported keyword definitions fail closed on malformed values and invariants", async () => {
  const { validateSchemaDefinition, validateValue } = await import(validatorUrl);
  const malformed = [
    ["$id", { $id: 1 }, /\$id.*string/i],
    ["title", { title: false }, /title.*string/i],
    ["description", { description: [] }, /description.*string/i],
    ["type array", { type: ["string", 1] }, /type.*unsupported/i],
    ["const non-finite", { const: Number.POSITIVE_INFINITY }, /const.*json/i],
    ["enum", { enum: "value" }, /enum.*array/i],
    ["enum duplicate", { enum: ["same", "same"] }, /enum.*unique/i],
    ["required", { type: "object", required: 1 }, /required.*array/i],
    ["required entry", { type: "object", required: [1] }, /required.*strings/i],
    ["additionalProperties", { additionalProperties: 1 }, /additionalProperties.*boolean.*schema/i],
    ["items", { type: "array", items: true }, /items.*schema/i],
    ["minItems", { type: "array", minItems: -1 }, /minItems.*non-negative/i],
    ["maxItems", { type: "array", maxItems: 1.5 }, /maxItems.*integer/i],
    ["array range", { type: "array", minItems: 2, maxItems: 1 }, /minItems.*maxItems/i],
    ["uniqueItems", { type: "array", uniqueItems: 1 }, /uniqueItems.*boolean/i],
    ["minLength", { type: "string", minLength: -1 }, /minLength.*non-negative/i],
    ["maxLength", { type: "string", maxLength: "2" }, /maxLength.*integer/i],
    ["string range", { type: "string", minLength: 2, maxLength: 1 }, /minLength.*maxLength/i],
    ["minimum", { type: "number", minimum: "0" }, /minimum.*finite number/i],
    ["maximum", { type: "number", maximum: Number.NaN }, /maximum.*finite number/i],
    ["numeric range", { type: "number", minimum: 2, maximum: 1 }, /minimum.*maximum/i],
    ["exclusive range", { type: "number", exclusiveMinimum: 2, exclusiveMaximum: 2 }, /exclusiveMinimum.*exclusiveMaximum/i],
    [
      "mixed minimum and exclusive maximum range",
      { type: "number", minimum: 2, exclusiveMaximum: 2 },
      /minimum.*exclusiveMaximum/i,
    ],
    [
      "mixed exclusive minimum and maximum range",
      { type: "number", exclusiveMinimum: 2, maximum: 2 },
      /exclusiveMinimum.*maximum/i,
    ],
    ["multipleOf", { type: "number", multipleOf: 0 }, /multipleOf.*positive/i],
    ["format", { type: "string", format: 1 }, /format.*string/i],
    ["not", { not: false }, /not.*schema/i],
  ];

  for (const [label, schema, expected] of malformed) {
    const result = validateSchemaDefinition(schema);
    assert.equal(result.valid, false, label);
    assert.match(result.errors.join("\n"), expected, label);
    assert.doesNotThrow(() => validateValue(null, schema), `${label} must not crash`);
    assert.equal(validateValue(null, schema).valid, false, label);
  }
});

test("numeric, date-time, and collection validation is exact and bounded", async () => {
  const { validateValue } = await import(validatorUrl);
  const decimalSchema = { type: "number", multipleOf: 0.1 };
  assert.equal(validateValue(0.3, decimalSchema).valid, true);
  assert.equal(validateValue(0.31, decimalSchema).valid, false);

  const dateSchema = { type: "string", format: "date-time" };
  assert.equal(validateValue("2024-02-29T23:59:59.123456789Z", dateSchema).valid, true);
  for (const invalid of [
    "2023-02-29T12:00:00Z",
    "2026-13-01T00:00:00Z",
    "2026-07-17T24:00:00Z",
    "2026-07-17T04:00:60Z",
    "2026-07-17T04:00:00",
  ]) {
    assert.equal(validateValue(invalid, dateSchema).valid, false, invalid);
  }

  const boundedArray = validateValue(
    Array.from({ length: 10_001 }, (_, index) => index),
    { type: "array" },
  );
  assert.equal(boundedArray.valid, false);
  assert.match(boundedArray.errors.join("\n"), /supported collection bound/i);

  const nestedNonFinite = validateValue(
    [{ observation: Number.POSITIVE_INFINITY }],
    { type: "array" },
  );
  assert.equal(nestedNonFinite.valid, false);
  assert.match(nestedNonFinite.errors.join("\n"), /finite/i);
});
