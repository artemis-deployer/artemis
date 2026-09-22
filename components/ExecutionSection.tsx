"use client";

import React, { useState } from 'react';
import { Check, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { HOOD_MAINNET } from '../lib/launcher-evm';
import { TransitionLink } from './PageTransition';

interface ExecutionSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const ExecutionSection: React.FC<ExecutionSectionProps> = () => {
  const [activeRail, setActiveRail] = useState<'robinhood' | 'solana'>('robinhood');

  return (
    <section
      id="execution"
      data-theme="light"
      className="execution-section py-28 px-[max(6.25vw,24px)] w-full bg-[#f8f6f0] text-[#18191c] border-t border-[#18191c]/10"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        {/* Center Heading */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h2 className="font-unbounded text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight text-[#18191c] mb-4 leading-[1.2]">
            <span className="block">Two Launch Rails.</span>
            <span className="block">One Transparent Standard.</span>
          </h2>
          <p className="font-sans text-[#18191c]/70 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Choose your execution rail. Both paths guarantee client-side transaction compilation and non-custodial wallet signatures.
          </p>
          <div className="mt-8">
            <a
              href="#studio"
              className="dp-button dark-button"
            >
              <span>CONFIGURE IN STUDIO</span>
              <span className="arrow-box">↘</span>
            </a>
          </div>
        </div>

        {/* Rail Toggle Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 bg-[#18191c]/5 border border-[#18191c]/15 rounded-full backdrop-blur-sm shadow-inner">
            <button
              type="button"
              onClick={() => setActiveRail('robinhood')}
              className={`px-6 py-2.5 text-xs md:text-sm font-medium rounded-full transition-all duration-300 cursor-pointer border-0 font-mono tracking-wide ${
                activeRail === 'robinhood'
                  ? 'bg-[#18191c] text-white shadow-md'
                  : 'text-[#18191c]/70 hover:text-[#18191c] bg-transparent'
              }`}
            >
              Robinhood Chain (EVM V2)
            </button>
            <button
              type="button"
              onClick={() => setActiveRail('solana')}
              className={`px-6 py-2.5 text-xs md:text-sm font-medium rounded-full transition-all duration-300 cursor-pointer border-0 font-mono tracking-wide ${
                activeRail === 'solana'
                  ? 'bg-[#18191c] text-white shadow-md'
                  : 'text-[#18191c]/70 hover:text-[#18191c] bg-transparent'
              }`}
            >
              Solana (pump.fun) (soon)
            </button>
          </div>
        </div>

        {/* Rail Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Robinhood Rail Card */}
          <article
            className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${
              activeRail === 'robinhood'
                ? 'bg-[#cadcf0] border-[#cadcf0] shadow-[0_16px_40px_rgba(202,220,240,0.45)] ring-2 ring-[#18191c]/30'
                : 'bg-[#cadcf0]/60 border-transparent opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[#18191c]/70 mb-6">
              <span className="font-semibold">EVM Rail · Uniswap V2</span>
              <div className="w-7 h-7 rounded-full bg-[#18191c]/5 border border-[#18191c]/10 flex items-center justify-center text-[#18191c]">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/90 backdrop-blur-sm p-6 sm:p-7 rounded-xl border border-white/60 shadow-sm">
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-unbounded text-xl sm:text-2xl font-bold tracking-tight text-[#18191c] mb-3 leading-tight">
                    Robinhood<br />Chain V2
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#18191c]/80 leading-relaxed mb-6">
                    One-transaction launcher: deploys a fixed 999M ERC20 and pairs with ETH via Uniswap V2 Router atomically.
                  </p>
                </div>
                <a
                  href="#studio"
                  className="dp-button dark-button text-xs py-1.5 px-4 w-fit"
                >
                  <span>LAUNCH ON HOOD</span>
                  <span className="arrow-box">↘</span>
                </a>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[#18191c]/90 border-l border-[#18191c]/15 pl-4 sm:pl-6 my-auto list-none p-0">
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Fixed 999M total supply</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Router {(HOOD_MAINNET.router ?? "").slice(0, 6)}...{(HOOD_MAINNET.router ?? "").slice(-4)}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Paired with native ETH</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Free testnet rehearsal</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Unlocked LP tokens to creator</span>
                </li>
              </ul>
            </div>
          </article>

          {/* Solana Rail Card */}
          <article
            className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${
              activeRail === 'solana'
                ? 'bg-[#fae8a4] border-[#fae8a4] shadow-[0_16px_40px_rgba(250,232,164,0.45)] ring-2 ring-[#18191c]/30'
                : 'bg-[#fae8a4]/60 border-transparent opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[#18191c]/70 mb-6">
              <span className="font-semibold">Solana Rail · PumpPortal</span>
              <div className="w-7 h-7 rounded-full bg-[#18191c]/5 border border-[#18191c]/10 flex items-center justify-center text-[#18191c]">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/90 backdrop-blur-sm p-6 sm:p-7 rounded-xl border border-white/60 shadow-sm">
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-unbounded text-xl sm:text-2xl font-bold tracking-tight text-[#18191c] mb-3 leading-tight">
                    Solana<br />pump.fun
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#18191c]/80 leading-relaxed mb-6">
                    Fair-launch bonding-curve rail. Decentralized metadata uploaded to IPFS and signed via Phantom or Solflare.
                  </p>
                </div>
                <a
                  href="#studio"
                  className="dp-button dark-button text-xs py-1.5 px-4 w-fit"
                >
                  <span>LAUNCH ON SOLANA</span>
                  <span className="arrow-box">↘</span>
                </a>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[#18191c]/90 border-l border-[#18191c]/15 pl-4 sm:pl-6 my-auto list-none p-0">
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>1,000,000,000 bonding curve</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>IPFS image and metadata</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Signed via Phantom/Solflare</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Devnet drill-mint mode</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#18191c]/10 text-[#18191c] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>Automated raydium migration</span>
                </li>
              </ul>
            </div>
          </article>
        </div>

        {/* Full Width Assurance Card */}
        <article className="rounded-2xl p-6 sm:p-8 bg-[#ece4d4]/90 border border-[#18191c]/10 shadow-sm text-[#18191c]">
          <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[#18191c]/70 mb-5">
            <span className="font-semibold">Non-Custodial Architecture Assurance</span>
            <ShieldCheck className="w-5 h-5 text-[#18191c]/70" />
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-xl border border-white/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-2xl">
              <h3 className="font-unbounded text-xl sm:text-2xl font-bold tracking-tight mb-2 text-[#18191c]">
                Fair, verifiable, and rehearsed.
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#18191c]/80 leading-relaxed">
                Robinhood Testnet and Solana Devnet let you rehearse token creation before spending real mainnet assets. Every deployment receipt is recorded in browser storage with direct links to official block explorers.
              </p>
            </div>

            <TransitionLink
              href="/tokens"
              className="dp-button dark-button whitespace-nowrap flex-shrink-0"
            >
              <span>BROWSE SHOWCASE</span>
              <span className="arrow-box">↗</span>
            </TransitionLink>
          </div>
        </article>
      </div>
    </section>
  );
};
