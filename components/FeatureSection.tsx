"use client";

import React, { useRef } from 'react';

const features = [
  {
    index: '01',
    badge: 'IMMUTABLE_SUPPLY',
    rail: 'CHAIN SPEC',
    title: 'FIXED 999M SUPPLY',
    theme: 'bg-[#fae8a4]',
    img: '/assets/orbital.png',
    alt: 'Faceted orbital sphere with neon rings',
    desc: 'Supply is strictly minted once at contract deployment. No mint functions, no administrative backdoor keys.',
    spec: 'SUPPLY: 999,000,000 FIXED'
  },
  {
    index: '02',
    badge: 'UNISWAP_V2_POOL',
    rail: 'ROBINHOOD CHAIN',
    title: 'ROBINHOOD V2 POOLS',
    theme: 'bg-[#ece4d4]',
    img: '/assets/pyramids.png',
    alt: 'Pastel geometric pyramids and prisms',
    desc: 'Deploy fixed-supply tokens directly into Uniswap V2 liquidity pairs with verified contract bytecode.',
    spec: 'ROUTER: 0x89e5…9eba'
  },
  {
    index: '03',
    badge: 'PUMPPORTAL_RAIL',
    rail: 'SOLANA MAINNET',
    title: 'SOLANA PUMP.FUN',
    theme: 'bg-[#cadcf0]',
    img: '/assets/walkways.png',
    alt: 'Suspended architectural walkways in nebula space',
    desc: 'Fair-launch bonding curve rail via PumpPortal. IPFS metadata and transaction bytes built locally in-browser.',
    spec: 'CURVE: BONDING V1'
  },
  {
    index: '04',
    badge: 'NON_CUSTODIAL',
    rail: 'CLIENT RUNTIME',
    title: 'CLIENT-SIDE SIGNATURES',
    theme: 'bg-[#fae8a4]',
    img: '/assets/terrain.png',
    alt: 'Floating crystalline terrain and monoliths',
    desc: 'Every transaction is signed from your personal wallet. The server never touches private keys or custody.',
    spec: 'KEYPAIR: LOCAL RUNTIME'
  },
  {
    index: '05',
    badge: 'TOLL_FREE',
    rail: 'PLATFORM PROTOCOL',
    title: 'ZERO-FEE PROTOCOL',
    theme: 'bg-[#ece4d4]',
    img: '/assets/orbital.png',
    alt: 'Faceted orbital geometry',
    desc: '$0 platform cut. You pay standard network gas and your paired liquidity deposit only.',
    spec: 'PLATFORM CUT: 0% EXACT'
  },
  {
    index: '06',
    badge: 'NATURAL_LANGUAGE',
    rail: 'STUDIO ENGINE',
    title: 'AI COPILOT DRAFTING',
    theme: 'bg-[#cadcf0]',
    img: '/assets/walkways.png',
    alt: 'Floating platforms in cosmos',
    desc: 'Brainstorm concepts and tokenize communities via natural language. Parameters populate your review draft automatically.',
    spec: 'MODEL: ASSISTED DRAFT'
  }
];

export const FeatureSection: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 380;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      id="protocol"
      data-theme="light"
      className="feature-section py-20 sm:py-24 bg-[#f8f6f0] text-[#18191c] overflow-hidden border-t border-[#18191c]/10"
    >
      {/* Centered Header with Telemetry Metadata and Arrow Controls */}
      <div className="max-w-[1400px] mx-auto px-[max(6.25vw,24px)] mb-12 text-center flex flex-col items-center">
        <div className="inline-flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-[#18191c]/55 mb-3 border-b border-[#18191c]/15 pb-1">
          <span>// PROTOCOL_SPEC</span>
          <span className="text-[#18191c]/25">/</span>
          <span>CORE CAPABILITIES</span>
        </div>

        <h2 className="font-unbounded text-2xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight leading-[1.12] text-[#18191c] max-w-3xl">
          Everything You Need for<br />
          <span className="text-[#18191c]/50 font-light">Autonomous Token Launches</span>
        </h2>

        {/* Centered Controls: Spec Index + Smooth Nudge Buttons */}
        <div className="mt-8 flex items-center justify-center gap-3 font-mono text-xs">
          <span className="hidden sm:inline-block px-3 py-1.5 border border-[#18191c]/15 bg-white/60 text-[#18191c]/70 rounded-sm">
            06 MODULES ACTIVE
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-10 h-10 border border-[#18191c]/20 bg-white/80 hover:bg-[#18191c] hover:text-[#f8f6f0] transition-colors flex items-center justify-center rounded-sm font-bold text-sm cursor-pointer shadow-xs"
              aria-label="Previous feature"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-10 h-10 border border-[#18191c]/20 bg-white/80 hover:bg-[#18191c] hover:text-[#f8f6f0] transition-colors flex items-center justify-center rounded-sm font-bold text-sm cursor-pointer shadow-xs"
              aria-label="Next feature"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Deck Track with Continuous Flow & Manual Override */}
      <div
        ref={scrollRef}
        className="feature-viewport overflow-x-auto scrollbar-none cursor-grab active:cursor-grabbing select-none px-[max(6.25vw,24px)]"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="feature-track flex gap-6 w-max">
          {/* Repeat list twice for continuous seamless loop */}
          {[...features, ...features].map((card, idx) => (
            <article
              key={idx}
              className={`feature ${card.theme} w-[325px] sm:w-[365px] p-5 sm:p-6 text-left flex flex-col justify-between rounded-sm border border-[#18191c]/15 shadow-xs hover:-translate-y-1.5 hover:shadow-md transition-all duration-300 relative group flex-shrink-0`}
            >
              {/* Top Technical Metadata Header */}
              <div className="flex items-center justify-between border-b border-[#18191c]/15 pb-2.5 mb-3.5 font-mono text-[11px]">
                <span className="font-bold tracking-wider text-[#18191c]">{card.index} // {card.rail}</span>
                <span className="border border-[#18191c]/20 bg-black/5 px-2 py-0.5 rounded-[2px] tracking-tight uppercase text-[#18191c]/70 text-[10px]">
                  {card.badge}
                </span>
              </div>

              {/* Framed Visual Asset Window - Strictly Identical Dimensions */}
              <div className="w-full h-48 sm:h-52 rounded-sm overflow-hidden border border-[#18191c]/10 bg-black/5 flex items-center justify-center relative mb-4 flex-shrink-0">
                <img
                  src={card.img}
                  alt={card.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
              </div>

              {/* Title & Description */}
              <div className="flex-1 flex flex-col justify-start">
                <h3 className="font-unbounded text-sm sm:text-[15px] font-bold tracking-tight text-[#18191c] leading-snug min-h-[2.6rem] flex items-start mb-2">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-[#18191c]/75 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              {/* Bottom Telemetry Footer */}
              <div className="mt-4 pt-3 border-t border-[#18191c]/10 flex items-center justify-between font-mono text-[10px] text-[#18191c]/60">
                <span>{card.spec}</span>
                <span className="text-[#18191c]/35 group-hover:text-[#18191c] transition-colors">↘</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
