"use client";

import React, { useEffect, useRef } from 'react';

interface WorksSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const WorksSection: React.FC<WorksSectionProps> = () => {
  const stackRef = useRef<HTMLDivElement>(null);

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
      className="works-section py-28 px-[max(6.25vw,24px)] w-full bg-[#121218] text-[#f5f3f7]"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
        <div>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white mb-4">
            A sovereign way to launch.
          </h2>
          <p className="text-white/60 text-base md:text-lg max-w-lg leading-relaxed">
            From natural-language drafting to automated liquidity pool funding, you hold absolute custody.
          </p>
        </div>

        <a
          href="#studio"
          className="dp-button"
        >
          <span>TRY LAUNCH STUDIO</span>
          <span className="arrow-box">↘</span>
        </a>
      </div>

      {/* Work Stack (Sticky Stacking Cards) */}
      <div ref={stackRef} className="work-stack space-y-6">
        {/* Card 1 */}
        <article className="work-card sticky top-24 rounded-lg bg-[#b9e2f8] text-[#17131f] grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl transition-transform duration-200">
          <div className="work-copy p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-[#17131f]/70 mb-6">
                <span>THE LAUNCH DRAFT</span>
                <span className="bg-black/10 px-2 py-0.5 rounded font-bold">01</span>
              </div>
              <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-snug mb-4">
                Draft with Copilot.<br />Keep every parameter yours.
              </h3>
              <p className="text-sm md:text-base text-[#17131f]/80 leading-relaxed max-w-md">
                Chat a ticker, community story, or supply split. The AI assistant extracts parameters while leaving you with 100% fine-tuning control.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-10 border-t border-[#17131f]/15 mt-8">
              <div className="border-l-2 border-[#17131f]/20 pl-4">
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mb-1">Total Supply</small>
                <strong className="block text-xl font-medium">999,000,000</strong>
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mt-3 mb-1">Mint Function</small>
                <strong className="block text-xl font-medium">None (Disabled)</strong>
              </div>
              <div className="border-l-2 border-[#17131f]/20 pl-4">
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mb-1">Ownership</small>
                <strong className="block text-xl font-medium">Non-Custodial</strong>
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mt-3 mb-1">Platform Cut</small>
                <strong className="block text-xl font-medium">$0 (Zero)</strong>
              </div>
            </div>
          </div>

          <div className="h-72 md:h-full overflow-hidden bg-black/10 flex items-center justify-center p-6">
            <img
              src="/assets/terrain.png"
              alt="Autonomous launch draft landscape"
              className="w-full h-full object-cover rounded shadow-md"
            />
          </div>
        </article>

        {/* Card 2 */}
        <article className="work-card sticky top-28 rounded-lg bg-[#e4cef7] text-[#17131f] grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl transition-transform duration-200">
          <div className="work-copy p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-[#17131f]/70 mb-6">
                <span>SOVEREIGN LIQUIDITY</span>
                <span className="bg-black/10 px-2 py-0.5 rounded font-bold">02</span>
              </div>
              <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-snug mb-4">
                Two verified rails.<br />Instant onchain markets.
              </h3>
              <p className="text-sm md:text-base text-[#17131f]/80 leading-relaxed max-w-md">
                Deploy directly into standard Uniswap V2 pairs on Robinhood Chain or fair-launch bonding curves on Solana via pump.fun.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-10 border-t border-[#17131f]/15 mt-8">
              <div className="border-l-2 border-[#17131f]/20 pl-4">
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mb-1">EVM Rail</small>
                <strong className="block text-xl font-medium">Uniswap V2</strong>
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mt-3 mb-1">Solana Rail</small>
                <strong className="block text-xl font-medium">pump.fun</strong>
              </div>
              <div className="border-l-2 border-[#17131f]/20 pl-4">
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mb-1">Rehearsal</small>
                <strong className="block text-xl font-medium">Free Testnets</strong>
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mt-3 mb-1">Router State</small>
                <strong className="block text-xl font-medium">Verified</strong>
              </div>
            </div>
          </div>

          <div className="h-72 md:h-full overflow-hidden bg-black/10 flex items-center justify-center p-6">
            <img
              src="/assets/orbital.png"
              alt="Sovereign liquidity orbital"
              className="w-full h-full object-cover rounded shadow-md"
            />
          </div>
        </article>

        {/* Card 3 */}
        <article className="work-card sticky top-32 rounded-lg bg-[#f1d2e8] text-[#17131f] grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl transition-transform duration-200">
          <div className="work-copy p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-[#17131f]/70 mb-6">
                <span>CLIENT-SIDE SIGNATURES</span>
                <span className="bg-black/10 px-2 py-0.5 rounded font-bold">03</span>
              </div>
              <h3 className="font-sans text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-snug mb-4">
                Sign locally.<br />Deploy to the world.
              </h3>
              <p className="text-sm md:text-base text-[#17131f]/80 leading-relaxed max-w-md">
                Every transaction payload is signed through your browser extension. Receipts and contract references are permanently saved in your local store.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-10 border-t border-[#17131f]/15 mt-8">
              <div className="border-l-2 border-[#17131f]/20 pl-4">
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mb-1">Private Keys</small>
                <strong className="block text-xl font-medium">Client Only</strong>
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mt-3 mb-1">Escrow</small>
                <strong className="block text-xl font-medium">None</strong>
              </div>
              <div className="border-l-2 border-[#17131f]/20 pl-4">
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mb-1">Local Receipts</small>
                <strong className="block text-xl font-medium">Indexed</strong>
                <small className="block text-xs uppercase tracking-wider text-[#17131f]/60 mt-3 mb-1">Block Explorer</small>
                <strong className="block text-xl font-medium">Direct Links</strong>
              </div>
            </div>
          </div>

          <div className="h-72 md:h-full overflow-hidden bg-black/10 flex items-center justify-center p-6">
            <img
              src="/assets/pyramids.png"
              alt="Verified client signatures prisms"
              className="w-full h-full object-cover rounded shadow-md"
            />
          </div>
        </article>
      </div>
      </div>
    </section>
  );
};
