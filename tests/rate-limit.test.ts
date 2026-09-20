import { describe, expect, it } from "vitest";
import { bucketCount, checkRateLimit, clearRateLimits, clientIp } from "../lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit then refuses", () => {
    clearRateLimits();
    expect(checkRateLimit("k1", 2, 60000).ok).toBe(true);
    expect(checkRateLimit("k1", 2, 60000).ok).toBe(true);
    const third = checkRateLimit("k1", 2, 60000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    clearRateLimits();
    expect(checkRateLimit("a", 1, 60000).ok).toBe(true);
    expect(checkRateLimit("a", 1, 60000).ok).toBe(false);
    expect(checkRateLimit("b", 1, 60000).ok).toBe(true);
  });

  it("caps buckets at 5000 and still enforces limits", () => {
    clearRateLimits();
    for (let i = 0; i < 6000; i++) {
      checkRateLimit(`cap-${i}`, 1, 60000);
    }
    expect(bucketCount()).toBeLessThanOrEqual(5000);
    expect(checkRateLimit("cap-probe", 1, 60000).ok).toBe(true);
    expect(checkRateLimit("cap-probe", 1, 60000).ok).toBe(false);
  });

  it("isolates route prefixes (chat vs showcase vs pin share no bucket)", () => {
    clearRateLimits();
    const ip = "1.2.3.4";
    for (let i = 0; i < 10; i++) expect(checkRateLimit(`chat:${ip}`, 10, 60000).ok).toBe(true);
    expect(checkRateLimit(`chat:${ip}`, 10, 60000).ok).toBe(false);
    expect(checkRateLimit(`showcase:${ip}`, 20, 60000).ok).toBe(true);
    expect(checkRateLimit(`showcase-get:${ip}`, 60, 60000).ok).toBe(true);
    expect(checkRateLimit(`pin:${ip}`, 10, 60000).ok).toBe(true);
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

  it("falls back to local", () => {
    expect(clientIp(new Request("http://x.test"))).toBe("local");
  });
});
