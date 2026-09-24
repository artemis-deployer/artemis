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
  saveSession,
  saveVerification,
} from "../lib/zk-db";
import { verifyProof } from "@reclaimprotocol/js-sdk";
import { POST as noncePOST } from "../app/api/zk/nonce/route";
import { POST as initPOST } from "../app/api/zk/init/route";
import { POST as callbackPOST } from "../app/api/zk/callback/route";
import { GET as statusGET } from "../app/api/zk/status/route";
import { GET as tokenGET } from "../app/api/zk/token/[chainId]/[address]/route";
import { GET as proofGET } from "../app/api/zk/proof/[id]/route";

const mocked = {
  consumeNonce: vi.mocked(consumeNonce),
  saveSession: vi.mocked(saveSession),
  getSession: vi.mocked(getSession),
  markSession: vi.mocked(markSession),
  saveVerification: vi.mocked(saveVerification),
  getTokenBadge: vi.mocked(getTokenBadge),
  getProof: vi.mocked(getProof),
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
    status,
    fail_reason: "",
    created_at: "",
  };
}

describe("zk routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
    // fail() records the rejection on the session, but stores nothing.
    expect(mocked.saveVerification).not.toHaveBeenCalled();
  });

  it("callback verifies a full proof and stores the handle", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue({ isVerified: true, isTeeAttestationVerified: true } as never);
    const proof = {
      sessionId: "sess-1",
      claimData: {
        context: JSON.stringify({ address: EVM, message: { app: "artemis", nonce: "n1" } }),
        timestampS: Math.floor(Date.now() / 1000),
        parameters: { username: "Artemis" },
      },
    };
    const res = await callbackPOST(
      new Request("http://x/api/zk/callback", { method: "POST", body: JSON.stringify(proof) }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; handle: string };
    expect(json).toMatchObject({ ok: true, handle: "artemis" });
    expect(mocked.saveVerification).toHaveBeenCalledOnce();
  });

  it("callback rejects wallet-mismatched context", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue({ isVerified: true, isTeeAttestationVerified: true } as never);
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

  it("proof returns 404 when missing", async () => {
    mocked.getProof.mockResolvedValue(null);
    const res = await proofGET(new Request("http://x/api/zk/proof/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("countHandleTokens is called for spam transparency", async () => {
    vi.stubEnv("RECLAIM_APP_SECRET", "0xsecret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    mocked.getSession.mockResolvedValue(sessionRow("pending") as never);
    mocked.verifyProof.mockResolvedValue({ isVerified: true, isTeeAttestationVerified: true } as never);
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
});
