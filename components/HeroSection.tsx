"use client";

import React, { useState } from 'react';
import { HOOD_MAINNET } from '../lib/launcher-evm';
import { FloatingPixels } from './FloatingPixels';
import { TransitionLink } from './PageTransition';

interface HeroSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const [copied, setCopied] = useState(false);
  const routerAddress = HOOD_MAINNET.router ?? ""; // single source: audited Uniswap V2 router

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(routerAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="hero relative min-h-[820px] w-full flex flex-col justify-center items-center text-center px-[max(6.25vw,24px)] pt-36 pb-24 overflow-hidden bg-[#131416]">
      {/* Floating Animated Pixels */}
      <FloatingPixels />

      <div className="relative z-10 max-w-[1400px] mx-auto w-full flex flex-col items-center border border-white/10 bg-[#1a1b1f]/30 p-8 sm:p-14 lg:p-16">
        {/* Subtle Architectural Corner Crosshairs */}
        <span className="pointer-events-none absolute -top-2.5 -left-2.5 font-mono text-sm leading-none text-white/30" aria-hidden="true">+</span>
        <span className="pointer-events-none absolute -top-2.5 -right-2.5 font-mono text-sm leading-none text-white/30" aria-hidden="true">+</span>
        <span className="pointer-events-none absolute -bottom-2.5 -left-2.5 font-mono text-sm leading-none text-white/30" aria-hidden="true">+</span>
        <span className="pointer-events-none absolute -bottom-2.5 -right-2.5 font-mono text-sm leading-none text-white/30" aria-hidden="true">+</span>

        {/* Top Technical Specification Strip (No pills, crisp rectangular typography) */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono">
          <span className="border border-white/15 bg-white/5 px-3 py-1.5 uppercase tracking-widest text-white/60">
            SPEC: NON-CUSTODIAL LAUNCHPAD
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="group inline-flex cursor-pointer items-center gap-2 border border-white/15 bg-white/5 px-3 py-1.5 transition-all hover:border-[#fae8a4]/50 hover:bg-white/10"
            title="Click to copy Uniswap V2 router address"
          >
            <span className="text-white/40 uppercase tracking-wider">ROUTER</span>
            <span className="font-mono text-[#fae8a4]">
              {copied ? 'COPIED TO CLIPBOARD' : routerAddress}
            </span>
            <span className="text-xs text-white/40 group-hover:text-[#fae8a4]">⎘</span>
          </button>
        </div>

        {/* Hero Title */}
        <h1 className="font-unbounded text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-[#f8f6f0] max-w-4xl">
          Deploy sovereign coins<br />straight from your wallet.
        </h1>

        {/* Subtitle */}
        <p className="mt-7 text-base sm:text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
          Autonomous launchpad for Robinhood Chain direct Uniswap V2 pools and Solana pump.fun bonding curves. Zero custody, fixed 999M supply, transparent onchain execution.
        </p>

        {/* Dual Actions */}
        <div className="actions flex flex-col sm:flex-row items-center justify-center gap-4 mt-9 w-full max-w-md sm:max-w-none">
          <a
            href="#studio"
            className="dp-button min-w-[210px]"
          >
            <span>LAUNCH ONCHAIN</span>
            <span className="arrow-box">↘</span>
          </a>

          <TransitionLink
            href="/tokens"
            className="dp-button secondary min-w-[210px]"
          >
            <span>EXPLORE SHOWCASE</span>
            <span className="arrow-box">↗</span>
          </TransitionLink>
        </div>

        {/* Technical Telemetry Ledger Strip (Tabular rectangular grid) */}
        <div className="mt-14 w-full border border-white/10 bg-[#131416]/80 text-left">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/10 font-mono">
            <div className="p-4 sm:p-5">
              <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider text-white/40">Total Supply</span>
              <strong className="mt-1 block text-sm sm:text-base font-semibold tracking-tight text-[#f8f6f0]">999M Fixed</strong>
            </div>
            <div className="p-4 sm:p-5">
              <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider text-white/40">Platform Cut</span>
              <strong className="mt-1 block text-sm sm:text-base font-semibold tracking-tight text-[#fae8a4]">0% Zero Toll</strong>
            </div>
            <div className="p-4 sm:p-5">
              <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider text-white/40">Execution Rails</span>
              <strong className="mt-1 block text-sm sm:text-base font-semibold tracking-tight text-[#cadcf0]">Hood V2 + Solana</strong>
            </div>
            <div className="p-4 sm:p-5">
              <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider text-white/40">Key Custody</span>
              <strong className="mt-1 block text-sm sm:text-base font-semibold tracking-tight text-[#f8f6f0]">Client Sovereign</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
