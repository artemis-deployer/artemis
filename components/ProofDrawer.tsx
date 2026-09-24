"use client";

import { useEffect, useState } from "react";
import { Check, Download, RefreshCw, X } from "lucide-react";

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
          setError("Proof not found.");
          return;
        }
        setData(json);
      } catch {
        if (alive) setError("Proof unavailable offline.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [proofId]);

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
    const blob = new Blob([JSON.stringify({ id: data.id, proof: data.proof }, null, 2)], { type: "application/json" });
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
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="ZK proof receipt"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-[400px] flex-col gap-4 overflow-y-auto border-l border-white/15 bg-[#1a1b1f] p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="font-mono text-xs font-bold tracking-[0.14em] text-white/60">ZK PROOF // RECEIPT</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close proof"
            className="cursor-pointer rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <p role="alert" className="m-0 text-sm font-medium text-red-300">
            {error}
          </p>
        )}
        {!error && !data && <p className="m-0 font-mono text-xs text-white/50">Loading proof…</p>}

        {data && (
          <>
            <dl className="m-0 flex flex-col gap-2.5 font-mono text-xs">
              {[
                ["Claim", `x.com account @${data.handle}`],
                ["Bound wallet", short(data.wallet, 6, 4)],
                ["Token", data.token ? short(data.token, 6, 4) : "—"],
                ["Chain", String(data.chainId || "—")],
                ["Session", short(data.sessionId, 4, 4)],
                ["Verified", new Date(data.verifiedAt).toLocaleString()],
                ["Attestation", "TEE ✓ · Attestor sig ✓"],
                ["Status", data.revoked ? "REVOKED" : recheck === "valid" ? "VALID (re-checked)" : recheck === "invalid" ? "RE-CHECK FAILED" : "VALID"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-white/40">{k}:</dt>
                  <dd className="m-0 min-w-0 text-right break-words text-white/90">{v}</dd>
                </div>
              ))}
              {data.revoked && data.revokeReason && (
                <p className="m-0 text-xs text-red-300">Reason: {data.revokeReason}</p>
              )}
            </dl>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={download}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                <Download size={13} aria-hidden="true" /> proof.json
              </button>
              <button
                type="button"
                onClick={() => void reverify()}
                disabled={recheck === "working"}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                {recheck === "valid" ? <Check size={13} className="text-emerald-400" /> : <RefreshCw size={13} aria-hidden="true" />}
                {recheck === "working" ? "Checking…" : "Re-verify"}
              </button>
            </div>

            <p className="m-0 text-xs leading-relaxed text-white/50">
              This proves control of @{data.handle} at verification time, bound to this wallet. It does not prove
              token safety.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
