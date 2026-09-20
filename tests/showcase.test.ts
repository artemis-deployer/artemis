import { afterEach, describe, expect, it, vi } from "vitest";
import { submitShowcase } from "../lib/showcase";
import { normalizeTokenInput } from "../lib/community-db";

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

  it("maps 429 rate-limit to offline (transient, not invalid)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"error":"too_many_requests"}', { status: 429 })),
    );
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

  it("rejects empty address/chainId without network", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitShowcase({ chainId: "", address: "" })).resolves.toBe("rejected");
    await expect(submitShowcase({ chainId: 4663, address: "   " })).resolves.toBe("rejected");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("normalizeTokenInput", () => {
  it("trims before slicing token fields", () => {
    expect(
      normalizeTokenInput({
        chainId: "4663",
        address: "0xabc",
        creator: "  0x123  ",
        name: "  Hi  ",
        symbol: " X ",
        pool: " p ",
        txHash: "  h  ",
      }),
    ).toEqual({
      chainId: "4663",
      address: "0xabc",
      creator: "0x123",
      name: "Hi",
      symbol: "X",
      pool: "p",
      txHash: "h",
    });
  });

  it("slices long fields after trim", () => {
    const out = normalizeTokenInput({
      chainId: " 4663 ",
      address: "0xabc",
      creator: `  ${"a".repeat(250)}  `,
    });
    expect(out.chainId).toBe("4663");
    expect(out.creator).toBe("a".repeat(200));
  });
});
