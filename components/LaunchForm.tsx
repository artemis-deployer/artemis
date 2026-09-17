"use client";

import { CHAINS } from "../lib/chains";
import { validateDraft } from "../lib/draft";
import { useDraft } from "./DraftContext";

export default function LaunchForm({ onReview }: { onReview: () => void }) {
  const { draft, setDraft } = useDraft();
  const errors = validateDraft(draft);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];

  return (
    <section aria-label="Your launch">
      <label>
        Coin name (optional)
        <input value={draft.name} maxLength={32} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>
      <label>
        Ticker (required)
        <input
          value={draft.ticker}
          maxLength={12}
          onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })}
        />
      </label>
      <label>
        Chain
        <select
          value={String(draft.chainId)}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft({ ...draft, chainId: isNaN(Number(raw)) ? raw : Number(raw) });
          }}
        >
          {CHAINS.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {c.name}
              {c.testnet ? " (test)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tokens for the pool
        <input value={draft.pooled} inputMode="decimal" onChange={(e) => setDraft({ ...draft, pooled: e.target.value })} />
      </label>
      <label>
        Starting liquidity ({chain.currency})
        <input value={draft.liquidity} inputMode="decimal" onChange={(e) => setDraft({ ...draft, liquidity: e.target.value })} />
      </label>
      {errors.map((x) => (
        <p key={x} role="alert">
          {x}
        </p>
      ))}
      <button type="button" disabled={errors.length > 0} onClick={onReview}>
        Review your launch
      </button>
    </section>
  );
}
