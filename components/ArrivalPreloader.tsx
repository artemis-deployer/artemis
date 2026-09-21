"use client";

import React, { useEffect, useState } from 'react';

export const ArrivalPreloader: React.FC = () => {
  const [stage, setStage] = useState<'pending' | 'ready' | 'hidden'>('pending');

  useEffect(() => {
    // Check reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion check
      setStage('hidden');
      return;
    }

    // Set arrival-pending so hero/headings are paused behind the sheet
    document.body.classList.add('arrival-pending');

    const timer1 = setTimeout(() => {
      document.body.classList.remove('arrival-pending');
      setStage('ready');
    }, 1450);

    const timer2 = setTimeout(() => {
      setStage('hidden');
    }, 2300);

    // Absolute failsafe: guarantees body is released and preloader hidden even if delayed
    const failsafe = setTimeout(() => {
      document.body.classList.remove('arrival-pending');
      setStage('hidden');
    }, 3200);

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        document.body.classList.remove('arrival-pending');
        setStage('hidden');
      }
    };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(failsafe);
      window.removeEventListener('pageshow', onPageShow);
      document.body.classList.remove('arrival-pending');
    };
  }, []);

  if (stage === 'hidden') return null;

  return (
    <div className={`arrival ${stage === 'ready' ? 'arrival-ready' : ''}`} aria-hidden="true">
      <div className="arrival-paper font-sans">
        <div className="arrival-masthead flex justify-between items-center text-[10px] tracking-[0.14em] text-[#18191c]/60">
          <span className="arrival-brand flex items-center">
            <img src="/assets/logo.webp" className="h-7 w-auto object-contain [filter:invert(1)]" alt="Artemis" />
          </span>
          <span>AUTONOMOUS LAUNCHPAD · ROBINHOOD & SOLANA</span>
        </div>

        <div className="arrival-composition my-auto py-8">
          <p className="arrival-kicker text-[10px] tracking-[0.18em] text-[#18191c]/60 mb-6 font-semibold">
            NON-CUSTODIAL LIQUIDITY DIRECTLY FROM YOUR WALLET
          </p>
          <div className="arrival-statement font-unbounded text-5xl md:text-8xl lg:text-9xl tracking-tight leading-none text-[#18191c] flex flex-col items-start font-bold">
            <span>Your next</span>
            <span className="arrival-redacted relative">
              coin is
              <span className="arrival-redaction">
                <i className="not-italic text-xs tracking-[0.28em] text-[#fae8a4]">SOVEREIGN</i>
                <b className="text-3xl font-light text-[#fae8a4]">↗</b>
              </span>
            </span>
            <span>yours.</span>
          </div>
          <div className="arrival-caption mt-6 flex gap-4 items-center text-[#18191c]/60">
            <span className="arrival-caption-rule w-8 h-[1px] bg-[#18191c]/30"></span>
            <p className="text-xs">From spark to liquidity pool.<br />Completely self-custodied.</p>
          </div>
        </div>

        <div className="arrival-colophon flex justify-between gap-6 border-t border-[#18191c]/15 pt-4 text-[10px] tracking-[0.14em] text-[#18191c]/60">
          <span>FIXED 999M SUPPLY · ZERO TAXES</span>
          <span>ARTEMIS PROTOCOL</span>
        </div>
      </div>
    </div>
  );
};
