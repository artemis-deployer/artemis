"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
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
  expectedHandle?: string;
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

const STEPS = [
  { id: "signing", label: "Sign Nonce" },
  { id: "requesting", label: "Init Request" },
  { id: "proving", label: "zkTLS Attest" },
  { id: "polling", label: "Bind Badge" },
];

function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default function ZkVerifyPanel({ token, chainId, txHash, expectedHandle, onVerified }: Props) {
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
    let s: { status?: string; failReason?: string; revokeReason?: string; handle?: string; wallet?: string };
    try {
      const res = await fetch(`/api/zk/status?session=${encodeURIComponent(sessionId)}`);
      s = ((await res.json().catch(() => null)) as typeof s) ?? {};
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
    if (s?.status === "revoked") {
      setPhase("error");
      setNote(`Verification revoked${s.revokeReason ? `: ${s.revokeReason}` : "."}`);
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
      const solanaTarget = String(chainId ?? "").startsWith("solana-");
      const evm = solanaTarget ? null : getActiveEvmProvider();
      const sol = solanaTarget || (!token && !evm) ? getActiveSolanaProvider() : null;
      if (!evm && !sol) {
        setPhase("error");
        setNote("Connect your deployer wallet first in the top bar.");
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
          expectedHandle: expectedHandle ?? "",
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

  const isWorking = phase === "signing" || phase === "requesting" || phase === "proving" || phase === "polling";
  const stepIdx = phase === "signing" ? 0 : phase === "requesting" ? 1 : phase === "proving" ? 2 : phase === "polling" ? 3 : -1;

  if (phase === "verified" && handle && wallet) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200" aria-live="polite">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <strong className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Creator Identity Verified
          </strong>
        </div>
        <div className="flex items-center gap-3">
          <ZkBadge state="verified" handle={handle} size="md" />
          <span className="font-mono text-xs text-white/70">
            Bound to {short(wallet)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#16171b] p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#fae8a4]" />
          <span className="font-mono text-xs font-bold tracking-wider text-white/70 uppercase">
            zkTLS Creator Verification
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#fae8a4] uppercase">Non-Custodial</span>
      </div>

      <p className="m-0 text-xs text-white/60">
        Prove ownership of your X profile with zero credentials shared. Bound directly to your launch transaction.
      </p>

      {/* Working Stepper Bar */}
      {isWorking && (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#121316] p-2">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-1.5 font-mono text-[10px]">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                  idx < stepIdx
                    ? "bg-emerald-500 text-black"
                    : idx === stepIdx
                      ? "bg-[#fae8a4] text-black animate-pulse"
                      : "bg-white/10 text-white/40"
                }`}
              >
                {idx < stepIdx ? <Check className="h-2.5 w-2.5 text-black" /> : idx + 1}
              </span>
              <span className={idx === stepIdx ? "text-[#fae8a4] font-bold" : idx < stepIdx ? "text-white/80" : "text-white/30"}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={isWorking}
        onClick={() => void start()}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fae8a4] bg-[#fae8a4] px-5 py-2.5 font-mono text-xs font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isWorking ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>VERIFYING SESSION ENCLAVE…</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>VERIFY CREATOR IDENTITY WITH ZK ↘</span>
          </>
        )}
      </button>

      {phase === "error" && note && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-200">
          <p className="m-0 leading-relaxed">
            {note}{" "}
            <button
              type="button"
              onClick={() => void start()}
              className="cursor-pointer font-bold text-white underline hover:text-[#fae8a4]"
            >
              Retry
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
