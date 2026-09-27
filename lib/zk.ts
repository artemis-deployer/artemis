import bs58 from "bs58";
import { ed25519 } from "@noble/curves/ed25519.js";
import { verifyMessage, type Address } from "viem";

export const ZK_NONCE_TTL_MS = 5 * 60 * 1000;
export const ZK_PROOF_TTL_MS = 10 * 60 * 1000;
const ZK_CLOCK_SKEW_MS = 30 * 1000;

export function isProofTimestampFresh(timestampMs: number | null, nowMs = Date.now()): boolean {
  return timestampMs !== null && timestampMs <= nowMs + ZK_CLOCK_SKEW_MS && timestampMs >= nowMs - ZK_PROOF_TTL_MS;
}

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
  };
};

/** Extract a handle only from Reclaim's verified `data[].extractedParameters`. */
export function extractVerifiedHandle(parameters: unknown): string | null {
  if (typeof parameters !== "object" || parameters === null || Array.isArray(parameters)) return null;
  const matches = Object.entries(parameters as Record<string, unknown>)
    .filter(([key]) => /user.?name|screen.?name|handle|login/i.test(key))
    .map(([, value]) => normalizeHandle(value))
    .filter((value): value is string => value !== null);
  const unique = [...new Set(matches)];
  return unique.length === 1 ? unique[0] : null;
}

export type NormalizedProofContext = {
  address: string;
  message: Record<string, unknown>;
  sessionId: string;
};

function parseContextMessage(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeProofContext(value: unknown): NormalizedProofContext | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const context = value as Record<string, unknown>;
  const address = typeof context.contextAddress === "string"
    ? context.contextAddress
    : typeof context.address === "string" ? context.address : "";
  const message = parseContextMessage(context.contextMessage ?? context.message);
  const sessionId = typeof context.reclaimSessionId === "string" ? context.reclaimSessionId : "";
  return address && message ? { address, message, sessionId } : null;
}

export function proofSessionId(proof: unknown): string | null {
  if (Array.isArray(proof)) {
    if (proof.length !== 1) return null;
    return proofSessionId(proof[0]);
  }
  if (typeof proof !== "object" || proof === null) return null;
  const p = proof as ProofLike;
  const s = p.sessionId;
  if (typeof s === "string" && s.length > 0) return s;
  const rawContext = p.claimData?.context;
  let context: unknown = rawContext;
  if (typeof rawContext === "string") {
    try {
      context = JSON.parse(rawContext) as unknown;
    } catch {
      return null;
    }
  }
  if (typeof context !== "object" || context === null || Array.isArray(context)) return null;
  const reclaimSessionId = (context as Record<string, unknown>).reclaimSessionId;
  return typeof reclaimSessionId === "string" && reclaimSessionId.length > 0 ? reclaimSessionId : null;
}

export function proofTimestampMs(proof: unknown): number | null {
  const ts = (proof as unknown as ProofLike)?.claimData?.timestampS;
  const n = typeof ts === "number" ? ts : typeof ts === "string" && ts !== "" ? Number(ts) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * 1000;
}

/** Context round-trips through Reclaim as a JSON string; parse defensively. */
export function proofContext(proof: unknown): NormalizedProofContext | null {
  const ctx = (proof as unknown as ProofLike)?.claimData?.context;
  if (typeof ctx === "string") {
    try {
      return normalizeProofContext(JSON.parse(ctx) as unknown);
    } catch {
      return null;
    }
  }
  return normalizeProofContext(ctx);
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
