/**
 * Short-lived cache in front of Better Auth's session lookup.
 *
 * Without it every authenticated request costs two database round-trips (session + user).
 * Entries are keyed by the *signed* session cookie, so only a cookie that Better Auth has
 * already verified can hit the cache. Entries live for at most 60 s and are dropped on
 * sign-out, role changes and account deletion.
 *
 * Single-process cache: with several server instances a signed-out token may keep working
 * on another instance for up to TTL_MS.
 */
import { auth } from "./auth.js";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
};

const TTL_MS = 60_000;
const MAX_ENTRIES = 10_000;
const COOKIE_RE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/;

const cache = new Map<string, { user: SessionUser; expiresAt: number }>();
const inflight = new Map<string, Promise<SessionUser | null>>();

function sessionToken(headers: Headers) {
  return headers.get("cookie")?.match(COOKIE_RE)?.[1] ?? null;
}

async function lookup(headers: Headers, token: string): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    cache.delete(token);
    return null;
  }
  const user = session.user as SessionUser;
  const expiresAt = Math.min(Date.now() + TTL_MS, new Date(session.session.expiresAt).getTime());
  cache.set(token, { user, expiresAt });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return user;
}

/** The signed-in user for a request, or null. No cookie → no database call at all. */
export async function resolveSessionUser(headers: Headers): Promise<SessionUser | null> {
  const token = sessionToken(headers);
  if (!token) return null;

  const hit = cache.get(token);
  if (hit && hit.expiresAt > Date.now()) return hit.user;

  // Concurrent requests from the same app screen share one lookup.
  let pending = inflight.get(token);
  if (!pending) {
    pending = lookup(headers, token).finally(() => inflight.delete(token));
    inflight.set(token, pending);
  }
  return pending;
}

/** Drop the cached session for this request's cookie (sign-out). */
export function forgetSession(headers: Headers) {
  const token = sessionToken(headers);
  if (token) cache.delete(token);
}

/** Drop every cached session of a user (role assigned, account deleted…). */
export function forgetUserSessions(userId: string) {
  for (const [token, entry] of cache) if (entry.user.id === userId) cache.delete(token);
}
