"use client";

import React, { useState } from 'react';
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
      className="execution-section py-28 px-[max(6.25vw,24px)] w-full bg-[#f8f6f0] text-[#18191c]"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        {/* Center Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#18191c] mb-4">
            Two Verified Rails.<br />One Transparent Standard.
          </h2>
          <p className="text-[#18191c]/70 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
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
          <div className="inline-flex p-1 bg-[#18191c]/5 border border-[#18191c]/15 rounded">
            <button
              type="button"
              onClick={() => setActiveRail('robinhood')}
              className={`px-6 py-2.5 text-xs md:text-sm font-medium rounded transition-colors cursor-pointer border-0 ${
                activeRail === 'robinhood'
                  ? 'bg-[#18191c] text-white'
                  : 'text-[#18191c]/70 hover:text-[#18191c] bg-transparent'
              }`}
            >
              Robinhood Chain (EVM V2)
            </button>
            <button
              type="button"
              onClick={() => setActiveRail('solana')}
              className={`px-6 py-2.5 text-xs md:text-sm font-medium rounded transition-colors cursor-pointer border-0 ${
                activeRail === 'solana'
                  ? 'bg-[#18191c] text-white'
                  : 'text-[#18191c]/70 hover:text-[#18191c] bg-transparent'
              }`}
            >
              Solana (pump.fun)
            </button>
          </div>
        </div>

        {/* Rail Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Robinhood Rail Card */}
          <article
            className={`rounded p-8 transition-all duration-300 ${
              activeRail === 'robinhood'
                ? 'bg-[#cadcf0] ring-2 ring-[#18191c]/40 shadow-lg'
                : 'bg-[#cadcf0]/60 opacity-80'
            }`}
          >
            <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[#18191c]/70 mb-6">
              <span className="font-semibold">EVM Rail · Uniswap V2</span>
              <span className="text-xl">↗</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/80 p-6 rounded">
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-sans text-2xl sm:text-3xl font-light tracking-tight text-[#18191c] mb-3">
                    Robinhood<br />Chain V2
                  </h3>
                  <p className="text-xs sm:text-sm text-[#18191c]/80 leading-relaxed mb-6">
                    Two-step honest deployment: creates a fixed 999M ERC20 contract, then pairs with ETH via Uniswap V2 Router.
                  </p>
                </div>
                <a
                  href="#studio"
                  className="dp-button dark-button text-xs py-1"
                >
                  <span>LAUNCH ON HOOD</span>
                  <span className="arrow-box">↘</span>
                </a>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[#18191c]/90 border-l border-[#18191c]/15 pl-4 sm:pl-6 my-auto list-none p-0">
                <li className="flex items-center gap-2">⊙ Fixed 999M total supply</li>
                <li className="flex items-center gap-2">⊙ Router {(HOOD_MAINNET.router ?? "").slice(0, 6)}...{(HOOD_MAINNET.router ?? "").slice(-4)}</li>
                <li className="flex items-center gap-2">⊙ Paired with native ETH</li>
                <li className="flex items-center gap-2">⊙ Free testnet rehearsal</li>
                <li className="flex items-center gap-2">⊙ Unlocked LP tokens to creator</li>
              </ul>
            </div>
          </article>

          {/* Solana Rail Card */}
          <article
            className={`rounded p-8 transition-all duration-300 ${
              activeRail === 'solana'
                ? 'bg-[#fae8a4] ring-2 ring-[#18191c]/40 shadow-lg'
                : 'bg-[#fae8a4]/60 opacity-80'
            }`}
          >
            <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[#18191c]/70 mb-6">
              <span className="font-semibold">Solana Rail · PumpPortal</span>
              <span className="text-xl">⊞</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/80 p-6 rounded">
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-sans text-2xl sm:text-3xl font-light tracking-tight text-[#18191c] mb-3">
                    Solana<br />pump.fun
                  </h3>
                  <p className="text-xs sm:text-sm text-[#18191c]/80 leading-relaxed mb-6">
                    Fair-launch bonding-curve rail. Decentralized metadata uploaded to IPFS and signed via Phantom or Solflare.
                  </p>
                </div>
                <a
                  href="#studio"
                  className="dp-button dark-button text-xs py-1"
                >
                  <span>LAUNCH ON SOLANA</span>
                  <span className="arrow-box">↘</span>
                </a>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[#18191c]/90 border-l border-[#18191c]/15 pl-4 sm:pl-6 my-auto list-none p-0">
                <li className="flex items-center gap-2">⊙ 1,000,000,000 bonding curve</li>
                <li className="flex items-center gap-2">⊙ IPFS image and metadata</li>
                <li className="flex items-center gap-2">⊙ Signed via Phantom/Solflare</li>
                <li className="flex items-center gap-2">⊙ Devnet simulation mode</li>
                <li className="flex items-center gap-2">⊙ Automated raydium migration</li>
              </ul>
            </div>
          </article>
        </div>

        {/* Full Width Assurance Card */}
        <article className="rounded p-8 bg-[#ece4d4] text-[#18191c]">
          <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-[#18191c]/70 mb-4">
            <span>Non-Custodial Architecture Assurance</span>
            <span className="text-xl">⊞</span>
          </div>

          <div className="bg-white/80 p-6 md:p-8 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-2xl">
              <h3 className="font-sans text-2xl font-light tracking-tight mb-2">
                Fair, verifiable, and rehearsed.
              </h3>
              <p className="text-sm text-[#18191c]/80 leading-relaxed">
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
