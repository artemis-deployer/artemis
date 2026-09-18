"use client";

import React, { useEffect, useRef, useState } from 'react';
import { findNewCompletion, resetLaunchAmounts, useDraft } from './DraftContext';
import LaunchForm from './LaunchForm';
import ReviewDialog from './ReviewDialog';
import StudioChat from './StudioChat';
import { CHAINS } from '../lib/chains';
import { validateDraft } from '../lib/draft';
import { listReceipts } from '../lib/receipts';

export const StudioSection: React.FC = () => {
  const { draft, setDraft, consent } = useDraft();
  const ref = useRef<HTMLDialogElement>(null);
  const openedAt = useRef<{ at: number; ticker: string } | null>(null);
  const [tab, setTab] = useState<'copilot' | 'manual'>('copilot');
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  const mainnet = !chain.testnet;
  const errors = validateDraft(draft);
  const gated = errors.length > 0 || (mainnet && !consent);

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

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-full">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'copilot'}
            onClick={() => setTab('copilot')}
            className={`min-h-11 px-8 py-2.5 text-xs md:text-sm font-semibold rounded-full transition-all cursor-pointer border-0 ${
              tab === 'copilot'
                ? 'bg-[#fae8a4] text-[#18191c] shadow-md'
                : 'bg-transparent text-white/70 hover:text-white'
            }`}
          >
            Copilot Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual'}
            onClick={() => setTab('manual')}
            className={`min-h-11 px-8 py-2.5 text-xs md:text-sm font-semibold rounded-full transition-all cursor-pointer border-0 ${
              tab === 'manual'
                ? 'bg-[#fae8a4] text-[#18191c] shadow-md'
                : 'bg-transparent text-white/70 hover:text-white'
            }`}
          >
            Manual Parameters
          </button>
        </div>
      </div>

      {/* Main Studio Frame */}
      <div className="rounded-xl border border-white/15 bg-[#1a1b1f] shadow-2xl p-4 sm:p-8">
        {/* Both panes stay mounted so the conversation survives tab switches.
            Only the reset button inside Copilot Chat clears it. */}
        <div hidden={tab !== 'copilot'}>
          <div>
            <StudioChat />
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={gated}
                onClick={openReview}
                className="dp-button min-w-[240px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <span>REVIEW LAUNCH CONFIG</span>
                <span className="arrow-box">↗</span>
              </button>
              {errors.length > 0 && (
                <p className="text-center text-xs text-white/50 max-w-md font-mono">
                  Prompt a ticker, pool allocation, and deposit first — or fill them in Manual Parameters.
                </p>
              )}
            </div>
          </div>
        </div>
        <div hidden={tab !== 'manual'}>
          <LaunchForm
            onReview={openReview}
          />
        </div>

        <ReviewDialog ref={ref} draft={draft} mainnet={!chain.testnet} />
      </div>
      </div>
    </section>
  );
};
