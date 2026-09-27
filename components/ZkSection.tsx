"use client";

import { useEffect, useRef, useState } from "react";
import ZkBadge from "./ZkBadge";
import { Check, CheckCircle2, Lock, Shield, ShieldCheck, Sparkles, X } from "lucide-react";

const CARDS = [
  {
    n: "01 // PROVEN",
    tag: "ACCOUNT CONTROL",
    title: "Real account. Real creator.",
    body: "A cryptographic zkTLS proof confirms the creator was actively authenticated in their X (Twitter) account. Fake accounts and impersonators cannot generate this proof.",
    foot: "CLAIM: X_ACCOUNT_CONTROL",
  },
  {
    n: "02 // BOUND",
    tag: "CRYPTOGRAPHIC BINDING",
    title: "Locked to deployer wallet.",
    body: "The deployer's public key and launch transaction are immutably baked into the proof context. Changing even a single byte invalidates the verification.",
    foot: "CONTEXT: DEPLOYER_WALLET",
  },
  {
    n: "03 // PRIVATE",
    tag: "ZERO DATA LEAKAGE",
    title: "Zero credentials shared.",
    body: "Artemis never sees passwords, session cookies, or private DMs. Only the verified public username and attestation signature are stored on-chain.",
    foot: "SHARED: HANDLE_ONLY",
  },
] as const;

const PIPELINE = [
  { step: "01", title: "NONCE SIGN", desc: "Creator signs a one-time cryptographic challenge with their deployer wallet" },
  { step: "02", title: "ZKTLS REQUEST", desc: "Artemis initiates an attested session proxy via Reclaim Protocol" },
  { step: "03", title: "SESSION PROOF", desc: "Client browser generates zk-proof of active login inside an encrypted enclave" },
  { step: "04", title: "TEE AUDIT", desc: "Attestation verified against hardware TEE signatures and timestamp freshness" },
  { step: "05", title: "VERIFIED BADGE", desc: "Public badge awarded to token card in the community showcase" },
] as const;

const COMPARISON = [
  {
    feature: "Password / Cookie Sharing",
    legacy: "Exposed to backend servers or OAuth intermediaries",
    artemis: "Never leaves client browser enclave (0% exposure)",
  },
  {
    feature: "Wallet Binding",
    legacy: "Arbitrary text input; anyone can claim any handle",
    artemis: "Cryptographically bound to deployer transaction hash",
  },
  {
    feature: "Spoofing Resistance",
    legacy: "Trivial to create lookalike names or stolen accounts",
    artemis: "zkTLS attestation fails if session is forged",
  },
  {
    feature: "Public Auditability",
    legacy: "Closed database boolean flag; trust the admin",
    artemis: "Open API with verifiable cryptographic signatures",
  },
];

