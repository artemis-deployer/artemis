import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return { ...actual, Connection: vi.fn() };
});

import { Connection } from "@solana/web3.js";
import {
  buildMetadata,
  buildTradePayload,
  confirmTx,
  decodeTxResponse,
  inspectTxSize,
  mapPumpError,
  PUMP_FEE_SOL,
  PUMP_POOL,
  PUMP_PRIORITY_FEE,
  PUMP_SLIPPAGE,
  signAndSend,
  uploadMetadata,
  validateTxBytes,
} from "../lib/launcher-solana";

const MockConnection = vi.mocked(Connection);

describe("buildMetadata", () => {
  it("builds pump metadata json", () => {
    const m = buildMetadata({ name: "Kopi", symbol: "KOPI", description: "d" });
    expect(m).toMatchObject({ name: "Kopi", symbol: "KOPI", description: "d" });
  });

  it("rejects blank name or symbol", () => {
    expect(() => buildMetadata({ name: "", symbol: "X", description: "" })).toThrow();
    expect(() => buildMetadata({ name: "X", symbol: "", description: "" })).toThrow();
  });
});

describe("buildTradePayload", () => {
  it("shapes a create payload for trade-local", () => {
    const p = buildTradePayload({
      publicKey: "11111111111111111111111111111111",
      mint: "22222222222222222222222222222222222222222222",
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    expect(p).toMatchObject({ action: "create", pool: "pump", denominatedInSol: "true" });
    expect(p.slippage).toBeGreaterThan(0);
    expect(p.tokenMetadata).toMatchObject({
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
    });
  });
});

describe("mapPumpError", () => {
  it("maps network failure to offline", () => {
    expect(mapPumpError(new Error("fetch failed"))).toBe("pump_offline");
  });

  it("passes through explicit codes", () => {
    expect(mapPumpError(new Error("pump_rejected: nope"))).toBe("pump_rejected: nope");
  });
});

describe("pump constants", () => {
  it("exports expected values", () => {
    expect(PUMP_SLIPPAGE).toBe(10);
    expect(PUMP_PRIORITY_FEE).toBe(0.0005);
    expect(PUMP_POOL).toBe("pump");
    expect(PUMP_FEE_SOL).toBe(0.02);
  });

  it("uses constants in trade payload", () => {
    const p = buildTradePayload({
      publicKey: "11111111111111111111111111111111",
      mint: "22222222222222222222222222222222222222222222",
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    expect(p.slippage).toBe(PUMP_SLIPPAGE);
    expect(p.priorityFee).toBe(PUMP_PRIORITY_FEE);
    expect(p.pool).toBe(PUMP_POOL);
  });
});

describe("inspectTxSize", () => {
  it("decodes valid base64 to byte length", () => {
    expect(inspectTxSize("aGk=")).toBe(2);
  });

  it("throws on invalid input", () => {
    expect(() => inspectTxSize("!!!")).toThrow("pump_rejected: bad tx bytes");
  });
});

describe("validateTxBytes", () => {
  it("throws on empty serialize output", () => {
    const tx = { serialize: () => new Uint8Array(0), message: { accountKeys: ["k"] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateTxBytes(tx as any)).toThrow("pump_rejected: empty tx bytes");
  });

  it("throws on empty account keys", () => {
    const tx = { serialize: () => new Uint8Array([1, 2]), message: { accountKeys: [] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateTxBytes(tx as any)).toThrow("pump_rejected: empty tx bytes");
  });

  it("passes for non-empty tx if constructible else skips", () => {
    const tx = { serialize: () => new Uint8Array([1, 2]), message: { accountKeys: ["k"] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateTxBytes(tx as any)).not.toThrow();
  });
});

describe("pump pin route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploadMetadata throws pump_offline on network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" })).rejects.toThrow(
      "pump_offline",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uploadMetadata returns pinned uri", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uri: "https://ipfs.io/ipfs/bafytest" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" }),
    ).resolves.toBe("https://ipfs.io/ipfs/bafytest");
    const [, init] = fetchMock.mock.calls[0] as [string, { body?: string }];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/pump-metadata");
    expect(JSON.parse(init.body ?? "{}")).toMatchObject({ name: "Kopi" });
  });

  it("uploadMetadata rejects pin failures", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 502 });
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" })).rejects.toThrow(
      "pump_rejected: metadata pin failed",
    );
  });
});

describe("signAndSend / confirmTx error paths", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it("propagates wallet sign rejection (user cancel) to caller", async () => {
    MockConnection.mockImplementation(function (this: unknown) {
      return { getLatestBlockhash: async () => ({ blockhash: "B".repeat(44) }), sendRawTransaction: async () => "sig" };
    } as never);
    const { Keypair, VersionedTransaction, TransactionMessage } = await import("@solana/web3.js");
    const mintKp = Keypair.generate();
    const message = new TransactionMessage({
      payerKey: mintKp.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [],
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    const wallet = {
      publicKey: { toBase58: () => mintKp.publicKey.toBase58() },
      signTransaction: async () => {
        throw new Error("User rejected the request");
      },
    };
    await expect(
      signAndSend({ rpc: "https://rpc.test", tx, mintSecret: mintKp.secretKey, wallet }),
    ).rejects.toThrow("User rejected the request");
  });
  it("confirmTx throws tx_failed on error value, propagates RPC throw (dropped sig)", async () => {
    MockConnection.mockImplementation(function (this: unknown) {
      return { confirmTransaction: async () => ({ value: { err: {} } }) };
    } as never);
    await expect(confirmTx("https://rpc.test", "sig")).rejects.toThrow("tx_failed");
    MockConnection.mockImplementation(function (this: unknown) {
      return {
        confirmTransaction: async () => {
          throw new Error("Transaction was not confirmed");
        },
      };
    } as never);
    await expect(confirmTx("https://rpc.test", "sig")).rejects.toThrow("Transaction was not confirmed");
  });
});

describe("decodeTxResponse", () => {
  function encodeJson(v: unknown): ArrayBuffer {
    return new TextEncoder().encode(JSON.stringify(v)).buffer;
  }

  it("decodes a live-shaped JSON base58 array into a transaction", async () => {
    const { Keypair, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const payer = Keypair.generate().publicKey;
    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [],
    }).compileToV0Message();
    const bytes = new VersionedTransaction(message).serialize();
    const tx = decodeTxResponse(encodeJson([bs58.encode(bytes)]));
    expect(tx.serialize().length).toBe(bytes.length);
  });

  it("rejects empty arrays", () => {
    expect(() => decodeTxResponse(encodeJson([]))).toThrow("pump_rejected: empty tx bytes");
  });

  it("rejects undecodable payloads", () => {
    expect(() => decodeTxResponse(encodeJson(["!!!"]))).toThrow("pump_rejected: bad tx bytes");
    expect(() => decodeTxResponse(new Uint8Array([0, 1, 2]).buffer)).toThrow(
      "pump_rejected: bad tx bytes",
    );
  });
});
