/**
 * Reading the host store. It is shared, hand-editable JSON, so every reader
 * in Canvas coerces what it finds instead of trusting it; this is the one
 * check they all start from.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
