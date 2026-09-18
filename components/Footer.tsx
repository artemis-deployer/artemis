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
  return (
    <footer className="footer" data-theme="dark">
      <div className="max-w-[1800px] mx-auto w-full relative z-10">
        {/* Footer CTA Banner with Animated Pixel Notch and Stepped Tabs */}
        <div className="footer-cta">
          <h2>
            Deploy where your coin<br />isn&apos;t the product.
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
            <Link className="brand" href="/">
              <img src="/assets/logo.png" alt="" />
              <span>Artemis</span>
            </Link>
            <p>
              Autonomous non-custodial token launcher.<br />
              <small>Built for Robinhood Chain &amp; Solana.</small>
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <p className="label">&#123;NAVIGATION&#125;</p>
            <Link href="/">Home</Link>
            <a href="#how-it-works">How it works</a>
            <a href="#rails">Execution Rails</a>
            <a href="#studio">Launch Studio</a>
            <TransitionLink href="/tokens">Showcase</TransitionLink>
          </div>

          {/* Col 3: Protocol & Resources */}
          <div>
            <p className="label">&#123;PROTOCOL&#125;</p>
            <a href="#intro">About</a>
            <a href="#transparency">Transparency</a>
            <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">
              Robinhood Chain ↗
            </a>
            <a href="https://solscan.io?cluster=devnet" target="_blank" rel="noreferrer">
              Solana Devnet ↗
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
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artemis on Telegram"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.7 3.3 18.1 21c-.3 1.2-1 1.5-2 .9l-5.5-4.1-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.6L17.5 6c.5-.4-.1-.6-.7-.2L4.2 13.7.8 12.6c-1.2-.4-1.2-1.2.2-1.7L20.1 3c.9-.3 1.9.2 1.6.3Z" />
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
        </div>
      </div>

      {/* Massive Gigantic Watermark Wordmark */}
      <div className="footer-wordmark" aria-hidden="true">
        Artemis
      </div>

      {/* Floating Animated Pixels */}
      <FloatingPixels className="pixels" />
    </footer>
  );
};
