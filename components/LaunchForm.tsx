"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CHAINS, DIRECT_SUPPLY } from "../lib/chains";
import { validateDraft } from "../lib/draft";
import { useDraft } from "./DraftContext";

export default function LaunchForm({ onReview }: { onReview: () => void }) {
  const { draft, setDraft } = useDraft();
  const [consent, setConsent] = useState(false);
  const errors = validateDraft(draft);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  const mainnet = !chain.testnet;

  const isSolana = String(draft.chainId).startsWith("solana");
  const totalSupply = isSolana ? 1_000_000_000 : DIRECT_SUPPLY;
  const pooledNumber = Number(draft.pooled) || 0;
  const liquidityNumber = Number(draft.liquidity) || 0;
  const pooledPercent = pooledNumber > 0 ? ((pooledNumber / totalSupply) * 100).toFixed(1) : "0";
  const estimatedPrice =
    pooledNumber > 0 && liquidityNumber > 0
      ? (liquidityNumber / pooledNumber).toLocaleString("en-US", { maximumSignificantDigits: 4 })
      : null;

  return (
    <section className="launch-form-card" aria-label="Your launch">
      <div className="form-header">
        <div>
          <h3>Launch Parameters</h3>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Configure parameters or let Kentir Copilot draft them
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--muted)] border border-[var(--line)] px-2.5 py-1 rounded">
          Non-Custodial
        </span>
      </div>

      {/* Live Token Stamp Preview */}
      <div className="token-preview-stamp">
        <div className="token-stamp-left">
          <span className="token-stamp-ticker">
            {draft.ticker ? `$${draft.ticker}` : "$TICKER"}
          </span>
          <span className="token-stamp-name">
            {draft.name ? draft.name : "Your Coin Draft"}
          </span>
        </div>
        <div className="text-right">
          <span className="token-stamp-meta block">{chain.name}</span>
          <span className="text-[11px] font-mono text-[var(--accent)] font-bold">
            {totalSupply.toLocaleString("en-US")} Fixed
          </span>
        </div>
      </div>

      {/* Target Network Selector */}
      <div className="field-group full">
        <label className="field-label">
          <span>Target Network</span>
          <span className="field-label-hint">Testnet recommended for rehearsal</span>
        </label>
        <div className="chain-picker-grid">
          {CHAINS.map((c) => {
            const active = draft.chainId === c.id;
            const sol = String(c.id).startsWith("solana");
            return (
              <div
                key={String(c.id)}
                onClick={() => {
                  setDraft({
                    ...draft,
                    chainId: c.id,
                    route: sol ? "pumpfun" : "direct",
                  });
                  setConsent(false);
                }}
                className={`chain-option ${active ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setDraft({ ...draft, chainId: c.id, route: sol ? "pumpfun" : "direct" });
                    setConsent(false);
                  }
                }}
              >
                <div className="chain-option-title">
                  <span>{c.name}</span>
                  <span className="text-[10px] uppercase font-bold text-[var(--muted)] border border-[var(--line)] px-1.5 py-0.5 rounded">
                    {c.testnet ? "Testnet" : "Mainnet"}
                  </span>
                </div>
                <span className="chain-option-meta">
                  {sol ? "Solana · pump.fun" : "Robinhood Chain · V2 Router"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Inputs Grid */}
      <div className="form-fields-grid">
        <div className="field-group">
          <label className="field-label" htmlFor="token-name">
            <span>Coin Name</span>
            <span className="field-label-hint">Optional</span>
          </label>
          <input
            id="token-name"
            className="field-input"
            placeholder="e.g. Kentir Spark"
            value={draft.name}
            maxLength={32}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="token-ticker">
            <span>Ticker Symbol</span>
            <span className="text-[var(--accent)] font-bold">*</span>
          </label>
          <input
            id="token-ticker"
            className="field-input font-mono font-bold uppercase tracking-wider"
            placeholder="e.g. SPARK"
            value={draft.ticker}
            maxLength={12}
            onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="pool-tokens">
            <span>Tokens for Liquidity Pool</span>
            <span className="field-label-hint">Max {totalSupply.toLocaleString()}</span>
          </label>
          <input
            id="pool-tokens"
            className="field-input font-mono"
            inputMode="decimal"
            placeholder="e.g. 500000000"
            value={draft.pooled}
            onChange={(e) => setDraft({ ...draft, pooled: e.target.value })}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="initial-liquidity">
            <span>Starting Deposit ({chain.currency})</span>
            <span className="field-label-hint">Paired liquidity</span>
          </label>
          <input
            id="initial-liquidity"
            className="field-input font-mono"
            inputMode="decimal"
            placeholder="e.g. 0.5"
            value={draft.liquidity}
            onChange={(e) => setDraft({ ...draft, liquidity: e.target.value })}
          />
        </div>
      </div>

      {/* Economics Preview */}
      <div className="economics-box">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1">
          Pool Economics Preview
        </div>
        <div className="economics-row">
          <span className="economics-label">Total Fixed Supply:</span>
          <span className="economics-value font-mono">
            {totalSupply.toLocaleString("en-US")} {draft.ticker || "TOKENS"} (No Mint)
          </span>
        </div>
        <div className="economics-row">
          <span className="economics-label">Pool Allocation:</span>
          <span className="economics-value font-mono">
            {pooledNumber.toLocaleString()} ({pooledPercent}%)
          </span>
        </div>
        {estimatedPrice && (
          <div className="economics-row">
            <span className="economics-label">Opening Est. Price:</span>
            <span className="economics-value font-mono">
              ~{estimatedPrice} {chain.currency} / token
            </span>
          </div>
        )}
      </div>

      {/* Mainnet Notice */}
      {mainnet && (
        <label className="consent-row">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <div>
            <span className="font-bold block">Mainnet Real Funds Confirmation</span>
            <span className="text-xs text-[var(--muted)] block">
              I have checked network, token allocations, and transaction gas requirements.
            </span>
          </div>
        </label>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="border border-[var(--accent)] bg-[var(--canvas)] rounded p-3 text-xs flex flex-col gap-1 text-[var(--accent-deep)]">
          {errors.map((x) => (
            <p key={x} role="alert" className="m-0 font-medium">
              • {x}
            </p>
          ))}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        disabled={errors.length > 0 || (mainnet && !consent)}
        onClick={onReview}
        className="btn-primary w-full py-3 text-base justify-center"
      >
        <span>Review Your Launch</span>
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
