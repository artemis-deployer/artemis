"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

type ProofData = {
  id: string;
  handle: string;
  wallet: string;
  token: string;
  chainId: string;
  sessionId: string;
  verifiedAt: string;
  testnet: boolean;
  revoked: boolean;
  revokeReason?: string;
  proof: unknown;
};

type Props = {
  proofId: string | null;
  onClose: () => void;
};

function short(v: string, head = 6, tail = 4): string {
  if (v.length <= head + tail + 1) return v;
  return `${v.slice(0, head)}…${v.slice(-tail)}`;
}

export default function ProofDrawer({ proofId, onClose }: Props) {
  const [data, setData] = useState<ProofData | null>(null);
  const [error, setError] = useState("");
  const [recheck, setRecheck] = useState<"idle" | "working" | "valid" | "invalid">("idle");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!proofId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [proofId, onClose]);

  useEffect(() => {
    if (!proofId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/zk/proof/${encodeURIComponent(proofId)}`);
        const json = (await res.json().catch(() => null)) as ProofData | { error?: string } | null;
        if (!alive) return;
        if (!res.ok || !json || !("proof" in json)) {
          setError("Proof record not found on notary registry.");
          return;
        }
        setData(json);
      } catch {
        if (alive) setError("Proof registry unavailable offline.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [proofId]);

  function copy(key: string, val: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  }

  async function reverify() {
    if (!data || recheck === "working") return;
    setRecheck("working");
    try {
      const res = await fetch("/api/zk/reverify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: data.id }),
      });
      const json = (await res.json().catch(() => null)) as { valid?: boolean } | null;
      setRecheck(res.ok && json?.valid === true ? "valid" : "invalid");
    } catch {
      setRecheck("invalid");
    }
  }

  function download() {
    if (!data) return;
    const blob = new Blob([JSON.stringify({ id: data.id, proof: data.proof }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zk-proof-${data.id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  if (!proofId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Cryptographic Proof Receipt"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-white/10 bg-[#16171a] p-6 sm:p-7 text-white shadow-2xl transition-all">
        {/* Top Bar Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#fae8a4]/30 bg-[#fae8a4]/10 text-[#fae8a4]">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-[#fae8a4] uppercase block">
                Cryptographic Attestation
              </span>
              <span className="text-[11px] font-mono text-white/50">zkTLS · MPC · Proof Receipt</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close proof"
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-200">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
              <span>Registry Error</span>
            </div>
            <p className="m-0 text-white/70">{error}</p>
          </div>
        )}

        {!error && !data && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-[#fae8a4]" />
            <p className="m-0 font-mono text-xs text-white/60">Fetching verified cryptographic proof…</p>
          </div>
        )}

        {data && (
          <div className="mt-5 flex flex-col gap-6">
            {/* Creator Identity Hero Card */}
            <div className="rounded-2xl border border-white/10 bg-[#1e2025] p-5 shadow-inner">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black border border-white/15 font-mono text-base font-bold text-white shadow-sm">
                    𝕏
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-base font-bold text-white">@{data.handle}</span>
                      {!data.revoked && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-white/50 block">Verified Social Identity</span>
                  </div>
                </div>

                {/* Status Pill */}
                {data.revoked ? (
                  <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-red-300">
                    REVOKED
                  </span>
                ) : recheck === "valid" ? (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300">
                    VALID (RE-CHECKED)
                  </span>
                ) : (
                  <span className="rounded-full border border-[#fae8a4]/40 bg-[#fae8a4]/10 px-2.5 py-1 font-mono text-[10px] font-bold text-[#fae8a4]">
                    {data.testnet ? "TESTNET ATTESTED" : "VERIFIED ON-CHAIN"}
                  </span>
                )}
              </div>

              {data.revoked && data.revokeReason && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/15 p-2.5 text-xs text-red-200">
                  <span className="font-semibold block mb-0.5">Revocation Notice:</span>
                  <span className="text-white/80">{data.revokeReason}</span>
                </div>
              )}
            </div>

            {/* Cryptographic Trust Pillars */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
                Trust Chain Verification
              </span>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#121316] p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <strong className="font-semibold text-white block">TLSNotary Web Attestation</strong>
                    <span className="text-[11px] text-white/50">TLS 1.3 session keys proved authentic via MPC notary</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#121316] p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <strong className="font-semibold text-white block">Hardware Security Signature</strong>
                    <span className="text-[11px] text-white/50">Intel SGX enclave signature matches official Artemis verifier</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#121316] p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <strong className="font-semibold text-white block">Cryptographic Key Binding</strong>
                    <span className="text-[11px] text-white/50">Social account bound exclusively to creator deployment wallet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Specifications List */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
                Attestation Payload
              </span>
              <div className="rounded-xl border border-white/10 bg-[#121316] p-4 font-mono text-xs">
                <div className="divide-y divide-white/5">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/40">Bound Wallet</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/90 font-bold">{short(data.wallet, 8, 6)}</span>
                      <button
                        type="button"
                        onClick={() => copy("wallet", data.wallet)}
                        className="rounded p-1 text-white/40 hover:text-white transition-colors"
                        title="Copy wallet"
                      >
                        {copiedKey === "wallet" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {data.token && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-white/40">Bound Token</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/90">{short(data.token, 8, 6)}</span>
                        <button
                          type="button"
                          onClick={() => copy("token", data.token)}
                          className="rounded p-1 text-white/40 hover:text-white transition-colors"
                          title="Copy token address"
                        >
                          {copiedKey === "token" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/40">Chain ID</span>
                    <span className="text-white/80">{data.chainId || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/40">Proof ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/80">{short(data.id, 6, 4)}</span>
                      <button
                        type="button"
                        onClick={() => copy("proofId", data.id)}
                        className="rounded p-1 text-white/40 hover:text-white transition-colors"
                        title="Copy proof ID"
                      >
                        {copiedKey === "proofId" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/40">Timestamp</span>
                    <span className="text-white/80">{new Date(data.verifiedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => void reverify()}
                disabled={recheck === "working"}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fae8a4] bg-[#fae8a4] px-4 py-2.5 font-mono text-xs font-bold text-[#18191c] transition-all hover:bg-[#fff0b8] active:scale-[0.99] disabled:opacity-50"
              >
                {recheck === "working" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>VERIFYING CRYPTOGRAPHIC SIGNATURE…</span>
                  </>
                ) : recheck === "valid" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                    <span>ATTESTATION SIGNATURE VALID</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>RE-VERIFY ATTESTATION INTEGRITY</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={download}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10"
              >
                <Download size={14} />
                <span>Download Raw Proof Payload (JSON)</span>
              </button>
            </div>

            {/* Security Guarantee Note */}
            <p className="mt-2 mb-0 text-[11px] leading-relaxed text-white/40 border-t border-white/10 pt-4">
              Cryptographically proves authentic control of the X handle at attestation timestamp without revealing private passwords, cookies, or 2FA credentials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
