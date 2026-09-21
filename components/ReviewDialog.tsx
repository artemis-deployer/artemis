"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { parseEther, type Address } from "viem";
import { X, ExternalLink } from "lucide-react";
import { DIRECT_SUPPLY, explorerTokenUrl, getChain } from "../lib/chains";
import type { Draft } from "../lib/draft";
import {
  addLiquidity,
  connectWallet,
  deployToken,
  ensureChain,
  ETH_MIN_BPS,
  estimateLaunchCost,
  formatEth,
  getHoodConfig,
  launchOneTx,
  publicClientFor,
  SLIPPAGE_PRESETS,
  toTokenUnits,
  TX_DEADLINE_SECS,
  validateRouter,
  type LaunchCost,
} from "../lib/launcher-evm";
import {
  DEVNET_RPC,
  MAINNET_RPC,
  PUMP_FEE_SOL,
  PUMP_PRIORITY_FEE,
  buildCreateTx,
  buildMetadata,
  buildSplMintTx,
  buildTradePayload,
  confirmTx,
  findSplAta,
  mapPumpError,
  signAndSend,
  splMintAmount,
  uploadMetadata,
  SPL_MINT_SPACE,
} from "../lib/launcher-solana";
import { findResumableEvmReceipt, listReceipts, saveReceipt } from "../lib/receipts";
import { submitShowcase } from "../lib/showcase";
import { isInsufficientFunds, solanaAddressOf, walletLabel } from "../lib/wallets";
import SolanaButton, { getSolanaProvider, type SolanaProvider } from "./SolanaButton";
import WalletButton from "./WalletButton";
import { useDraft } from "./DraftContext";
import type { LaunchSuccess } from "./SuccessModal";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result) resolve(reader.result);
      else reject(new Error("bad_metadata"));
    };
    reader.onerror = () => reject(new Error("bad_metadata"));
    reader.readAsDataURL(file);
  });
}

type HoodState = "idle" | "working" | "token-done" | "pool-done" | "stub" | "error";
type PumpState = "idle" | "working" | "built" | "sent" | "error";

function safeEthAmount(value: string): bigint | null {
  try {
    return parseEther(value || "0");
  } catch {
    return null;
  }
}

function trimSol(value: number): string {
  return String(Number(value.toFixed(9)));
}

