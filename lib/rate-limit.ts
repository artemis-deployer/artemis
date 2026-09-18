type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

function now(): number {
  return Date.now();
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const t = now();
  let bucket = buckets.get(key);
  if (!bucket) {
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
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "local";
}

export function clearRateLimits(): void {
  buckets.clear();
}
