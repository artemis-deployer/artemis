import { describe, expect, it, vi } from "vitest";
import { bucketCount, checkDailyLimit, checkRateLimit, clearRateLimits, clientIp } from "../lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit then refuses", async () => {
    clearRateLimits();
    expect((await checkRateLimit("k1", 2, 60000)).ok).toBe(true);
    expect((await checkRateLimit("k1", 2, 60000)).ok).toBe(true);
    const third = await checkRateLimit("k1", 2, 60000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates keys", async () => {
    clearRateLimits();
    expect((await checkRateLimit("a", 1, 60000)).ok).toBe(true);
    expect((await checkRateLimit("a", 1, 60000)).ok).toBe(false);
    expect((await checkRateLimit("b", 1, 60000)).ok).toBe(true);
  });

  it("caps buckets at 5000 and still enforces limits", async () => {
    clearRateLimits();
    for (let i = 0; i < 6000; i++) {
      await checkRateLimit(`cap-${i}`, 1, 60000);
    }
    expect(bucketCount()).toBeLessThanOrEqual(5000);
    expect((await checkRateLimit("cap-probe", 1, 60000)).ok).toBe(true);
    expect((await checkRateLimit("cap-probe", 1, 60000)).ok).toBe(false);
  });

  it("isolates route prefixes (chat vs showcase vs pin share no bucket)", async () => {
    clearRateLimits();
    const ip = "1.2.3.4";
    for (let i = 0; i < 10; i++) expect((await checkRateLimit(`chat:${ip}`, 10, 60000)).ok).toBe(true);
    expect((await checkRateLimit(`chat:${ip}`, 10, 60000)).ok).toBe(false);
    expect((await checkRateLimit(`showcase:${ip}`, 20, 60000)).ok).toBe(true);
    expect((await checkRateLimit(`showcase-get:${ip}`, 60, 60000)).ok).toBe(true);
    expect((await checkRateLimit(`pin:${ip}`, 10, 60000)).ok).toBe(true);
  });

  it("falls back to memory when the database is unreachable", async () => {
    clearRateLimits();
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:1/db");
    try {
      expect((await checkRateLimit("fb1", 1, 60000)).ok).toBe(true);
      expect((await checkRateLimit("fb1", 1, 60000)).ok).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("checkDailyLimit", () => {
  it("allows up to the limit per key then refuses", async () => {
    clearRateLimits();
    expect((await checkDailyLimit("d1", 2)).ok).toBe(true);
    expect((await checkDailyLimit("d1", 2)).ok).toBe(true);
    expect((await checkDailyLimit("d1", 2)).ok).toBe(false);
    expect((await checkDailyLimit("d2", 2)).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers last forwarded address (platform-appended real IP)", () => {
    const req = new Request("http://x.test", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("5.6.7.8");
  });

  it("ADVERSARIAL: trusts LAST forwarded entry (platform-appended real IP, first spoofable)", () => {
    const req = new Request("http://x.test", { headers: { "x-forwarded-for": "spoofed-1, spoofed-2, 9.9.9.9" } });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("handles single direct-connect IP with no commas", () => {
    const req = new Request("http://x.test", { headers: { "x-forwarded-for": "1.2.3.4" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to local", () => {
    expect(clientIp(new Request("http://x.test"))).toBe("local");
  });
});
