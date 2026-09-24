"use client";

import { useEffect, useRef, useState } from "react";
import ZkBadge from "./ZkBadge";

const CARDS = [
  {
    n: "01 // PROVEN",
    tag: "ACCOUNT CONTROL",
    title: "Real account, real creator.",
    body: "A zkTLS proof confirms the creator was signed in to the claimed X account at verification time. Spoofed handles fail.",
    foot: "CLAIM: X_ACCOUNT_CONTROL",
  },
  {
    n: "02 // BOUND",
    tag: "WALLET CONTEXT",
    title: "Locked to the deployer.",
    body: "The deployer wallet is written into the proof context. Change one byte and verification fails.",
    foot: "CONTEXT: DEPLOYER_WALLET",
  },
  {
    n: "03 // PRIVATE",
    tag: "ZERO CREDENTIALS",
    title: "Nothing else leaves your session.",
    body: "Artemis never sees your login, cookies, or messages. Only your public handle and the proof are stored.",
    foot: "SHARED: HANDLE_ONLY",
  },
] as const;

const PIPELINE = [
  ["SIGN", "Wallet signs a one-time nonce"],
  ["REQUEST", "Artemis issues a zkTLS proof request"],
  ["ATTEST", "Your X session is attested, not shared"],
  ["VERIFY", "Signatures, TEE attestation, freshness, context"],
  ["BADGE", "Public, inspectable, revocable"],
] as const;

const NOT_PROVEN = [
  "Token safety, price, or liquidity",
  "The creator's intentions",
  "That the account stays in the same hands",
  "Real-world identity — this is not KYC",
];

/**
 * Zero-knowledge verification section. Rendered ONLY when
 * NEXT_PUBLIC_ZK_LIVE=1 (no cosmetic ZK claims before production works).
 */
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
        timers = PIPELINE.map((_, i) => setTimeout(() => setLit(i + 1), 350 * (i + 1)));
      },
      { threshold: 0.3 },
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
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="m-0 font-mono text-xs tracking-[0.2em] text-white/50 uppercase">07 // Zero-Knowledge Verification</p>
          <span className="rounded border border-[#fae8a4]/40 bg-[#fae8a4]/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#fae8a4] uppercase">
            zkTLS · Live
          </span>
        </div>

        <h2 className="font-unbounded m-0 mb-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Prove who launched it.
          <br />
          Reveal nothing else.
        </h2>
        <p className="m-0 mb-8 max-w-2xl text-base leading-relaxed text-white/70">
          Creators can prove they control the X account on their launch using zkTLS — no OAuth, no passwords, no data
          handed to Artemis. Each proof is bound to the deployer wallet and open for anyone to inspect.
        </p>

        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <article key={c.n} className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-[#1a1b1f] p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold tracking-wider text-white/50">{c.n}</span>
                <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60 uppercase">
                  {c.tag}
                </span>
              </div>
              <h3 className="m-0 text-xl font-bold text-white">{c.title}</h3>
              <p className="m-0 flex-1 text-sm leading-relaxed text-white/65">{c.body}</p>
              <p className="m-0 font-mono text-[11px] tracking-wider text-[#fae8a4]/80">{c.foot} ↘</p>
            </article>
          ))}
        </div>

        <div className="mb-10 rounded-xl border border-white/10 bg-[#1a1b1f] p-6">
          <p className="m-0 mb-4 font-mono text-xs font-bold tracking-[0.2em] text-white/50">PROOF PIPELINE</p>
          <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-5">
            {PIPELINE.map(([t, c], i) => (
              <li
                key={t}
                className={`rounded-lg border p-3 transition-all ${i < lit ? "border-[#fae8a4]/50 bg-[#fae8a4]/5" : "border-white/10 bg-transparent opacity-50"}`}
              >
                <p className="m-0 mb-1 font-mono text-xs font-bold text-[#fae8a4]">{t}</p>
                <p className="m-0 text-xs leading-relaxed text-white/60">{c}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#1a1b1f] p-6">
            <p className="m-0 mb-3 font-mono text-xs font-bold tracking-[0.2em] text-white/50">LIVE BADGE PREVIEW</p>
            <div className="flex flex-col gap-1.5">
              <span className="text-lg font-bold text-white">$AGNT · Agent Sovereign</span>
              <ZkBadge state="verified" handle="artemis" size="md" />
              <span className="font-mono text-[11px] text-white/40">0x89e5…9eba · bound to deployer</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1a1b1f] p-6">
            <p className="m-0 mb-3 font-mono text-xs font-bold tracking-[0.2em] text-white/50">WHAT THIS DOES NOT PROVE</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-white/70">
              {NOT_PROVEN.map((x) => (
                <li key={x} className="flex gap-2">
                  <span aria-hidden="true" className="text-red-300">
                    ×
                  </span>
                  {x}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-xs leading-relaxed text-white/45">
              Trust model: proofs are signed by Reclaim Protocol attestors with TEE attestation. Not fully trustless.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
