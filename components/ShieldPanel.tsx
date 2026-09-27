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
import { proveShieldWithdrawal, recoverShieldAccount } from "@/lib/shielded-client";
import { buildShieldAssociationSet } from "@/lib/shielded-association";
import { buildConfirmedShieldState } from "@/lib/shielded-indexer";
import { SHIELDED_ENTRYPOINT_ABI, SHIELDED_POOL_READ_ABI } from "@/lib/shielded-contract-abis";

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

function shieldChain(rpcUrl: string) {
  return defineChain({
    id: 46630,
    name: "Robinhood Chain Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

export const ShieldPanel: React.FC = () => {
  const [config, setConfig] = useState<ShieldConfig | null>(null);
  const [phrase, setPhrase] = useState("");
  const [walletAddress, setWalletAddress] = useState<Address | "">("");
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("Loading testnet configuration…");
  const [busy, setBusy] = useState(false);
  const [depositTx, setDepositTx] = useState("");
  const [withdrawTx, setWithdrawTx] = useState("");
  const denomination = config?.denominationWei ? formatEther(BigInt(config.denominationWei)) : "—";
  const poolCap = config?.lifetimeDepositCapWei ? formatEther(BigInt(config.lifetimeDepositCapWei)) : "—";

  useEffect(() => {
    let active = true;
    void fetch("/api/shield/config", { cache: "no-store" })
      .then(async (response) => {
        const value = await response.json() as ShieldConfig;
        if (active) {
          setConfig(value);
          setStatus(value.configured ? "Testnet contract configuration verified." : "Shield testnet is not configured yet.");
        }
      })
      .catch(() => { if (active) setStatus("Could not load Shield configuration."); });
    return () => { active = false; };
  }, []);

  function getClients() {
    if (!config?.rpcUrl || !config.chainId) return null;
    const chain = shieldChain(config.rpcUrl);
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
    if (!window.ethereum || !clients || !config?.chainId || !config.rpcUrl) throw new Error("Connect an injected EVM wallet to continue.");
    let chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
    if (BigInt(chainId) !== BigInt(config.chainId)) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xb626" }] });
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== 4902) throw new Error("Switch your wallet to Robinhood Chain Testnet (46630).");
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xb626",
            chainName: "Robinhood Chain Testnet",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [config.rpcUrl],
          }],
        });
      }
      chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
      if (!config.chainId || BigInt(chainId) !== BigInt(config.chainId)) throw new Error("Wallet network switch did not complete.");
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
    const selected = accounts?.[0];
    if (!selected || !isAddress(selected)) throw new Error("Wallet did not return a valid EVM address.");
    setWalletAddress(selected);
    return createWalletClient({
      account: selected,
      chain: clients.chain,
      transport: custom(window.ethereum as never),
    });
  }

  async function restoreAccount() {
    const pool = poolInfo();
    if (!phrase || !pool || !config?.rpcUrl) throw new Error("Add or restore your recovery phrase first.");
    const restored = await recoverShieldAccount(phrase, [pool], config.rpcUrl);
    if (restored.errors.length > 0) throw new Error("Could not fully recover pool history. Check the testnet RPC and retry.");
    return restored;
  }

  async function deposit() {
    const clients = getClients();
    if (!config?.depositEnabled || !config.entrypoint || !config.pool || !config.denominationWei || !clients) throw new Error("Deposits are not enabled for this testnet pool.");
    const wallet = await connectWallet();
    const pool = poolInfo();
    if (!pool) throw new Error("Pool manifest is incomplete.");
    const restored = await restoreAccount();
    const treeSize = await clients.publicClient.readContract({ address: config.pool, abi: SHIELDED_POOL_READ_ABI, functionName: "currentTreeSize" });
    if (treeSize >= 2n ** 32n) throw new Error("Pool tree is full.");
    const secrets = restored.account.createDepositSecrets(pool.scope as never);
    const hash = await wallet.writeContract({
      address: config.entrypoint,
      abi: SHIELDED_ENTRYPOINT_ABI,
      functionName: "deposit",
      args: [secrets.precommitment],
      value: BigInt(config.denominationWei),
    });
    setDepositTx(hash);
    setStatus("Deposit submitted. Waiting for 12 confirmations before rebuilding your account.");
    await clients.publicClient.waitForTransactionReceipt({ hash, confirmations: 12 });
    setStatus("Deposit confirmed. Keep your encrypted backup offline; the note is recoverable from your phrase and pool events.");
  }

  async function withdraw() {
    const clients = getClients();
    if (!config?.withdrawEnabled || !config.pool || !config.entrypoint || !config.relayerAddress || !config.denominationWei || !clients) {
      throw new Error("Withdrawals are not enabled for this testnet pool.");
    }
    if (!isAddress(recipient) || /^0x0{40}$/i.test(recipient)) throw new Error("Enter a valid withdrawal recipient address.");
    const pool = poolInfo();
    if (!pool || !config.rpcUrl || !config.deploymentBlock) throw new Error("Pool manifest is incomplete.");
    const restored = await restoreAccount();
    const associationResponse = await fetch("/api/shield/association", { cache: "no-store" });
    if (!associationResponse.ok) throw new Error("Current association set is unavailable.");
    const associationData = await associationResponse.json() as { labels: string[]; root: string };
    const associationSet = buildShieldAssociationSet(associationData.labels.map((label) => BigInt(label)));
    if (associationSet.root !== BigInt(associationData.root)) throw new Error("Association set root integrity check failed.");
    const state = await buildConfirmedShieldState(
      clients.publicClient,
      config.pool,
      BigInt(config.deploymentBlock),
      12,
    );
    const candidates = restored.account.getSpendableCommitments().get(pool.scope) ?? [];
    const commitment = candidates.find((item) =>
      state.tree.leaves.includes(item.hash) && associationSet.labels.includes(item.label),
    );
    if (!commitment) throw new Error("No confirmed spendable note is included in the current state and association roots.");
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
    const response = await fetch("/api/shield/relay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient,
        withdrawalProof,
      }, (_key, value) => typeof value === "bigint" ? value.toString() : value),
    });
    const result = await response.json() as { error?: string; transactionHash?: string };
    if (!response.ok || !result.transactionHash) throw new Error(result.error || "Relayer rejected the withdrawal.");
    setWithdrawTx(result.transactionHash);
    setStatus("Relayed withdrawal confirmed on Robinhood testnet.");
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setStatus("Preparing wallet and checking pool state…");
    try { await action(); }
    catch (error) { setStatus(error instanceof Error ? error.message : "shield_action_failed"); }
    finally { setBusy(false); }
  }

  return (
    <section id="shield" data-theme="dark" className="section">
      <p className="eyebrow">08 // SHIELDED POOLS · ROBINHOOD TESTNET</p>
      <h2 className="center-heading font-unbounded">A private pool, with recoverable notes.</h2>
      <p className="section-sub">
        Fixed {denomination} ETH deposits, a {poolCap} ETH lifetime pool cap, and browser-side proving. This is a testnet rehearsal; deposit addresses remain visible onchain.
      </p>

      {!config?.enabled ? (
        <p className="shield-warning" role="status">{status} Public Shield actions stay disabled until the testnet manifest and onchain configuration are verified.</p>
      ) : (
        <div className="shield-grid">
          <div className="shield-field">
            <span>Denomination</span><strong>{denomination} ETH</strong>
            <span>Lifetime deposit cap</span><strong>{poolCap} ETH</strong>
            <button type="button" disabled={busy || !config.depositEnabled || !phrase} onClick={() => void run(deposit)}>
              {busy ? "WORKING?" : `DEPOSIT ${denomination} ETH`}
            </button>
            <label className="shield-note-label" htmlFor="shield-recipient">Withdrawal recipient</label>
            <input id="shield-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0x… fresh address" autoComplete="off" />
            <button type="button" disabled={busy || !config.withdrawEnabled || !phrase || !recipient} onClick={() => void run(withdraw)}>
              {busy ? "PROVING…" : "PROVE & WITHDRAW"}
            </button>
          </div>
          <div className="shield-actions">
            {!phrase ? (
              <ShieldNoteBackup onReady={(recoveryPhrase) => { setPhrase(recoveryPhrase); setStatus("Recovery phrase verified in memory. Connect a wallet when you are ready."); }} />
            ) : (
              <>
              <p>Recovery phrase is held in memory for this session only.</p>
                <button type="button" onClick={() => { setPhrase(""); setDepositTx(""); setWithdrawTx(""); }}>CLEAR SESSION PHRASE</button>
              </>
            )}
            <button type="button" disabled={busy || !config.depositEnabled && !config.withdrawEnabled} onClick={() => void run(async () => { await connectWallet(); setStatus("Wallet connected to Robinhood Chain Testnet."); })}>
              {walletAddress ? `CONNECTED ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "CONNECT TESTNET WALLET"}
            </button>
            <p role="status">{status}</p>
            {depositTx && <p>Deposit transaction: <code>{depositTx}</code></p>}
            {withdrawTx && <p>Withdrawal transaction: <code>{withdrawTx}</code></p>}
          </div>
        </div>
      )}

      <p className="shield-warning" role="note">
        Testnet only. Never enter your wallet private key here. A recovery phrase controls shielded notes: keep it offline, use an encrypted backup, and never share it. Mainnet is unsupported.
      </p>
    </section>
  );
};
