"use client";

import { forwardRef, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { parseEther, type Address } from "viem";
import { DIRECT_SUPPLY, getChain } from "../lib/chains";
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
import {
  DEVNET_RPC,
  MAINNET_RPC,
  buildCreateTx,
  buildMetadata,
  buildTradePayload,
  confirmTx,
  mapPumpError,
  signAndSend,
  uploadMetadata,
} from "../lib/launcher-solana";
import { listReceipts, saveReceipt } from "../lib/receipts";
import SolanaButton, { getSolanaProvider, type SolanaProvider } from "./SolanaButton";
import WalletButton from "./WalletButton";

type HoodState = "idle" | "working" | "token-done" | "pool-done" | "stub" | "error";
type PumpState = "idle" | "working" | "built" | "sent" | "error";

const ReviewDialog = forwardRef<HTMLDialogElement, { draft: Draft; mainnet: boolean }>(function ReviewDialog(
  { draft, mainnet },
  ref,
) {
  const rawChain = draft.chainId;
  const chainId = rawChain === 4663 ? 4663 : rawChain === 46630 ? 46630 : null;
  const [account, setAccount] = useState<Address | null>(null);
  const [hood, setHood] = useState<HoodState>("idle");
  const [token, setToken] = useState<Address | null>(null);
  const [note, setNote] = useState("");
  const [provider, setProvider] = useState<SolanaProvider | null>(null);
  const [mint, setMint] = useState("");
  const [pump, setPump] = useState<PumpState>("idle");
  const [pumpNote, setPumpNote] = useState("");

  const isPump = draft.route === "pumpfun" && String(draft.chainId).startsWith("solana");
  const rpc = draft.chainId === "solana-mainnet" ? MAINNET_RPC : DEVNET_RPC;
  const resume = isPump
    ? listReceipts().find((r) => String(r.chainId) === String(draft.chainId) && r.token && !r.pool)
    : undefined;
  const explorer = getChain(draft.chainId)?.explorer ?? "https://solscan.io";

  function fail(message: string): void {
    setNote(message);
    setHood("error");
  }

  async function launch() {
    setNote("");
    setHood("working");
    try {
      if (chainId === null) return fail("Unsupported chain.");
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
      fail(message);
    }
  }

  async function resumePool() {
    if (!token || !account) return;
    if (chainId === null) return;
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

  async function launchPump() {
    let meta;
    try {
      meta = buildMetadata({
        name: draft.name || draft.ticker,
        symbol: draft.ticker,
        description: draft.ticker,
      });
    } catch (e: unknown) {
      setPumpNote(e instanceof Error ? e.message : "bad_metadata");
      setPump("error");
      return;
    }
    const amountSol = Number(draft.liquidity);
    if (!Number.isFinite(amountSol) || amountSol <= 0) {
      setPumpNote("liquidity must be a positive number");
      setPump("error");
      return;
    }
    if (rpc !== MAINNET_RPC) {
      // Devnet rehearsal: no wallet, no funds, no broadcast. Build metadata + payload, stop.
      const mintKp = Keypair.generate();
      const mintBase58 = mintKp.publicKey.toBase58();
      if (!mintBase58) {
        setPumpNote("pump_failed");
        setPump("error");
        return;
      }
      const payer = (() => {
        try {
          return provider?.publicKey.toBase58() ?? getSolanaProvider()?.publicKey.toBase58() ?? mintBase58;
        } catch {
          return mintBase58;
        }
      })();
      buildTradePayload({
        publicKey: payer,
        mint: mintBase58,
        name: meta.name,
        symbol: meta.symbol,
        uri: "devnet-rehearsal",
        amountSol,
      });
      setMint(mintBase58);
      setPumpNote("Devnet rehearsal: transaction built, broadcast refused by design.");
      setPump("built");
      return;
    }
    const p = provider ?? getSolanaProvider();
    if (!p) {
      setPumpNote("Connect a Solana wallet first.");
      setPump("error");
      return;
    }
    const wallet = p as SolanaProvider & { signTransaction?: <T>(tx: T) => Promise<T> };
    if (typeof wallet.signTransaction !== "function") {
      setPumpNote("Wallet cannot sign transactions.");
      setPump("error");
      return;
    }
    const signTransaction = wallet.signTransaction;
    setPump("working");
    setPumpNote("");
    try {
      const uri = await uploadMetadata(meta);
      if (!uri) throw new Error("pump_rejected: no metadata uri");
      const mintKp = Keypair.generate();
      const mintBase58 = mintKp.publicKey.toBase58();
      if (!mintBase58) throw new Error("pump_failed");
      const payload = buildTradePayload({
        publicKey: p.publicKey.toBase58(),
        mint: mintBase58,
        name: meta.name,
        symbol: meta.symbol,
        uri,
        amountSol,
      });
      const tx = await buildCreateTx(payload);
      const sig = await signAndSend({
        rpc: MAINNET_RPC,
        tx,
        mintSecret: mintKp.secretKey,
        wallet: { publicKey: p.publicKey, signTransaction },
      });
      await confirmTx(MAINNET_RPC, sig);
      setMint(mintBase58);
      saveReceipt({ chainId: draft.chainId, token: mintBase58, hash: sig, createdAt: new Date().toISOString() });
      setPump("sent");
    } catch (e: unknown) {
      setPumpNote(mapPumpError(e));
      setPump("error");
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
      {chainId !== null ? <WalletButton chainId={chainId} /> : <p role="alert">Unsupported chain.</p>}
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
      {isPump && (
        <section aria-label="Pump.fun launch">
          <h3>Pump.fun (Solana)</h3>
          <SolanaButton onConnect={setProvider} />
          <p role="status">Pump: {pump}</p>
          {pumpNote && <p role="alert">{pumpNote}</p>}
          {mint && <p>Mint: {mint}</p>}
          <button type="button" onClick={() => void launchPump()}>
            Launch on pump.fun
          </button>
          {resume?.token && (
            <p>
              Resume: open the mint in explorer{" "}
              <a href={`${explorer}/address/${resume.token}`} target="_blank" rel="noreferrer">
                {resume.token}
              </a>
            </p>
          )}
        </section>
      )}
      <p>Wallet launcher lands in Plan 3 (pump.fun) for Solana. Nothing is submitted yet.</p>
      <form method="dialog">
        <button value="close">Edit launch details</button>
      </form>
    </dialog>
  );
});

export default ReviewDialog;
