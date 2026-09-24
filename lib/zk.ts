import bs58 from "bs58";
import { ed25519 } from "@noble/curves/ed25519.js";
import { verifyMessage, type Address } from "viem";

export const ZK_NONCE_TTL_MS = 5 * 60 * 1000;
export const ZK_PROOF_TTL_MS = 10 * 60 * 1000;

/** "@Handle" / "handle" → lowercase bare handle, null when unusable. */
export function normalizeHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const h = value.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) return null;
  return h.toLowerCase();
}

type ProofLike = {
  sessionId?: unknown;
  claimData?: {
    context?: unknown;
    identifier?: unknown;
    timestampS?: unknown;
    parameters?: unknown;
    provider?: unknown;
  };
};

/**
 * Best-effort handle extraction from Reclaim claim parameters. Prefers keys
 * mentioning user/screen/handle/name, falls back to any handle-shaped value
 * that is not obviously an id, url, or timestamp.
 */
export function extractHandle(proof: unknown): string | null {
  if (typeof proof !== "object" || proof === null) return null;
  const params = (proof as ProofLike).claimData?.parameters;
  if (typeof params !== "object" || params === null || Array.isArray(params)) return null;
  const entries = Object.entries(params as Record<string, unknown>);
  const preferred = entries.filter(([k]) => /user|screen|handle|name|login/i.test(k));
  const ordered = [...preferred, ...entries.filter(([k]) => !/user|screen|handle|name|login/i.test(k))];
  for (const [, v] of ordered) {
    if (typeof v !== "string") continue;
    if (/^\d+$/.test(v) || v.includes("://") || v.includes(" ")) continue;
    const h = normalizeHandle(v);
    if (h) return h;
  }
  return null;
}

export function proofSessionId(proof: unknown): string | null {
  if (typeof proof !== "object" || proof === null) return null;
  const s = (proof as ProofLike).sessionId;
  return typeof s === "string" && s.length > 0 ? s : null;
}

export function proofTimestampMs(proof: unknown): number | null {
  const ts = (proof as unknown as ProofLike)?.claimData?.timestampS;
  const n = typeof ts === "number" ? ts : typeof ts === "string" && ts !== "" ? Number(ts) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * 1000;
}

/** Context round-trips through Reclaim as a JSON string; parse defensively. */
export function proofContext(proof: unknown): { address?: string; message?: Record<string, unknown> } | null {
  const ctx = (proof as unknown as ProofLike)?.claimData?.context;
  if (typeof ctx === "string") {
    try {
      const parsed = JSON.parse(ctx) as unknown;
      if (typeof parsed === "object" && parsed !== null) return parsed as { address?: string };
    } catch {
      return null;
    }
  }
  if (typeof ctx === "object" && ctx !== null) return ctx as { address?: string };
  return null;
}

/** Exact message the wallet signs for a nonce (SIWE-style, EIP-191 personal_sign). */
export function zkSignMessage(nonce: string): string {
  return `Artemis ZK verification\nnonce: ${nonce}`;
}

/** EVM wallet-ownership check. Never throws (false on any failure). */
export async function verifyEvmSigner(wallet: string, signature: string, nonce: string): Promise<boolean> {
  try {
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet) || !/^0x[0-9a-fA-F]+$/.test(signature)) return false;
    const ok = await verifyMessage({
      address: wallet as Address,
      message: zkSignMessage(nonce),
      signature: signature as `0x${string}`,
    });
    return ok === true;
  } catch {
    return false;
  }
}

/** Solana wallet-ownership check (ed25519 signMessage). Never throws. */
export function verifySolanaSigner(wallet: string, signature: string, nonce: string): boolean {
  try {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return false;
    const sig = bs58.decode(signature);
    const msg = new TextEncoder().encode(zkSignMessage(nonce));
    return ed25519.verify(sig, msg, bs58.decode(wallet));
  } catch {
    return false;
  }
}

export function isTestnetChain(chainId: string): boolean {
  return chainId === "46630" || chainId === "solana-devnet";
}
