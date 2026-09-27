"use client";

import { useRef, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { TransitionLink } from "../../components/PageTransition";
import mainnet from "../../deployments/robinhood-mainnet.json";
import testnet from "../../deployments/robinhood-testnet.json";
import shieldMainnet from "../../deployments/robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json";

type Entry = {
  group?: string;
  name: string;
  address: string;
  txHash?: string;
  verified?: boolean;
  owner?: string;
  notes?: string;
};

type Manifest = {
  network: string;
  chainId: number;
  explorer: string;
  deployBlock: number;
  deployedAt: string;
  deployer: string;
  gitCommit: string;
  contracts: Entry[];
  external: Entry[];
  notes?: string;
};

const MANIFESTS: Record<"mainnet" | "testnet", Manifest> = {
  mainnet: mainnet as Manifest,
  testnet: testnet as Manifest,
};

type ShieldManifest = {
  chainId: number;
  denominationWei: string;
  lifetimeDepositCapWei: string;
  poolActivation: { depositsPaused: boolean; activationPending: boolean; activationTx: string | null };
  contracts: Record<string, { address: string; transactionHash: string } | Record<string, { address: string; transactionHash: string }>>;
};

const SHIELD_EXPLORER = "https://robinhoodchain.blockscout.com";

function shieldEntries(): Entry[] {
  const m = shieldMainnet as unknown as ShieldManifest;
  const out: Entry[] = [];
  const push = (group: string, name: string, v: { address: string; transactionHash: string } | undefined, notes?: string) => {
    if (!v) return;
    out.push({ name, address: v.address, txHash: v.transactionHash, verified: true, notes });
  };
  const c = m.contracts as Record<string, { address: string; transactionHash: string }>;
  push("ZK Layer", "ArtemisMainnetPrivacyPoolSimple", c.pool, "partial match");
  push("ZK Layer", "Entrypoint", c.entrypointImplementation, "partial match");
  push("ZK Layer", "ERC1967Proxy", c.entrypointProxy);
  push("ZK Layer", "WithdrawalVerifier", c.withdrawalVerifier);
  push("ZK Layer", "CommitmentVerifier", c.commitmentVerifier);
  const libs = (m.contracts as Record<string, Record<string, { address: string; transactionHash: string }>>).libraries ?? {};
  push("External", "PoseidonT3", libs.PoseidonT3);
  push("External", "PoseidonT4", libs.PoseidonT4);
  return out;
}

function shieldMeta(): { label: string; value: string }[] {
  const m = shieldMainnet as unknown as ShieldManifest;
  const eth = (wei: string) => `${Number(BigInt(wei)) / 1e18} ETH`;
  return [
    { label: "Chain ID", value: String(m.chainId) },
    { label: "Denomination", value: eth(m.denominationWei) },
    { label: "Lifetime cap", value: eth(m.lifetimeDepositCapWei) },
    { label: "Deposits", value: m.poolActivation.depositsPaused ? "PAUSED" : "OPEN" },
  ];
}

export default function ContractsPage() {
  const [tab, setTab] = useState<"mainnet" | "testnet" | "shield">("mainnet");
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const m = MANIFESTS[tab === "shield" ? "mainnet" : tab];
  const isShield = tab === "shield";

  function copyText(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(text);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2000);
    }
  }

  function addrRow(e: Entry, group: string, explorer?: string) {
    const ex = explorer ?? m.explorer;
    const url = `${ex}/address/${e.address}`;
    return (
      <div key={`${group}:${e.name}`} className="contract-row">
        <div className="contract-head">
          <span className="contract-group">{group}</span>
          <h3>{e.name}</h3>
          {e.verified && <span className="contract-verified">VERIFIED</span>}
          {group === "External" && <span className="contract-external">EXTERNAL</span>}
        </div>
        <div className="contract-addr">
          <a href={url} target="_blank" rel="noreferrer" className="contract-link">
            {e.address} <ExternalLink size={12} />
          </a>
          <button type="button" onClick={() => copyText(e.address)} title="Copy address" aria-label={`Copy ${e.name} address`}>
            {copied === e.address ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
        {e.owner !== undefined && <p className="contract-meta">Owner: {e.owner}</p>}
        {e.txHash && (
          <p className="contract-meta">
            Deploy tx:{" "}
            <a href={`${ex}/tx/${e.txHash}`} target="_blank" rel="noreferrer" className="contract-link">
              {e.txHash.slice(0, 10)}…{e.txHash.slice(-8)}
            </a>
          </p>
        )}
        {e.notes && <p className="contract-notes">{e.notes}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131416] text-[#f8f6f0] font-sans">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#131416]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-[80px] max-w-[1800px] items-center justify-between gap-4 px-[max(6.25vw,24px)]">
          <TransitionLink href="/" aria-label="Artemis home">
            <img src="/assets/logo.webp" className="h-7 w-auto object-contain" alt="Artemis" />
          </TransitionLink>
          <TransitionLink href="/" className="dp-button secondary min-w-0 text-xs py-1">
            <span>BACK TO STUDIO</span>
            <span className="arrow-box">↖</span>
          </TransitionLink>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-[max(6.25vw,24px)] pt-12 pb-24">
        <p className="m-0 mb-2 text-xs font-mono uppercase tracking-[0.2em] text-[#fae8a4]">PUBLIC REGISTRY</p>
        <h1 className="font-unbounded m-0 mb-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Contracts
        </h1>
        <p className="m-0 mb-8 max-w-xl text-base text-white/70 leading-relaxed">
          Every Artemis contract, verified on the explorer. Read directly from the deployment manifest —
          nothing typed by hand.
        </p>

        <div className="mb-8 flex gap-2">
          {(["mainnet", "testnet", "shield"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`min-h-10 cursor-pointer rounded px-4 py-2 text-xs font-semibold border ${
                tab === t
                  ? "border-[#fae8a4] bg-[#fae8a4] text-[#18191c]"
                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              {t === "mainnet" ? "Mainnet 4663" : t === "testnet" ? "Testnet 46630" : "Shield 4663"}
            </button>
          ))}
        </div>

        {isShield ? (
          <>
            <dl className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              {shieldMeta().map((d) => (
                <div key={d.label}><dt className="text-white/40 uppercase">{d.label}</dt><dd className="text-white">{d.value}</dd></div>
              ))}
            </dl>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {shieldEntries().map((e) => addrRow(e, e.name === "PoseidonT3" || e.name === "PoseidonT4" ? "External" : "ZK Layer", SHIELD_EXPLORER))}
            </div>
          </>
        ) : (
          <>
            <dl className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div><dt className="text-white/40 uppercase">Chain ID</dt><dd className="text-white">{m.chainId}</dd></div>
              <div><dt className="text-white/40 uppercase">Deploy block</dt><dd className="text-white">{m.deployBlock || "—"}</dd></div>
              <div><dt className="text-white/40 uppercase">Commit</dt><dd className="text-white">{m.gitCommit}</dd></div>
              <div><dt className="text-white/40 uppercase">Deployer</dt><dd className="text-white break-all">{m.deployer}</dd></div>
            </dl>

            {m.notes && <p className="mb-8 border-l-2 border-[#fae8a4]/60 pl-3 text-sm text-white/70">{m.notes}</p>}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {m.contracts.map((e) => addrRow(e, "Core"))}
              {m.external.map((e) => addrRow(e, "External"))}
              {m.contracts.length === 0 && m.external.length === 0 && (
                <p className="text-sm text-white/50 font-mono">No contracts deployed on this network yet.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
