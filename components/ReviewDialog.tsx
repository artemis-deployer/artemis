"use client";

import { forwardRef } from "react";
import type { Draft } from "../lib/draft";
import { DIRECT_SUPPLY } from "../lib/chains";

const ReviewDialog = forwardRef<HTMLDialogElement, { draft: Draft; mainnet: boolean }>(function ReviewDialog(
  { draft, mainnet },
  ref,
) {
  return (
    <dialog ref={ref} aria-label="Review your launch">
      <h2>Ready to begin?</h2>
      <dl>
        <dt>Name</dt>
        <dd>{draft.name || draft.ticker}</dd>
        <dt>Ticker</dt>
        <dd>{draft.ticker}</dd>
        <dt>Pool tokens</dt>
        <dd>{draft.pooled}</dd>
        <dt>Liquidity</dt>
        <dd>{draft.liquidity}</dd>
        <dt>Supply</dt>
        <dd>{DIRECT_SUPPLY.toLocaleString("en-US")} fixed · no mint</dd>
      </dl>
      {mainnet && <p>Real funds. Review the chain, amounts, and cost before signing.</p>}
      <p>Wallet launcher lands in Plan 2 (Hood) and Plan 3 (pump.fun). Nothing is submitted yet.</p>
      <form method="dialog">
        <button value="close">Edit launch details</button>
      </form>
    </dialog>
  );
});

export default ReviewDialog;
