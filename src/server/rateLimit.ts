/**
 * In-memory sliding-window rate limiter for AI agent requests.
 *
 * Tracks per-user request timestamps and enforces a configurable daily limit.
 * Uses a Map in server memory — sufficient for single-process deployments.
 * For multi-instance production, swap to Redis-backed storage.
 *
 * Limit: 50 AI requests per user per 24-hour sliding window.
 * This covers all agent mutations (A1 draft, A2/A3/A4 drafts, task generation, PDF extraction).
 * Confirm/Apply actions are NOT rate-limited — they don't call the LLM.
 */

import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum AI requests per user per sliding window */
const MAX_REQUESTS_PER_WINDOW = 50;

/** Sliding window duration in milliseconds (24 hours) */
const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Cleanup interval — prune stale entries every 10 minutes */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** userId → sorted array of request timestamps (epoch ms) */
const requestLog = new Map<string, number[]>();

// Periodic cleanup of expired entries to prevent memory leaks
if (typeof globalThis !== "undefined") {
  const existing = (globalThis as Record<string, unknown>).__kairosRateLimitCleanup;
  if (!existing) {
    const interval = setInterval(() => {
      const cutoff = Date.now() - WINDOW_MS;
      for (const [userId, timestamps] of requestLog) {
        const valid = timestamps.filter((ts) => ts > cutoff);
        if (valid.length === 0) {
          requestLog.delete(userId);
        } else {
          requestLog.set(userId, valid);
        }
      }
    }, CLEANUP_INTERVAL_MS);
    // Unref so the timer doesn't prevent process exit
    if (typeof interval === "object" && "unref" in interval) {
      interval.unref();
    }
    (globalThis as Record<string, unknown>).__kairosRateLimitCleanup = true;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
}

/**
 * Check rate limit for a user WITHOUT consuming a request.
 */
export function checkRateLimit(userId: string): RateLimitStatus {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = requestLog.get(userId) ?? [];
  const valid = timestamps.filter((ts) => ts > cutoff);
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - valid.length);
  const oldestInWindow = valid[0] ?? now;
  const resetsAt = new Date(oldestInWindow + WINDOW_MS);

  return {
    allowed: valid.length < MAX_REQUESTS_PER_WINDOW,
    remaining,
    limit: MAX_REQUESTS_PER_WINDOW,
    resetsAt,
  };
}

/**
 * Consume one request for a user. Throws TRPC TOO_MANY_REQUESTS if limit exceeded.
 */
export function consumeRateLimit(userId: string): RateLimitStatus {
  const status = checkRateLimit(userId);

  if (!status.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached your limit for messages to KAIROS. You can send ${status.limit} AI messages per day. Try again after ${status.resetsAt.toLocaleTimeString()}.`,
    });
  }

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const existing = requestLog.get(userId) ?? [];
  const valid = existing.filter((ts) => ts > cutoff);
  valid.push(now);
  requestLog.set(userId, valid);

  return {
    allowed: true,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - valid.length),
    limit: MAX_REQUESTS_PER_WINDOW,
    resetsAt: status.resetsAt,
  };
}
