const MAX_NAME_LENGTH = 50;

export function greeting(name: string): string {
  const normalized = name.trim();
  if (!normalized || normalized.length > MAX_NAME_LENGTH) {
    throw new RangeError("Name must contain 1 to 50 characters.");
  }
  return `Hello, ${normalized}!`;
}
