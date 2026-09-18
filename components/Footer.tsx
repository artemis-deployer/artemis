"use client";

import React from 'react';
import { TransitionLink } from './PageTransition';
import { FloatingPixels } from './FloatingPixels';

interface FooterProps {
  onOpenSoon: (feature: string) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="footer relative bg-[#121218] text-[#f5f3f7] pt-24 pb-12 px-6 md:px-12 overflow-hidden border-t border-white/10">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Top CTA Banner */}
        <div className="footer-cta bg-[#e4cef7] text-[#17131f] p-8 md:p-16 mb-28 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-2xl">
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-light tracking-tight max-w-lg leading-tight">
            Launch where your coin<br />isn&apos;t the product.
          </h2>

          <a
            href="#studio"
            className="dp-button dark-button min-w-[220px]"
          >
            <span>LAUNCH STUDIO</span>
            <span className="arrow-box">↘</span>
          </a>
        </div>

        {/* 4 Column Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 pb-16">
          <div>
            <p className="text-xs uppercase font-mono tracking-widest text-white/50 mb-6">&#123;KENTIR&#125;</p>
            <div className="flex items-center gap-3 text-2xl font-bold tracking-tight mb-4">
              <img src="/assets/logo.png" className="w-8 h-8 rounded-full object-cover" alt="Kentir" />
              <span className="font-unbounded">Kentir</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Autonomous non-custodial token launcher.<br />
              <small className="text-xs text-white/40">Robinhood Chain V2 &amp; Solana pump.fun.</small>
            </p>
          </div>

          <div>
            <p className="text-xs uppercase font-mono tracking-widest text-white/50 mb-6">&#123;NAVIGATION&#125;</p>
            <ul className="space-y-3 text-sm text-white/70 list-none p-0">
              <li><a href="#" className="hover:text-white transition-colors no-underline text-inherit">Home</a></li>
              <li><a href="#studio" className="hover:text-white transition-colors no-underline text-inherit">Launch Studio</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors no-underline text-inherit">How it works</a></li>
              <li><a href="#rails" className="hover:text-white transition-colors no-underline text-inherit">Rails</a></li>
              <li><TransitionLink href="/tokens" className="hover:text-white transition-colors no-underline text-inherit">Showcase</TransitionLink></li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase font-mono tracking-widest text-white/50 mb-6">&#123;RAILS&#125;</p>
            <ul className="space-y-3 text-sm text-white/70 list-none p-0">
              <li>
                <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors no-underline text-inherit">
                  Robinhood Chain ↗
                </a>
              </li>
              <li>
                <a href="https://explorer.testnet.chain.robinhood.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors no-underline text-inherit">
                  Robinhood Testnet ↗
                </a>
              </li>
              <li>
                <a href="https://solscan.io" target="_blank" rel="noreferrer" className="hover:text-white transition-colors no-underline text-inherit">
                  Solana Mainnet ↗
                </a>
              </li>
              <li>
                <a href="https://solscan.io?cluster=devnet" target="_blank" rel="noreferrer" className="hover:text-white transition-colors no-underline text-inherit">
                  Solana Devnet ↗
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase font-mono tracking-widest text-white/50 mb-6">&#123;CONNECT&#125;</p>
            <div className="flex gap-3 mb-6">
              {/* X / Twitter */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded border border-white/20 hover:border-white/60 bg-white/5 flex items-center justify-center transition-colors text-white"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L1 2h6.5l5.8 7.7L18.9 2ZM17.8 20h1.7L6.5 4H4.7z"/>
                </svg>
              </a>

              {/* Telegram */}
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded border border-white/20 hover:border-white/60 bg-white/5 flex items-center justify-center transition-colors text-white"
                aria-label="Telegram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M21.7 3.3 18.1 21c-.3 1.2-1 1.5-2 .9l-5.5-4.1-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.6L17.5 6c.5-.4-.1-.6-.7-.2L4.2 13.7.8 12.6c-1.2-.4-1.2-1.2.2-1.7L20.1 3c.9-.3 1.9.2 1.6.3Z"/>
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded border border-white/20 hover:border-white/60 bg-white/5 flex items-center justify-center transition-colors text-white"
                aria-label="GitHub"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/>
                </svg>
              </a>
            </div>
            <p className="text-xs text-white/50">Follow decentralized launch updates.</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
          <span>Kentir — client-side signed. Zero platform custody.</span>
          <span>Staging software. Rehearse on testnets first.</span>
        </div>
      </div>

      {/* Massive Gigantic Watermark Wordmark */}
      <div
        className="footer-wordmark absolute -bottom-10 -left-6 select-none font-bold text-white/[0.03] text-[18vw] leading-none pointer-events-none whitespace-nowrap font-unbounded"
        aria-hidden="true"
      >
        Kentir
      </div>

      {/* Bottom floating animated pixels */}
      <FloatingPixels className="bottom-0 top-auto h-28 opacity-100" />
    </footer>
  );
};
