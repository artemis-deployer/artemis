"use client";

import React from 'react';
import { usePageTransition } from './PageTransition';

const techCards = [
  {
    title: 'ROBINHOOD V2 ROUTER',
    symbol: '↗',
    theme: 'tech-card-blue',
    href: '#rails',
  },
  {
    title: 'PUMP.FUN PORTAL',
    symbol: '▣',
    theme: 'tech-card-lavender',
    href: '#rails',
  },
  {
    title: '999M FIXED CEILING',
    symbol: '⊞',
    theme: 'tech-card-pink',
    href: '#how-it-works',
  },
  {
    title: '0% PLATFORM TOLL',
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
      className="technology-section py-28 px-[max(6.25vw,24px)] w-full bg-[#121218] text-[#f5f3f7]"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        <div className="center-heading text-center mb-16">
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
            The Mechanics of<br />Autonomous Launch Rails
          </h2>
        </div>

        <div className="tech-grid">
          {techCards.map((card, i) => (
            <a
              key={i}
              href={card.href}
              onClick={(e) => handleClick(e, card.href)}
              className={card.theme}
            >
              <span>{card.title}</span>
              <strong>{card.symbol}</strong>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
