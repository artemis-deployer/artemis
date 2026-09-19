"use client";

import React from 'react';
import { usePageTransition } from './PageTransition';

const techCards = [
  {
    title: 'ROBINHOOD V2 ROUTER',
    symbol: '↗',
    theme: 'tech-card-blue',
    href: '#how-it-works',
  },
  {
    title: 'PUMP.FUN PORTAL',
    symbol: '▣',
    theme: 'tech-card-lavender',
    href: '#how-it-works',
  },
  {
    title: 'FIXED SUPPLY CEILING',
    symbol: '⊞',
    theme: 'tech-card-pink',
    href: '#how-it-works',
  },
  {
    title: 'ZERO PLATFORM TOLL',
    symbol: '◇',
    theme: 'tech-card-pink',
    href: '#how-it-works',
  },
  {
    title: 'LOCAL RECEIPTS',
    symbol: '≋',
    theme: 'tech-card-blue',
    href: '/tokens',
  },
  {
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
            <span>AUTONOMOUS INVARIANTS</span>
          </div>
          <h2 className="font-unbounded text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            The Mechanics of<br />Autonomous Launch Rails
          </h2>
          <p className="mt-4 text-xs sm:text-sm md:text-base text-white/60 max-w-xl mx-auto font-sans leading-relaxed">
            Architectural pillars locking liquidity, eliminating platform extraction, and striking supply in an immutable genesis event.
          </p>
        </div>

        {/* Staggered Tech Grid with Clean Non-Redundant Cards */}
        <div className="tech-grid select-none">
          {techCards.map((card, i) => (
            <a
              key={i}
              href={card.href}
              onClick={(e) => handleClick(e, card.href)}
              className={`${card.theme} group rounded-[3px] border border-black/15 shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-all duration-300`}
            >
              <span className="tracking-wider uppercase font-bold">{card.title}</span>
              <strong className="group-hover:scale-110 transition-transform duration-300 ease-out select-none">
                {card.symbol}
              </strong>
            </a>
          ))}
        </div>

        {/* Bottom Verification Footer Strip */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] sm:text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <span className="text-[#fae8a4]">IMMUTABLE RAIL SPEC</span>
            <span>·</span>
            <span>ZERO ADMIN PRIVILEGE</span>
          </div>
          <div className="flex items-center gap-3 tracking-wider">
            <span>ROBINHOOD EVM</span>
            <span>·</span>
            <span>SOLANA AMM</span>
            <span>·</span>
            <span>NON-CUSTODIAL RUNTIME</span>
          </div>
        </div>
      </div>
    </section>
  );
};
