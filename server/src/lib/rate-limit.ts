import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { env } from "../config/env.js";

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window in-memory rate limiter.
 * Good for a single Node process. If you scale to several instances, move the store to Postgres or Redis.
 */
class MemoryStore {
  private buckets = new Map<string, Bucket>();

  constructor() {
    // Sweep expired buckets every minute so memory stays flat.
    setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(key);
      }
    }, 60_000).unref();
  }

  hit(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
      return bucket;
    }
    existing.count += 1;
    return existing;
  }
}

const store = new MemoryStore();

export function clientIp(c: Context): string {
  if (env.TRUST_PROXY) {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
    const real = c.req.header("cf-connecting-ip") ?? c.req.header("x-real-ip");
    if (real) return real;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

type Options = {
  /** Unique name so different limiters don't share counters. */
  name: string;
  windowMs: number;
  max: number;
  /** Defaults to client IP. Use the user id for authenticated routes. */
  key?: (c: Context) => string;
  message?: string;
};

export function rateLimit(opts: Options): MiddlewareHandler {
  return async (c, next) => {
    const id = opts.key ? opts.key(c) : clientIp(c);
    const bucket = store.hit(`${opts.name}:${id}`, opts.windowMs);
    const remaining = Math.max(0, opts.max - bucket.count);

    c.header("RateLimit-Limit", String(opts.max));
    c.header("RateLimit-Remaining", String(remaining));
    c.header("RateLimit-Reset", String(Math.ceil((bucket.resetAt - Date.now()) / 1000)));

    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - Date.now()) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: opts.message ?? `Too many requests. Please try again in ${retryAfter}s.`,
          },
        },
        429,
      );
    }
    await next();
  };
}

/** Key by signed-in user when available, otherwise by IP. */
export const byUser = (c: Context) => {
  const user = c.get("user") as { id: string } | null | undefined;
  return user?.id ?? clientIp(c);
};
