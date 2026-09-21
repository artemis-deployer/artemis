"use client";

import React, { useEffect, useRef, useState } from 'react';
import { CHAINS, DIRECT_SUPPLY } from '../lib/chains';
import { HOOD_MAINNET } from '../lib/launcher-evm';
import { CandleBars } from './CandleBars';
import { TransitionLink } from './PageTransition';

interface HeroSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routerAddress = HOOD_MAINNET.router ?? ""; // single source: audited Uniswap V2 router

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(routerAddress);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="hero relative min-h-[820px] w-full flex flex-col justify-center items-center text-center px-[max(6.25vw,24px)] pt-36 pb-20 overflow-hidden bg-[#131416]">
      {/* DEX Candlestick & Market Depth Bars */}
      <CandleBars />

      <div className="relative z-10 max-w-[1400px] mx-auto w-full flex flex-col items-center">
        {/* Top Minimal Eyebrow (Flat typography, zero pills, zero dots) */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs font-mono tracking-wider text-white/50 uppercase">
          <span>NON-CUSTODIAL PROTOCOL</span>
          <span className="text-white/20">/</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex cursor-pointer items-center gap-1.5 text-white/70 transition-colors hover:text-[#fae8a4]"
            title="Click to copy Uniswap V2 router address on Robinhood Chain"
          >
            <span className="text-white/40">HOOD V2 ROUTER:</span>
            <span className="font-mono text-[#fae8a4]">
              {copied ? 'COPIED TO CLIPBOARD' : routerAddress ? `${routerAddress.slice(0, 6)}…${routerAddress.slice(-4)}` : 'UNAVAILABLE'}
            </span>
            <span className="text-[11px] text-white/40">⎘</span>
          </button>
        </div>

        {/* Hero Title with Subtle Editorial Depth */}
        <h1 className="font-unbounded text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.04] text-[#f8f6f0] max-w-5xl">
          Deploy sovereign coins<br />
          <span className="text-white/35 font-light">straight from your wallet.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-8 text-base sm:text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
          Autonomous launchpad for Robinhood Chain direct Uniswap V2 pools and Solana pump.fun bonding curves. Zero custody, fixed 999M supply, transparent onchain execution.
        </p>

        {/* Dual Actions */}
        <div className="actions flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 w-full max-w-md sm:max-w-none">
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

        {/* Open Telemetry Strip (Mapped directly to codebase constants) */}
        <div className="mt-20 w-full max-w-4xl border-t border-white/10 pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left font-mono">
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-white/40">Fixed Supply</span>
              <strong className="mt-1 block text-base sm:text-lg font-bold tracking-tight text-[#f8f6f0]">{DIRECT_SUPPLY.toLocaleString('en-US')}</strong>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-white/40">Platform Cut</span>
              <strong className="mt-1 block text-base sm:text-lg font-bold tracking-tight text-[#fae8a4]">0% Zero Toll</strong>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-white/40">Environments</span>
              <strong className="mt-1 block text-base sm:text-lg font-bold tracking-tight text-[#cadcf0]">{CHAINS.length} Networks</strong>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-white/40">Key Custody</span>
              <strong className="mt-1 block text-base sm:text-lg font-bold tracking-tight text-[#f8f6f0]">Client Sovereign</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
