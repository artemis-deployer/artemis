"use client";

import React from 'react';

const disclosures = [
  {
    title: 'Total supply is permanently immutable.',
    desc: 'The ERC20 contract deployed on Robinhood Chain has no mint function and no administrative owner roles. Exactly 999,000,000 tokens are created at genesis. No entity can ever create additional supply.'
  },
  {
    title: 'Direct DEX liquidity tokens are unlocked.',
    desc: 'Upon funding Uniswap V2 on Robinhood Chain, the LP pair tokens are returned directly to your connected wallet. Kentir does not escrow or time-lock LP tokens; management remains sovereign to the creator.'
  },
  {
    title: 'Free rehearsal on testnets is recommended.',
    desc: 'You can test token parameters on Robinhood Testnet (Chain ID 46630) or Solana Devnet completely free before deploying with real mainnet assets.'
  },
  {
    title: 'Zero platform fees and zero transfer taxes.',
    desc: 'Kentir takes 0% platform cut on launches. The smart contracts contain no transfer tax, no marketing tax, and no blacklist hooks.'
  },
  {
    title: 'Client-side custody only.',
    desc: 'Kentir runs as a client-side interface and stateless API proxy. Private keys are never requested, stored, or transmitted. Every onchain interaction requires your explicit wallet signature.'
  },
  {
    title: 'Trading pair creation guarantees no buyers.',
    desc: 'Creating an onchain liquidity pool establishes an open DEX order book, but does not guarantee volume, secondary market interest, or market appreciation. Launch responsibly.'
  }
];

interface TransparencySectionProps {
  onOpenSoon: (feature: string) => void;
}

export const TransparencySection: React.FC<TransparencySectionProps> = () => {
  return (
    <section
      id="transparency"
      data-theme="light"
      className="transparency-section py-28 px-[max(6.25vw,24px)] w-full bg-[#f8f6f0] text-[#18191c]"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Heading & 3D Art Card */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#18191c] mb-4">
                What We<br />Do Not Hide
              </h2>
              <p className="text-[#18191c]/70 text-base sm:text-lg leading-relaxed max-w-sm">
                A non-custodial launchpad must be radically honest regarding contract mechanics, liquidity parameters, and operational boundaries.
              </p>
            </div>

            <a
              href="#studio"
              className="mt-12 group text-left block rounded-lg overflow-hidden border border-[#18191c]/10 bg-white shadow-md hover:shadow-xl transition-all no-underline text-inherit"
            >
              <div className="h-56 overflow-hidden bg-black/5">
                <img
                  src="/assets/terrain.png"
                  alt="Transparent crystalline landscape"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 bg-[#fae8a4] flex justify-between items-center text-sm font-semibold text-[#18191c]">
                <span>Launch in the studio now.</span>
                <span className="text-base group-hover:translate-x-1 transition-transform">↘</span>
              </div>
            </a>
          </div>

          {/* Right Column: Interactive Disclosures Accordion */}
          <div className="lg:col-span-7 divide-y divide-[#18191c]/15">
            {disclosures.map((item, idx) => (
              <details
                key={idx}
                className="group py-5 first:pt-0 cursor-pointer"
                open={idx === 0}
              >
                <summary className="text-lg md:text-xl font-light tracking-tight flex items-center justify-between gap-4 select-none list-none text-[#18191c] hover:opacity-75 transition-opacity">
                  <span>{item.title}</span>
                </summary>
                <p className="mt-3 text-sm text-[#18191c]/75 leading-relaxed pr-8">
                  {item.desc}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Go Deeper Section Navigation */}
        <div className="mt-28 pt-12 border-t border-[#18191c]/10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#18191c]/50 mb-6 font-semibold font-mono">
            GO A LITTLE DEEPER
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { num: '01', label: 'Studio', href: '#studio' },
              { num: '02', label: 'How it works', href: '#how-it-works' },
              { num: '03', label: 'Rails', href: '#rails' },
              { num: '04', label: 'Showcase', href: '/tokens' }
            ].map((link) => (
              <a
                key={link.num}
                href={link.href}
                className="p-4 border border-[#18191c]/10 rounded bg-white/50 hover:bg-[#fae8a4] hover:border-[#fae8a4] transition-all flex justify-between items-center text-sm font-medium text-[#18191c] no-underline"
              >
                <span className="flex items-center gap-2">
                  <small className="font-mono text-xs opacity-50">{link.num}</small>
                  <span>{link.label}</span>
                </span>
                <span>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
