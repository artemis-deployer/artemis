import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";
import {
  extractVerifiedHandle,
  isTestnetChain,
  isProofTimestampFresh,
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
    expect(extractVerifiedHandle({ id: "12345", screen_name: "Artemis" })).toBe("artemis");
  });
  it("skips ids, urls, sentences", () => {
    expect(extractVerifiedHandle({ a: "123", b: "https://x.com", c: "two words" })).toBeNull();
  });
  it("rejects non-objects", () => {
    expect(extractVerifiedHandle(null)).toBeNull();
    expect(extractVerifiedHandle([])).toBeNull();
  });
  it("rejects ambiguous verified username fields", () => {
    expect(extractVerifiedHandle({ username: "one", screen_name: "two" })).toBeNull();
  });
});

describe("proof parsing", () => {
  it("reads session id", () => {
    expect(proofSessionId({ sessionId: "abc" })).toBe("abc");
    expect(proofSessionId({ claimData: { context: JSON.stringify({ reclaimSessionId: "sdk-session" }) } })).toBe("sdk-session");
    expect(proofSessionId([{ claimData: { context: JSON.stringify({ reclaimSessionId: "sdk-session" }) } }])).toBe("sdk-session");
    expect(proofSessionId({})).toBeNull();
    expect(proofSessionId([{ sessionId: "one" }, { sessionId: "two" }])).toBeNull();
  });
  it("converts timestampS to ms", () => {
    expect(proofTimestampMs({ claimData: { timestampS: 1000 } })).toBe(1000000);
    expect(proofTimestampMs({ claimData: { timestampS: "1000" } })).toBe(1000000);
    expect(proofTimestampMs({})).toBeNull();
  });
  it("parses string or object context", () => {
    expect(proofContext({ claimData: { context: '{"address":"0x1","message":{}}' } })).toEqual({ address: "0x1", message: {}, sessionId: "" });
    expect(proofContext({ claimData: { context: { address: "0x1", message: {} } } })).toEqual({ address: "0x1", message: {}, sessionId: "" });
    expect(proofContext({ claimData: { context: "nope{" } })).toBeNull();
  });
  it("normalizes the current Reclaim context shape", () => {
    expect(proofContext({ claimData: { context: JSON.stringify({
      contextAddress: "0xabc",
      contextMessage: JSON.stringify({ nonce: "n1" }),
      reclaimSessionId: "session-1",
    }) } })).toEqual({ address: "0xabc", message: { nonce: "n1" }, sessionId: "session-1" });
  });
  it("pins TTL constants", () => {
    expect(ZK_NONCE_TTL_MS).toBe(5 * 60 * 1000);
    expect(ZK_PROOF_TTL_MS).toBe(10 * 60 * 1000);
  });
  it("rejects future proof timestamps outside clock skew", () => {
    expect(isProofTimestampFresh(1_000_000, 1_000_000)).toBe(true);
    expect(isProofTimestampFresh(1_000_000 + 30_001, 1_000_000)).toBe(false);
    expect(isProofTimestampFresh(1_000_000 - ZK_PROOF_TTL_MS - 1, 1_000_000)).toBe(false);
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
  it("routes report zk_disabled when the feature flag is off", async () => {
    vi.stubEnv("ZK_VERIFY_ENABLED", "");
    const { POST } = await import("../app/api/zk/nonce/route");
    const res = await POST(new Request("http://x/api/zk/nonce", { method: "POST", body: JSON.stringify({ wallet: "nope" }) }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("zk_disabled");
    vi.unstubAllEnvs();
  });

  it("nonce rejects bad wallet before touching db", async () => {
    vi.stubEnv("ZK_VERIFY_ENABLED", "1");
    vi.stubEnv("DATABASE_URL", "");
    const { POST } = await import("../app/api/zk/nonce/route");
    const res = await POST(new Request("http://x/api/zk/nonce", { method: "POST", body: JSON.stringify({ wallet: "nope" }) }));
    expect(res.status).toBe(400);
    vi.unstubAllEnvs();
  });

  // Heavy Reclaim SDK import: generous timeout under full-suite load.
  it("init reports zk_offline without Reclaim creds", async () => {
    vi.stubEnv("ZK_VERIFY_ENABLED", "1");
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
  }, 30000);
});
