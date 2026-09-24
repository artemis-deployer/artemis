"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import bs58 from "bs58";
import { getActiveEvmProvider, getActiveSolanaProvider, solanaAddressOf } from "../lib/wallets";
import ZkBadge from "./ZkBadge";

type Phase = "idle" | "signing" | "requesting" | "proving" | "polling" | "verified" | "error";

type Props = {
  /** Token being verified (optional: general handle verification without a token). */
  token?: string;
  chainId?: number | string;
  /** Deploy tx hash: required with token so the wallet must be the deployer. */
  txHash?: string;
  onVerified?: (handle: string, wallet: string) => void;
};

const ERRORS: Record<string, string> = {
  wallet_signature_rejected: "Signature cancelled. No data was saved.",
  not_deployer: "This wallet didn't deploy this token. Connect the deployer wallet.",
  handle_mismatch: "Proof handle doesn't match. Verify the correct account.",
  stale_proof: "Proof expired. Start a new verification.",
  unknown_or_used_session: "This proof session is no longer valid. Start again.",
  invalid_proof: "Proof could not be verified. Try again.",
  rate_limited: "Too many attempts. Try again in an hour.",
  token_proof_required: "Token verification needs its deploy transaction.",
  zk_offline: "Verification service is unavailable right now.",
  db_offline: "Verification service is unavailable right now.",
};

const PHASE_LABEL: Record<Exclude<Phase, "idle" | "verified" | "error">, string> = {
  signing: "State: awaiting wallet signature",
  requesting: "State: issuing zkTLS proof request",
  proving: "State: generating zkTLS proof",
  polling: "State: verifying attestation",
};

