"use client";

import React, { useEffect, useRef } from 'react';
import { findNewCompletion, resetLaunchAmounts, useDraft } from './DraftContext';
import LaunchForm from './LaunchForm';
import ReviewDialog from './ReviewDialog';
import StudioChat from './StudioChat';
import { CHAINS } from '../lib/chains';
import { listReceipts } from '../lib/receipts';

export const StudioSection: React.FC = () => {
  const { draft, setDraft } = useDraft();
  const ref = useRef<HTMLDialogElement>(null);
  const openedAt = useRef<{ at: number; ticker: string } | null>(null);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];

  function openReview() {
    openedAt.current = { at: Date.now(), ticker: draft.ticker };
    ref.current?.showModal();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClose = () => {
      const m = openedAt.current;
      if (!m) return;
      // A receipt saved while open = launch completed: drop amounts, keep identity.
      if (findNewCompletion(m.at, m.ticker, listReceipts())) {
        setDraft((prev) => resetLaunchAmounts(prev));
      }
    };
    el.addEventListener('close', onClose);
    return () => el.removeEventListener('close', onClose);
  }, [setDraft]);

  return (
    <section
      id="studio"
      data-theme="dark"
      className="studio-section py-28 px-[max(6.25vw,24px)] w-full text-[#f8f6f0] relative z-10"
      aria-label="Token Studio"
    >
      <div className="max-w-[1800px] mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#fae8a4] mb-3">
          INTERACTIVE LAUNCHPAD STUDIO
        </p>
        <h2 className="font-unbounded text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Create &amp; Deploy
        </h2>
        <p className="text-white/70 text-base md:text-lg leading-relaxed">
          Co-create your coin with Artemis AI Copilot or fine-tune parameters directly before signing onchain.
        </p>
      </div>

      {/* Main Studio Frame */}
      <div className="rounded-xl border border-white/15 bg-[#1a1b1f] shadow-2xl p-4 sm:p-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <LaunchForm
            onReview={openReview}
          />
        </div>
        <div className="lg:col-span-5">
          <StudioChat />
        </div>

        <ReviewDialog ref={ref} draft={draft} mainnet={!chain.testnet} />
      </div>
      </div>
    </section>
  );
};
