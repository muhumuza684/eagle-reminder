// Tier 1 #2 — rate limiting on mutations and the LLM-backed quotes endpoint.
//
// Deliberately does NOT touch `_core/*` (platform-managed, per
// FIXES-LOG.md / MERGE-NOTES.md convention) — this composes on top of the
// existing `protectedProcedure` via tRPC's standard `.use(middleware)`
// chaining, which any procedure builder supports regardless of what's
// inside it.
//
// KNOWN LIMITATION: this is an in-memory, single-process fixed-window
// limiter. It's correct and sufficient for a single server instance; it is
// NOT correct behind multiple instances/load balancing, since each process
// has its own counters. If/when this deploys behind more than one instance,
// swap the Map below for a shared store (Redis INCR + EXPIRE is the
// standard pattern) — the `rateLimited()` call sites in routers.ts don't
// need to change, only this file's internals.

import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";
import { log } from "./logger";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded across long-lived
// server processes with many distinct users.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (now >= bucket.resetAt) buckets.delete(key);
}, 5 * 60 * 1000);

/**
 * Wraps `protectedProcedure` with a per-user, per-`key` fixed-window rate
 * limit. Usage: `rateLimited("quotes.generate", 5, 60_000).input(...).mutation(...)`
 * — reads exactly like a normal procedure declaration.
 */
export function rateLimited(key: string, limit: number, windowMs: number) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const bucketKey = `${key}:${ctx.user.id}`;
    const now = Date.now();
    const bucket = buckets.get(bucketKey);
    if (!bucket || now >= bucket.resetAt) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count += 1;
      if (bucket.count > limit) {
        const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
        log({ event: "rate_limit.exceeded", level: "warn", userId: ctx.user.id, key, count: bucket.count, limit });
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Slow down a little — try again in ${retryAfterSeconds}s.` });
      }
    }
    return next();
  });
}
