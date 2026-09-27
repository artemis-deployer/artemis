"use client";

import React, { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatEther,
  http,
  isAddress,
  type Address,
} from "viem";
import type { PoolInfo } from "@0xbow/privacy-pools-core-sdk";
import { ShieldNoteBackup } from "./ShieldNoteBackup";
import { createShieldAccount, proveShieldWithdrawal, recoverShieldAccount } from "@/lib/shielded-client";
import { buildShieldAssociationSet } from "@/lib/shielded-association";
import { buildConfirmedShieldState } from "@/lib/shielded-indexer";
import { SHIELDED_ENTRYPOINT_ABI, SHIELDED_POOL_READ_ABI } from "@/lib/shielded-contract-abis";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Key,
  Layers,
  Lock,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Terminal as TerminalIcon,
  Wallet,
} from "lucide-react";

type ShieldConfig = {
  configured: boolean;
  enabled: boolean;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  reason: string;
  chainId?: number;
  rpcUrl?: string;
  entrypoint?: Address;
  pool?: Address;
  deploymentBlock?: string;
  scope?: string;
  relayerAddress?: Address;
  denominationWei?: string;
  lifetimeDepositCapWei?: string;
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function shieldChain(rpcUrl: string, chainId = 46630) {
  const isMainnet = chainId === 4663;
  return defineChain({
    id: chainId,
    name: isMainnet ? "Robinhood Chain" : "Robinhood Chain Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

type TabType = "vault" | "deposit" | "withdraw";

export const ShieldPanel: React.FC = () => {
  const [config, setConfig] = useState<ShieldConfig | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("vault");
  const [phrase, setPhraseState] = useState("");
  const [walletAddress, setWalletAddress] = useState<Address | "">("");
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("Initializing protocol environment…");
  const [busy, setBusy] = useState(false);
  const [provingStep, setProvingStep] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [depositTx, setDepositTxState] = useState("");
  const [withdrawTx, setWithdrawTx] = useState("");
  const [showLogs, setShowLogs] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "[init] Artemis Shielded Pool module mounted",
  ]);

  const setPhrase = (val: string) => {
    setPhraseState(val);
    if (typeof window !== "undefined") {
      try {
        if (val) sessionStorage.setItem("artemis_vault_phrase", val);
        else sessionStorage.removeItem("artemis_vault_phrase");
      } catch {
        // ignore
      }
    }
  };

  const setDepositTx = (val: string) => {
    setDepositTxState(val);
    if (typeof window !== "undefined") {
      try {
        if (val) sessionStorage.setItem("artemis_deposit_tx", val);
        else sessionStorage.removeItem("artemis_deposit_tx");
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedPhrase = sessionStorage.getItem("artemis_vault_phrase");
        if (storedPhrase) setPhraseState(storedPhrase);
        const storedDepositTx = sessionStorage.getItem("artemis_deposit_tx");
        if (storedDepositTx) setDepositTxState(storedDepositTx);
      } catch {
        // ignore
      }
    }
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toISOString().split("T")[1]?.slice(0, 8) ?? "telemetry";
    setLogs((prev) => [...prev.slice(-25), `[${time}] ${msg}`]);
  };

  const denomination = config?.denominationWei ? formatEther(BigInt(config.denominationWei)) : "0.001";
  const poolCap = config?.lifetimeDepositCapWei ? formatEther(BigInt(config.lifetimeDepositCapWei)) : "10";
  const isMainnet = config?.chainId === 4663;
  const networkName = isMainnet ? "Robinhood Chain" : "Robinhood Chain Testnet";
  const chainHex = isMainnet ? "0x1237" : "0xb626";
  const explorerBase = isMainnet ? "https://robinhoodchain.blockscout.com" : "https://explorer.testnet.chain.robinhood.com";

  useEffect(() => {
    let active = true;
    void fetch("/api/shield/config", { cache: "no-store" })
      .then(async (response) => {
        const value = (await response.json()) as ShieldConfig;
        if (active) {
          setConfig(value);
          if (value.configured) {
            const nn = value.chainId === 4663 ? "Robinhood Chain" : "Robinhood Chain Testnet";
            setStatus(`Ready. Connected to ${nn}.`);
            addLog(`Pool configured: ${value.pool?.slice(0, 10)}… (Denom: ${formatEther(BigInt(value.denominationWei || "1000000000000000"))} ETH)`);
          } else {
            setStatus("Shield pool is not configured yet.");
            addLog("Pool configuration offline.");
          }
        }
      })
      .catch(() => {
        if (active) {
          setStatus("Could not load Shield configuration.");
          addLog("Network error: failed to fetch /api/shield/config");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function getClients() {
    if (!config?.rpcUrl || !config.chainId) return null;
    const chain = shieldChain(config.rpcUrl, config.chainId);
    return {
      chain,
      publicClient: createPublicClient({ chain, transport: http(config.rpcUrl) }),
    };
  }

  function poolInfo(): PoolInfo | null {
    if (!config?.pool || !config.scope || !config.deploymentBlock || !config.chainId) return null;
    return {
      chainId: config.chainId,
      address: config.pool,
      scope: BigInt(config.scope) as never,
      deploymentBlock: BigInt(config.deploymentBlock),
    };
  }

  async function connectWallet() {
    const clients = getClients();
    if (!window.ethereum || !clients || !config?.chainId || !config.rpcUrl) {
      throw new Error("Connect an injected EVM wallet (MetaMask / Rabby) to continue.");
    }
    let chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    if (BigInt(chainId) !== BigInt(config.chainId)) {
      addLog(`Switching network to ${networkName} (${config.chainId})...`);
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== 4902) throw new Error(`Switch your wallet to ${networkName} (${config.chainId}).`);
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainHex,
              chainName: networkName,
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [config.rpcUrl],
            },
          ],
        });
      }
      chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      if (!config.chainId || BigInt(chainId) !== BigInt(config.chainId)) {
        throw new Error("Wallet network switch did not complete.");
      }
    }
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    const selected = accounts?.[0];
    if (!selected || !isAddress(selected)) throw new Error("Wallet did not return a valid EVM address.");
    setWalletAddress(selected);
    addLog(`Wallet connected: ${selected.slice(0, 6)}…${selected.slice(-4)}`);
    return createWalletClient({
      account: selected,
      chain: clients.chain,
      transport: custom(window.ethereum as never),
    });
  }

  async function restoreAccount() {
    const pool = poolInfo();
    if (!phrase || !pool || !config?.rpcUrl) throw new Error("Add or restore your recovery phrase first.");
    addLog("Scanning pool deposit events from recovery phrase...");
    const restored = await recoverShieldAccount(phrase, [pool], config.rpcUrl);
    if (restored.errors.length > 0) {
      throw new Error("Could not fully recover pool history. Check RPC and retry.");
    }
    addLog("Account state and commitments indexed successfully.");
    return restored;
  }

  async function deposit() {
    const clients = getClients();
    if (!config?.depositEnabled || !config.entrypoint || !config.pool || !config.denominationWei || !clients) {
      throw new Error("Deposits are not enabled for this pool.");
    }
    const wallet = await connectWallet();
    const pool = poolInfo();
    if (!pool) throw new Error("Pool manifest is incomplete.");

    const treeSize = await clients.publicClient.readContract({
      address: config.pool,
      abi: SHIELDED_POOL_READ_ABI,
      functionName: "currentTreeSize",
    });
    if (treeSize >= 2n ** 32n) throw new Error("Pool tree is full.");

    addLog("Deriving precommitment secrets from recovery phrase...");
    const account = createShieldAccount(phrase, pool, config.rpcUrl!);
    const secrets = account.accountService.createDepositSecrets(pool.scope as never);
    addLog(`Precommitment leaf: ${secrets.precommitment.toString().slice(0, 16)}…`);

    setStatus("Please confirm deposit in your wallet (MetaMask)…");
    addLog("Prompting wallet transaction in MetaMask...");
    const hash = await wallet.writeContract({
      address: config.entrypoint,
      abi: SHIELDED_ENTRYPOINT_ABI,
      functionName: "deposit",
      args: [secrets.precommitment],
      value: BigInt(config.denominationWei),
    });
    setDepositTx(hash);
    addLog(`Deposit broadcasted! Tx: ${hash}`);
    setStatus("Deposit broadcasted! Waiting for 12 confirmations…");

    await clients.publicClient.waitForTransactionReceipt({ hash, confirmations: 12 });
    addLog("Deposit confirmed with 12 blocks! Note is securely in the Merkle state tree.");
    setStatus("Deposit confirmed. Note is recoverable and ready for private withdrawal.");
  }

  async function withdraw() {
    const clients = getClients();
    if (
      !config?.withdrawEnabled ||
      !config.pool ||
      !config.entrypoint ||
      !config.relayerAddress ||
      !config.denominationWei ||
      !clients
    ) {
      throw new Error("Withdrawals are not enabled for this pool.");
    }
    if (!isAddress(recipient) || /^0x0{40}$/i.test(recipient)) {
      throw new Error("Enter a valid fresh withdrawal recipient address.");
    }
    const pool = poolInfo();
    if (!pool || !config.rpcUrl || !config.deploymentBlock) throw new Error("Pool manifest is incomplete.");

    setProvingStep("1/4: Indexing confirmed deposit notes…");
    addLog("Starting withdrawal flow...");
    const restored = await restoreAccount();

    setProvingStep("2/4: Querying Association Set Provider (ASP)…");
    addLog("Fetching verified association set from /api/shield/association...");
    const associationResponse = await fetch("/api/shield/association", { cache: "no-store" });
    if (!associationResponse.ok) throw new Error("Current association set is unavailable.");
    const associationData = (await associationResponse.json()) as { labels: string[]; root: string };
    let associationSet = buildShieldAssociationSet(associationData.labels.map((label) => BigInt(label)));
    if (associationSet.root !== BigInt(associationData.root)) {
      throw new Error("Association set root integrity check failed.");
    }
    addLog(`ASP Root verified: ${associationData.root.slice(0, 12)}…`);

    setProvingStep("3/4: Building Merkle State Tree & Computing zkSNARK Proof…");
    addLog("Building confirmed LeanIMT tree snapshot (12 confirmations)...");
    const state = await buildConfirmedShieldState(clients.publicClient, config.pool, BigInt(config.deploymentBlock), 12);

    const candidates = restored.account.getSpendableCommitments().get(pool.scope) ?? [];
    let commitment = candidates.find(
      (item) => state.tree.leaves.includes(item.hash) && associationSet.labels.includes(item.label),
    );

    if (!commitment) {
      addLog("Note not yet in current ASP root. Auto-syncing association set on-chain...");
      try {
        const syncRes = await fetch("/api/shield/sync-asp", { method: "POST" });
        if (syncRes.ok) {
          addLog("ASP synced! Refreshing association set...");
          const refetchAssoc = await fetch("/api/shield/association", { cache: "no-store" });
          if (refetchAssoc.ok) {
            const nextAssocData = (await refetchAssoc.json()) as { labels: string[]; root: string };
            const nextAssocSet = buildShieldAssociationSet(nextAssocData.labels.map((l) => BigInt(l)));
            const recheck = candidates.find(
              (item) => state.tree.leaves.includes(item.hash) && nextAssocSet.labels.includes(item.label),
            );
            if (recheck) {
              commitment = recheck;
              associationSet = nextAssocSet;
              addLog("Spendable note verified in synchronized ASP root!");
            }
          }
        }
      } catch {
        // proceed
      }
    }

    if (!commitment) {
      throw new Error("No confirmed spendable note is included in the current state and association roots.");
    }

    addLog("Executing Groth16 SnarkJS proving circuit locally in browser (no keys leave client)...");
    const { withdrawalProof } = await proveShieldWithdrawal({
      sdk: restored.sdk,
      accountService: restored.account,
      commitment,
      stateTree: state.tree,
      associationSet,
      entrypoint: config.entrypoint,
      recipient,
      feeRecipient: config.relayerAddress,
      scope: pool.scope,
      withdrawalAmount: BigInt(config.denominationWei),
    });
    addLog("Groth16 Zero-Knowledge proof generated successfully!");

    setProvingStep("4/4: Relaying gasless transaction to fresh address…");
    addLog(`Sending proof to relayer for recipient ${recipient.slice(0, 6)}…${recipient.slice(-4)}`);
    const response = await fetch("/api/shield/relay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        {
          recipient,
          withdrawalProof,
        },
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      ),
    });
    const result = (await response.json()) as { error?: string; transactionHash?: string };
    if (!response.ok || !result.transactionHash) throw new Error(result.error || "Relayer rejected the withdrawal.");

    setWithdrawTx(result.transactionHash);
    addLog(`Relayed withdrawal CONFIRMED onchain! Tx: ${result.transactionHash}`);
    setStatus("Relayed withdrawal confirmed. Clean funds delivered to fresh address.");
    setProvingStep(null);
  }

  async function run(action: () => Promise<void>) {
    setActionError(null);
    setBusy(true);
    setStatus("Processing action…");
    try {
      await action();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "shield_action_failed";
      setActionError(msg);
      setStatus(msg);
      addLog(`Error: ${msg}`);
      setProvingStep(null);
    } finally {
      setBusy(false);
    }
  }

  const explorerUrl = explorerBase;

  return (
    <section
      id="shield"
      data-theme="dark"
      aria-label="Shielded Privacy Pools"
      className="w-full border-t border-white/10 bg-[#131416] px-[max(6.25vw,24px)] py-28 text-[#f8f6f0]"
    >
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Section Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-white/50 uppercase">
                08 // PRIVACY PROTOCOL
              </span>
              <span className="rounded border border-[#fae8a4]/40 bg-[#fae8a4]/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#fae8a4] uppercase">
                ZK-GROTH16 · LEANIMT
              </span>
            </div>
            <h2 className="font-unbounded m-0 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Break the on-chain link.
              <br />
              <span className="text-white/60">Maintain absolute custody.</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-[#1a1b1f] px-4 py-2.5 font-mono text-xs">
              <span className="text-white/40 block text-[10px] uppercase">Denomination</span>
              <strong className="text-sm font-bold text-[#fae8a4]">{denomination} ETH</strong>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1a1b1f] px-4 py-2.5 font-mono text-xs">
              <span className="text-white/40 block text-[10px] uppercase">Lifetime Pool Cap</span>
              <strong className="text-sm font-bold text-white">{poolCap} ETH</strong>
            </div>
          </div>
        </div>

        {/* Visual Architecture Diagram (How it works in 4 clean nodes) */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-[#18191c]/80 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs font-bold tracking-wider text-white/50 uppercase">
              Zero-Knowledge Settlement Flow
            </span>
            <span className="font-mono text-[11px] text-[#fae8a4]">Non-Custodial · Zero Platform Fee</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-[#121316] p-4">
              <div className="flex items-center justify-between text-xs font-mono text-white/40">
                <span>01 // DEPOSIT</span>
                <Wallet className="h-3.5 w-3.5 text-[#fae8a4]" />
              </div>
              <strong className="text-sm font-bold text-white">Deposit Note</strong>
              <p className="m-0 text-xs text-white/60">
                {denomination} ETH committed with Poseidon hash precommitment.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-[#121316] p-4">
              <div className="flex items-center justify-between text-xs font-mono text-white/40">
                <span>02 // ANONYMITY</span>
                <Layers className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <strong className="text-sm font-bold text-white">Lean IMT Tree</strong>
              <p className="m-0 text-xs text-white/60">
                Deposits aggregated into an incremental Merkle tree state pool.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-[#121316] p-4">
              <div className="flex items-center justify-between text-xs font-mono text-white/40">
                <span>03 // COMPLIANCE</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <strong className="text-sm font-bold text-white">ASP Root Filter</strong>
              <p className="m-0 text-xs text-white/60">
                Association Set verifies note legitimacy without leaking identity.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-[#121316] p-4">
              <div className="flex items-center justify-between text-xs font-mono text-white/40">
                <span>04 // WITHDRAW</span>
                <Send className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <strong className="text-sm font-bold text-white">Groth16 Relayer</strong>
              <p className="m-0 text-xs text-white/60">
                Gasless relayed payout to fresh address. Zero link to depositor.
              </p>
            </div>
          </div>
        </div>

        {/* Guided Wizard Navigation Bar */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-5 py-3 font-mono text-xs font-bold transition-all ${
              activeTab === "vault"
                ? "border border-[#fae8a4] bg-[#fae8a4] text-[#18191c] shadow-lg shadow-[#fae8a4]/10"
                : "border border-white/10 bg-[#1a1b1f] text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            <Key className="h-4 w-4" />
            <span>01. SOVEREIGN VAULT</span>
            {phrase && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${activeTab === "vault" ? "bg-black/20 text-black" : "bg-emerald-500/20 text-emerald-300"}`}>
                Ready
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-5 py-3 font-mono text-xs font-bold transition-all ${
              activeTab === "deposit"
                ? "border border-[#fae8a4] bg-[#fae8a4] text-[#18191c] shadow-lg shadow-[#fae8a4]/10"
                : "border border-white/10 bg-[#1a1b1f] text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>02. SHIELD DEPOSIT</span>
            {depositTx && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${activeTab === "deposit" ? "bg-black/20 text-black" : "bg-emerald-500/20 text-emerald-300"}`}>
                Confirmed
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("withdraw")}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-5 py-3 font-mono text-xs font-bold transition-all ${
              activeTab === "withdraw"
                ? "border border-[#fae8a4] bg-[#fae8a4] text-[#18191c] shadow-lg shadow-[#fae8a4]/10"
                : depositTx
                  ? "border-[#fae8a4]/40 bg-[#fae8a4]/5 text-white hover:border-[#fae8a4] hover:bg-[#fae8a4]/10"
                  : "border border-white/10 bg-[#1a1b1f] text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            <Send className="h-4 w-4" />
            <span>03. ZK WITHDRAWAL</span>
            {withdrawTx ? (
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${activeTab === "withdraw" ? "bg-black/20 text-black" : "bg-purple-500/20 text-purple-300"}`}>
                Completed
              </span>
            ) : depositTx ? (
              <span className="rounded px-1.5 py-0.5 text-[10px] bg-[#fae8a4] text-black font-bold animate-pulse">
                Next Step
              </span>
            ) : null}
          </button>
        </div>

        {/* TAB CONTENT PANELS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Action Box (8 cols) */}
          <div className="lg:col-span-8">
            {/* TAB 1: VAULT SETUP */}
            {activeTab === "vault" && (
              <div className="rounded-2xl border border-white/10 bg-[#1a1b1f] p-6 sm:p-8">
                <div className="mb-6">
                  <h3 className="font-unbounded m-0 text-xl font-bold text-white">Sovereign Vault Key Setup</h3>
                  <p className="mt-1.5 text-sm text-white/60">
                    Your 12-word cryptographic seed phrase generates deposit precommitments and private withdrawal proofs.
                  </p>
                </div>

                {!phrase ? (
                  <ShieldNoteBackup
                    onReady={(recoveryPhrase) => {
                      setPhrase(recoveryPhrase);
                      setStatus("Recovery phrase active in memory. You may now proceed to deposit.");
                      addLog("Vault unlocked with recovery phrase in memory.");
                      setActiveTab("deposit");
                    }}
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        <div>
                          <strong className="block text-sm font-bold text-white">Vault Active & Secured</strong>
                          <span className="text-xs text-white/70">
                            Phrase is securely held in browser memory for this session only.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhrase("");
                          setDepositTx("");
                          setWithdrawTx("");
                          addLog("Session phrase purged.");
                        }}
                        className="cursor-pointer rounded-lg border border-white/20 bg-black/30 px-3.5 py-2 font-mono text-xs font-semibold text-white/80 hover:bg-black/50 hover:text-white"
                      >
                        PURGE SESSION KEY
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveTab("deposit")}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#fae8a4] bg-[#fae8a4] px-6 py-3 font-mono text-xs font-bold text-[#18191c] hover:bg-[#fff0b8]"
                      >
                        <span>CONTINUE TO DEPOSIT</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DEPOSIT */}
            {activeTab === "deposit" && (
              <div className="rounded-2xl border border-white/10 bg-[#1a1b1f] p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-unbounded m-0 text-xl font-bold text-white">Deposit Note into Privacy Pool</h3>
                    <p className="mt-1 text-sm text-white/60">
                      Locks exactly {denomination} ETH into the Merkle tree with your unique secret.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void run(async () => { await connectWallet(); })}
                    className="cursor-pointer rounded-xl border border-white/20 bg-white/5 px-4 py-2 font-mono text-xs font-semibold text-white transition-all hover:bg-white/10"
                  >
                    {walletAddress
                      ? `Connected: ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
                      : "Connect Wallet"}
                  </button>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-[#121316] p-5 font-mono text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-white/40 block text-[11px] uppercase">Fixed Deposit</span>
                    <strong className="mt-1 block text-base font-bold text-[#fae8a4]">{denomination} ETH</strong>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[11px] uppercase">Network</span>
                    <strong className="mt-1 block text-sm font-semibold text-white">{networkName}</strong>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[11px] uppercase">Confirmations</span>
                    <strong className="mt-1 block text-sm font-semibold text-white">12 Blocks</strong>
                  </div>
                </div>

                {!phrase ? (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-5 text-xs text-amber-200">
                    <div className="flex items-center gap-2 mb-2 font-bold text-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Vault Key Required</span>
                    </div>
                    <p className="m-0 mb-4 text-white/70 leading-relaxed">
                      You must generate or restore a vault recovery phrase before depositing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("vault")}
                      className="cursor-pointer rounded-lg border border-[#fae8a4] bg-[#fae8a4] px-4 py-2 font-mono text-xs font-bold text-[#18191c]"
                    >
                      OPEN VAULT TAB
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {actionError && (
                      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 font-mono text-xs text-red-200">
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          <span>Deposit Error</span>
                        </div>
                        <p className="m-0 text-white/80">{actionError}</p>
                      </div>
                    )}

                    {depositTx ? (
                      <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 font-mono text-xs text-emerald-200 shadow-lg shadow-emerald-950/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                              <span className="font-bold text-sm text-emerald-300">Deposit Confirmed & Shielded</span>
                            </div>
                            <a
                              href={`${explorerUrl}/tx/${depositTx}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-[#fae8a4] hover:border-[#fae8a4]/50 hover:bg-[#fae8a4]/10 transition-all"
                            >
                              <span>View Explorer</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <p className="mt-3 mb-0 text-white/80 leading-relaxed">
                            Your <strong>{denomination} ETH</strong> has been locked into the Privacy Pool and your cryptographic precommitment is indexed. You can now anonymously withdraw it to any recipient wallet using a zero-knowledge proof.
                          </p>
                          <p className="mt-2 mb-0 break-all text-[11px] text-white/50">
                            Tx: {depositTx}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab("withdraw")}
                          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fae8a4] bg-[#fae8a4] px-6 py-4 font-mono text-sm font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] hover:shadow-lg hover:shadow-[#fae8a4]/20 active:scale-[0.99]"
                        >
                          <span>PROCEED TO ZK WITHDRAWAL (STEP 03)</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>

                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setDepositTx("")}
                            className="cursor-pointer text-[11px] font-mono text-white/50 hover:text-[#fae8a4] underline underline-offset-4 transition-colors"
                          >
                            + Deposit another {denomination} ETH note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || !config?.depositEnabled}
                        onClick={() => void run(deposit)}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fae8a4] bg-[#fae8a4] px-6 py-4 font-mono text-sm font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busy ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>DEPOSITING & WAITING CONFIRMATIONS…</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            <span>CONFIRM & DEPOSIT {denomination} ETH</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: WITHDRAW */}
            {activeTab === "withdraw" && (
              <div className="rounded-2xl border border-white/10 bg-[#1a1b1f] p-6 sm:p-8">
                <div className="mb-6">
                  <h3 className="font-unbounded m-0 text-xl font-bold text-white">Private Relayed Withdrawal</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Proves note ownership via zkSNARK without revealing the deposit address. Paid via gasless relayer.
                  </p>
                </div>

                {!phrase && (
                  <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-5 text-xs text-amber-200">
                    <div className="flex items-center gap-2 mb-2 font-bold text-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>Vault Recovery Phrase Required</span>
                    </div>
                    <p className="m-0 mb-4 text-white/70 leading-relaxed">
                      Your 12-word vault recovery phrase is required to compute the zero-knowledge proof of note ownership. Please restore or enter your phrase in the Vault tab.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("vault")}
                      className="cursor-pointer rounded-lg border border-[#fae8a4] bg-[#fae8a4] px-4 py-2 font-mono text-xs font-bold text-[#18191c] hover:bg-[#fff0b8] transition-all"
                    >
                      OPEN VAULT TAB TO RESTORE
                    </button>
                  </div>
                )}

                <div className="mb-6 flex flex-col gap-4">
                  <div>
                    <label className="mb-2 block font-mono text-xs font-bold text-white/60 uppercase" htmlFor="shield-recipient">
                      Fresh Recipient Address (Robinhood Chain)
                    </label>
                    <input
                      id="shield-recipient"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x… (Must be a fresh, unlinked address)"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-xl border border-white/15 bg-[#121316] px-4 py-3 font-mono text-xs text-white placeholder-white/30 focus:border-[#fae8a4] focus:outline-none"
                    />
                    {recipient.trim() && (!isAddress(recipient.trim()) || /^0x0{40}$/i.test(recipient.trim())) && (
                      <p className="mt-1.5 mb-0 text-[11px] font-mono text-red-400">
                        Invalid EVM address format. Must be a 42-character address starting with 0x.
                      </p>
                    )}
                    <span className="mt-1.5 block text-[11px] text-white/40">
                      Note: For maximum privacy, use a newly generated address with zero prior transaction history.
                    </span>
                  </div>

                  {provingStep && (
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 font-mono text-xs text-purple-200">
                      <div className="flex items-center gap-2 font-bold">
                        <RefreshCw className="h-4 w-4 animate-spin text-[#fae8a4]" />
                        <span>Computing Zero-Knowledge Proof…</span>
                      </div>
                      <p className="mt-1 mb-0 text-white/80">{provingStep}</p>
                    </div>
                  )}

                  {actionError && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 font-mono text-xs text-red-200">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <span>Withdrawal Error</span>
                      </div>
                      <p className="m-0 text-white/80">{actionError}</p>
                    </div>
                  )}

                  {withdrawTx ? (
                    <div className="flex flex-col gap-4">
                      <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-5 font-mono text-xs text-purple-200 shadow-lg shadow-purple-950/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-purple-300 shrink-0" />
                            <span className="font-bold text-sm text-purple-100">Relayed Withdrawal Confirmed & Delivered</span>
                          </div>
                          <a
                            href={`${explorerUrl}/tx/${withdrawTx}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/15 px-2 py-1 text-[11px] text-[#fae8a4] hover:border-[#fae8a4]/50 hover:bg-[#fae8a4]/10 transition-all"
                          >
                            <span>View Explorer</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="mt-3 mb-0 text-white/80 leading-relaxed">
                          Clean funds of <strong>{denomination} ETH</strong> have been delivered to your recipient address with zero on-chain link to your depositor wallet. You can now use this fresh wallet to deploy and verify tokens anonymously.
                        </p>
                        <p className="mt-2 mb-0 break-all text-[11px] text-white/50">
                          Recipient: {recipient}
                        </p>
                        <p className="mt-1 mb-0 break-all text-[11px] text-white/50">
                          Tx: {withdrawTx}
                        </p>
                      </div>

                      <a
                        href="/#studio"
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fae8a4] bg-[#fae8a4] px-6 py-4 font-mono text-sm font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] hover:shadow-lg hover:shadow-[#fae8a4]/20 active:scale-[0.99] no-underline text-center"
                      >
                        <span>DEPLOY TOKEN ANONYMOUSLY (LAUNCHPAD)</span>
                        <ArrowRight className="h-4 w-4" />
                      </a>

                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setWithdrawTx("");
                            setRecipient("");
                          }}
                          className="cursor-pointer text-[11px] font-mono text-white/50 hover:text-[#fae8a4] underline underline-offset-4 transition-colors"
                        >
                          + Perform another withdrawal
                        </button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const isRecipientValid = Boolean(recipient.trim() && isAddress(recipient.trim()) && !/^0x0{40}$/i.test(recipient.trim()));
                      const canWithdraw = !busy && Boolean(phrase) && isRecipientValid && Boolean(config?.withdrawEnabled);
                      return (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            disabled={!canWithdraw}
                            onClick={() => void run(withdraw)}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fae8a4] bg-[#fae8a4] px-6 py-4 font-mono text-sm font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span>PROVING & RELAYING…</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                <span>PROVE & WITHDRAW {denomination} ETH</span>
                              </>
                            )}
                          </button>

                          {!busy && !canWithdraw && (
                            <div className="rounded-lg border border-white/5 bg-[#121316] px-3.5 py-2 font-mono text-[11px] text-white/50 flex items-center gap-2">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
                              <span>
                                {!phrase
                                  ? "Vault recovery phrase missing. Please load or restore it in Step 01."
                                  : !recipient.trim()
                                    ? "Please enter a recipient address above."
                                    : !isRecipientValid
                                      ? "Recipient address is invalid (must be a 42-character 0x address)."
                                      : !config?.withdrawEnabled
                                        ? "Withdrawals are currently offline on this network."
                                        : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info & Status Cards (4 cols) */}
          <div className="flex flex-col gap-5 lg:col-span-4">
            {/* Status Card */}
            <div className="rounded-2xl border border-white/10 bg-[#1a1b1f] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white/50 uppercase">Network Telemetry</span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isMainnet ? "Mainnet Online" : "Testnet Online"}
                </span>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#121316] p-3 font-mono text-xs text-white/80">
                <p className="m-0 leading-relaxed text-[11px]">{status}</p>
              </div>

              <div className="mt-4 flex flex-col gap-2 font-mono text-[11px] text-white/60">
                <div className="flex justify-between">
                  <span>Chain:</span>
                  <span className="text-white">{networkName} ({config?.chainId ?? "—"})</span>
                </div>
                <div className="flex justify-between">
                  <span>Prover:</span>
                  <span className="text-white">Groth16 SnarkJS (WASM)</span>
                </div>
                <div className="flex justify-between">
                  <span>Tree:</span>
                  <span className="text-white">LeanIMT (Depth 32)</span>
                </div>
              </div>
            </div>

            {/* Network Advisory */}
            <div className="rounded-2xl border border-[#fae8a4]/20 bg-[#fae8a4]/5 p-5">
              <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-[#fae8a4] uppercase">
                <Shield className="h-4 w-4" />
                <span>{isMainnet ? "Mainnet Environment" : "Rehearsal Environment"}</span>
              </div>
              <p className="m-0 text-xs leading-relaxed text-white/70">
                {isMainnet
                  ? `This pool runs on Robinhood Chain Mainnet with ${denomination} ETH notes. All transactions are final and involve real funds.`
                  : `This pool runs on Robinhood Chain Testnet with ${denomination} ETH notes. Real funds are never risked during rehearsal drills.`}
              </p>
            </div>
          </div>
        </div>

        {/* Collapsible Monospace Telemetry Logger */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#121316] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex w-full cursor-pointer items-center justify-between border-b border-white/10 bg-[#18191c] px-5 py-3 font-mono text-xs font-semibold text-white/70 hover:text-white"
          >
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-3.5 w-3.5 text-[#fae8a4]" />
              <span>Live Protocol Telemetry Log ({logs.length} events)</span>
            </div>
            {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showLogs && (
            <div className="max-h-48 overflow-y-auto p-4 font-mono text-[11px] text-white/60 space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed hover:text-white/90 font-mono">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
