"use client";

import React, { useState } from 'react';
import { FloatingPixels } from './FloatingPixels';

interface HeroSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const [copied, setCopied] = useState(false);
  const routerAddress = '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'; // Verified Uniswap V2 Router on Robinhood Chain

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(routerAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="hero relative min-h-[780px] w-full flex flex-col justify-center items-center text-center px-6 md:px-12 pt-36 pb-20 overflow-hidden bg-[#121218]">
      {/* Floating Animated Pixels */}
      <FloatingPixels />

      <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col items-center">
        {/* Router / Network Chip */}
        <button
          type="button"
          onClick={handleCopy}
          className="hero-ca inline-flex items-center gap-2 mb-8 px-4 py-2 border border-white/20 rounded-full bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer text-xs font-mono text-white/90"
        >
          <span className="text-white/60 font-semibold tracking-wider">VERIFIED ROUTER :</span>
          <span className="text-[#e4cef7] font-mono tracking-tight">
            {copied ? 'COPIED TO CLIPBOARD' : routerAddress}
          </span>
        </button>

        {/* Hero Title */}
        <h1 className="font-unbounded text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-[#f5f3f7] max-w-3xl">
          Deploy sovereign coins<br />straight from your wallet.
        </h1>

        {/* Subtitle */}
        <p className="mt-8 text-base sm:text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
          Autonomous launchpad for Robinhood Chain direct Uniswap V2 pools and Solana pump.fun bonding curves. Zero custody, fixed 999M supply, transparent onchain execution.
        </p>

        {/* Dual Actions */}
        <div className="actions flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <a
            href="#studio"
            className="dp-button min-w-[210px]"
          >
            <span>LAUNCH STUDIO</span>
            <span className="arrow-box">↘</span>
          </a>

          <a
            href="#how-it-works"
            className="dp-button secondary min-w-[210px]"
          >
            <span>HOW IT WORKS</span>
            <span className="arrow-box">↘</span>
          </a>
        </div>
      </div>
    </section>
  );
};
