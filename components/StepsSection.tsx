"use client";

import React from 'react';

const steps = [
  {
    num: '01',
    label: 'PROMPT SYNTHESIS',
    badge: 'COPILOT_V1',
    title: 'Draft with Copilot',
    desc: 'Describe your community token or concept in natural language. Kentir extracts name, symbol, supply, and liquidity allocation into a clean review draft.',
    terminal: [
      '> kentir.parse("sovereign coin $KENTIR")',
      '[OK] symbol: $KENTIR | supply: 999M'
    ],
    accent: 'hover:bg-[#ece4d4]/30'
  },
  {
    num: '02',
    label: 'GENESIS TOKENOMICS',
    badge: 'IMMUTABLE',
    title: 'Fixed 999M Supply',
    desc: 'Total supply is minted once at inception. There is no mint function, no administrative backdoor keys, and zero platform transfer tax.',
    terminal: [
      '> token.deploy(supply: 999000000)',
      '[LOCKED] ownership: renounced'
    ],
    accent: 'hover:bg-[#fae8a4]/20'
  },
  {
    num: '03',
    label: 'LIQUIDITY SETTLEMENT',
    badge: 'DUAL_RAILS',
    title: 'Pair Onchain Liquidity',
    desc: 'Deploy initial supply directly into Uniswap V2 on Robinhood Chain or fair-launch bonding curves on Solana pump.fun.',
    terminal: [
      '> router.createPair(0x89e5…9eba)',
      '[ACTIVE] autonomous pool live'
    ],
    accent: 'hover:bg-[#cadcf0]/30'
  },
  {
    num: '04',
    label: 'CLIENT RUNTIME',
    badge: 'NON_CUSTODIAL',
    title: 'Sign from Wallet',
    desc: 'Review gas estimates and sign the deployment transaction in MetaMask, Phantom, or Rabby. Private keys never touch any server.',
    terminal: [
      '> wallet.signTransaction(localKey)',
      '[BROADCAST] tx confirmed onchain'
    ],
    accent: 'hover:bg-[#ece4d4]/30'
  }
];

export const StepsSection: React.FC = () => {
  return (
    <section
      id="how-it-works"
      data-theme="light"
      className="steps-section py-20 sm:py-24 px-[max(6.25vw,24px)] bg-[#f8f6f0] text-[#18191c] overflow-hidden w-full border-t border-[#18191c]/10"
    >
      <div className="max-w-[1400px] mx-auto w-full">
        {/* Section Header */}
        <div className="mb-14 text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-[#18191c]/55 mb-3 border-b border-[#18191c]/15 pb-1">
            <span>// EXECUTION_PIPELINE</span>
            <span className="text-[#18191c]/25">/</span>
            <span>END-TO-END WORKFLOW</span>
          </div>
          <h2 className="font-unbounded text-2xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight text-[#18191c] leading-[1.12]">
            Four Steps from Spark to Pool.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#18191c]/70 max-w-lg leading-relaxed font-sans">
            From conversational prompt to verified DEX pair completely under your cryptographic ownership.
          </p>
        </div>

        {/* Unified Architectural Execution Console (Diverged from DarkpoolFi staggered cards) */}
        <div className="w-full border border-[#18191c]/15 bg-white/70 backdrop-blur-sm rounded-sm shadow-xs overflow-hidden">
          
          {/* Top Sequential Progress Header */}
          <div className="hidden lg:grid grid-cols-4 border-b border-[#18191c]/10 font-mono text-[11px] uppercase tracking-wider text-[#18191c]/60 bg-[#18191c]/[0.02]">
            <div className="px-6 py-3 border-r border-[#18191c]/10 flex items-center justify-between">
              <span className="font-bold text-[#18191c]">01 // STEP ONE</span>
              <span className="text-[#18191c]/30">››</span>
            </div>
            <div className="px-6 py-3 border-r border-[#18191c]/10 flex items-center justify-between">
              <span className="font-bold text-[#18191c]">02 // STEP TWO</span>
              <span className="text-[#18191c]/30">››</span>
            </div>
            <div className="px-6 py-3 border-r border-[#18191c]/10 flex items-center justify-between">
              <span className="font-bold text-[#18191c]">03 // STEP THREE</span>
              <span className="text-[#18191c]/30">››</span>
            </div>
            <div className="px-6 py-3 flex items-center justify-between">
              <span className="font-bold text-[#18191c]">04 // STEP FOUR</span>
              <span className="text-[#18191c]/30">✓</span>
            </div>
          </div>

          {/* 4 Connected Architectural Bays */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#18191c]/10">
            {steps.map((step) => (
              <div
                key={step.num}
                className={`p-6 sm:p-8 flex flex-col justify-between transition-colors duration-200 ${step.accent} group relative`}
              >
                <div>
                  {/* Bay Metadata Bar */}
                  <div className="flex items-center justify-between font-mono text-[11px] mb-6">
                    <span className="font-bold tracking-widest text-[#18191c] text-xs">
                      {step.num} // {step.label}
                    </span>
                    <span className="border border-[#18191c]/20 bg-white/80 px-2 py-0.5 rounded-[2px] text-[10px] text-[#18191c]/70 font-semibold tracking-tight">
                      {step.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-unbounded text-base sm:text-lg font-bold text-[#18191c] tracking-tight mb-3 leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-[13px] text-[#18191c]/75 leading-relaxed mb-6 font-sans">
                    {step.desc}
                  </p>
                </div>

                {/* Micro Terminal Execution Receipt */}
                <div className="mt-4 pt-3 border-t border-[#18191c]/10 font-mono text-[11px] bg-[#18191c]/5 p-3 rounded-[2px] border border-[#18191c]/5 space-y-1 text-[#18191c]/80">
                  <div className="truncate font-semibold text-[#18191c]">{step.terminal[0]}</div>
                  <div className="truncate text-[10px] text-[#18191c]/60">{step.terminal[1]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Principle Strip Marquee (Retained & Smoothly Animated) */}
        <div className="principle-strip mt-14 pt-8 border-t border-[#18191c]/10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[#18191c]/60 whitespace-nowrap font-bold">
            SOVEREIGN PRINCIPLES:
          </p>

          <div className="principle-marquee flex-1 overflow-hidden select-none">
            <div className="principle-track font-mono text-xs sm:text-sm tracking-widest text-[#18191c]/75">
              <span className="px-6">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
              <span className="px-6" aria-hidden="true">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
