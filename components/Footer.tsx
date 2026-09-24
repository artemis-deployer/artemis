"use client";

import React from 'react';
import Link from 'next/link';
import { HOOD_MAINNET } from '../lib/launcher-evm';
import { TransitionLink } from './PageTransition';
import { FloatingPixels } from './FloatingPixels';

interface FooterProps {
  onOpenSoon?: (feature: string) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer" data-theme="dark">
      <div className="max-w-[1800px] mx-auto w-full relative z-10">
        <div className="footer-cta">
          <h2 className="!max-w-xl lg:!max-w-2xl font-unbounded">
            <span className="block">Deploy where your coin</span>
            <span className="block">isn&apos;t the product.</span>
          </h2>
          <a className="button dark-button" href="#studio">
            LAUNCH STUDIO <span>↗</span>
          </a>
        </div>

        {/* 4-Column Footer Grid */}
        <div className="footer-grid">
          {/* Col 1: Brand & Tagline */}
          <div>
            <p className="label">&#123;ARTEMIS&#125;</p>
            <Link className="brand" href="/" onClick={handleHomeClick} aria-label="Artemis home">
              <img src="/assets/logo.webp" alt="Artemis" />
            </Link>
            <p>
              Autonomous non-custodial token launcher.<br />
              <small>Built for Robinhood Chain &amp; Solana.</small>
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <p className="label">&#123;NAVIGATION&#125;</p>
            <Link href="/" onClick={handleHomeClick}>Home</Link>
            <a href="#how-it-works">How it works</a>
            <a href="#rails">Execution Rails</a>
            <a href="#studio">Launch Studio</a>
            <TransitionLink href="/tokens">Showcase</TransitionLink>
          </div>

          {/* Col 3: Protocol & Resources */}
          <div>
            <p className="label">&#123;PROTOCOL&#125;</p>
            <a href="#about">About</a>
            <a href="#transparency">Transparency</a>
            {process.env.NEXT_PUBLIC_ZK_LIVE === "1" && <a href="#zk">ZK Verify</a>}
            <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">
              Robinhood Chain ↗
            </a>
            <a href="https://solscan.io" target="_blank" rel="noreferrer">
              Solana Explorer ↗
            </a>
            <a
              href={`${HOOD_MAINNET.explorer}/address/${HOOD_MAINNET.router ?? ""}`}
              target="_blank"
              rel="noreferrer"
            >
              Router Contract ↗
            </a>
          </div>

          {/* Col 4: Follow Us / Social Icons */}
          <div>
            <p className="label">&#123;FOLLOW US&#125;</p>
            <div className="footer-social">
              <a
                className="social"
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artemis on X"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L1 2h6.5l5.8 7.7L18.9 2ZM17.8 20h1.7L6.5 4H4.7z" />
                </svg>
              </a>
              <a
                className="social"
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artemis on GitHub"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom Row */}
        <div className="footer-bottom">
          <span>© 2026 Artemis. All rights reserved.</span>
          <span>Non-custodial autonomous launch rails.</span>
          <span>Nothing here is financial advice. Tokens are user-created; do your own research. Availability varies by jurisdiction.</span>
        </div>
      </div>

      {/* Massive Gigantic Watermark Wordmark */}
      <div className="footer-wordmark" aria-hidden="true">
        Artemis
      </div>

      {/* Candlestick Animation at exact bottom baseline of original pixels */}
      <FloatingPixels className="pixels" />
    </footer>
  );
};
