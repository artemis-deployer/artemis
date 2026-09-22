import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/community-db", () => ({
  isDbConfigured: vi.fn(),
  listTokens: vi.fn(),
  saveToken: vi.fn(),
}));

vi.mock("../lib/verify-tx", () => ({
  verifyEvmTx: vi.fn(),
  verifySolanaTx: vi.fn(),
}));

import { GET, POST } from "../app/api/community/tokens/route";
import { isDbConfigured, listTokens, saveToken } from "../lib/community-db";
import { verifyEvmTx, verifySolanaTx } from "../lib/verify-tx";
import { clearRateLimits } from "../lib/rate-limit";

const mocked = vi.mocked({ isDbConfigured, listTokens, saveToken });
const mockedVerify = vi.mocked({ verifyEvmTx, verifySolanaTx });

const EVM_ADDR = "0x097716e767df17605627def0030110f8ee559ec4";
const EVM_HASH = `0x${"ab".repeat(32)}`;

describe("tokens route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearRateLimits();
    mockedVerify.verifyEvmTx.mockResolvedValue(true);
    mockedVerify.verifySolanaTx.mockResolvedValue(true);
  });

  it("GET returns db_offline when unconfigured", async () => {
    mocked.isDbConfigured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("db_offline");
  });

  it("GET lists newest tokens", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.listTokens.mockResolvedValue([{ chain_id: "4663", address: "0xabc", creator: "", name: "X", symbol: "", pool: "", tx_hash: "", image: "", tagline: "", description: "", lore: "", created_at: "" }]);
    const res = await GET(new Request("http://x/api/community/tokens"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { tokens: unknown[] }).tokens).toHaveLength(1);
  });

  it("GET throttles after 60 rapid calls with 429", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.listTokens.mockResolvedValue([]);
    let last: Response | null = null;
    for (let i = 0; i < 61; i++) {
      last = await GET(
        new Request("http://x/api/community/tokens", { headers: { "x-forwarded-for": "9.9.9.9" } }),
      );
    }
    expect(last!.status).toBe(429);
    expect(((await last!.json()) as { error: string }).error).toBe("too_many_requests");
  });

  it("POST rejects bad address with 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: "nope" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST saves a good token", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        name: "LucePad",
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocked.saveToken).toHaveBeenCalledTimes(1);
  });

  it("POST forwards artwork image to saveToken", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        name: "Art",
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
        image: "https://example.test/art.png",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocked.saveToken).toHaveBeenCalledWith(expect.objectContaining({ image: "https://example.test/art.png" }));
  });

  it("POST rejects invalid tx with 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mockedVerify.verifyEvmTx.mockResolvedValue(false);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_tx");
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("POST rejects missing txHash with 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        creator: "0x1111111111111111111111111111111111111111",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });
  it("POST returns db_offline when unconfigured", async () => {
    mocked.isDbConfigured.mockReturnValue(false);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: "0x097716e767df17605627def0030110f8ee559ec4" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it("GET returns db_offline when listTokens throws", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.listTokens.mockRejectedValue(new Error("down"));
    const res = await GET();
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("db_offline");
  });

  it("POST returns db_offline when saveToken throws", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockRejectedValue(new Error("down"));
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("db_offline");
  });

  it("POST rejects null and non-object JSON with 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    for (const raw of ["null", "[]", '"hi"', "5"]) {
      const req = new Request("http://x/api/community/tokens", { method: "POST", body: raw });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("bad_request");
    }
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("POST imports clean in node env without window (server regression)", async () => {
    expect(typeof window).toBe("undefined");
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("POST forwards EVM creator and rejects mismatch with invalid_tx", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const victim = "0x2222222222222222222222222222222222222222";
    mockedVerify.verifyEvmTx.mockImplementation(async (_c, _a, _h, expectedFrom?: string) =>
      expectedFrom?.toLowerCase() === victim.toLowerCase() ? false : true,
    );
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR, txHash: EVM_HASH, creator: victim }),
    });
    const res = await POST(req);
    expect(mockedVerify.verifyEvmTx).toHaveBeenCalledWith(4663, EVM_ADDR, EVM_HASH, victim);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_tx");
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("POST accepts EVM creator match", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const creator = "0x1111111111111111111111111111111111111111";
    mockedVerify.verifyEvmTx.mockResolvedValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR, txHash: EVM_HASH, creator }),
    });
    const res = await POST(req);
    expect(mockedVerify.verifyEvmTx).toHaveBeenCalledWith(4663, EVM_ADDR, EVM_HASH, creator);
    expect(res.status).toBe(200);
  });

  it("POST ignores unknown fields (not stored)", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
        evil: "x".repeat(5000),
        foo: 1,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocked.saveToken).toHaveBeenCalledTimes(1);
    const saved = mocked.saveToken.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(saved).not.toHaveProperty("evil");
    expect(saved).not.toHaveProperty("foo");
  });

  it("POST survives 5MB JSON without crash (slices, validates)", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const big = "n".repeat(5 * 1024 * 1024);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
        name: big,
      }),
    });
    const res = await POST(req);
    expect([200, 400]).toContain(res.status);
  });

  it("POST maps empty body and broken JSON syntax to 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    for (const raw of ["", "{bad", '{"chainId":}']) {
      const req = new Request("http://x/api/community/tokens", { method: "POST", body: raw });
      const res = await POST(req);
      expect(res.status).toBe(400);
    }
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("ADVERSARIAL: POST rejects solana squat with empty creator (creator required)", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "solana-devnet",
        address: "Mint111111111111111111111111111111111111",
        txHash: "5".repeat(88),
        creator: "",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("ADVERSARIAL: POST rejects solana squat with malformed creator", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "solana-devnet",
        address: "Mint111111111111111111111111111111111111",
        txHash: "5".repeat(88),
        creator: "not-a-valid-key!!",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("ADVERSARIAL: POST rejects EVM squat with empty creator (creator required)", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR, txHash: EVM_HASH, creator: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("ADVERSARIAL: POST rejects EVM squat with malformed creator", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR, txHash: EVM_HASH, creator: "0x123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });
  it("ADVERSARIAL REPLAY: same valid showcase POST twice overwrites via upsert (both 200, no dup rows)", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const body = {
      chainId: "4663",
      address: EVM_ADDR,
      txHash: EVM_HASH,
      creator: "0x1111111111111111111111111111111111111111",
    };
    const req1 = new Request("http://x/api/community/tokens", { method: "POST", body: JSON.stringify(body) });
    const req2 = new Request("http://x/api/community/tokens", { method: "POST", body: JSON.stringify(body) });
    expect((await POST(req1)).status).toBe(200);
    expect((await POST(req2)).status).toBe(200);
    expect(mocked.saveToken).toHaveBeenCalledTimes(2);
  });

  it("POST accepts numeric chainId 4663 (number) same as string, no 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mocked.saveToken.mockResolvedValue(undefined);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: 4663,
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockedVerify.verifyEvmTx).toHaveBeenCalledWith(
      4663,
      EVM_ADDR,
      EVM_HASH,
      "0x1111111111111111111111111111111111111111",
    );
  });

  it("POST forwards Solana creator and rejects mismatch with invalid_tx", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const mint = "Mint111111111111111111111111111111111111";
    const victimCreator = "Creator11111111111111111111111111111111";
    mockedVerify.verifySolanaTx.mockImplementation(async (_r, _m, _s, expected?: string) =>
      expected === victimCreator ? false : true,
    );
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "solana-devnet",
        address: mint,
        txHash: "5".repeat(88),
        creator: victimCreator,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_tx");
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("rejects oversized raw body >64KB before parse (JSON bomb guard)", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const evil = "x".repeat(70 * 1024);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
        evil,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("bad_request");
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });

  it("rejects lying Content-Length >64KB without verify RPC", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      headers: { "content-length": String(200 * 1024) },
      body: JSON.stringify({
        chainId: "4663",
        address: EVM_ADDR,
        txHash: EVM_HASH,
        creator: "0x1111111111111111111111111111111111111111",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockedVerify.verifyEvmTx).not.toHaveBeenCalled();
    expect(mocked.saveToken).not.toHaveBeenCalled();
  });
});
