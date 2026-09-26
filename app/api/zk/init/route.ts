import { NextResponse } from "next/server";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { DEVNET_RPC, MAINNET_RPC } from "../../../../lib/launcher-solana";
import { getHoodConfig, publicClientFor } from "../../../../lib/launcher-evm";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { verifyEvmTx, verifySolanaTx } from "../../../../lib/verify-tx";
import { consumeNonce, saveSession } from "../../../../lib/zk-db";
import { verifyEvmSigner, verifySolanaSigner } from "../../../../lib/zk";
import { baseUrl, isEvmWallet, isSolanaWallet, readJsonBody } from "../../../../lib/zk-http";
import { isWalletAllowed, zkFlags } from "../../../../lib/zk-flags";

function zkCreds(): { appId: string; secret: string; providerId: string } | null {
  const appId = (process.env.RECLAIM_APP_ID ?? "").trim();
  const secret = (process.env.RECLAIM_APP_SECRET ?? "").trim();
  const providerId = (process.env.RECLAIM_PROVIDER_ID_X ?? "").trim();
  if (!appId || !secret || !providerId) return null;
  return { appId, secret, providerId };
}

async function assertDeployer(wallet: string, token: string, chainId: string, txHash: string): Promise<boolean> {
  try {
    if (chainId === "4663" || chainId === "46630") {
      const cfg = getHoodConfig(Number(chainId) as 4663 | 46630);
      if (!cfg) return false;
      // Token must exist with a creation log; pool path proves creator funding.
      const pub = publicClientFor(cfg);
      const receipt = await pub.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (!receipt || receipt.status !== "success") return false;
      return verifyEvmTx(Number(chainId) as 4663 | 46630, token, txHash, wallet);
    }
    if (chainId === "solana-mainnet" || chainId === "solana-devnet") {
      const rpc = chainId === "solana-mainnet" ? MAINNET_RPC : DEVNET_RPC;
      return verifySolanaTx(rpc, token, txHash, wallet);
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const flags = zkFlags();
  if (!flags.enabled) return NextResponse.json({ error: "zk_disabled" }, { status: 503 });
  const parsed = await readJsonBody(req, 8 * 1024);
  if ("error" in parsed) return parsed.error;
  const b = parsed.body;
  const wallet = typeof b.wallet === "string" ? b.wallet.trim() : "";
  const signature = typeof b.signature === "string" ? b.signature.trim() : "";
  const nonce = typeof b.nonce === "string" ? b.nonce.trim() : "";
  const token = typeof b.token === "string" ? b.token.trim() : "";
  const chainId = typeof b.chainId === "string" || typeof b.chainId === "number" ? String(b.chainId) : "";
  const txHash = typeof b.txHash === "string" ? b.txHash.trim() : "";
  const evm = isEvmWallet(wallet);
  const sol = !evm && isSolanaWallet(wallet);
  if ((!evm && !sol) || !signature || !nonce) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!isWalletAllowed(flags, wallet)) {
    return NextResponse.json({ error: "allowlist_only" }, { status: 403 });
  }
  if (!(await checkRateLimit(`zk-init:${clientIp(req)}:${wallet.toLowerCase()}`, 5, 3600000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const creds = zkCreds();
  if (!creds) return NextResponse.json({ error: "zk_offline" }, { status: 502 });

  // 1. Single-use nonce + wallet ownership (never touch Reclaim before this).
  let consumed = false;
  try {
    consumed = await consumeNonce(nonce, wallet);
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
  if (!consumed) return NextResponse.json({ error: "unknown_or_used_session" }, { status: 400 });
  const owned = evm
    ? await verifyEvmSigner(wallet, signature, nonce)
    : verifySolanaSigner(wallet, signature, nonce);
  if (!owned) return NextResponse.json({ error: "wallet_signature_rejected" }, { status: 400 });

  // 2. Optional per-token deployer binding (token requires its deploy tx).
  if (token) {
    if (!chainId || !txHash) return NextResponse.json({ error: "token_proof_required" }, { status: 400 });
    if (!(await assertDeployer(wallet, token, chainId, txHash))) {
      return NextResponse.json({ error: "not_deployer" }, { status: 400 });
    }
  }

  // 3. Issue the Reclaim request bound to this wallet.
  try {
    const request = await ReclaimProofRequest.init(creds.appId, creds.secret, creds.providerId);
    request.setContext(wallet, JSON.stringify({ app: "artemis", token, chainId, nonce }));
    request.setAppCallbackUrl(`${baseUrl(req)}/api/zk/callback`, true);
    const sessionId = request.getSessionId();
    await saveSession({ sessionId, wallet, token, chainId, nonce });
    return NextResponse.json({ config: request.toJsonString(), sessionId });
  } catch {
    return NextResponse.json({ error: "zk_offline" }, { status: 502 });
  }
}