export default function ZkSection() {
  const [lit, setLit] = useState(0);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLit(PIPELINE.length);
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        timers = PIPELINE.map((_, i) => setTimeout(() => setLit(i + 1), 300 * (i + 1)));
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section
      id="zk"
      ref={ref}
      data-theme="dark"
      aria-label="Zero-knowledge verification"
      className="w-full border-t border-white/10 bg-[#131416] px-[max(6.25vw,24px)] py-28 text-[#f8f6f0]"
    >
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Section Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-8">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-white/50 uppercase">
                07 // IDENTITY ATTESTATION
              </span>
              <span className="rounded border border-[#fae8a4]/40 bg-[#fae8a4]/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#fae8a4] uppercase">
                zkTLS · RECLAIM PROTOCOL
              </span>
            </div>
            <h2 className="font-unbounded m-0 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Prove who launched it.
              <br />
              <span className="text-white/60">Reveal zero private credentials.</span>
            </h2>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-white/70">
            Eliminate impersonators and spoofed launches. Creators prove control over their verified X profile via zero-knowledge TLS attestation, bound directly to their token deployment transaction.
          </p>
        </div>

        {/* 3 Value Pillars */}
        <div className="mb-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <article
              key={c.n}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#1a1b1f] p-7 transition-all hover:border-white/25"
            >
              <div>
                <div className="mb-4 flex items-center justify-between text-xs font-mono">
                  <span className="text-white/40 font-bold">{c.n}</span>
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-[#fae8a4] uppercase">
                    {c.tag}
                  </span>
                </div>
                <h3 className="font-unbounded m-0 mb-3 text-lg font-bold text-white">{c.title}</h3>
                <p className="m-0 text-xs leading-relaxed text-white/65">{c.body}</p>
              </div>

              <div className="mt-6 border-t border-white/5 pt-4 font-mono text-[11px] text-[#fae8a4]">
                {c.foot} ↘
              </div>
            </article>
          ))}
        </div>

        {/* Animated Stepper Pipeline */}
        <div className="mb-12 rounded-2xl border border-white/10 bg-[#18191c]/80 p-7 backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <span className="font-mono text-xs font-bold tracking-wider text-white/50 uppercase">
              Attestation Pipeline Architecture
            </span>
            <span className="font-mono text-[11px] text-emerald-400">Hardware TEE · Nonce Freshness Check</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {PIPELINE.map((p, i) => (
              <div
                key={p.step}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-300 ${
                  i < lit
                    ? "border-[#fae8a4]/50 bg-[#fae8a4]/5 shadow-md shadow-[#fae8a4]/5"
                    : "border-white/10 bg-[#121316]/50 opacity-40"
                }`}
              >
                <div>
                  <span className="font-mono text-[10px] font-bold text-white/40 block mb-1">
                    STEP {p.step}
                  </span>
                  <strong className="font-mono text-xs font-bold text-[#fae8a4] block mb-1.5">
                    {p.title}
                  </strong>
                  <p className="m-0 text-[11px] leading-relaxed text-white/60">{p.desc}</p>
                </div>
                {i < lit && (
                  <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Attested</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Matrix & Live Badge Preview */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Comparison Matrix (7 cols) */}
          <div className="rounded-2xl border border-white/10 bg-[#1a1b1f] p-7 lg:col-span-7">
            <span className="font-mono text-xs font-bold tracking-wider text-white/50 uppercase block mb-4">
              Conventional Verification vs. Artemis zkTLS
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="pb-3 font-normal">DIMENSION</th>
                    <th className="pb-3 font-normal text-red-300/80">LEGACY OAUTH / MANUAL</th>
                    <th className="pb-3 font-normal text-[#fae8a4]">ARTEMIS ZKTLS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {COMPARISON.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-semibold text-white/80">{row.feature}</td>
                      <td className="py-3 text-red-200/70">{row.legacy}</td>
                      <td className="py-3 text-[#fae8a4]/90 font-medium">{row.artemis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Badge Preview & Disclosures (5 cols) */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-[#1a1b1f] p-6">
              <span className="font-mono text-xs font-bold tracking-wider text-white/50 uppercase block mb-3">
                Live Community Showcase Preview
              </span>

              <div className="rounded-xl border border-white/10 bg-[#121316] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-unbounded text-sm font-bold text-white">$HOOD · Hood Sovereign</span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                    Robinhood Chain
                  </span>
                </div>

                <div className="mb-4">
                  <ZkBadge state="verified" handle="artemislauncher" size="md" />
                </div>

                <div className="border-t border-white/5 pt-3 font-mono text-[10px] text-white/50 space-y-1">
                  <div className="flex justify-between">
                    <span>Deployer:</span>
                    <span className="text-white">0x89e5…9eba</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verification:</span>
                    <span className="text-emerald-400">Cryptographically Bound</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#121316] p-5 text-xs text-white/60">
              <strong className="block font-mono text-[11px] font-bold text-white/80 uppercase mb-1">
                Transparency & Security Scope
              </strong>
              <p className="m-0 leading-relaxed text-[11px]">
                zkTLS verifies account control at the time of deployment. It does not certify price performance, code audits, or secondary trading safety.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
