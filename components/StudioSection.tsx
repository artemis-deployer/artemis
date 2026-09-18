"use client";

import React, { useRef, useState } from 'react';
import { useDraft } from './DraftContext';
import LaunchForm from './LaunchForm';
import ReviewDialog from './ReviewDialog';
import StudioChat from './StudioChat';
import { CHAINS } from '../lib/chains';
import { validateDraft } from '../lib/draft';

export const StudioSection: React.FC = () => {
  const { draft } = useDraft();
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<'copilot' | 'manual'>('copilot');
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  const errors = validateDraft(draft);

  return (
    <section
      id="studio"
      data-theme="dark"
      className="studio-section py-28 px-6 md:px-12 max-w-5xl mx-auto text-[#f5f3f7] relative z-10"
      aria-label="Token Studio"
    >
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#e4cef7] mb-3">
          INTERACTIVE LAUNCHPAD STUDIO
        </p>
        <h2 className="font-unbounded text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Create &amp; Deploy
        </h2>
        <p className="text-white/70 text-base md:text-lg leading-relaxed">
          Co-create your coin with Kentir AI Copilot or fine-tune parameters directly before signing onchain.
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
                ? 'bg-[#e4cef7] text-[#17131f] shadow-md'
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
                ? 'bg-[#e4cef7] text-[#17131f] shadow-md'
                : 'bg-transparent text-white/70 hover:text-white'
            }`}
          >
            Manual Parameters
          </button>
        </div>
      </div>

      {/* Main Studio Frame */}
      <div className="rounded-xl border border-white/15 bg-[#18171f] shadow-2xl p-4 sm:p-8">
        {tab === 'copilot' ? (
          <div>
            <StudioChat />
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={errors.length > 0}
                onClick={() => {
                  ref.current?.showModal();
                }}
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
        ) : (
          <LaunchForm
            onReview={() => {
              ref.current?.showModal();
            }}
          />
        )}

        <ReviewDialog ref={ref} draft={draft} mainnet={!chain.testnet} />
      </div>
    </section>
  );
};