const ReviewDialog = forwardRef<HTMLDialogElement, { draft: Draft; mainnet: boolean; onLaunched?: (info: LaunchSuccess) => void }>(function ReviewDialog(
  { draft, mainnet, onLaunched },
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
  const [cost, setCost] = useState<LaunchCost | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [slippageBps, setSlippageBps] = useState<number>(ETH_MIN_BPS);
  const { artworkFile, setArtworkFile } = useDraft();

  async function artworkDataUrl(): Promise<string | undefined> {
    if (!artworkFile) return undefined;
    try {
      const url = await fileToDataUrl(artworkFile);
      return url || undefined;
    } catch {
      return undefined;
    }
  }
  // Resume unmounts once hood hits working, so disabled prop can't guard
  // same-tick double-clicks (TS narrows hood here). Ref guards instead.
  const fundingRef = useRef(false);
  // Same-tick guard for Confirm buttons: disabled flips only after re-render.
  const launchingRef = useRef(false);
  const pumpWorkingRef = useRef(false);

  const isPump = draft.route === "pumpfun" && String(draft.chainId).startsWith("solana");
  const rpc = draft.chainId === "solana-mainnet" ? MAINNET_RPC : DEVNET_RPC;
  const resume = isPump
    ? listReceipts().find(
        (r) =>
          String(r.chainId).toLowerCase() === String(draft.chainId).toLowerCase() &&
          typeof r.token === "string" &&
          r.token.length > 0 &&
          !r.pool &&
          (r.ticker === undefined ||
            (typeof r.ticker === "string" &&
              typeof draft.ticker === "string" &&
              r.ticker.toUpperCase() === draft.ticker.toUpperCase())),
      )
    : undefined;
  const evmResume =
    !isPump && !token && chainId !== null
      ? findResumableEvmReceipt(listReceipts(), chainId, draft.ticker)
      : undefined;
  const chainObj = getChain(draft.chainId);
  const explorer = chainObj?.explorer ?? "https://solscan.io";
  const singleTx = chainId !== null && (getHoodConfig(chainId)?.launcher ?? null) !== null;

  useEffect(() => {
    if (isPump || chainId === null || !account) {
      setCost(null);
      setCostLoading(false);
      return;
    }
    setCostLoading(true);
    let alive = true;
    const id = setTimeout(() => {
      (async () => {
        try {
          const estimate = await estimateLaunchCost({
            chainId,
            account,
            name: draft.name || draft.ticker,
            ticker: draft.ticker,
            supply: toTokenUnits(String(DIRECT_SUPPLY)),
            pooled: toTokenUnits(draft.pooled || "0"),
            ethAmount: parseEther(draft.liquidity || "0"),
            slippageBps,
          });
          if (alive) setCost(estimate);
        } catch {
          if (alive) setCost(null);
        } finally {
          if (alive) setCostLoading(false);
        }
      })();
    }, 500);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [isPump, chainId, account, slippageBps, draft.name, draft.ticker, draft.pooled, draft.liquidity]);

  useEffect(() => {
    if (isPump || chainId === null || !account) {
      setBalanceWei(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const cfg = getHoodConfig(chainId);
        const wei = cfg ? await publicClientFor(cfg).getBalance({ address: account }) : null;
        if (alive) setBalanceWei(wei);
      } catch {
        if (alive) setBalanceWei(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isPump, chainId, account]);

  function fail(message: string): void {
    setNote(message);
    setHood("error");
  }

  function succeed(token: string, hash: string, rehearsal = false): void {
    setArtworkFile(null);
    onLaunched?.({
      chainId: draft.chainId,
      token,
      hash,
      ticker: draft.ticker,
      name: draft.name || draft.ticker,
      rehearsal,
    });
    if (ref && typeof ref !== "function") ref.current?.close();
  }

  async function launchSingle(acc: Address, launcher: Address) {
    const one = await launchOneTx({
      chainId: chainId as 4663 | 46630,
      account: acc,
      name: draft.name || draft.ticker,
      ticker: draft.ticker,
      supply: toTokenUnits(String(DIRECT_SUPPLY)),
      pooled: toTokenUnits(draft.pooled || "0"),
      ethAmount: parseEther(draft.liquidity || "0"),
      slippageBps,
    });
    setToken(one.token);
    saveReceipt({ chainId: chainId as 4663 | 46630, token: one.token, hash: one.hash, pool: one.hash, createdAt: new Date().toISOString(), ticker: draft.ticker });
    void submitShowcase({ chainId: chainId as 4663 | 46630, address: one.token, creator: acc, name: draft.name || draft.ticker, symbol: draft.ticker, txHash: one.hash });
    setHood("pool-done");
    setNote(`One transaction: token deployed and pool funded together (${launcher.slice(0, 10)}…).`);
    succeed(one.token, one.hash);
  }

  async function launch() {
    if (launchingRef.current) return;
    launchingRef.current = true;
    setNote("");
    setHood("working");
    try {
      if (chainId === null) return fail("Unsupported chain.");
      await ensureChain(chainId);
      const acc = account ?? (await connectWallet());
      setAccount(acc);
      const cfg = getHoodConfig(chainId);
      if (!cfg) return fail("Unsupported chain.");
      if (cfg.launcher) {
        await launchSingle(acc, cfg.launcher);
        return;
      }
      if (cfg.router) await validateRouter(cfg);
      const dep = await deployToken({
        chainId,
        account: acc,
        name: draft.name || draft.ticker,
        ticker: draft.ticker,
        supply: toTokenUnits(String(DIRECT_SUPPLY)),
      });
      setToken(dep.token);
      saveReceipt({ chainId, token: dep.token, hash: dep.hash, createdAt: new Date().toISOString(), ticker: draft.ticker });
      void submitShowcase({ chainId, address: dep.token, creator: acc, name: draft.name || draft.ticker, symbol: draft.ticker, txHash: dep.hash });
      setHood("token-done");
      try {
        await validateRouter(cfg);
        const liq = await addLiquidity({
          chainId,
          account: acc,
          token: dep.token,
          tokenAmount: toTokenUnits(draft.pooled || "0"),
          ethAmount: parseEther(draft.liquidity || "0"),
          slippageBps,
        });
        saveReceipt({ chainId, token: dep.token, hash: liq.hash, pool: liq.hash, createdAt: new Date().toISOString(), ticker: draft.ticker });
        void submitShowcase({ chainId, address: dep.token, creator: acc, name: draft.name || draft.ticker, symbol: draft.ticker, txHash: liq.hash });
        setHood("pool-done");
        succeed(dep.token, liq.hash);
      } catch (inner: unknown) {
        const m = inner instanceof Error ? inner.message : "launch_failed";
        if (m === "pool_unsupported_on_testnet") {
          setHood("stub");
          setNote("Testnet rehearsal: token deployed, pool step unavailable (no V2 router on testnet).");
          succeed(dep.token, dep.hash, true);
          return;
        }
        throw inner;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? walletLabel(e) : "launch_failed";
      fail(message);
    } finally {
      launchingRef.current = false;
    }
  }

  async function resumePool() {
    if (!token) return;
    if (chainId === null) return;
    const acc = account ?? (await connectWallet().catch(() => null));
    if (!acc) return;
    setAccount(acc);
    await fundPool(token, acc);
  }

  async function resumeFromReceipt() {
    const receiptToken = evmResume?.token;
    if (!receiptToken || chainId === null) return;
    const acc = account ?? (await connectWallet().catch(() => null));
    if (!acc) return;
    setAccount(acc);
    setToken(receiptToken as Address);
    await fundPool(receiptToken as Address, acc);
  }

  async function fundPool(tokenAddr: Address, acc: Address) {
    if (chainId === null) return;
    if (fundingRef.current) return;
    fundingRef.current = true;
    setHood("working");
    try {
      await ensureChain(chainId);
      const liq = await addLiquidity({
        chainId,
        account: acc,
        token: tokenAddr,
        tokenAmount: toTokenUnits(draft.pooled || "0"),
        ethAmount: parseEther(draft.liquidity || "0"),
        slippageBps,
      });
      saveReceipt({ chainId, token: tokenAddr, hash: liq.hash, pool: liq.hash, createdAt: new Date().toISOString(), ticker: draft.ticker });
      void submitShowcase({ chainId, address: tokenAddr, creator: acc, name: draft.name || draft.ticker, symbol: draft.ticker, txHash: liq.hash });
      setHood("pool-done");
      succeed(tokenAddr, liq.hash);
    } catch (e: unknown) {
      fail(e instanceof Error ? walletLabel(e) : "launch_failed");
    } finally {
      fundingRef.current = false;
    }
  }

  async function launchPump() {
    if (pumpWorkingRef.current) return;
    pumpWorkingRef.current = true;
    try {
    let meta;
    try {
      meta = buildMetadata({
        name: draft.name || draft.ticker,
        symbol: draft.ticker,
        description: draft.name ? `${draft.name} (${draft.ticker}) community token` : `${draft.ticker} community token`,
        image: draft.image,
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
      // Devnet: real SPL drill mint (pump lookup tables don't exist on devnet).
      const p = getSolanaProvider() ?? provider;
      if (!p) {
        setPumpNote("Connect a Solana wallet first.");
        setPump("error");
        return;
      }
      const payerAddr = solanaAddressOf(p);
      if (!payerAddr) {
        setPumpNote("Connect a Solana wallet first.");
        setPump("error");
        return;
      }
      if (typeof (p as { signTransaction?: unknown }).signTransaction !== "function") {
        setPumpNote("Wallet cannot sign transactions.");
        setPump("error");
        return;
      }
      setPump("working");
      setPumpNote("");
      try {
        const connection = new Connection(rpc, "confirmed");
        const mintKp = Keypair.generate();
        const mintBase58 = mintKp.publicKey.toBase58();
        if (!mintBase58) throw new Error("pump_failed");
        const payerKey = new PublicKey(payerAddr);
        const mintLamports = await connection.getMinimumBalanceForRentExemption(SPL_MINT_SPACE);
        const ata = findSplAta(mintKp.publicKey, payerKey);
        const tx = buildSplMintTx({
          payer: payerKey,
          mint: mintKp.publicKey,
          ata,
          mintLamports,
          amount: splMintAmount(),
        });
        const sig = await signAndSend({
          rpc,
          tx,
          mintSecret: mintKp.secretKey,
          wallet: {
            publicKey: p.publicKey,
            signTransaction: (p as { signTransaction: <T>(tx: T) => Promise<T> }).signTransaction,
          },
        });
        await confirmTx(rpc, sig);
        setMint(mintBase58);
        saveReceipt({ chainId: draft.chainId, token: mintBase58, hash: sig, createdAt: new Date().toISOString(), ticker: draft.ticker });
        void submitShowcase({ chainId: draft.chainId, address: mintBase58, creator: payerAddr, name: meta.name, symbol: meta.symbol, txHash: sig });
        setPump("sent");
        succeed(mintBase58, sig);
      } catch (e: unknown) {
        setPumpNote(mapPumpError(e));
        setPump("error");
      }
      return;
    }
    const p = getSolanaProvider() ?? provider;
    if (!p) {
      setPumpNote("Connect a Solana wallet first.");
      setPump("error");
      return;
    }
    // Connect-only providers expose no publicKey yet: fail clean, not TypeError.
    const payerAddr = solanaAddressOf(p);
    if (!payerAddr) {
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
      const uri = await uploadMetadata(meta, await artworkDataUrl());
      if (!uri) throw new Error("pump_rejected: no metadata uri");
      const mintKp = Keypair.generate();
      const mintBase58 = mintKp.publicKey.toBase58();
      if (!mintBase58) throw new Error("pump_failed");
      const payload = buildTradePayload({
        publicKey: payerAddr,
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
      saveReceipt({ chainId: draft.chainId, token: mintBase58, hash: sig, createdAt: new Date().toISOString(), ticker: draft.ticker });
      void submitShowcase({ chainId: draft.chainId, address: mintBase58, creator: payerAddr, name: meta.name, symbol: meta.symbol, txHash: sig });
      setPump("sent");
      succeed(mintBase58, sig);
    } catch (e: unknown) {
      setPumpNote(mapPumpError(e));
      setPump("error");
    }
    } finally {
      pumpWorkingRef.current = false;
    }
  }

  return (
    <dialog ref={ref} aria-label="Review your launch" className="m-auto max-w-[min(540px,94vw)] overflow-hidden rounded-xl border border-white/15 bg-[#1a1b1f] p-0 text-white shadow-2xl">
      <div className="chat-scroll flex max-h-[88vh] flex-col gap-4 overflow-y-auto p-6 max-sm:p-[18px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div>
            <h3 className="m-0 text-[19px] font-bold font-unbounded text-white">Review Launch Parameters</h3>
            <p className="m-0 text-xs text-white/50">Confirm details before submitting signatures</p>
          </div>
          <form method="dialog">
            <button value="close" className="inline-flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-[13px] font-semibold text-white/60 no-underline hover:bg-white/10 hover:text-white" aria-label="Close dialog">
              <X size={18} />
            </button>
          </form>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-[#131416] p-3.5 text-[13px]">
          <dt className="font-medium text-white/50">Network:</dt>
          <dd className="m-0 text-right font-semibold break-all text-white">{chainObj?.name ?? String(draft.chainId)}</dd>
          <dt className="font-medium text-white/50">Token Name:</dt>
          <dd className="m-0 text-right font-semibold break-all text-white">{draft.name || draft.ticker || "-"}</dd>
          <dt className="font-medium text-white/50">Ticker Symbol:</dt>
          <dd className="m-0 text-right font-mono font-bold break-all text-[#fae8a4] uppercase">{draft.ticker}</dd>
          <dt className="font-medium text-white/50">Pool Tokens:</dt>
          <dd className="m-0 text-right font-mono font-semibold break-all text-white">{draft.pooled}</dd>
          <dt className="font-medium text-white/50">Initial Liquidity:</dt>
          <dd className="m-0 text-right font-mono font-semibold break-all text-white">{draft.liquidity} {chainObj?.currency}</dd>
          <dt className="font-medium text-white/50">Supply Rule:</dt>
          <dd className="m-0 text-right font-mono font-semibold break-all text-[#cadcf0]">{(isPump ? 1000000000 : DIRECT_SUPPLY).toLocaleString("en-US")} (Fixed · No Mint)</dd>
        </dl>

        {!isPump && (
          <div className="flex flex-col gap-2 rounded border border-white/10 bg-[#131219] p-2.5 text-xs text-white/60">
            <p className="m-0">
              Protection: {100 - slippageBps / 100}% ETH slippage · {TX_DEADLINE_SECS / 60}-min deadline. Token minimum is exact.
            </p>
            <label className="flex items-center gap-2 font-semibold text-white/80">
              <span>Slippage tolerance</span>
              <select
                value={slippageBps}
                onChange={(e) => setSlippageBps(Number(e.target.value))}
                aria-label="Slippage tolerance"
                className="cursor-pointer rounded-md border border-white/15 bg-[#1a1b1f] px-2 py-1 font-mono text-xs text-white"
              >
                {SLIPPAGE_PRESETS.map((p) => (
                  <option key={p.bps} value={p.bps}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {mainnet && (
          <p className="m-0 rounded border border-white/10 bg-[#131416] p-2.5 text-xs text-white/60">
            <strong className="text-white">Mainnet Deployment:</strong> Wallet signatures will execute live blockchain transactions and spend real tokens for gas and initial pool liquidity.
          </p>
        )}

        {/* EVM Rail (Robinhood Chain) */}
        {!isPump && (
          <div className="flex flex-col gap-3 pt-2">
            {chainId !== null ? (
              <WalletButton chainId={chainId} onConnect={setAccount} />
            ) : (
              <p role="alert" className="text-xs font-medium text-red-400">
                Unsupported chain.
              </p>
            )}

            <p role="status" className="m-0 font-mono text-xs text-white/50">
              State: {hood}
            </p>

            {note && (
              <p role="alert" className="m-0 text-xs font-medium text-red-400">
                {note}
              </p>
            )}

            {token && (
              <p className="m-0 flex items-center gap-1 font-mono text-xs text-white">
                <span className="text-white/50">Token:</span>
                <a
                  href={`${explorer}/address/${token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#cadcf0] inline-flex items-center gap-0.5"
                >
                  <span>{token.slice(0, 10)}…{token.slice(-8)}</span>
                  <ExternalLink size={11} />
                </a>
              </p>
            )}

            <button
              type="button"
              disabled={hood === "working"}
              onClick={() => void launch()}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#fae8a4] px-6 py-3 text-sm font-bold text-[#18191c] transition-all hover:bg-[#ece4d4] disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
            >
              {hood === "working"
                ? "Deploying & Funding…"
                : singleTx
                  ? "Confirm & Launch (1 Transaction)"
                  : "Confirm & Launch on Hood"}
            </button>

            <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-[#131219] p-3.5 text-[13px]" aria-label="Cost breakdown">
              <div className="mb-1 font-mono text-xs font-bold tracking-wider text-white uppercase">
                Cost Breakdown
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/50">Pool liquidity:</span>
                <span className="text-right font-mono font-semibold break-all text-white">
                  {draft.liquidity || "0"} {chainObj?.currency}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/50">Network fee{cost && cost.steps === 2 ? " (deploy only)" : ""}:</span>
                <span className="text-right font-mono font-semibold break-all text-white">
                  {costLoading ? "estimating…" : cost ? `~${formatEth(cost.fee)} ${chainObj?.currency}` : account ? "estimate unavailable" : "connect wallet"}
                </span>
              </div>
              {(() => {
                const liq = safeEthAmount(draft.liquidity);
                if (!cost || liq === null) return null;
                return (
                  <div className="flex justify-between gap-3 border-t border-white/10 pt-1.5">
                    <span className="text-white/50">Total spend:</span>
                    <span className="text-right font-mono font-bold break-all text-[#fae8a4]">
                      ~{formatEth(cost.fee + liq)} {chainObj?.currency}
                    </span>
                  </div>
                );
              })()}
              {(() => {
                const liq = safeEthAmount(draft.liquidity);
                if (!cost || liq === null || balanceWei === null) return null;
                if (!isInsufficientFunds(balanceWei, cost.fee + liq)) return null;
                return (
                  <p role="alert" className="m-0 text-xs font-medium text-red-400">
                    Insufficient funds: total exceeds wallet balance.
                  </p>
                );
              })()}
              {cost && cost.steps === 2 && (
                <p className="m-0 text-[11px] text-white/50">Pool funding is a second transaction with its own gas.</p>
              )}
            </div>

            {!singleTx && (hood === "token-done" || hood === "error" || hood === "idle") && (token || evmResume?.token) && (
              <button
                type="button"
                onClick={() => void (token ? resumePool() : resumeFromReceipt())}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Resume Pool Funding (Step 2)
              </button>
            )}
          </div>
        )}

        {/* Solana Rail (pump.fun) */}
        {isPump && (
          <div className="flex flex-col gap-3 pt-2" aria-label="Pump.fun launch">
            <SolanaButton onConnect={setProvider} rpc={rpc} />

            <p role="status" className="m-0 font-mono text-xs text-white/50">
              State: {pump}
            </p>

            {pumpNote && (
              <p role="alert" className="m-0 text-xs font-medium text-red-400">
                {pumpNote}
              </p>
            )}

            {mint && (
              <p className="m-0 flex items-center gap-1 font-mono text-xs text-white">
                <span className="text-white/50">Mint:</span>
                {rpc !== MAINNET_RPC ? (
                  <span className="text-white/70">{mint.slice(0, 10)}…{mint.slice(-8)} (unbroadcast)</span>
                ) : (
                <a
                  href={explorerTokenUrl(draft.chainId, mint)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#cadcf0] inline-flex items-center gap-0.5"
                >
                  <span>{mint.slice(0, 10)}…{mint.slice(-8)}</span>
                  <ExternalLink size={11} />
                </a>
                )}
              </p>
            )}

            <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-[#131219] p-3.5 text-[13px]" aria-label="Cost breakdown">
              <div className="mb-1 font-mono text-xs font-bold tracking-wider text-white uppercase">
                Cost Breakdown
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/50">Dev buy:</span>
                <span className="text-right font-mono font-semibold break-all text-white">
                  {Number.isFinite(Number(draft.liquidity)) && Number(draft.liquidity) > 0 ? draft.liquidity : "0"} SOL
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/50">Creation + priority fee:</span>
                <span className="text-right font-mono font-semibold break-all text-white">
                  ~{trimSol(PUMP_FEE_SOL + PUMP_PRIORITY_FEE)} SOL
                </span>
              </div>
              <div className="flex justify-between gap-3 border-t border-white/10 pt-1.5">
                <span className="text-white/50">Total spend:</span>
                <span className="text-right font-mono font-bold break-all text-[#fae8a4]">
                  ~{trimSol((Number.isFinite(Number(draft.liquidity)) && Number(draft.liquidity) > 0 ? Number(draft.liquidity) : 0) + PUMP_FEE_SOL + PUMP_PRIORITY_FEE)} SOL
                </span>
              </div>
              <p className="m-0 text-[11px] text-white/50">Plus small rent deposits for new accounts. Only actual onchain costs apply.</p>
            </div>

            <button
              type="button"
              disabled={pump === "working"}
              onClick={() => void launchPump()}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#fae8a4] px-6 py-3 text-sm font-bold text-[#18191c] transition-all hover:bg-[#ece4d4] disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
            >
              {pump === "working" ? "Building Transaction…" : "Confirm & Launch on Solana"}
            </button>

            {resume?.token && (
              <p className="m-0 font-mono text-xs text-white/50">
                <span>Resume prior launch: </span>
                <a
                  href={explorerTokenUrl(draft.chainId, resume.token)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#cadcf0]"
                >
                  {resume.token.slice(0, 8)}…
                </a>
              </p>
            )}
          </div>
        )}

        <form method="dialog" className="flex justify-end border-t border-white/10 pt-2">
          <button value="close" className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold text-white/60 no-underline hover:bg-white/10 hover:text-white">
            Back to editing
          </button>
        </form>
      </div>
    </dialog>
  );
});

export default ReviewDialog;