function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default function ZkVerifyPanel({ token, chainId, txHash, onVerified }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState("");
  const [handle, setHandle] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadRef = useRef(false);

  useEffect(() => () => {
    deadRef.current = true;
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  async function poll(sessionId: string, tries = 0): Promise<void> {
    if (deadRef.current) return;
    if (tries > 100) {
      setPhase("error");
      setNote("Verification timed out. Start again.");
      return;
    }
    let s: { status?: string; failReason?: string; handle?: string; wallet?: string };
    try {
      const res = await fetch(`/api/zk/status?session=${encodeURIComponent(sessionId)}`);
      s = (await res.json().catch(() => null)) as typeof s;
    } catch {
      s = {};
    }
    if (deadRef.current) return;
    if (s?.status === "verified") {
      const h = typeof s.handle === "string" ? s.handle : "";
      const w = typeof s.wallet === "string" ? s.wallet : "";
      setHandle(h || null);
      setWallet(w || null);
      setPhase("verified");
      if (h && w) onVerified?.(h, w);
      return;
    }
    if (s?.status === "failed") {
      setPhase("error");
      setNote(ERRORS[s.failReason ?? ""] ?? "Verification failed. Try again.");
      return;
    }
    // Pending (or transient fetch failure): keep polling every 3s.
    pollRef.current = setTimeout(() => void poll(sessionId, tries + 1), 3000);
  }

  async function start() {
    if (phase === "signing" || phase === "requesting" || phase === "proving" || phase === "polling") return;
    setNote("");
    setHandle(null);
    try {
      // 1. Wallet + nonce.
      const evm = getActiveEvmProvider();
      const sol = !evm ? getActiveSolanaProvider() : null;
      if (!evm && !sol) {
        setPhase("error");
        setNote("Connect a wallet first (top bar).");
        return;
      }
      setPhase("signing");
      const who: string = await (async () => {
        if (evm) {
          const accs = (await evm.request({ method: "eth_requestAccounts" })) as unknown;
          const a = Array.isArray(accs) ? String(accs[0] ?? "") : "";
          if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error("wallet_missing");
          const nRes = await fetch("/api/zk/nonce", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ wallet: a }),
          });
          const nj = (await nRes.json().catch(() => null)) as { nonce?: string; message?: string } | null;
          if (!nRes.ok || !nj?.nonce || !nj?.message) throw new Error(nRes.status === 429 ? "rate_limited" : "zk_offline");
          let sig: unknown;
          try {
            sig = await evm.request({ method: "personal_sign", params: [nj.message, a] });
          } catch {
            throw new Error("wallet_signature_rejected");
          }
          if (typeof sig !== "string" || !sig.startsWith("0x")) throw new Error("wallet_signature_rejected");
          return JSON.stringify({ wallet: a, signature: sig, nonce: nj.nonce });
        }
        const p = sol as unknown as {
          publicKey?: { toBase58?: () => string };
          signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
        };
        const addr = solanaAddressOf(sol) ?? (typeof p.publicKey?.toBase58 === "function" ? p.publicKey.toBase58() : null);
        if (!addr) throw new Error("wallet_missing");
        const nRes = await fetch("/api/zk/nonce", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ wallet: addr }),
        });
        const nj = (await nRes.json().catch(() => null)) as { nonce?: string; message?: string } | null;
        if (!nRes.ok || !nj?.nonce || !nj?.message) throw new Error(nRes.status === 429 ? "rate_limited" : "zk_offline");
        if (typeof p.signMessage !== "function") throw new Error("wallet_signature_rejected");
        let sigBytes: Uint8Array;
        try {
          sigBytes = await p.signMessage(new TextEncoder().encode(nj.message));
        } catch {
          throw new Error("wallet_signature_rejected");
        }
        return JSON.stringify({
          wallet: addr,
          signature: bs58.encode(sigBytes),
          nonce: nj.nonce,
        });
      })();

      // 2. Init proof request.
      setPhase("requesting");
      const payload = JSON.parse(who) as { wallet: string; signature: string; nonce: string };
      const initRes = await fetch("/api/zk/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          token: token ?? "",
          chainId: chainId ?? "",
          txHash: txHash ?? "",
        }),
      });
      const init = (await initRes.json().catch(() => null)) as { config?: string; sessionId?: string; error?: string } | null;
      if (!initRes.ok || !init?.config || !init?.sessionId) {
        throw new Error(typeof init?.error === "string" ? init.error : "zk_offline");
      }

      // 3. Reclaim flow (extension → QR → app handles itself).
      setPhase("proving");
      const { ReclaimProofRequest } = await import("@reclaimprotocol/js-sdk");
      const request = await ReclaimProofRequest.fromJsonString(init.config);
      try {
        await request.triggerReclaimFlow();
      } catch {
        // User may finish on another device; polling still resolves.
      }

      // 4. Poll server truth (never trust client onSuccess).
      setPhase("polling");
      await poll(init.sessionId);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setPhase("error");
      setNote(ERRORS[code] ?? "Verification failed. Try again.");
    }
  }

  if (phase === "verified" && handle && wallet) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-[#fae8a4]/30 bg-[#fae8a4]/5 p-3" aria-live="polite">
        <ZkBadge state="verified" handle={handle} size="md" />
        <p className="m-0 text-xs text-white/70">
          Verified. @{handle} is now bound to {short(wallet)}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#1a1b1f] p-3">
      <button
        type="button"
        disabled={phase !== "idle" && phase !== "error"}
        onClick={() => void start()}
        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#fae8a4]/40 bg-transparent px-4 py-2 text-xs font-bold tracking-wide text-[#fae8a4] transition-all hover:bg-[#fae8a4]/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ShieldCheck size={14} aria-hidden="true" />
        {phase === "idle" || phase === "error" ? "VERIFY WITH ZK ↘" : "VERIFYING…"}
      </button>
      <p className="m-0 text-[11px] text-white/50">Optional · your X login is never shared with Artemis.</p>
      {phase !== "idle" && phase !== "error" && phase !== "verified" && (
        <p role="status" className="m-0 font-mono text-[11px] text-white/60">
          {PHASE_LABEL[phase]}
        </p>
      )}
      {phase === "error" && note && (
        <p role="alert" className="m-0 text-xs font-medium text-red-300">
          {note}{" "}
          <button type="button" onClick={() => void start()} className="cursor-pointer underline">
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
