import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";
import {
  extractHandle,
  isTestnetChain,
  normalizeHandle,
  proofContext,
  proofSessionId,
  proofTimestampMs,
  verifyEvmSigner,
  verifySolanaSigner,
  zkSignMessage,
  ZK_NONCE_TTL_MS,
  ZK_PROOF_TTL_MS,
} from "../lib/zk";

describe("normalizeHandle", () => {
  it("strips @ and lowercases", () => {
    expect(normalizeHandle("@Artemis")).toBe("artemis");
    expect(normalizeHandle("a_b9")).toBe("a_b9");
  });
  it("rejects garbage", () => {
    expect(normalizeHandle("")).toBeNull();
    expect(normalizeHandle("has space")).toBeNull();
    expect(normalizeHandle("waytoolonghandle12345")).toBeNull();
    expect(normalizeHandle(123)).toBeNull();
  });
});

describe("extractHandle", () => {
  it("prefers username-ish keys", () => {
    const proof = { claimData: { parameters: { id: "12345", screen_name: "Artemis" } } };
    expect(extractHandle(proof)).toBe("artemis");
  });
  it("skips ids, urls, sentences", () => {
    const proof = { claimData: { parameters: { a: "123", b: "https://x.com", c: "two words" } } };
    expect(extractHandle(proof)).toBeNull();
  });
  it("rejects non-objects", () => {
    expect(extractHandle(null)).toBeNull();
    expect(extractHandle({ claimData: { parameters: [] } })).toBeNull();
  });
});

describe("proof parsing", () => {
  it("reads session id", () => {
    expect(proofSessionId({ sessionId: "abc" })).toBe("abc");
    expect(proofSessionId({})).toBeNull();
  });
  it("converts timestampS to ms", () => {
    expect(proofTimestampMs({ claimData: { timestampS: 1000 } })).toBe(1000000);
    expect(proofTimestampMs({ claimData: { timestampS: "1000" } })).toBe(1000000);
    expect(proofTimestampMs({})).toBeNull();
  });
  it("parses string or object context", () => {
    expect(proofContext({ claimData: { context: '{"address":"0x1"}' } })).toEqual({ address: "0x1" });
    expect(proofContext({ claimData: { context: { address: "0x1" } } })).toEqual({ address: "0x1" });
    expect(proofContext({ claimData: { context: "nope{" } })).toBeNull();
  });
  it("pins TTL constants", () => {
    expect(ZK_NONCE_TTL_MS).toBe(5 * 60 * 1000);
    expect(ZK_PROOF_TTL_MS).toBe(10 * 60 * 1000);
  });
});

describe("wallet signers", () => {
  it("verifies an EVM signature round-trip", async () => {
    const account = privateKeyToAccount("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const nonce = "abc123";
    const sig = await account.signMessage({ message: zkSignMessage(nonce) });
    expect(await verifyEvmSigner(account.address, sig, nonce)).toBe(true);
    expect(await verifyEvmSigner(account.address, sig, "other")).toBe(false);
    expect(await verifyEvmSigner("0x123", sig, nonce)).toBe(false);
  });

  it("verifies a Solana signature round-trip", () => {
    const priv = randomBytes(32);
    const pub = ed25519.getPublicKey(priv);
    const wallet = bs58.encode(pub);
    const sig = bs58.encode(ed25519.sign(new TextEncoder().encode(zkSignMessage("n1")), priv));
    expect(verifySolanaSigner(wallet, sig, "n1")).toBe(true);
    expect(verifySolanaSigner(wallet, sig, "n2")).toBe(false);
    expect(verifySolanaSigner("bad", sig, "n1")).toBe(false);
  });
});

describe("isTestnetChain", () => {
  it("flags testnets", () => {
    expect(isTestnetChain("46630")).toBe(true);
    expect(isTestnetChain("solana-devnet")).toBe(true);
    expect(isTestnetChain("4663")).toBe(false);
    expect(isTestnetChain("solana-mainnet")).toBe(false);
  });
});

describe("zk routes without creds or db", () => {
  it("nonce rejects bad wallet before touching db", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { POST } = await import("../app/api/zk/nonce/route");
    const res = await POST(new Request("http://x/api/zk/nonce", { method: "POST", body: JSON.stringify({ wallet: "nope" }) }));
    expect(res.status).toBe(400);
    vi.unstubAllEnvs();
  });

  it("init reports zk_offline without Reclaim creds", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("RECLAIM_APP_ID", "");
    vi.stubEnv("RECLAIM_APP_SECRET", "");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "");
    const { POST } = await import("../app/api/zk/init/route");
    const res = await POST(
      new Request("http://x/api/zk/init", {
        method: "POST",
        body: JSON.stringify({ wallet: "0x0000000000000000000000000000000000000001", signature: "0x00", nonce: "n" }),
      }),
    );
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("zk_offline");
    vi.unstubAllEnvs();
  });
});
