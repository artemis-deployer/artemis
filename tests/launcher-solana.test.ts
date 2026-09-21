import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return { ...actual, Connection: vi.fn() };
});

import { Connection } from "@solana/web3.js";
import {
  buildCreateTx,
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

  it("locks full PumpPortal contract: each field once, no flat leakage", () => {
    const p = buildTradePayload({
      publicKey: "11111111111111111111111111111111",
      mint: "22222222222222222222222222222222222222222222",
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    expect(p.action).toBe("create");
    expect(p.publicKey).toBe("11111111111111111111111111111111");
    expect(p.mint).toBe("22222222222222222222222222222222222222222222");
    expect(p.denominatedInSol).toBe("true");
    expect(typeof p.denominatedInSol).toBe("string");
    expect(p.amount).toBe(0.1);
    expect(p.slippage).toBe(PUMP_SLIPPAGE);
    expect(p.priorityFee).toBe(PUMP_PRIORITY_FEE);
    expect(p.pool).toBe(PUMP_POOL);
    expect(p.tokenMetadata).toEqual({ name: "Kopi", symbol: "KOPI", uri: "https://example.test/m.json" });
    expect(Object.keys(p).sort()).toEqual(
      ["action", "amount", "denominatedInSol", "mint", "pool", "priorityFee", "publicKey", "slippage", "tokenMetadata"].sort(),
    );
    expect(p).not.toHaveProperty("name");
    expect(p).not.toHaveProperty("symbol");
    expect(p).not.toHaveProperty("uri");
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

  it("uploadMetadata maps 429 throttle to offline, 400 to rejected (distinct)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 429 }));
    await expect(uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" })).rejects.toThrow(
      "pump_offline",
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 400 }));
    await expect(uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" })).rejects.toThrow(
      "pump_rejected",
    );
  });

  it("uploadMetadata rejects bad pin JSON and missing uri", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("bad json"); } }));
    await expect(uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" })).rejects.toThrow(
      "pump_rejected: bad pin response",
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) }));
    await expect(uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" })).rejects.toThrow(
      "pump_rejected: no metadata uri",
    );
  });

  it("uploadMetadata forwards imageData for uploaded artwork", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uri: "https://ipfs.io/ipfs/bafytest" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" }, "data:image/png;base64,aGk="),
    ).resolves.toBe("https://ipfs.io/ipfs/bafytest");
    const [, init] = fetchMock.mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(init.body ?? "{}")).toMatchObject({ imageData: "data:image/png;base64,aGk=" });
  });
});

