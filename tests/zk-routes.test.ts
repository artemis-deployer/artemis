import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/zk-db", () => ({
  consumeNonce: vi.fn(),
  saveNonce: vi.fn(),
  saveSession: vi.fn(),
  getSession: vi.fn(),
  markSession: vi.fn(),
  saveVerification: vi.fn(),
  getTokenBadge: vi.fn(),
  getProof: vi.fn(),
  getVerificationBySession: vi.fn(),
  countHandleTokens: vi.fn().mockResolvedValue(0),
  getZkMetrics: vi.fn(),
  revokeVerification: vi.fn(),
}));

vi.mock("@reclaimprotocol/js-sdk", () => ({
  ReclaimProofRequest: { init: vi.fn() },
  verifyProof: vi.fn(),
}));

import {
  consumeNonce,
  countHandleTokens,
  getProof,
  getSession,
  getTokenBadge,
  markSession,
  revokeVerification,
  saveSession,
  saveVerification,
  getVerificationBySession,
} from "../lib/zk-db";
import { ReclaimProofRequest, verifyProof } from "@reclaimprotocol/js-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { clearRateLimits } from "../lib/rate-limit";
import { POST as noncePOST } from "../app/api/zk/nonce/route";
import { POST as initPOST } from "../app/api/zk/init/route";
import { POST as callbackPOST } from "../app/api/zk/callback/route";
import { POST as reverifyPOST } from "../app/api/zk/reverify/route";
import { GET as metricsGET } from "../app/api/zk/metrics/route";
import { GET as statusGET } from "../app/api/zk/status/route";
import { GET as tokenGET } from "../app/api/zk/token/[chainId]/[address]/route";
import { GET as proofGET } from "../app/api/zk/proof/[id]/route";
import { POST as revokePOST } from "../app/api/zk/revoke/route";
import { GET as configGET } from "../app/api/zk/config/route";
import { zkSignMessage } from "../lib/zk";

const mocked = {
  consumeNonce: vi.mocked(consumeNonce),
  saveSession: vi.mocked(saveSession),
  getSession: vi.mocked(getSession),
  markSession: vi.mocked(markSession),
  saveVerification: vi.mocked(saveVerification),
  getTokenBadge: vi.mocked(getTokenBadge),
  getProof: vi.mocked(getProof),
  getVerificationBySession: vi.mocked(getVerificationBySession),
  revokeVerification: vi.mocked(revokeVerification),
  verifyProof: vi.mocked(verifyProof),
};

const EVM = "0x0000000000000000000000000000000000000001";

function sessionRow(status: string) {
  return {
    session_id: "sess-1",
    wallet: EVM,
    token: "",
    chain_id: "",
    nonce: "n1",
    expected_handle: "",
    provider_config: { providerId: "provider-x", providerVersion: "1.2.3", allowedTags: [] },
    status,
    fail_reason: "",
    created_at: "",
  };
}

function verifiedProofData(options: {
  address?: string;
  message?: Record<string, unknown>;
  sessionId?: string;
  parameters?: Record<string, string>;
} = {}) {
  return {
    isVerified: true,
    isTeeAttestationVerified: true,
    isAttestorTeeAttestationVerified: true,
    data: [{
      context: {
        contextAddress: options.address ?? EVM,
        contextMessage: JSON.stringify(options.message ?? { app: "artemis", nonce: "n1" }),
        reclaimSessionId: options.sessionId ?? "sess-1",
      },
      extractedParameters: options.parameters ?? { username: "Artemis" },
    }],
  };
}

