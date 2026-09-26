import { z } from "zod";

/** `?cursor=<id>&limit=20` — every list endpoint uses cursor pagination. */
export const pageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type Page<T> = { items: T[]; nextCursor: string | null };

/** Prisma args that fetch one extra row so we know whether another page exists. */
export function cursorArgs(cursor: string | undefined, limit: number): { take: number; skip?: number; cursor?: { id: string } } {
  return cursor ? { take: limit + 1, skip: 1, cursor: { id: cursor } } : { take: limit + 1 };
}

export function paginate<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}

/** Fetch a page with a single call: `findPage((args) => prisma.x.findMany({ where, ...args }), query)`. */
export async function findPage<T extends { id: string }>(
  find: (args: ReturnType<typeof cursorArgs>) => Promise<T[]>,
  query: { cursor?: string; limit: number },
): Promise<Page<T>> {
  return paginate(await find(cursorArgs(query.cursor, query.limit)), query.limit);
}
