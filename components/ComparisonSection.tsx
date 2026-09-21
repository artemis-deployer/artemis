"use client";

import React, { useEffect, useRef, useState } from 'react';

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

      // DarkpoolFi exact scroll progress formula
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
      className="comparison-story scroll-scene relative bg-[#131416] text-[#f8f6f0]"
      style={{ height: '250svh', minHeight: '1700px' }}
    >
      <div
        ref={stageRef}
        className="comparison-stage sticky top-20 h-[calc(100svh-80px)] min-h-[570px] flex flex-col justify-center items-center overflow-hidden px-[max(6.25vw,24px)]"
      >
        {/* Pinned Splitting Title from darkpoolfi.tech */}
        <h2 className="comparison-title font-unbounded absolute inset-0 flex items-center justify-center gap-3.5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold pointer-events-none z-10 select-none tracking-tight">
          <span
            className="visible-word transition-transform duration-75 will-change-transform"
            style={{
              transform: `translateX(-${split * distance}px)`,
              opacity: Math.max(0, 1 - split)
            }}
          >
            Custodial
          </span>
          <span
            className="versus-word text-[#baacc6] font-normal transition-opacity duration-75"
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

        {/* Rising Comparison Cards Grid (900px matching darkpoolfi) */}
        <div
          className="compare-grid w-full max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 relative z-20 will-change-transform"
          style={{
            opacity: cardsProgress,
            transform: `translateY(${riseVal}px) scale(${scale})`,
            transformOrigin: '50% 60%',
            pointerEvents: cardsProgress > 0.4 ? 'auto' : 'none'
          }}
        >
          {/* Card 1: Custodial (Dark, Warning) */}
          <article className="rounded bg-[#1a1b1f] border border-white/10 p-7 md:p-8 shadow-2xl relative overflow-hidden text-[#f1eaf6]">
            <h3 className="text-xl md:text-2xl font-unbounded font-medium text-white mb-2 tracking-tight">
              The cost of custodial launchpads
            </h3>
            <p className="text-sm text-white/60 mb-6 pb-6 border-b border-white/10 leading-relaxed">
              Your community token is trapped in someone else&apos;s smart contract infrastructure.
            </p>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-full border border-white/20 text-[#e4d9ec] flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  ×
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-normal text-white/95">Platform holds the keys</h4>
                  <p className="text-xs text-[#a99daf] leading-relaxed mt-1">
                    Servers custody your liquidity, sign on your behalf, or lock contract ownership behind centralized databases.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 pt-4 sm:pt-5 border-t border-white/10">
                <span className="w-7 h-7 rounded-full border border-white/20 text-[#e4d9ec] flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  ×
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-normal text-white/95">Hidden mint traps</h4>
                  <p className="text-xs text-[#a99daf] leading-relaxed mt-1">
                    Contracts with mutable owner roles, pause mechanisms, or undisclosed mint privileges that dilute holders.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 pt-4 sm:pt-5 border-t border-white/10">
                <span className="w-7 h-7 rounded-full border border-white/20 text-[#e4d9ec] flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  ×
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-normal text-white/95">Tolls and listing cuts</h4>
                  <p className="text-xs text-[#a99daf] leading-relaxed mt-1">
                    Hefty creator tax, transaction fees, and arbitrary gatekeeping before your coin can reach open DEX liquidity.
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Artemis (Buttercream, Success) with darkpoolfi decorative notches */}
          <article className="rounded bg-[#fae8a4] text-[#18191c] p-7 md:p-8 shadow-2xl relative overflow-hidden border border-[#fae8a4]">
            {/* Subtle decorative geometry accents from darkpoolfi */}
            <div className="absolute top-0 left-0 w-12 h-7 bg-[#fae8a4]/40 pointer-events-none" />
            <div className="absolute bottom-[15%] right-0 w-4 h-20 bg-[#fae8a4]/40 pointer-events-none" />

            <h3 className="text-xl md:text-2xl font-unbounded font-medium text-[#18191c] mb-2 tracking-tight">
              Sovereign launch with Artemis
            </h3>
            <p className="text-sm text-[#18191c]/70 mb-6 pb-6 border-b border-[#18191c]/15 leading-relaxed">
              Every parameter is immutable and executed directly through your personal Web3 wallet.
            </p>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-full border border-[#18191c]/30 text-[#18191c] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-[#18191c]">100% Non-Custodial</h4>
                  <p className="text-xs text-[#18191c]/80 leading-relaxed mt-1">
                    Private keys never leave your browser. MetaMask, Phantom, and Solflare sign every deployment call directly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 pt-4 sm:pt-5 border-t border-[#18191c]/15">
                <span className="w-7 h-7 rounded-full border border-[#18191c]/30 text-[#18191c] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-[#18191c]">Fixed 999M Supply</h4>
                  <p className="text-xs text-[#18191c]/80 leading-relaxed mt-1">
                    Minted once in deployment. No mint functions, no administrative owner privileges, no transfer taxes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 pt-4 sm:pt-5 border-t border-[#18191c]/15">
                <span className="w-7 h-7 rounded-full border border-[#18191c]/30 text-[#18191c] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-[#18191c]">$0 Platform Fees</h4>
                  <p className="text-xs text-[#18191c]/80 leading-relaxed mt-1">
                    Zero Artemis cuts, zero token taxes. You pay standard network gas (plus pump.fun creation fees on Solana) and whatever liquidity you choose to fund.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Scroll prompt cue from darkpoolfi */}
        <div
          className="comparison-cue absolute bottom-8 flex flex-col items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-[#887997] select-none transition-opacity duration-300 pointer-events-none"
          style={{ opacity: Math.max(0, 1 - split * 2) }}
        >
          <span>SCROLL TO SEE THE DIFFERENCE</span>
          <i className="not-italic text-2xl text-white/70">↓</i>
        </div>
      </div>
    </section>
  );
};
