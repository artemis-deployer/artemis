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
});
