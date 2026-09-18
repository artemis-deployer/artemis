"use client";

import React, { useEffect, useRef } from 'react';
import { DIRECT_SUPPLY } from '../lib/chains';
import { HOOD_MAINNET } from '../lib/launcher-evm';

interface WorksSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const WorksSection: React.FC<WorksSectionProps> = () => {
  const stackRef = useRef<HTMLDivElement>(null);
  const routerShort = HOOD_MAINNET.router
    ? `${HOOD_MAINNET.router.slice(0, 6)}…${HOOD_MAINNET.router.slice(-4)}`
    : '0x89e5…9eba';

  useEffect(() => {
    const handleScroll = () => {
      if (!stackRef.current || window.innerWidth <= 768) return;
      const cards = Array.from(stackRef.current.children) as HTMLElement[];
      const vh = window.innerHeight;

      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const rect = next.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(1, (vh - rect.top) / (vh * 0.8)));
        card.style.transform = `scale(${1 - overlap * 0.035})`;
        card.style.filter = `brightness(${1 - overlap * 0.12})`;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      id="how-it-works"
      data-theme="dark"
      className="works-section py-24 sm:py-28 px-[max(6.25vw,24px)] w-full bg-[#131416] text-[#f8f6f0] border-t border-white/10"
    >
      <div className="max-w-[1400px] mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 border-b border-white/10 pb-10">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-white/50 mb-3">
              <span>// ARCHITECTURE_02</span>
              <span className="text-white/20">/</span>
              <span>LIFECYCLE PIPELINE</span>
            </div>
            <h2 className="font-unbounded text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f8f6f0] leading-[1.1]">
              A sovereign way to launch.
            </h2>
            <p className="mt-4 text-white/65 text-base md:text-lg max-w-xl leading-relaxed">
              From natural-language drafting to automated liquidity pool settlement, you hold absolute cryptographic custody at every step.
            </p>
          </div>

          <a
            href="#studio"
            className="dp-button self-start md:self-end"
          >
            <span>TRY LAUNCH STUDIO</span>
            <span className="arrow-box">↘</span>
          </a>
        </div>

        {/* Work Stack (Preserved Sticky Stacking Animation) */}
        <div ref={stackRef} className="work-stack space-y-8">
          
          {/* Card 1: The Launch Draft */}
          <article className="work-card sticky top-24 rounded-sm bg-[#cadcf0] text-[#18191c] grid grid-cols-1 lg:grid-cols-12 overflow-hidden shadow-2xl transition-transform duration-200 border border-[#18191c]/15">
            <div className="lg:col-span-7 p-7 sm:p-10 md:p-12 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-[#18191c]/70 mb-5 pb-3 border-b border-[#18191c]/15">
                  <span className="font-bold">01 // PHASE ONE: GENESIS SPECIFICATION</span>
                  <span className="border border-[#18191c]/25 bg-white/40 px-2 py-0.5 rounded-[2px] text-[10px] font-bold">
                    IMMUTABLE DRAFT
                  </span>
                </div>
                <h3 className="font-unbounded text-2xl sm:text-3xl lg:text-[2.2rem] font-bold tracking-tight leading-[1.15] mb-4 text-[#18191c]">
                  Draft with Copilot.<br />
                  <span className="font-light text-[#18191c]/60">Keep every parameter yours.</span>
                </h3>
                <p className="text-sm md:text-base text-[#18191c]/80 leading-relaxed max-w-xl">
                  Tokenize communities and protocols through natural-language prompts. Kentir&apos;s client copilot parses ticker, supply allocation, and metadata while leaving you with 100% manual review authority before signing.
                </p>
              </div>

              {/* 4-Metric Architectural Telemetry Grid */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-8 border-t border-[#18191c]/15 mt-8 font-mono">
                <div className="border-l-2 border-[#18191c]/25 pl-4">
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mb-1">Total Supply</small>
                  <strong className="block text-lg sm:text-xl font-bold tracking-tight text-[#18191c]">{DIRECT_SUPPLY.toLocaleString('en-US')}</strong>
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mt-3 mb-1">Mint Function</small>
                  <strong className="block text-base sm:text-lg font-semibold text-[#18191c]">Permanently Disabled</strong>
                </div>
                <div className="border-l-2 border-[#18191c]/25 pl-4">
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mb-1">Contract Custody</small>
                  <strong className="block text-lg sm:text-xl font-bold tracking-tight text-[#18191c]">100% Non-Custodial</strong>
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mt-3 mb-1">Platform Cut</small>
                  <strong className="block text-base sm:text-lg font-semibold text-[#18191c]">$0 (Zero Toll)</strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 h-64 lg:h-auto overflow-hidden bg-black/10 flex items-center justify-center p-6 relative">
              <img
                src="/assets/terrain.png"
                alt="Autonomous launch draft landscape"
                className="w-full h-full object-cover rounded-sm shadow-md"
              />
              <span className="absolute bottom-9 right-9 font-mono text-[10px] tracking-widest uppercase bg-black/60 text-white px-2 py-1 rounded-[2px] backdrop-blur-xs">
                SPEC // GENESIS_MAP
              </span>
            </div>
          </article>

          {/* Card 2: Sovereign Liquidity Rails */}
          <article className="work-card sticky top-28 rounded-sm bg-[#fae8a4] text-[#18191c] grid grid-cols-1 lg:grid-cols-12 overflow-hidden shadow-2xl transition-transform duration-200 border border-[#18191c]/15">
            <div className="lg:col-span-7 p-7 sm:p-10 md:p-12 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-[#18191c]/70 mb-5 pb-3 border-b border-[#18191c]/15">
                  <span className="font-bold">02 // PHASE TWO: DUAL-CHAIN ROUTING</span>
                  <span className="border border-[#18191c]/25 bg-white/40 px-2 py-0.5 rounded-[2px] text-[10px] font-bold">
                    ATOMIC ROUTING
                  </span>
                </div>
                <h3 className="font-unbounded text-2xl sm:text-3xl lg:text-[2.2rem] font-bold tracking-tight leading-[1.15] mb-4 text-[#18191c]">
                  Two verified rails.<br />
                  <span className="font-light text-[#18191c]/60">Instant onchain liquidity.</span>
                </h3>
                <p className="text-sm md:text-base text-[#18191c]/80 leading-relaxed max-w-xl">
                  Deploy directly into standard Uniswap V2 liquidity pairs on Robinhood Chain, or instantiate autonomous bonding curves on Solana through PumpPortal. Verified contract bytecode, zero platform escrow.
                </p>
              </div>

              {/* 4-Metric Architectural Telemetry Grid */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-8 border-t border-[#18191c]/15 mt-8 font-mono">
                <div className="border-l-2 border-[#18191c]/25 pl-4">
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mb-1">EVM Mainnet Rail</small>
                  <strong className="block text-lg sm:text-xl font-bold tracking-tight text-[#18191c]">Uniswap V2 ({routerShort})</strong>
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mt-3 mb-1">Solana Engine</small>
                  <strong className="block text-base sm:text-lg font-semibold text-[#18191c]">pump.fun Bonding V1</strong>
                </div>
                <div className="border-l-2 border-[#18191c]/25 pl-4">
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mb-1">Slippage Guard</small>
                  <strong className="block text-lg sm:text-xl font-bold tracking-tight text-[#18191c]">200 BPS Protected</strong>
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mt-3 mb-1">Rehearsal Environment</small>
                  <strong className="block text-base sm:text-lg font-semibold text-[#18191c]">Free Testnets Ready</strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 h-64 lg:h-auto overflow-hidden bg-black/10 flex items-center justify-center p-6 relative">
              <img
                src="/assets/orbital.png"
                alt="Sovereign liquidity orbital"
                className="w-full h-full object-cover rounded-sm shadow-md"
              />
              <span className="absolute bottom-9 right-9 font-mono text-[10px] tracking-widest uppercase bg-black/60 text-white px-2 py-1 rounded-[2px] backdrop-blur-xs">
                AMM // LIQUIDITY_ROUTER
              </span>
            </div>
          </article>

          {/* Card 3: Client-Side Signatures */}
          <article className="work-card sticky top-32 rounded-sm bg-[#ece4d4] text-[#18191c] grid grid-cols-1 lg:grid-cols-12 overflow-hidden shadow-2xl transition-transform duration-200 border border-[#18191c]/15">
            <div className="lg:col-span-7 p-7 sm:p-10 md:p-12 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-[#18191c]/70 mb-5 pb-3 border-b border-[#18191c]/15">
                  <span className="font-bold">03 // PHASE THREE: LOCAL EXECUTION</span>
                  <span className="border border-[#18191c]/25 bg-white/40 px-2 py-0.5 rounded-[2px] text-[10px] font-bold">
                    CLIENT SIGNED
                  </span>
                </div>
                <h3 className="font-unbounded text-2xl sm:text-3xl lg:text-[2.2rem] font-bold tracking-tight leading-[1.15] mb-4 text-[#18191c]">
                  Sign locally.<br />
                  <span className="font-light text-[#18191c]/60">Broadcast to the world.</span>
                </h3>
                <p className="text-sm md:text-base text-[#18191c]/80 leading-relaxed max-w-xl">
                  Every transaction payload compiles client-side and dispatches through your personal browser wallet extension. Private keys never leave your device, and receipts are permanently indexed in your browser store.
                </p>
              </div>

              {/* 4-Metric Architectural Telemetry Grid */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-8 border-t border-[#18191c]/15 mt-8 font-mono">
                <div className="border-l-2 border-[#18191c]/25 pl-4">
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mb-1">Key Custody</small>
                  <strong className="block text-lg sm:text-xl font-bold tracking-tight text-[#18191c]">Client Device Only</strong>
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mt-3 mb-1">Escrow Intermediary</small>
                  <strong className="block text-base sm:text-lg font-semibold text-[#18191c]">Zero Platform Holding</strong>
                </div>
                <div className="border-l-2 border-[#18191c]/25 pl-4">
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mb-1">Receipt Indexing</small>
                  <strong className="block text-lg sm:text-xl font-bold tracking-tight text-[#18191c]">IndexedDB Local Cache</strong>
                  <small className="block text-[11px] uppercase tracking-wider text-[#18191c]/60 mt-3 mb-1">Verification</small>
                  <strong className="block text-base sm:text-lg font-semibold text-[#18191c]">Direct Explorer Link</strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 h-64 lg:h-auto overflow-hidden bg-black/10 flex items-center justify-center p-6 relative">
              <img
                src="/assets/pyramids.png"
                alt="Verified client signatures prisms"
                className="w-full h-full object-cover rounded-sm shadow-md"
              />
              <span className="absolute bottom-9 right-9 font-mono text-[10px] tracking-widest uppercase bg-black/60 text-white px-2 py-1 rounded-[2px] backdrop-blur-xs">
                PROOF // LOCAL_SIGN
              </span>
            </div>
          </article>

        </div>
      </div>
    </section>
  );
};
