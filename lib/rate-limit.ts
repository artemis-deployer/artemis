type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 5000;

export function bucketCount(): number {
  return buckets.size;
}

function now(): number {
  return Date.now();
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
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

// Best-effort in-memory daily cap (resets on deploy/restart). Guards
// quota-backed proxies (Pinata) against junk-pinning across rotated IPs.
export function checkDailyLimit(key: string, limit: number): { ok: boolean } {
  const day = today();
  const entry = dailyHits.get(key);
  if (!entry || entry.day !== day) {
    dailyHits.set(key, { day, hits: 1 });
    return { ok: true };
  }
  if (entry.hits >= limit) return { ok: false };
  entry.hits += 1;
  return { ok: true };
}

export function clearRateLimits(): void {
  buckets.clear();
  dailyHits.clear();
}
