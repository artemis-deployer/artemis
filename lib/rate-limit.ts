import postgres from "postgres";
import { isDbConfigured } from "./community-db";

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 5000;

let db: ReturnType<typeof postgres> | null = null;

function sql() {
  if (!process.env.DATABASE_URL) throw new Error("db_offline");
  db ??= postgres(process.env.DATABASE_URL, { prepare: false });
  return db;
}

export function bucketCount(): number {
  return buckets.size;
}

function now(): number {
  return Date.now();
}

export type RateDecision = { ok: boolean; retryAfterMs: number };

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateDecision> {
  const shared = await dbHit(key, limit, windowMs);
  if (shared) return shared;
  return checkRateLimitMemory(key, limit, windowMs);
}

function checkRateLimitMemory(key: string, limit: number, windowMs: number): RateDecision {
  const t = now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next();
      if (!oldest.done) buckets.delete(oldest.value);
    }
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((h) => t - h < windowMs);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? t;
    return { ok: false, retryAfterMs: windowMs - (t - oldest) };
  }
  bucket.hits.push(t);
  return { ok: true, retryAfterMs: 0 };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  // Trust LAST entry: platforms (Vercel et al) append the real client IP,
  // while the first entry is attacker-controlled. Taking first lets attackers
  // rotate quota with spoofed headers.
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
    if (parts.length > 0) return parts[parts.length - 1] as string;
    return "unknown";
  }
  return "local";
}

const dailyHits = new Map<string, { day: string; hits: number }>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Fixed-window counter in Postgres: survives deploys/restarts and is shared
// across serverless instances. Falls back to memory when DB is unavailable.
async function dbHit(key: string, limit: number, windowMs: number): Promise<RateDecision | null> {
  if (!isDbConfigured()) return null;
  const bucket = Math.floor(Date.now() / windowMs);
  try {
    const rows = await sql()`
      INSERT INTO rate_limits (key, window_start, hits) VALUES (${key}, ${bucket}, 1)
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN rate_limits.window_start = EXCLUDED.window_start THEN rate_limits.hits + 1 ELSE 1 END,
        window_start = EXCLUDED.window_start
      RETURNING hits`;
    const hits = (rows as unknown as { hits: number }[])[0]?.hits ?? limit + 1;
    if (hits <= limit) return { ok: true, retryAfterMs: 0 };
    return { ok: false, retryAfterMs: (bucket + 1) * windowMs - Date.now() };
  } catch {
    return null;
  }
}

export function clearRateLimits(): void {
  buckets.clear();
  dailyHits.clear();
}

// Daily cap backed by the shared counter (rolling 24h window).
// Guards quota-backed proxies (Pinata) against junk-pinning across rotated IPs.
export async function checkDailyLimit(key: string, limit: number): Promise<{ ok: boolean }> {
  const day = today();
  const entry = dailyHits.get(key);
  if (!entry || entry.day !== day) {
    dailyHits.set(key, { day, hits: 1 });
  } else {
    if (entry.hits >= limit) return { ok: false };
    entry.hits += 1;
  }
  const shared = await dbHit(`daily:${day}:${key}`, limit, 24 * 60 * 60 * 1000);
  if (shared) return { ok: shared.ok };
  return { ok: true };
}
