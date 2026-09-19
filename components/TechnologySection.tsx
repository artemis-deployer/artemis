"use client";

import React from 'react';
import { usePageTransition } from './PageTransition';

const techCards = [
  {
    tag: 'EVM 4663',
    title: 'ROBINHOOD V2 ROUTER',
    symbol: '↗',
    theme: 'tech-card-blue',
    href: '#how-it-works',
  },
  {
    tag: 'SOLANA',
    title: 'PUMP.FUN PORTAL',
    symbol: '▣',
    theme: 'tech-card-lavender',
    href: '#how-it-works',
  },
  {
    tag: 'HARDCAP',
    title: '999M FIXED CEILING',
    symbol: '⊞',
    theme: 'tech-card-pink',
    href: '#how-it-works',
  },
  {
    tag: '0.00% FEE',
    title: '0% PLATFORM TOLL',
    symbol: '◇',
    theme: 'tech-card-pink',
    href: '#how-it-works',
  },
  {
    tag: 'EIP-712',
    title: 'LOCAL RECEIPTS',
    symbol: '≋',
    theme: 'tech-card-blue',
    href: '/tokens',
  },
  {
    tag: 'BURN 0xDEAD',
    title: 'SOVEREIGN LP KEYS',
    symbol: '↗',
    theme: 'tech-card-lavender',
    href: '#transparency',
  },
];

export const TechnologySection: React.FC = () => {
  const { navigate } = usePageTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <section
      id="rails"
      data-theme="dark"
      className="technology-section relative py-28 sm:py-36 px-[max(6.25vw,24px)] w-full bg-[#111215] text-[#f8f6f0] overflow-hidden border-t border-white/10"
    >
      {/* Subtle Ambient Radial Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(250,232,164,0.035),transparent_65%)] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto w-full relative z-10">
        {/* Section Header */}
        <div className="center-heading text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center justify-center gap-2 font-mono text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-white/50 mb-3 border-b border-white/15 pb-1">
            <span>CORE ARCHITECTURE</span>
            <span className="text-white/20">/</span>
            <span>SIX DETERMINISTIC INVARIANTS</span>
          </div>
          <h2 className="font-unbounded text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            The Mechanics of<br />Autonomous Launch Rails
          </h2>
          <p className="mt-4 text-xs sm:text-sm md:text-base text-white/60 max-w-xl mx-auto font-sans leading-relaxed">
            Six architectural pillars locking liquidity, eliminating platform extraction, and striking supply in a single immutable genesis event.
          </p>
        </div>

        {/* Original Staggered Tech Grid with Enhanced Polish */}
        <div className="tech-grid select-none">
          {techCards.map((card, i) => (
            <a
              key={i}
              href={card.href}
              onClick={(e) => handleClick(e, card.href)}
              className={`${card.theme} group rounded-[3px] border border-black/15 shadow-[0_10px_35px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.55)] transition-all duration-300`}
            >
              {/* Card Top Pill Tag */}
              <div className="w-full flex items-center justify-between font-mono text-[9px] sm:text-[10px] tracking-wider opacity-70 mb-1 border-b border-black/10 pb-1.5">
                <span className="font-bold tracking-widest">{card.tag}</span>
                <span className="opacity-50">0{i + 1}</span>
              </div>

              {/* Central Large Glyph */}
              <strong className="group-hover:scale-110 transition-transform duration-300 ease-out select-none">
                {card.symbol}
              </strong>

              {/* Bottom Title */}
              <div className="w-full text-center">
                <span className="block font-mono font-bold tracking-wider leading-tight text-xs sm:text-[13px]">
                  {card.title}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Bottom Verification Footer Strip */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] sm:text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <span className="text-[#fae8a4]">IMMUTABLE RAIL SPEC</span>
            <span>·</span>
            <span>ZERO ADMIN CAPABILITY</span>
          </div>
          <div className="flex items-center gap-3 tracking-wider">
            <span>ROBINHOOD CHAIN 4663</span>
            <span>·</span>
            <span>SOLANA AMM</span>
            <span>·</span>
            <span>100% NON-CUSTODIAL</span>
          </div>
        </div>
      </div>
    </section>
  );
};