describe("buildCreateTx", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts single-element array payload, no flat leakage", async () => {
    const { Keypair, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const payer = Keypair.generate().publicKey;
    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [],
    }).compileToV0Message();
    const bytes = new VersionedTransaction(message).serialize();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(JSON.stringify([bs58.encode(bytes)])).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);
    const payload = buildTradePayload({
      publicKey: payer.toBase58(),
      mint: Keypair.generate().publicKey.toBase58(),
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    const tx = await buildCreateTx(payload);
    expect(tx.serialize().length).toBe(bytes.length);
    const [url, init] = fetchMock.mock.calls[0] as [string, { body?: string }];
    expect(url).toBe("https://pumpportal.fun/api/trade-local");
    const body = JSON.parse(init.body ?? "");
    expect(Array.isArray(body) && body.length).toBe(1);
    expect(body[0]).toMatchObject({ action: "create", pool: "pump", denominatedInSol: "true" });
    expect(body[0]).not.toHaveProperty("name");
    expect(body[0]).not.toHaveProperty("symbol");
    expect(body[0]).not.toHaveProperty("uri");
  });

  it("maps offline vs rejected distinctly", async () => {
    const payload = buildTradePayload({
      publicKey: "11111111111111111111111111111111",
      mint: "22222222222222222222222222222222222222222222",
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(buildCreateTx(payload)).rejects.toThrow("pump_offline");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }));
    await expect(buildCreateTx(payload)).rejects.toThrow("pump_rejected: trade-local failed");
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

describe("devnet SPL drill mint", () => {
describe("devnet SPL drill mint", () => {
  it("mints the 1B fixed supply", async () => {
    const { splMintAmount, SPL_DECIMALS, SPL_MINT_SPACE } = await import("../lib/launcher-solana");
    expect(splMintAmount()).toBe(1000000000n * 10n ** BigInt(SPL_DECIMALS));
    expect(SPL_MINT_SPACE).toBe(82);
  });

  it("builds 5 well-formed drill instructions", async () => {
    const { Keypair, SystemProgram } = await import("@solana/web3.js");
    const { buildSplMintInstructions, findSplAta, splMintAmount, SPL_TOKEN_PROGRAM_ID } = await import(
      "../lib/launcher-solana"
    );
    const payer = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const ata = findSplAta(mint, payer);
    expect(ata.equals(payer)).toBe(false);
    expect(findSplAta(mint, payer).toBase58()).toBe(ata.toBase58());
    const ixs = buildSplMintInstructions({ payer, mint, ata, mintLamports: 1461600, amount: splMintAmount() });
    expect(ixs.length).toBe(5);
    expect(ixs[0].programId.toBase58()).toBe(SystemProgram.programId.toBase58());
    expect(ixs[2].programId.toBase58()).toBe("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    for (const ix of [ixs[1], ixs[3], ixs[4]]) expect(ix.programId.toBase58()).toBe(SPL_TOKEN_PROGRAM_ID);
    expect(ixs[2].keys[0].pubkey.toBase58()).toBe(payer.toBase58());
    const mintTo = ixs[3].data as Uint8Array;
    expect(mintTo[0]).toBe(7);
    const setAuth = ixs[4].data as Uint8Array;
    expect(Array.from(setAuth)).toEqual([6, 0, 0]);
  });

  it("round-trips an unsigned drill transaction", async () => {
    const { Keypair, VersionedTransaction } = await import("@solana/web3.js");
    const { buildSplMintTx, findSplAta, splMintAmount } = await import("../lib/launcher-solana");
    const payer = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const tx = buildSplMintTx({
      payer,
      mint,
      ata: findSplAta(mint, payer),
      mintLamports: 1461600,
      amount: splMintAmount(),
    });
    const back = VersionedTransaction.deserialize(tx.serialize());
    expect(back.serialize().length).toBe(tx.serialize().length);
  });

  it("rejects bad decimals and overflowing amounts", async () => {
    const { Keypair } = await import("@solana/web3.js");
    const { buildSplMintInstructions, findSplAta } = await import("../lib/launcher-solana");
    const payer = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const ata = findSplAta(mint, payer);
    expect(() => buildSplMintInstructions({ payer, mint, ata, mintLamports: 1, amount: 1n, decimals: 10 })).toThrow();
    expect(() =>
      buildSplMintInstructions({ payer, mint, ata, mintLamports: 1, amount: 2n ** 64n, decimals: 9 }),
    ).toThrow();
  });
});
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

  it("decodes legacy base64 text into a transaction", async () => {
    const { Keypair, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
    const payer = Keypair.generate().publicKey;
    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [],
    }).compileToV0Message();
    const bytes = new VersionedTransaction(message).serialize();
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    const b64 = btoa(bin);
    const tx = decodeTxResponse(new TextEncoder().encode(b64).buffer);
    expect(tx.serialize().length).toBe(bytes.length);
  });

  it("decodes raw bytes into a transaction", async () => {
    const { Keypair, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
    const payer = Keypair.generate().publicKey;
    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [],
    }).compileToV0Message();
    const bytes = new VersionedTransaction(message).serialize();
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const tx = decodeTxResponse(copy.buffer);
    expect(tx.serialize().length).toBe(bytes.length);
  });

  it("rejects empty arrays", () => {
    expect(() => decodeTxResponse(encodeJson([]))).toThrow("pump_rejected: empty tx bytes");
  });

  it("rejects malformed JSON, non-string array entries, empty string entries", () => {
    expect(() => decodeTxResponse(new TextEncoder().encode("[bad").buffer)).toThrow(
      "pump_rejected: bad tx bytes",
    );
    expect(() => decodeTxResponse(encodeJson([123]))).toThrow("pump_rejected: empty tx bytes");
    expect(() => decodeTxResponse(encodeJson([""]))).toThrow("pump_rejected: empty tx bytes");
    expect(() => decodeTxResponse(new TextEncoder().encode("").buffer)).toThrow();
  });

  it("rejects undecodable payloads", () => {
    expect(() => decodeTxResponse(encodeJson(["!!!"]))).toThrow("pump_rejected: bad tx bytes");
    expect(() => decodeTxResponse(new Uint8Array([0, 1, 2]).buffer)).toThrow(
      "pump_rejected: bad tx bytes",
    );
  });
});