describe("zk routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearRateLimits();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("ZK_VERIFY_ENABLED", "1");
    vi.stubEnv("ZK_VERIFY_UI_ENABLED", "");
    vi.stubEnv("ZK_BADGE_PUBLIC", "");
    vi.stubEnv("ZK_LANDING_SECTION", "");
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "");
    vi.stubEnv("ZK_ADMIN_TOKEN", "admin-token");
    vi.stubEnv("RECLAIM_APP_ID", "");
    vi.stubEnv("RECLAIM_APP_SECRET", "");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "");
  });

  it("nonce rejects non-wallets", async () => {
    const res = await noncePOST(new Request("http://x/api/zk/nonce", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("init rejects malformed wallets before any secret use", async () => {
    const res = await initPOST(
      new Request("http://x/api/zk/init", { method: "POST", body: JSON.stringify({ wallet: "nope" }) }),
    );
    expect(res.status).toBe(400);
  });

  it("init reports zk_offline without creds (secret never leaves server)", async () => {
    const res = await initPOST(
      new Request("http://x/api/zk/init", {
        method: "POST",
        body: JSON.stringify({ wallet: EVM, signature: "0x00", nonce: "n" }),
      }),
    );
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe("zk_offline");
  });

  it("callback rejects unknown sessions", async () => {
    mocked.getSession.mockResolvedValue(null);
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify({ sessionId: "ghost" }) }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("unknown_or_used_session");
  });

  it("callback rejects replayed (non-pending) sessions", async () => {
    mocked.getSession.mockResolvedValue(sessionRow("verified") as never);
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify({ sessionId: "sess-1" }) }),
    );
    expect(res.status).toBe(400);
    expect(mocked.markSession).not.toHaveBeenCalled();
    expect(mocked.saveVerification).not.toHaveBeenCalled();
  });

  it("callback verifies a full proof and stores the handle", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue(verifiedProofData() as never);
    const proof = {
      sessionId: "sess-1",
      claimData: {
        context: JSON.stringify({ contextAddress: EVM, contextMessage: JSON.stringify({ app: "artemis", nonce: "n1" }), reclaimSessionId: "sess-1" }),
        timestampS: Math.floor(Date.now() / 1000),
        parameters: JSON.stringify({ username: "UntrustedRawValue" }),
      },
    };
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify([proof]) }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; handle: string };
    expect(json).toMatchObject({ ok: true, handle: "artemis" });
    expect(mocked.saveVerification).toHaveBeenCalledOnce();
    expect(mocked.verifyProof).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      providerId: "provider-x", providerVersion: "1.2.3", allowedTags: [],
      teeAttestation: { appSecret: "0xsecret" },
      attestorTeeAttestation: {},
    }));
  });

  it("issues a TEE-enabled request and persists its exact Reclaim provider version", async () => {
    const account = privateKeyToAccount(`0x${"12".repeat(32)}`);
    const signature = await account.signMessage({ message: zkSignMessage("n1") });
    vi.stubEnv("RECLAIM_APP_ID", "app-id");
    vi.stubEnv("RECLAIM_APP_SECRET", "server-only-secret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.consumeNonce.mockResolvedValue(true);
    vi.mocked(ReclaimProofRequest.init).mockResolvedValue({
      setContext: vi.fn(),
      setAppCallbackUrl: vi.fn(),
      getSessionId: () => "reclaim-session-1",
      getProviderVersion: () => ({ providerId: "provider-x", providerVersion: "4.2.1", allowedTags: [] }),
      toJsonString: () => "{\"safe\":true}",
    } as never);

    const res = await initPOST(new Request("http://x/api/zk/init", {
      method: "POST",
      body: JSON.stringify({ wallet: account.address, signature, nonce: "n1" }),
    }));

    expect(res.status).toBe(200);
    const responseBody = await res.json();
    expect(responseBody).toEqual({ config: "{\"safe\":true}", sessionId: "reclaim-session-1" });
    expect(ReclaimProofRequest.init).toHaveBeenCalledWith("app-id", "server-only-secret", "provider-x", { acceptTeeAttestation: true });
    expect(mocked.saveSession).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "reclaim-session-1",
      providerConfig: { providerId: "provider-x", providerVersion: "4.2.1", allowedTags: [] },
    }));
    expect(JSON.stringify(responseBody)).not.toContain("server-only-secret");
  });

  it("callback rejects a proof whose handle differs from the token listing", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue({ ...sessionRow("pending"), token: "0xToken", chain_id: "46630", expected_handle: "listed" } as never);
    mocked.verifyProof.mockResolvedValue(verifiedProofData({
      message: { app: "artemis", nonce: "n1", token: "0xToken", chainId: "46630", expectedHandle: "listed" },
    }) as never);
    const proof = validProof();
    (proof.claimData as { context: string }).context = JSON.stringify({
      address: EVM,
      message: { app: "artemis", nonce: "n1", token: "0xToken", chainId: "46630", expectedHandle: "listed" },
    });
    const res = await callbackPOST(new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify(proof) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "handle_mismatch" });
    expect(mocked.saveVerification).not.toHaveBeenCalled();
  });

  it("requires the listed handle when starting a token-bound proof", async () => {
    vi.stubEnv("RECLAIM_APP_ID", "app");
    vi.stubEnv("RECLAIM_APP_SECRET", "secret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider");
    mocked.consumeNonce.mockResolvedValue(true);
    const res = await initPOST(new Request("http://x/api/zk/init", {
      method: "POST",
      body: JSON.stringify({ wallet: EVM, signature: "0x00", nonce: "n1", token: "0xToken", chainId: "46630", txHash: "0x123" }),
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "token_proof_required" });
  });

  it("accepts Solana devnet token claims for the wallet proof stage", async () => {
    vi.stubEnv("RECLAIM_APP_ID", "app");
    vi.stubEnv("RECLAIM_APP_SECRET", "secret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider");
    mocked.consumeNonce.mockResolvedValue(true);
    const res = await initPOST(new Request("http://x/api/zk/init", {
      method: "POST",
      body: JSON.stringify({
        wallet: "So11111111111111111111111111111111111111112", signature: "4".repeat(88), nonce: "n1",
        token: "So11111111111111111111111111111111111111112", chainId: "solana-devnet",
        txHash: "5".repeat(88), expectedHandle: "creator",
      }),
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "wallet_signature_rejected" });
    expect(consumeNonce).toHaveBeenCalledOnce();
  });

  it("rejects a Solana wallet attempting to claim an EVM token", async () => {
    const res = await initPOST(new Request("http://x/api/zk/init", {
      method: "POST",
      body: JSON.stringify({
        wallet: "So11111111111111111111111111111111111111112", signature: "sig", nonce: "n1",
        token: "0x0000000000000000000000000000000000000001", chainId: "46630",
        txHash: `0x${"11".repeat(32)}`, expectedHandle: "creator",
      }),
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "unsupported_wallet" });
    expect(consumeNonce).not.toHaveBeenCalled();
  });

  it("requires the admin bearer token to revoke a verification", async () => {
    const res = await revokePOST(new Request("http://x/api/zk/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "proof-id", reason: "policy violation" }),
    }));
    expect(res.status).toBe(401);
    expect(revokeVerification).not.toHaveBeenCalled();
  });

  it("revokes a proof with a valid admin token and preserves idempotent state", async () => {
    vi.mocked(revokeVerification).mockResolvedValueOnce("revoked");
    const res = await revokePOST(new Request("http://x/api/zk/revoke", {
      method: "POST",
      headers: { authorization: "Bearer admin-token", "content-type": "application/json" },
      body: JSON.stringify({ id: "123e4567-e89b-42d3-a456-426614174000", reason: "policy violation" }),
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "revoked" });
    expect(revokeVerification).toHaveBeenCalledWith("123e4567-e89b-42d3-a456-426614174000", "policy violation");
  });

  it("exposes only server feature flags to the UI", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://database");
    vi.stubEnv("RECLAIM_APP_ID", "app-id");
    vi.stubEnv("RECLAIM_APP_SECRET", "app-secret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    vi.stubEnv("ZK_VERIFY_UI_ENABLED", "1");
    vi.stubEnv("ZK_BADGE_PUBLIC", "true");
    const res = await configGET();
    expect(await res.json()).toMatchObject({ enabled: true, uiEnabled: true, badgePublic: true });
  });

  it("callback rejects wallet-mismatched context", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue(verifiedProofData({ address: "0x0000000000000000000000000000000000000002" }) as never);
    const proof = {
      sessionId: "sess-1",
      claimData: {
        context: JSON.stringify({ address: "0x0000000000000000000000000000000000000002", message: { nonce: "n1" } }),
        timestampS: Math.floor(Date.now() / 1000),
        parameters: { username: "Artemis" },
      },
    };
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify(proof) }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("wallet_mismatch");
    expect(mocked.saveVerification).not.toHaveBeenCalled();
  });

  it("status requires a session id", async () => {
    const res = await statusGET(new Request("http://x/api/zk/status"));
    expect(res.status).toBe(400);
  });

  it("token badge returns null when unverified", async () => {
    mocked.getTokenBadge.mockResolvedValue(null);
    const res = await tokenGET(new Request("http://x/api/zk/token/4663/0xabc"), {
      params: Promise.resolve({ chainId: "4663", address: "0xabc" }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { badge: null }).badge).toBeNull();
  });

  it("reports revoked session status and reason instead of leaving it verified", async () => {
    mocked.getSession.mockResolvedValue(sessionRow("verified") as never);
    mocked.getVerificationBySession.mockResolvedValue({
      id: "proof-1", handle: "creator", wallet: EVM, token: "0xToken", chain_id: "46630",
      session_id: "sess-1", proof_json: {}, verified_at: "2026-09-26T00:00:00Z",
      revoked_at: "2026-09-26T01:00:00Z", revoke_reason: "policy violation",
    } as never);
    const res = await statusGET(new Request("http://x/api/zk/status?session=sess-1"));
    expect(await res.json()).toMatchObject({ status: "revoked", revokeReason: "policy violation" });
  });

  it("keeps a revoked receipt inspectable and marks its public status", async () => {
    vi.stubEnv("ZK_BADGE_PUBLIC", "true");
    mocked.getTokenBadge.mockResolvedValue({
      id: "proof-1", handle: "creator", wallet: EVM, token: "0xToken", chain_id: "46630",
      session_id: "session-1", proof_json: {}, verified_at: "2026-09-26T00:00:00Z",
      revoked_at: "2026-09-26T01:00:00Z", revoke_reason: "policy violation",
    } as never);
    const res = await tokenGET(new Request("http://x/api/zk/token/46630/0xToken"), {
      params: Promise.resolve({ chainId: "46630", address: "0xToken" }),
    });
    expect(await res.json()).toMatchObject({ badge: { revoked: true, revokeReason: "policy violation" } });
  });

  it("proof returns 404 when missing", async () => {
    mocked.getProof.mockResolvedValue(null);
    const res = await proofGET(new Request("http://x/api/zk/proof/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("does not serve raw proof records while public badges are disabled", async () => {
    const res = await proofGET(new Request("http://x/api/zk/proof/proof-1"), {
      params: Promise.resolve({ id: "proof-1" }),
    });
    expect(res.status).toBe(404);
    expect(getProof).not.toHaveBeenCalled();
  });

  it("countHandleTokens is called for spam transparency", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue(verifiedProofData() as never);
    const { countHandleTokens: mockedCount } = await import("../lib/zk-db");
    const proof = {
      sessionId: "sess-1",
      claimData: {
        context: JSON.stringify({ address: EVM, message: { nonce: "n1" } }),
        timestampS: Math.floor(Date.now() / 1000),
        parameters: { username: "Artemis" },
      },
    };
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify(proof) }),
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(mockedCount)).toHaveBeenCalled();
    expect(countHandleTokens).toBeDefined();
  });

  function validProof(overrides: Record<string, unknown> = {}) {
    return {
      sessionId: "sess-1",
      claimData: {
        context: JSON.stringify({ address: EVM, message: { app: "artemis", nonce: "n1" } }),
        timestampS: Math.floor(Date.now() / 1000),
        parameters: { username: "Artemis" },
        ...overrides,
      },
    };
  }

  function stubVerifiedProof() {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue(verifiedProofData() as never);
  }

  it("callback rejects stale proofs older than 10 minutes", async () => {
    stubVerifiedProof();
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", {
        method: "POST",
        body: JSON.stringify(validProof({ timestampS: Math.floor(Date.now() / 1000) - 3600 })),
      }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("stale_proof");
    expect(mocked.saveVerification).not.toHaveBeenCalled();
  });

  it("callback rejects nonce-mismatched context", async () => {
    stubVerifiedProof();
    mocked.verifyProof.mockResolvedValue(verifiedProofData({ message: { app: "artemis", nonce: "n2" } }) as never);
    const proof = validProof();
    (proof.claimData as { context: string }).context = JSON.stringify({
      address: EVM,
      message: { app: "artemis", nonce: "n2" },
    });
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify(proof) }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("nonce_mismatch");
    expect(mocked.saveVerification).not.toHaveBeenCalled();
  });

  it("callback rejects proofs failing TEE attestation", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue({ isVerified: true, isTeeAttestationVerified: false } as never);
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify(validProof()) }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_proof");
    expect(mocked.saveVerification).not.toHaveBeenCalled();
  });

  it("callback rejects double-submitted proofs (replay)", async () => {
    stubVerifiedProof();
    mocked.saveVerification.mockRejectedValueOnce(new Error("duplicate"));
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify(validProof()) }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("unknown_or_used_session");
  });

  it("init rejects wallets outside the allowlist", async () => {
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "0x0000000000000000000000000000000000000009");
    const res = await initPOST(
      new Request("http://x/api/zk/init", {
        method: "POST",
        body: JSON.stringify({ wallet: EVM, signature: "0x00", nonce: "n" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe("allowlist_only");
  });

  it("reverify reports valid stored proofs", async () => {
    vi.stubEnv("ZK_BADGE_PUBLIC", "true");
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getProof.mockResolvedValue({
      id: "p1",
      proof_json: { sessionId: "sess-1" },
      provider_config: { providerId: "provider-x", providerVersion: "1.2.3", allowedTags: [] },
      revoked_at: null,
    } as never);
    mocked.verifyProof.mockResolvedValue(verifiedProofData() as never);
    const res = await reverifyPOST(
      new Request("http://x/api/zk/reverify", { method: "POST", body: JSON.stringify({ id: "p1" }) }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ valid: true, revoked: false });
  });

  it("reverify reports revoked proofs as revoked", async () => {
    vi.stubEnv("ZK_BADGE_PUBLIC", "true");
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getProof.mockResolvedValue({
      id: "p1",
      proof_json: { sessionId: "sess-1" },
      provider_config: { providerId: "provider-x", providerVersion: "1.2.3", allowedTags: [] },
      revoked_at: "2026-09-26T00:00:00Z",
    } as never);
    mocked.verifyProof.mockResolvedValue(verifiedProofData() as never);
    const res = await reverifyPOST(
      new Request("http://x/api/zk/reverify", { method: "POST", body: JSON.stringify({ id: "p1" }) }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ valid: true, revoked: true });
  });

  it("does not expose a proof re-verification oracle while badges are private", async () => {
    const res = await reverifyPOST(new Request("http://x/api/zk/reverify", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "proof-1" }),
    }));
    expect(res.status).toBe(404);
    expect(getProof).not.toHaveBeenCalled();
  });

  it("metrics rejects without a token", async () => {
    const res = await metricsGET(new Request("http://x/api/zk/metrics"));
    expect(res.status).toBe(401);
  });

  it("metrics returns counts with a valid token", async () => {
    vi.stubEnv("ZK_METRICS_TOKEN", "op-token");
    const { getZkMetrics } = await import("../lib/zk-db");
    vi.mocked(getZkMetrics).mockResolvedValue({
      sessions: { verified: 3 },
      failures: { invalid_proof: 1 },
      verifications24h: 2,
    });
    const res = await metricsGET(new Request("http://x/api/zk/metrics?token=op-token"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      sessions: { verified: 3 },
      failures: { invalid_proof: 1 },
      verifications24h: 2,
    });
  });
});
