import type { TSchema } from "@sinclair/typebox";
import { TypeCompiler, type TypeCheck } from "@sinclair/typebox/compiler";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Compile each tool's TypeBox schema once and reuse the checker. Keyed on the
// schema object identity so every getClient()-built tool instance that shares a
// module-level `Schema` hits the same compiled checker.
const compiledCache = new WeakMap<TSchema, TypeCheck<TSchema>>();

function getChecker(schema: TSchema): TypeCheck<TSchema> {
  let checker = compiledCache.get(schema);
  if (!checker) {
    checker = TypeCompiler.Compile(schema);
    compiledCache.set(schema, checker);
  }
  return checker;
}

/**
 * Validate raw tool `arguments` against a tool's TypeBox `inputSchema` before
 * the tool's `execute` runs. Throws ValidationError on the first mismatch so
 * unvalidated values (ids, types, states, limits) never reach URL paths/queries.
 */
export function validateToolArgs(
  schema: TSchema,
  toolName: string,
  args: unknown,
): void {
  const checker = getChecker(schema);
  if (checker.Check(args)) return;
  const first = checker.Errors(args).First();
  const where = first?.path ? ` at ${first.path}` : "";
  const detail = first ? `${first.message}${where}` : "schema mismatch";
  throw new ValidationError(
    `Invalid arguments for ${toolName}: ${detail}`,
  );
}
