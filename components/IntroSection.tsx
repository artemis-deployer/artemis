"use client";

import React, { useRef } from 'react';
import { DIRECT_SUPPLY } from '../lib/chains';
import { HOOD_MAINNET } from '../lib/launcher-evm';
import { BlockyGridCanvas } from './BlockyGridCanvas';

interface IntroSectionProps {
  onOpenSoon: (feature: string) => void;
}

export const IntroSection: React.FC<IntroSectionProps> = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const routerShort = HOOD_MAINNET.router
    ? `${HOOD_MAINNET.router.slice(0, 6)}…${HOOD_MAINNET.router.slice(-4)}`
    : '0x89e5…9eba';

  return (
    <section
      ref={sectionRef}
      id="about"
      className="intro relative w-full flex flex-col justify-center px-[max(6.25vw,24px)] py-14 sm:py-16 md:py-20 bg-[#ece4d4] text-[#18191c] overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* 3D Three.js Interactive Blocky Grid */}
      <BlockyGridCanvas sectionRef={sectionRef} />

      {/* Radial soft ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(250,232,164,0.3)_0%,transparent_70%)] pointer-events-none -z-10" />

      <div className="relative z-10 max-w-[1320px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Manifesto Statement & Action */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <h2 className="font-unbounded text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-bold tracking-tight leading-[1.1] text-[#18191c]">
              Artemis puts token creation back in your hands.
            </h2>

            <p className="mt-4 text-sm sm:text-base text-[#18191c]/75 leading-relaxed font-sans max-w-xl">
              No platform custody, zero mint backdoors, and zero developer tax. Every transaction compiles locally in-browser and routes directly to your wallet for signing. Launch on Robinhood Chain Uniswap V2 or Solana pump.fun with true cryptographic sovereignty.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a
                href="#studio"
                className="dp-button dark-button min-w-[200px]"
              >
                <span>MEET ARTEMIS STUDIO</span>
                <span className="arrow-box">↘</span>
              </a>
              
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#18191c]/50">
                ZERO ESCROW // ZERO TOLL
              </span>
            </div>
          </div>

          {/* Right Column: 3 Compact Architectural Telemetry Cards */}
          <div className="lg:col-span-6 flex flex-col gap-3 sm:gap-3.5 w-full">
            
            {/* Card 01 */}
            <div className="group border border-[#18191c]/15 bg-white/40 hover:bg-white/70 hover:border-[#18191c]/35 transition-all duration-200 rounded-sm p-4 sm:p-5 backdrop-blur-sm text-left">
              <div className="flex items-center justify-between font-mono text-[10px] sm:text-[11px] text-[#18191c]/50 mb-1.5 tracking-widest uppercase">
                <span className="font-bold text-[#18191c]">01 // CLIENT SIGNING</span>
                <span className="group-hover:text-[#18191c] transition-colors">VERIFIED LOCAL</span>
              </div>
              <h3 className="font-unbounded text-sm sm:text-base font-semibold text-[#18191c] tracking-tight mb-1">
                Local Keypair Sovereignty
              </h3>
              <p className="text-xs sm:text-[13px] text-[#18191c]/70 leading-relaxed">
                Transactions compile in-browser and route to Phantom or MetaMask. Keys never leave your device.
              </p>
            </div>

            {/* Card 02 */}
            <div className="group border border-[#18191c]/15 bg-white/40 hover:bg-white/70 hover:border-[#18191c]/35 transition-all duration-200 rounded-sm p-4 sm:p-5 backdrop-blur-sm text-left">
              <div className="flex items-center justify-between font-mono text-[10px] sm:text-[11px] text-[#18191c]/50 mb-1.5 tracking-widest uppercase">
                <span className="font-bold text-[#18191c]">02 // FIXED SUPPLY</span>
                <span className="font-mono text-[#18191c]/70 group-hover:text-[#18191c]">{DIRECT_SUPPLY.toLocaleString('en-US')}</span>
              </div>
              <h3 className="font-unbounded text-sm sm:text-base font-semibold text-[#18191c] tracking-tight mb-1">
                Immutable Genesis Mint
              </h3>
              <p className="text-xs sm:text-[13px] text-[#18191c]/70 leading-relaxed">
                Ownership renounced on deploy with zero auxiliary mint functions. Strictly fixed at 999,000,000 supply.
              </p>
            </div>

            {/* Card 03 */}
            <div className="group border border-[#18191c]/15 bg-white/40 hover:bg-white/70 hover:border-[#18191c]/35 transition-all duration-200 rounded-sm p-4 sm:p-5 backdrop-blur-sm text-left">
              <div className="flex items-center justify-between font-mono text-[10px] sm:text-[11px] text-[#18191c]/50 mb-1.5 tracking-widest uppercase">
                <span className="font-bold text-[#18191c]">03 // LIQUIDITY SETTLEMENT</span>
                <span className="font-mono text-[#18191c]/70 group-hover:text-[#18191c]">{routerShort}</span>
              </div>
              <h3 className="font-unbounded text-sm sm:text-base font-semibold text-[#18191c] tracking-tight mb-1">
                Direct DEX Routing
              </h3>
              <p className="text-xs sm:text-[13px] text-[#18191c]/70 leading-relaxed">
                Direct Robinhood Chain Uniswap V2 router & Solana pump.fun bonding curves. 0% platform toll.
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
