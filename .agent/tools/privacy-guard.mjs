const SENSITIVE_KEYS = new Set([
  'authorization', 'chain_of_thought', 'credential', 'credentials', 'password',
  'private_key', 'prompt', 'raw_payload', 'raw_prompt', 'raw_response',
  'reasoning_content', 'secret',
]);
const SENSITIVE_TEXT_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/giu,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu,
  /\bsk-[A-Za-z0-9_-]{16,}\b/gu,
  /\bAKIA[0-9A-Z]{16}\b/gu,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/giu,
  /\b(?:api[_ -]?key|password|private[_ -]?key|secret|token)\s*[:=]\s*\S+/giu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  /(?<!\d)(?:\+?62|0)8\d{8,11}(?!\d)/gu,
  /(?<!\d)\d{16}(?!\d)/gu,
  /\b(?:raw\s+prompt|chain[- ]of[- ]thought|private\s+reasoning|hidden\s+reasoning)\s*:/giu,
  /\braw\s+untrusted\s+payload\s*:/giu,
];

export function assertPrivacySafeRuntimeValue(value, label = 'runtime value') {
  const active = new Set();
  let visited = 0;
  const visit = (candidate, key, depth) => {
    if (++visited > 100_000 || depth > 64) {
      throw new TypeError(`PRIVACY_STOP: ${label} exceeds the safe inspection bound.`);
    }
    if (typeof key === 'string' && SENSITIVE_KEYS.has(key.toLowerCase())) {
      throw new TypeError(`PRIVACY_STOP: ${label} contains a forbidden sensitive field.`);
    }
    if (typeof candidate === 'string') {
      const opaqueHash = /^(?:sha256:[a-f0-9]{64}|[a-f0-9]{40}|[a-f0-9]{64})$/u.test(candidate);
      if (!opaqueHash && SENSITIVE_TEXT_PATTERNS.some(pattern => candidate.replace(pattern, '') !== candidate)) {
        throw new TypeError(`PRIVACY_STOP: ${label} contains forbidden sensitive content.`);
      }
      return;
    }
    if (candidate === null || typeof candidate === 'boolean' || typeof candidate === 'number') return;
    if (typeof candidate !== 'object' || active.has(candidate)
      || (!Array.isArray(candidate) && ![Object.prototype, null].includes(Object.getPrototypeOf(candidate)))) {
      throw new TypeError(`PRIVACY_STOP: ${label} is not bounded plain JSON data.`);
    }
    active.add(candidate);
    const entries = Array.isArray(candidate)
      ? candidate.map((entry, index) => [String(index), entry]) : Object.entries(candidate);
    for (const [entryKey, entry] of entries) visit(entry, Array.isArray(candidate) ? null : entryKey, depth + 1);
    active.delete(candidate);
  };
  visit(value, null, 0);
  return value;
}
