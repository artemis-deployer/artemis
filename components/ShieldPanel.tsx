"use client";

import React, { useState } from "react";
import { formatEther } from "viem";
import { DENOMINATIONS } from "../lib/shielded";

/**
 * Shielded pool rehearsal panel (DevBrief-Activation §B).
 * Renders ONLY when NEXT_PUBLIC_SHIELD_ENABLED=1. Testnet rehearsal UI:
 * deposit/withdraw actions stay disabled until the B-1 exit criteria pass
 * (audit + ceremony transcript). Losing a note means losing the funds.
 */
export const ShieldPanel: React.FC = () => {
  const [denom, setDenom] = useState<string>(DENOMINATIONS[1].toString());

  return (
    <section id="shield" data-theme="dark" className="section">
      <p className="eyebrow">08 // SHIELDED POOLS · TESTNET REHEARSAL</p>
      <h2 className="center-heading font-unbounded">Private by choice. Provably clean.</h2>
      <p className="section-sub">
        Fixed-denomination shielded deposits on Robinhood Testnet. This rehearsal UI is read-only
        until testnet rehearsal completes with a real verifier.
      </p>

      <div className="shield-grid">
        <label className="shield-field">
          <span>Denomination (fixed)</span>
          <select value={denom} onChange={(e) => setDenom(e.target.value)} aria-label="Shield denomination">
            {DENOMINATIONS.map((d) => (
              <option key={d.toString()} value={d.toString()}>
                {formatEther(d)} ETH
              </option>
            ))}
          </select>
        </label>
        <div className="shield-actions">
          <button type="button" disabled title="Deposit opens after testnet rehearsal (brief §B7)">
            DEPOSIT {formatEther(BigInt(denom))} ETH
          </button>
          <button type="button" disabled title="Withdraw opens after testnet rehearsal (brief §B7)">
            WITHDRAW
          </button>
        </div>
      </div>

      <p className="shield-warning" role="note">
        Back up your shield note (nullifier + secret) before any deposit. A lost note cannot be
        recovered by Artemis — the funds become permanently unspendable. Withdrawals can never be
        paused or blocked by Artemis.
      </p>
    </section>
  );
};
