import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/pump-metadata/route";
import { clearRateLimits } from "../lib/rate-limit";

describe("pump-metadata route", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.unstubAllGlobals();
    vi.stubEnv("PINATA_JWT", "test-jwt");
  });

  it("returns 502 when unconfigured", async () => {
    vi.stubEnv("PINATA_JWT", "");
    const req = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI", description: "d" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it("rejects blank name or symbol with 400", async () => {
    for (const body of [
      { name: "", symbol: "KOPI" },
      { name: "Kopi", symbol: "" },
      "null",
    ]) {
      const req = new Request("http://x/api/pump-metadata", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
      expect((await POST(req)).status).toBe(400);
    }
  });

  it("pins metadata and returns ipfs uri", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { cid: "bafytest" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const req = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI", description: "d" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { uri: string }).uri).toBe("https://ipfs.io/ipfs/bafytest");
    const [, init] = fetchMock.mock.calls[0] as [string, { headers?: Record<string, string> }];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://uploads.pinata.cloud/v3/files");
    expect(init.headers?.authorization).toBe("Bearer test-jwt");
  });

  it("maps pinata failure to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 400 }));
    const req = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI" }),
    });
    expect((await POST(req)).status).toBe(502);
  });

  it("ignores unknown fields", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { cid: "bafytest" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const req = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI", evil: "x".repeat(1000), foo: 1 }),
    });
    expect((await POST(req)).status).toBe(200);
  });

  it("survives 5MB JSON without crash", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { cid: "b" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const big = "d".repeat(5 * 1024 * 1024);
    const req = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI", description: big }),
    });
    const res = await POST(req);
    expect([200, 400]).toContain(res.status);
  });

  it("ADVERSARIAL: rejects non-https image URLs (data:/http:/javascript: quota burn)", async () => {
    for (const image of [
      "data:image/png;base64,AAAA",
      "http://evil.test/x.png",
      "javascript:alert(1)",
    ]) {
      const req = new Request("http://x/api/pump-metadata", {
        method: "POST",
        body: JSON.stringify({ name: "Kopi", symbol: "KOPI", image }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    }
  });

  it("ADVERSARIAL: caps pins per day (junk-pinning on our JWT quota)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { cid: "b" } }) });
    vi.stubGlobal("fetch", fetchMock);
    let capped = false;
    for (let i = 0; i < 500; i++) {
      const req = new Request("http://x/api/pump-metadata", {
        method: "POST",
        headers: { "x-forwarded-for": `10.9.9.${i % 250}` },
        body: JSON.stringify({ name: "Kopi", symbol: "KOPI" }),
      });
      const res = await POST(req);
      if (res.status === 429) {
        capped = true;
        break;
      }
    }
    expect(capped).toBe(true);
  });

  it("maps empty body and broken JSON syntax to 400", async () => {
    for (const raw of ["", "{bad", '{"name":}']) {
      const req = new Request("http://x/api/pump-metadata", { method: "POST", body: raw });
      expect((await POST(req)).status).toBe(400);
    }
  });

  it("rejects array and null bodies with 400", async () => {
    for (const raw of ['[]', 'null', '"str"']) {
      const req = new Request("http://x/api/pump-metadata", { method: "POST", body: raw });
      expect((await POST(req)).status).toBe(400);
    }
  });

  it("maps missing cid to 502", async () => {
    for (const upstreamBody of [{ data: {} }, {}, { data: { cid: "" } }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => upstreamBody }));
      const req = new Request("http://x/api/pump-metadata", {
        method: "POST",
        body: JSON.stringify({ name: "Kopi", symbol: "KOPI" }),
      });
      expect((await POST(req)).status).toBe(502);
    }
  });

  it("maps pinata throw and bad upstream JSON to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));
    const req1 = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI" }),
    });
    expect((await POST(req1)).status).toBe(502);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("bad json"); } }),
    );
    const req2 = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI" }),
    });
    expect((await POST(req2)).status).toBe(502);
  });

  it("throttles twenty rapid 2MB pins from one IP (quota + bandwidth guard)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { cid: "b" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const bigImage = `data:image/png;base64,${"QUJD".repeat(500000)}`;
    let okCount = 0;
    let throttled = false;
    for (let i = 0; i < 20; i++) {
      const req = new Request("http://x/api/pump-metadata", {
        method: "POST",
        headers: { "x-forwarded-for": "8.8.8.8" },
        body: JSON.stringify({ name: "Kopi", symbol: "KOPI", imageData: bigImage }),
      });
      const res = await POST(req);
      if (res.status === 200) okCount += 1;
      if (res.status === 429) throttled = true;
    }
    expect(throttled).toBe(true);
    expect(okCount).toBeLessThanOrEqual(10);
  });

  it("throttles 10/min per IP with 429", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { cid: "b" } }) });
    vi.stubGlobal("fetch", fetchMock);
    let throttled = false;
    for (let i = 0; i < 12; i++) {
      const req = new Request("http://x/api/pump-metadata", {
        method: "POST",
        headers: { "x-forwarded-for": "9.9.9.9" },
        body: JSON.stringify({ name: "Kopi", symbol: "KOPI" }),
      });
      const res = await POST(req);
      if (i < 10) expect(res.status).toBe(200);
      else if (res.status === 429) throttled = true;
    }
    expect(throttled).toBe(true);
  });

  it("pins uploaded artwork first, then metadata", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { cid: "bafyimg" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { cid: "bafymeta" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const req = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI", imageData: "data:image/png;base64,aGk=" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { uri: string }).uri).toBe("https://ipfs.io/ipfs/bafymeta");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects bad or oversized imageData with 400", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const imageData of ["not-a-data-url", "data:image/svg+xml;base64,aGk=", "data:image/png;base64,!!!"]) {
      const req = new Request("http://x/api/pump-metadata", {
        method: "POST",
        body: JSON.stringify({ name: "Kopi", symbol: "KOPI", imageData }),
      });
      expect((await POST(req)).status).toBe(400);
    }
    const huge = `data:image/png;base64,${"QUJD".repeat(700000)}`;
    const big = new Request("http://x/api/pump-metadata", {
      method: "POST",
      body: JSON.stringify({ name: "Kopi", symbol: "KOPI", imageData: huge }),
    });
    expect((await POST(big)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
