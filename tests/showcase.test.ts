import { afterEach, describe, expect, it, vi } from "vitest";
import { submitShowcase } from "../lib/showcase";

describe("submitShowcase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs token payload to the community API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const status = await submitShowcase({ chainId: 4663, address: "0xabc", name: "X", symbol: "X", txHash: "0x1" });
    expect(status).toBe("saved");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/community/tokens");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ address: "0xabc", txHash: "0x1" });
  });

  it("maps 400 invalid_tx rejection to rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"invalid_tx"}', { status: 400 })));
    await expect(submitShowcase({ chainId: 4663, address: "0xabc" })).resolves.toBe("rejected");
  });

  it("maps 500 server error to offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"db_offline"}', { status: 500 })));
    await expect(submitShowcase({ chainId: 4663, address: "0xabc" })).resolves.toBe("offline");
  });

  it("maps timeout abort to offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "AbortError")));
    await expect(submitShowcase({ chainId: 4663, address: "0xabc" })).resolves.toBe("offline");
  });

  it("swallows network errors so local receipt stays source of truth", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("down")),
    );
    await expect(submitShowcase({ chainId: 4663, address: "0xabc" })).resolves.toBe("offline");
  });
});
