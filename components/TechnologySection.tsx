"use client";

import React from 'react';

const techCards = [
  {
    title: 'ROBINHOOD V2 ROUTER',
    symbol: '↗',
    color: 'border-[#b9e2f8]/30 hover:border-[#b9e2f8] text-[#b9e2f8]',
    offset: 'md:translate-y-0',
    href: '#rails'
  },
  {
    title: 'PUMP.FUN PORTAL',
    symbol: '▣',
    color: 'border-[#e4cef7]/30 hover:border-[#e4cef7] text-[#e4cef7]',
    offset: 'md:-translate-y-12',
    href: '#rails'
  },
  {
    title: '999M FIXED CEILING',
    symbol: '⊞',
    color: 'border-[#f1d2e8]/30 hover:border-[#f1d2e8] text-[#f1d2e8]',
    offset: 'md:translate-y-8',
    href: '#how-it-works'
  },
  {
    title: '0% PLATFORM TOLL',
    symbol: '◇',
    color: 'border-[#f1d2e8]/30 hover:border-[#f1d2e8] text-[#f1d2e8]',
    offset: 'md:translate-y-20',
    href: '#how-it-works'
  },
  {
    title: 'LOCAL RECEIPTS',
    symbol: '≋',
    color: 'border-[#b9e2f8]/30 hover:border-[#b9e2f8] text-[#b9e2f8]',
    offset: 'md:col-start-1 md:translate-y-0',
    href: '/tokens'
  },
  {
    title: 'SOVEREIGN LP KEYS',
    symbol: '↗',
    color: 'border-[#e4cef7]/30 hover:border-[#e4cef7] text-[#e4cef7]',
    offset: 'md:col-start-3 md:translate-y-8',
    href: '#transparency'
  }
];

export const TechnologySection: React.FC = () => {
  return (
    <section
      id="rails"
      data-theme="dark"
      className="technology-section py-28 px-[max(6.25vw,24px)] w-full bg-[#121218] text-[#f5f3f7]"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        <div className="center-heading text-center mb-24">
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
            The Mechanics of<br />Autonomous Launch Rails
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
          {techCards.map((card, i) => (
            <a
              key={i}
              href={card.href}
              className={`group h-56 md:h-64 p-6 border rounded bg-[#18171f] flex flex-col items-center justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-xl no-underline ${card.color} ${card.offset}`}
            >
              <span className="text-xs font-mono uppercase tracking-wider text-center group-hover:text-white transition-colors">
                {card.title}
              </span>
              <strong className="text-6xl md:text-8xl font-thin select-none group-hover:scale-110 transition-transform duration-300">
                {card.symbol}
              </strong>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                VIEW RAIL ↗
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
