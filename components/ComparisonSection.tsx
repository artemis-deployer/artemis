"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, X, ShieldCheck, ArrowDown } from 'lucide-react';

export const ComparisonSection: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(0);
  const [cardsProgress, setCardsProgress] = useState(0);
  const [distance, setDistance] = useState(500);
  const [riseVal, setRiseVal] = useState(250);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !stageRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const stageHeight = stageRef.current.offsetHeight;
      const totalScrollable = rect.height - stageHeight;
      if (totalScrollable <= 0) return;

      // Exact scroll progress formula
      const isMobile = window.innerWidth <= 700;
      const p = isMobile
        ? Math.max(0, Math.min(1, (80 - rect.top) / (vh * 0.55)))
        : Math.max(0, Math.min(1, (80 - rect.top) / totalScrollable));

      // Title splits first (progress 0.06 to 0.58)
      const s = Math.max(0, Math.min(1, (p - 0.06) / 0.52));
      // Cards rise up (progress 0.14 to 0.68)
      const c = Math.max(0, Math.min(1, (p - 0.14) / 0.54));
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - c, 3);

      const d = isMobile ? window.innerWidth * 0.65 : window.innerWidth * 0.48;
      const r = (1 - ease) * Math.min(250, vh * 0.38);

      setSplit(s);
      setCardsProgress(ease);
      setDistance(d);
      setRiseVal(r);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const scale = 0.88 + cardsProgress * 0.12;

  return (
    <section
      ref={containerRef}
      id="visible-vs-sealed"
      data-theme="dark"
      className="comparison-story scroll-scene relative bg-[#111215] text-[#f8f6f0] border-t border-white/10 overflow-hidden"
      style={{ height: '250svh', minHeight: '1700px' }}
    >
      {/* Ambient background lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(250,232,164,0.035),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div
        ref={stageRef}
        className="comparison-stage sticky top-20 h-[calc(100svh-80px)] min-h-[570px] flex flex-col justify-center items-center overflow-hidden px-[max(6.25vw,24px)]"
      >
        {/* Pinned Splitting Title */}
        <h2 className="comparison-title absolute inset-0 flex items-center justify-center gap-3 sm:gap-5 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-unbounded font-black pointer-events-none z-10 select-none tracking-tight">
          <span
            className="visible-word text-white/40 transition-transform duration-75 will-change-transform"
            style={{
              transform: `translateX(-${split * distance}px)`,
              opacity: Math.max(0, 1 - split)
            }}
          >
            Custodial
          </span>
          <span
            className="versus-word font-mono text-xs sm:text-sm uppercase tracking-widest text-[#fae8a4] px-3 py-1 rounded-full border border-[#fae8a4]/30 bg-[#fae8a4]/10 transition-opacity duration-75"
            style={{ opacity: Math.max(0, 1 - split * 1.5) }}
          >
            vs.
          </span>
          <span
            className="sealed-word text-[#fae8a4] transition-transform duration-75 will-change-transform"
            style={{
              transform: `translateX(${split * distance}px)`,
              opacity: Math.max(0, 1 - split)
            }}
          >
            Artemis
          </span>
        </h2>

        {/* Rising Comparison Cards Grid */}
        <div
          className="compare-grid w-full max-w-[920px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 relative z-20 will-change-transform"
          style={{
            opacity: cardsProgress,
            transform: `translateY(${riseVal}px) scale(${scale})`,
            transformOrigin: '50% 60%',
            pointerEvents: cardsProgress > 0.4 ? 'auto' : 'none'
          }}
        >
          {/* Card 1: Custodial (Legacy Warning Card) */}
          <article className="rounded-2xl bg-[#141518]/90 backdrop-blur-md border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:border-white/20 transition-all duration-300">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] tracking-widest uppercase mb-4 w-fit">
                <X className="w-3 h-3 text-red-400" />
                <span>LEGACY CUSTODIAL RISK</span>
              </div>

              <h3 className="font-unbounded text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">
                The cost of custodial launchpads
              </h3>
              <p className="font-sans text-xs sm:text-sm text-white/50 mb-6 pb-6 border-b border-white/10 leading-relaxed">
                Your community token is trapped in someone else&apos;s smart contract infrastructure.
              </p>

              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white/90">Platform holds the keys</h4>
                    <p className="text-xs text-white/50 leading-relaxed mt-1">
                      Servers custody your liquidity, sign on your behalf, or lock contract ownership behind centralized databases.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-4 border-t border-white/5">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white/90">Hidden mint traps</h4>
                    <p className="text-xs text-white/50 leading-relaxed mt-1">
                      Contracts with mutable owner roles, pause mechanisms, or undisclosed mint privileges that dilute holders.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-4 border-t border-white/5">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white/90">Tolls and listing cuts</h4>
                    <p className="text-xs text-white/50 leading-relaxed mt-1">
                      Hefty creator tax, transaction fees, and arbitrary gatekeeping before your coin can reach open DEX liquidity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Artemis (Sovereign Gold Card) */}
          <article className="rounded-2xl bg-[#fae8a4] text-[#18191c] p-6 sm:p-8 shadow-[0_20px_50px_rgba(250,232,164,0.12)] relative overflow-hidden border border-[#fae8a4] flex flex-col justify-between group">
            {/* Tech watermark accent */}
            <div className="absolute top-4 right-4 font-mono text-[9px] uppercase tracking-widest text-[#18191c]/30 select-none pointer-events-none">
              VERIFIED_RAIL
            </div>

            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18191c]/10 border border-[#18191c]/20 text-[#18191c] font-mono text-[10px] tracking-widest uppercase mb-4 w-fit font-bold">
                <ShieldCheck className="w-3 h-3 text-[#18191c]" />
                <span>ARTEMIS SOVEREIGN SPEC</span>
              </div>

              <h3 className="font-unbounded text-lg sm:text-xl font-bold text-[#18191c] mb-2 tracking-tight">
                Sovereign launch with Artemis
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#18191c]/75 mb-6 pb-6 border-b border-[#18191c]/15 leading-relaxed">
                Every parameter is immutable and executed directly through your personal Web3 wallet.
              </p>

              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#18191c] text-[#fae8a4] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#18191c]">100% Non-Custodial</h4>
                    <p className="text-xs text-[#18191c]/80 leading-relaxed mt-1">
                      Private keys never leave your browser. MetaMask, Phantom, and Solflare sign every deployment call directly.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-4 border-t border-[#18191c]/15">
                  <div className="w-6 h-6 rounded-full bg-[#18191c] text-[#fae8a4] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#18191c]">Fixed 999M Supply</h4>
                    <p className="text-xs text-[#18191c]/80 leading-relaxed mt-1">
                      Minted once in deployment. No mint functions, no administrative owner privileges, no transfer taxes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-4 border-t border-[#18191c]/15">
                  <div className="w-6 h-6 rounded-full bg-[#18191c] text-[#fae8a4] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#18191c]">$0 Platform Fees</h4>
                    <p className="text-xs text-[#18191c]/80 leading-relaxed mt-1">
                      Zero cuts, zero protocol taxes. You pay standard network gas and whatever liquidity you choose to fund.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Scroll prompt cue */}
        <div
          className="comparison-cue absolute bottom-8 flex flex-col items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase select-none transition-opacity duration-300 pointer-events-none"
          style={{ opacity: Math.max(0, 1 - split * 2) }}
        >
          <span className="text-[#fae8a4]/70 font-medium">SCROLL TO SEE THE DIFFERENCE</span>
          <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center bg-white/5 animate-bounce">
            <ArrowDown className="w-3 h-3 text-[#fae8a4]" />
          </div>
        </div>
      </div>
    </section>
  );
};
