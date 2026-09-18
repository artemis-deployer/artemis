"use client";

import React from 'react';

const features = [
  {
    theme: 'bg-[#e4cef7]',
    title: 'FIXED 999M SUPPLY',
    img: '/assets/orbital.png',
    alt: 'Faceted orbital sphere with neon rings',
    desc: 'Supply is strictly minted once at contract deployment. No mint functions, no administrative backdoor keys.'
  },
  {
    theme: 'bg-[#f1d2e8]',
    title: 'ROBINHOOD V2 POOLS',
    img: '/assets/pyramids.png',
    alt: 'Pastel geometric pyramids and prisms',
    desc: 'Deploy fixed-supply tokens directly into Uniswap V2 liquidity pairs with verified contract bytecode.'
  },
  {
    theme: 'bg-[#b9e2f8]',
    title: 'SOLANA PUMP.FUN',
    img: '/assets/walkways.png',
    alt: 'Suspended architectural walkways in nebula space',
    desc: 'Fair-launch bonding curve rail via PumpPortal. IPFS metadata and transaction bytes built locally in-browser.'
  },
  {
    theme: 'bg-[#e4cef7]',
    title: 'CLIENT-SIDE SIGNATURES',
    img: '/assets/terrain.png',
    alt: 'Floating crystalline terrain and monoliths',
    desc: 'Every transaction is signed from your personal wallet. The server never touches private keys or custody.'
  },
  {
    theme: 'bg-[#f1d2e8]',
    title: 'ZERO PLATFORM FEES',
    img: '/assets/orbital.png',
    alt: 'Faceted orbital geometry',
    desc: '$0 platform cut. You pay standard network gas and your paired liquidity deposit only.'
  },
  {
    theme: 'bg-[#b9e2f8]',
    title: 'AI COPILOT DRAFTING',
    img: '/assets/walkways.png',
    alt: 'Floating platforms in cosmos',
    desc: 'Brainstorm concepts and tokenize communities via natural language. Parameters populate your review draft automatically.'
  }
];

export const FeatureSection: React.FC = () => {
  return (
    <section
      id="protocol"
      data-theme="light"
      className="feature-section py-28 bg-[#f8f7fa] text-[#17131f] overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 mb-16 text-center">
        <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-tight text-[#17131f] max-w-3xl mx-auto">
          Everything You Need for<br />Autonomous Token Launches
        </h2>
      </div>

      <div className="feature-viewport overflow-hidden cursor-grab active:cursor-grabbing select-none">
        <div className="feature-track">
          {/* Render cards twice for infinite seamless CSS marquee loop */}
          {[...features, ...features].map((card, idx) => (
            <article
              key={idx}
              className={`feature ${card.theme} w-[280px] p-6 text-center flex flex-col items-center justify-between rounded shadow-sm hover:-translate-y-1.5 transition-transform duration-300`}
            >
              <h3 className="text-sm font-semibold tracking-wider uppercase text-[#17131f] mb-4">
                {card.title}
              </h3>

              <div className="w-48 h-48 my-4 rounded overflow-hidden flex items-center justify-center">
                <img
                  src={card.img}
                  alt={card.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>

              <p className="text-sm text-[#17131f]/80 leading-relaxed mt-2">
                {card.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
