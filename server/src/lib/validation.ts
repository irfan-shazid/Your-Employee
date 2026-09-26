import type { Context } from "hono";
import type { z } from "zod";
import { badRequest } from "./errors.js";

/** Validate any input against a schema; throws 400 with `{ field: message }` details. */
export function validate<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  const first = result.error.issues[0];
  throw badRequest(first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", fields);
}

/** Parse and validate the JSON body. */
export async function readJson<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  return validate(schema, raw);
}

/** Validate query-string parameters. */
export function readQuery<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  return validate(schema, c.req.query());
}
