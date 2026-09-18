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
    mocked.listTokens.mockResolvedValue([{ chain_id: "4663", address: "0xabc", creator: "", name: "X", symbol: "", pool: "", tx_hash: "", created_at: "" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { tokens: unknown[] }).tokens).toHaveLength(1);
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
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR, name: "LucePad", txHash: EVM_HASH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocked.saveToken).toHaveBeenCalledTimes(1);
  });

  it("POST rejects invalid tx with 400", async () => {
    mocked.isDbConfigured.mockReturnValue(true);
    mockedVerify.verifyEvmTx.mockResolvedValue(false);
    const req = new Request("http://x/api/community/tokens", {
      method: "POST",
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR, txHash: EVM_HASH }),
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
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR }),
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
      body: JSON.stringify({ chainId: "4663", address: EVM_ADDR, txHash: EVM_HASH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("db_offline");
  });
});
