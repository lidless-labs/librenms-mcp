import type { LibreNmsClient } from "../librenms-client.ts";

export type ClientFactory = () => LibreNmsClient;

export function jsonToolResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/**
 * Defense-in-depth coercion for numeric id/limit params that get interpolated
 * into URL paths or query strings. Runtime schema validation already enforces
 * these, but coercing here guarantees only a safe positive integer (optionally
 * bounded) ever reaches a request, even if a caller bypasses the dispatcher.
 */
export function safeInt(
  value: unknown,
  label: string,
  opts: { min?: number; max?: number } = {},
): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isInteger(n)) {
    throw new Error(`${label} must be an integer, got: ${String(value)}`);
  }
  const min = opts.min ?? 1;
  if (n < min) throw new Error(`${label} must be >= ${min}, got: ${n}`);
  if (opts.max !== undefined && n > opts.max) {
    throw new Error(`${label} must be <= ${opts.max}, got: ${n}`);
  }
  return n;
}
