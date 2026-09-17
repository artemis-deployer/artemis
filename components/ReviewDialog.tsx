"use client";

import { forwardRef, useState } from "react";
import { parseEther, type Address } from "viem";
import { DIRECT_SUPPLY } from "../lib/chains";
import type { Draft } from "../lib/draft";
import {
  addLiquidity,
  connectWallet,
  deployToken,
  ensureChain,
  getHoodConfig,
  toTokenUnits,
  validateRouter,
} from "../lib/launcher-evm";
import { saveReceipt } from "../lib/receipts";
import WalletButton from "./WalletButton";

type HoodState = "idle" | "working" | "token-done" | "pool-done" | "stub" | "error";

const ReviewDialog = forwardRef<HTMLDialogElement, { draft: Draft; mainnet: boolean }>(function ReviewDialog(
  { draft, mainnet },
  ref,
) {
  const chainId = draft.chainId === 4663 ? 4663 : 46630;
  const [account, setAccount] = useState<Address | null>(null);
  const [hood, setHood] = useState<HoodState>("idle");
  const [token, setToken] = useState<Address | null>(null);
  const [note, setNote] = useState("");

  async function fail(message: string) {
    setNote(message);
    setHood("error");
  }

  async function launch() {
    setNote("");
    setHood("working");
    try {
      await ensureChain(chainId);
      const acc = account ?? (await connectWallet());
      setAccount(acc);
      const cfg = getHoodConfig(chainId);
      if (!cfg) return fail("Unsupported chain.");
      const dep = await deployToken({
        chainId,
        account: acc,
        name: draft.name || draft.ticker,
        ticker: draft.ticker,
        supply: toTokenUnits(String(DIRECT_SUPPLY)),
      });
      setToken(dep.token);
      saveReceipt({ chainId, token: dep.token, hash: dep.hash, createdAt: new Date().toISOString() });
      setHood("token-done");
      try {
        await validateRouter(cfg);
        const liq = await addLiquidity({
          chainId,
          account: acc,
          token: dep.token,
          tokenAmount: toTokenUnits(draft.pooled || "0"),
          ethAmount: parseEther(draft.liquidity || "0"),
        });
        saveReceipt({ chainId, token: dep.token, hash: liq.hash, createdAt: new Date().toISOString() });
        setHood("pool-done");
      } catch (inner: unknown) {
        const m = inner instanceof Error ? inner.message : "launch_failed";
        if (m === "pool_unsupported_on_testnet") {
          setHood("stub");
          setNote("Testnet rehearsal: token deployed, pool step unavailable (no V2 on testnet).");
          return;
        }
        throw inner;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "launch_failed";
      if (message === "pool_unsupported_on_testnet") {
        setHood("stub");
        setNote("Testnet rehearsal: token deployed, pool step unavailable (no V2 on testnet).");
        return;
      }
      fail(message);
    }
  }

  async function resumePool() {
    if (!token || !account) return;
    setHood("working");
    try {
      const liq = await addLiquidity({
        chainId,
        account,
        token,
        tokenAmount: toTokenUnits(draft.pooled || "0"),
        ethAmount: parseEther(draft.liquidity || "0"),
      });
      saveReceipt({ chainId, token, hash: liq.hash, createdAt: new Date().toISOString() });
      setHood("pool-done");
    } catch (e: unknown) {
      fail(e instanceof Error ? e.message : "launch_failed");
    }
  }

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
      <WalletButton chainId={chainId} />
      <p role="status">Hood: {hood}</p>
      {note && <p role="alert">{note}</p>}
      {token && <p>Token: {token}</p>}
      <button type="button" onClick={() => void launch()}>
        Launch on Hood
      </button>
      {token && (hood === "token-done" || hood === "error") && (
        <button type="button" onClick={() => void resumePool()}>
          Resume pool funding
        </button>
      )}
      <p>Wallet launcher lands in Plan 3 (pump.fun) for Solana. Nothing is submitted yet.</p>
      <form method="dialog">
        <button value="close">Edit launch details</button>
      </form>
    </dialog>
  );
});

export default ReviewDialog;
