"use client";

import React from 'react';

interface SoonModalProps {
  isOpen: boolean;
  feature: string;
  onClose: () => void;
}

export const SoonModal: React.FC<SoonModalProps> = ({ isOpen, feature, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#e4cef7] text-[#17131f] p-8 md:p-10 shadow-2xl border border-white/20 rounded">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-[#17131f]/60 hover:text-[#17131f] transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        <img src="/assets/logo.png" className="w-14 h-14 rounded-full mb-6 object-cover" alt="" />

        <h2 className="font-unbounded text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Coming soon.
        </h2>

        <p className="text-sm leading-relaxed text-[#17131f]/80 mb-6">
          {feature === 'Showcase' || feature === 'Tokens'
            ? 'The onchain token showcase is updated in real-time. Explore live tokens directly in the showcase catalog.'
            : `${feature} is currently undergoing smart contract security verification. Stay tuned for upcoming testnet deployments.`}
        </p>

        <button
          onClick={onClose}
          className="dp-button dark-button w-full justify-between"
        >
          <span>GOT IT</span>
          <span className="arrow-box">↗</span>
        </button>
      </div>
    </div>
  );
};
