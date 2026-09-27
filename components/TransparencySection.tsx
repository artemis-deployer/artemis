"use client";

import React, { useState } from 'react';
import { Plus, Minus, ArrowDownRight, ShieldCheck } from 'lucide-react';

const disclosures = [
  {
    title: 'Total supply is permanently immutable.',
    desc: 'The ERC20 contract deployed on Robinhood Chain has no mint function and no administrative owner roles. Exactly 999,000,000 tokens are created at genesis. No entity can ever create additional supply.'
  },
  {
    title: 'Direct DEX liquidity tokens are unlocked.',
    desc: 'Upon funding Uniswap V2 on Robinhood Chain, the LP pair tokens are returned directly to your connected wallet. Artemis does not escrow or time-lock LP tokens; management remains sovereign to the creator.'
  },
  {
    title: 'Free rehearsal on testnets is recommended.',
    desc: 'You can test token parameters on Robinhood Testnet (Chain ID 46630) or Solana Devnet completely free before deploying with real mainnet assets.'
  },
  {
    title: 'Zero platform fees and zero transfer taxes.',
    desc: 'Artemis takes 0% platform cut on launches. The smart contracts contain no transfer tax, no marketing tax, and no blacklist hooks.'
  },
  {
    title: 'Client-side custody only.',
    desc: 'Artemis runs as a client-side interface and API proxy. Private keys and account credentials are never requested, stored, or transmitted. For optional ZK verification, Artemis stores only public handles, wallet addresses, and proofs. Every onchain interaction requires your explicit wallet signature.'
  },
  {
    title: 'ZK verification proves an account, not a promise.',
    desc: 'A ZK VERIFIED badge means the deployer wallet proved control of the listed X account at the time shown. It says nothing about the token\u2019s value or the creator\u2019s intentions. Proofs rely on Reclaim Protocol attestors and TEE attestation. Artemis stores the public handle, bound wallet, and proof so anyone can inspect them.'
  },
  {
    title: 'No buyers guaranteed at launch.',
    desc: 'Creating an onchain liquidity pool establishes an open DEX order book, but does not guarantee volume, secondary market interest, or market appreciation. Launch responsibly.'
  }
];

interface TransparencySectionProps {
  onOpenSoon: (feature: string) => void;
}

export const TransparencySection: React.FC<TransparencySectionProps> = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section
      id="transparency"
      data-theme="light"
      className="transparency-section py-28 px-[max(6.25vw,24px)] w-full bg-[#f8f6f0] text-[#18191c] border-t border-[#18191c]/10"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Heading & 3D Art Card */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18191c]/5 border border-[#18191c]/10 text-[#18191c] font-mono text-[10px] tracking-widest uppercase mb-4 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-[#18191c]" />
                <span>RADICAL TRANSPARENCY</span>
              </div>

              <h2 className="font-unbounded text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#18191c] mb-4 leading-[1.15]">
                What We<br />Do Not Hide
              </h2>
              <p className="font-sans text-[#18191c]/70 text-sm sm:text-base leading-relaxed max-w-sm">
                A non-custodial launchpad must be radically honest regarding contract mechanics, liquidity parameters, and operational boundaries.
              </p>
            </div>

            <a
              href="#studio"
              className="mt-10 group text-left block rounded-2xl overflow-hidden border border-[#18191c]/10 bg-white shadow-sm hover:shadow-xl transition-all duration-300 no-underline text-inherit"
            >
              <div className="h-56 overflow-hidden bg-black/5">
                <img
                  src="/assets/works_step2.png"
                  alt="Interactive launch studio synthesizer console"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 bg-[#fae8a4] flex justify-between items-center text-sm font-bold text-[#18191c]">
                <span>Launch in the studio now</span>
                <div className="w-7 h-7 rounded-full bg-[#18191c]/10 flex items-center justify-center text-[#18191c] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
            </a>
          </div>

          {/* Right Column: Interactive Disclosures Accordion */}
          <div className="lg:col-span-7 divide-y divide-[#18191c]/15">
            {disclosures.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} className="py-5 first:pt-0">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(idx)}
                    className="w-full text-left text-base sm:text-lg font-semibold tracking-tight flex items-center justify-between gap-4 select-none text-[#18191c] hover:opacity-80 transition-opacity bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <span>{item.title}</span>
                    <span
                      className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0 ${
                        isOpen
                          ? 'bg-[#18191c] text-white border-[#18191c]'
                          : 'bg-[#18191c]/5 text-[#18191c] border-[#18191c]/10 hover:bg-[#18191c]/10'
                      }`}
                    >
                      {isOpen ? (
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100 mt-3'
                        : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-sm text-[#18191c]/75 leading-relaxed pr-6 font-sans">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
