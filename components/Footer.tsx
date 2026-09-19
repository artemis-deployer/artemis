"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { HOOD_MAINNET } from '../lib/launcher-evm';
import { TransitionLink } from './PageTransition';
import { CandleBars } from './CandleBars';

interface FooterProps {
  onOpenSoon?: (feature: string) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="footer relative bg-[#111215] text-[#f8f6f0] pt-24 pb-8 overflow-hidden border-t border-white/10" data-theme="dark">
      {/* Background DEX Candlestick & Market Depth Animation (matching Hero) */}
      <CandleBars className="opacity-60" />

      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(250,232,164,0.04),transparent_65%)] pointer-events-none" />

      <div className="max-w-[1800px] mx-auto w-full relative z-10">
        {/* Footer CTA Banner with Animated Pixel Notch and Stepped Tabs */}
        <div className="footer-cta rounded-2xl border border-[#fae8a4]/60 shadow-[0_20px_50px_rgba(250,232,164,0.12)]">
          <div>
            <span className="font-mono text-[10px] tracking-widest uppercase text-[#18191c]/60 font-bold mb-2 block">
              AUTONOMOUS TOKEN RAILS
            </span>
            <h2 className="font-unbounded font-bold tracking-tight text-[#18191c]">
              Deploy where your coin<br />isn&apos;t the product.
            </h2>
          </div>
          <a className="button dark-button group" href="#studio">
            <span>LAUNCH STUDIO</span>
            <span className="arrow-box group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </a>
        </div>

        {/* 4-Column Footer Grid */}
        <div className="footer-grid mt-16">
          {/* Col 1: Brand & Tagline */}
          <div>
            <p className="label font-mono text-xs uppercase tracking-widest text-[#fae8a4]/70 mb-4">&#123;ARTEMIS&#125;</p>
            <Link className="brand flex items-center gap-3 text-2xl font-bold font-unbounded text-white mb-3 no-underline" href="/">
              <img src="/assets/logo.png" alt="Artemis Logo" className="w-8 h-8 rounded-full border border-white/20" />
              <span>Artemis</span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-[280px]">
              Autonomous non-custodial token launcher.<br />
              <small className="text-white/40 block mt-1 font-mono text-xs">Built for Robinhood Chain &amp; Solana.</small>
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <p className="label font-mono text-xs uppercase tracking-widest text-[#fae8a4]/70 mb-4">&#123;NAVIGATION&#125;</p>
            <div className="flex flex-col space-y-2.5">
              <Link href="/" className="text-sm text-white/70 hover:text-[#fae8a4] hover:translate-x-1 transition-all no-underline w-fit">Home</Link>
              <a href="#how-it-works" className="text-sm text-white/70 hover:text-[#fae8a4] hover:translate-x-1 transition-all no-underline w-fit">How it works</a>
              <a href="#rails" className="text-sm text-white/70 hover:text-[#fae8a4] hover:translate-x-1 transition-all no-underline w-fit">Execution Rails</a>
              <a href="#studio" className="text-sm text-white/70 hover:text-[#fae8a4] hover:translate-x-1 transition-all no-underline w-fit">Launch Studio</a>
              <TransitionLink href="/tokens" className="text-sm text-white/70 hover:text-[#fae8a4] hover:translate-x-1 transition-all no-underline w-fit">Showcase</TransitionLink>
            </div>
          </div>

          {/* Col 3: Protocol & Resources */}
          <div>
            <p className="label font-mono text-xs uppercase tracking-widest text-[#fae8a4]/70 mb-4">&#123;PROTOCOL&#125;</p>
            <div className="flex flex-col space-y-2.5">
              <a href="#intro" className="text-sm text-white/70 hover:text-[#fae8a4] hover:translate-x-1 transition-all no-underline w-fit">About</a>
              <a href="#transparency" className="text-sm text-white/70 hover:text-[#fae8a4] hover:translate-x-1 transition-all no-underline w-fit">Transparency</a>
              <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" className="text-sm text-white/70 hover:text-[#fae8a4] inline-flex items-center gap-1 hover:translate-x-1 transition-all no-underline w-fit">
                <span>Robinhood Chain</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <a href="https://solscan.io?cluster=devnet" target="_blank" rel="noreferrer" className="text-sm text-white/70 hover:text-[#fae8a4] inline-flex items-center gap-1 hover:translate-x-1 transition-all no-underline w-fit">
                <span>Solana Devnet</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <a
                href={`${HOOD_MAINNET.explorer}/address/${HOOD_MAINNET.router ?? ""}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-white/70 hover:text-[#fae8a4] inline-flex items-center gap-1 hover:translate-x-1 transition-all no-underline w-fit"
              >
                <span>Router Contract</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Col 4: Follow Us / Social Icons */}
          <div>
            <p className="label font-mono text-xs uppercase tracking-widest text-[#fae8a4]/70 mb-4">&#123;FOLLOW US&#125;</p>
            <div className="footer-social flex items-center gap-2.5">
              <a
                className="social w-10 h-10 rounded-xl border border-white/10 hover:border-[#fae8a4]/50 hover:bg-[#fae8a4]/10 hover:text-[#fae8a4] transition-all flex items-center justify-center text-white/70"
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artemis on X"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-currentColor">
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L1 2h6.5l5.8 7.7L18.9 2ZM17.8 20h1.7L6.5 4H4.7z" />
                </svg>
              </a>
              <a
                className="social w-10 h-10 rounded-xl border border-white/10 hover:border-[#fae8a4]/50 hover:bg-[#fae8a4]/10 hover:text-[#fae8a4] transition-all flex items-center justify-center text-white/70"
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artemis on Telegram"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-currentColor">
                  <path d="M21.7 3.3 18.1 21c-.3 1.2-1 1.5-2 .9l-5.5-4.1-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.6L17.5 6c.5-.4-.1-.6-.7-.2L4.2 13.7.8 12.6c-1.2-.4-1.2-1.2.2-1.7L20.1 3c.9-.3 1.9.2 1.6.3Z" />
                </svg>
              </a>
              <a
                className="social w-10 h-10 rounded-xl border border-white/10 hover:border-[#fae8a4]/50 hover:bg-[#fae8a4]/10 hover:text-[#fae8a4] transition-all flex items-center justify-center text-white/70"
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Artemis on GitHub"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-currentColor">
                  <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom Row */}
        <div className="footer-bottom border-t border-white/10 mt-16 pt-8 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-white/50">
          <span>© 2026 Artemis. All rights reserved.</span>
          <span className="text-[#fae8a4]/80">Non-custodial autonomous launch rails.</span>
        </div>
      </div>

      {/* Massive Gigantic Watermark Wordmark */}
      <div className="footer-wordmark font-unbounded font-black select-none pointer-events-none" aria-hidden="true">
        Artemis
      </div>
    </footer>
  );
};
