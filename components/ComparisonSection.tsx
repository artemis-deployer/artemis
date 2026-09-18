"use client";

import React, { useEffect, useRef, useState } from 'react';

export const ComparisonSection: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);
  const [split, setSplit] = useState(0);
  const [cardsProgress, setCardsProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const totalScrollable = rect.height - vh;
      if (totalScrollable <= 0) return;

      const progress = Math.max(0, Math.min(1, -rect.top / totalScrollable));

      // Title splits first (progress 0.05 to 0.55)
      const s = Math.max(0, Math.min(1, (progress - 0.05) / 0.5));
      // Cards rise up (progress 0.15 to 0.7)
      const c = Math.max(0, Math.min(1, (progress - 0.15) / 0.55));
      const ease = 1 - Math.pow(1 - c, 3);

      setSplit(s);
      setCardsProgress(ease);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [distance, setDistance] = useState(500);

  useEffect(() => {
    const updateDistance = () => {
      setDistance(window.innerWidth <= 768 ? window.innerWidth * 0.45 : 550);
    };
    updateDistance();
    window.addEventListener('resize', updateDistance);
    return () => window.removeEventListener('resize', updateDistance);
  }, []);

  const rise = (1 - cardsProgress) * 220;
  const scale = 0.88 + cardsProgress * 0.12;

  return (
    <section
      ref={containerRef}
      id="visible-vs-sealed"
      data-theme="dark"
      className="comparison-story scroll-scene relative bg-[#121218] text-[#f5f3f7]"
      style={{ height: '240vh' }}
    >
      <div className="comparison-stage sticky top-20 h-[calc(100vh-80px)] min-h-[580px] flex flex-col justify-center items-center overflow-hidden px-[max(6.25vw,24px)]">
        {/* Splitting Title */}
        <h2 className="comparison-title font-sans absolute inset-0 flex items-center justify-center gap-4 text-4xl sm:text-5xl md:text-7xl font-light pointer-events-none z-10 select-none">
          <span
            className="visible-word transition-transform duration-75"
            style={{
              transform: `translateX(-${split * distance}px)`,
              opacity: 1 - split
            }}
          >
            Custodial
          </span>
          <span className="opacity-30">vs</span>
          <span
            className="sealed-word transition-transform duration-75 font-unbounded text-3xl sm:text-4xl md:text-6xl font-bold"
            style={{
              transform: `translateX(${split * distance}px)`,
              opacity: 1 - split
            }}
          >
            Kentir
          </span>
        </h2>

        {/* Rising Comparison Cards Grid */}
        <div
          className="compare-grid w-full max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20"
          style={{
            opacity: cardsProgress,
            transform: `translateY(${rise}px) scale(${scale})`,
            pointerEvents: cardsProgress > 0.4 ? 'auto' : 'none'
          }}
        >
          {/* Card 1: Custodial (Dark, Warning) */}
          <article className="rounded-lg bg-[#18171f] border border-white/10 p-8 md:p-10 shadow-2xl">
            <h3 className="text-xl md:text-2xl font-light text-white mb-2">
              The cost of custodial launchpads
            </h3>
            <p className="text-sm text-white/60 mb-8 pb-6 border-b border-white/10 leading-relaxed">
              Your community token is trapped in someone else&apos;s smart contract infrastructure.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="w-7 h-7 rounded-full border border-red-400/40 text-red-300 flex items-center justify-center text-sm flex-shrink-0">
                  ×
                </span>
                <div>
                  <h4 className="text-base font-medium text-white/90">Platform holds the keys</h4>
                  <p className="text-xs text-white/60 leading-relaxed mt-1">
                    Servers custody your liquidity, sign on your behalf, or lock contract ownership behind centralized databases.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="w-7 h-7 rounded-full border border-red-400/40 text-red-300 flex items-center justify-center text-sm flex-shrink-0">
                  ×
                </span>
                <div>
                  <h4 className="text-base font-medium text-white/90">Hidden mint traps</h4>
                  <p className="text-xs text-white/60 leading-relaxed mt-1">
                    Contracts with mutable owner roles, pause mechanisms, or undisclosed mint privileges that dilute holders.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="w-7 h-7 rounded-full border border-red-400/40 text-red-300 flex items-center justify-center text-sm flex-shrink-0">
                  ×
                </span>
                <div>
                  <h4 className="text-base font-medium text-white/90">Tolls and listing cuts</h4>
                  <p className="text-xs text-white/60 leading-relaxed mt-1">
                    Hefty creator tax, transaction fees, and arbitrary gatekeeping before your coin can reach open DEX liquidity.
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Kentir (Lavender, Success) */}
          <article className="rounded-lg bg-[#e4cef7] text-[#21172d] p-8 md:p-10 shadow-2xl">
            <h3 className="text-xl md:text-2xl font-light text-[#21172d] mb-2">
              Sovereign launch with Kentir
            </h3>
            <p className="text-sm text-[#21172d]/70 mb-8 pb-6 border-b border-[#21172d]/15 leading-relaxed">
              Every parameter is immutable and executed directly through your personal Web3 wallet.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="w-7 h-7 rounded-full border border-[#21172d]/30 text-[#21172d] flex items-center justify-center text-sm flex-shrink-0 font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="text-base font-semibold text-[#21172d]">100% Non-Custodial</h4>
                  <p className="text-xs text-[#21172d]/80 leading-relaxed mt-1">
                    Private keys never leave your browser. MetaMask, Phantom, and Solflare sign every deployment call directly.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="w-7 h-7 rounded-full border border-[#21172d]/30 text-[#21172d] flex items-center justify-center text-sm flex-shrink-0 font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="text-base font-semibold text-[#21172d]">Fixed 999M Supply</h4>
                  <p className="text-xs text-[#21172d]/80 leading-relaxed mt-1">
                    Minted once in deployment. No mint functions, no administrative owner privileges, no transfer taxes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="w-7 h-7 rounded-full border border-[#21172d]/30 text-[#21172d] flex items-center justify-center text-sm flex-shrink-0 font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="text-base font-semibold text-[#21172d]">$0 Platform Fees</h4>
                  <p className="text-xs text-[#21172d]/80 leading-relaxed mt-1">
                    Zero cuts, zero protocol taxes. You pay standard network gas and whatever liquidity you choose to fund.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Scroll prompt cue */}
        <div
          className="absolute bottom-6 flex flex-col items-center gap-2 text-xs tracking-[0.2em] uppercase text-white/50 select-none transition-opacity duration-300"
          style={{ opacity: Math.max(0, 1 - split * 2) }}
        >
          <span>SCROLL TO SEE THE DIFFERENCE</span>
          <span className="text-lg animate-bounce">↓</span>
        </div>
      </div>
    </section>
  );
};
