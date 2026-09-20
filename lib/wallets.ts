// Multi-wallet registry. No wallet SDKs: detect injected providers directly,
// EIP-6963 providers[] first, legacy singletons as fallback.

export type EvmWalletId = "metamask" | "rabby" | "coinbase" | "okx" | "trust" | "phantom";
export type SolanaWalletId = "phantom" | "solflare" | "backpack" | "nightly";
export type WalletKind = "evm" | "solana";

export type EvmProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, cb: (...a: never[]) => void) => void;
  removeListener?: (event: string, cb: (...a: never[]) => void) => void;
};

export type SolanaProviderLike = {
  publicKey: { toBase58(): string };
  connect(opts?: unknown): Promise<unknown>;
  disconnect?: () => Promise<unknown>;
};

export type WalletOption = {
  id: EvmWalletId | SolanaWalletId;
  kind: WalletKind;
  name: string;
  installUrl: string;
  icon: string;
};

export const EVM_WALLETS: WalletOption[] = [
  { id: "metamask", kind: "evm", name: "MetaMask", installUrl: "https://metamask.io/download/", icon: "/wallets/metamask.svg" },
  { id: "rabby", kind: "evm", name: "Rabby", installUrl: "https://rabby.io/", icon: "/wallets/rabby.svg" },
  { id: "coinbase", kind: "evm", name: "Coinbase Wallet", installUrl: "https://www.coinbase.com/wallet/downloads", icon: "/wallets/coinbase.svg" },
  { id: "okx", kind: "evm", name: "OKX Wallet", installUrl: "https://www.okx.com/web3", icon: "/wallets/okx.svg" },
  { id: "trust", kind: "evm", name: "Trust Wallet", installUrl: "https://trustwallet.com/download", icon: "/wallets/trust.png" },
  { id: "phantom", kind: "evm", name: "Phantom (EVM)", installUrl: "https://phantom.app/download", icon: "/wallets/phantom.svg" },
];

export const SOLANA_WALLETS: WalletOption[] = [
  { id: "phantom", kind: "solana", name: "Phantom", installUrl: "https://phantom.app/download", icon: "/wallets/phantom.svg" },
  { id: "solflare", kind: "solana", name: "Solflare", installUrl: "https://solflare.com/download", icon: "/wallets/solflare.svg" },
  { id: "backpack", kind: "solana", name: "Backpack", installUrl: "https://www.backpack.app/", icon: "/wallets/backpack.svg" },
  { id: "nightly", kind: "solana", name: "Nightly", installUrl: "https://nightly.app/download", icon: "/wallets/nightly.svg" },
];

type Win = typeof window & {
  ethereum?: Record<string, unknown> & { providers?: Record<string, unknown>[] };
  phantom?: { ethereum?: unknown; solana?: unknown };
  coinbaseWalletExtension?: unknown;
  okxwallet?: unknown;
  trustwallet?: unknown;
  solflare?: unknown;
  backpack?: unknown;
  nightly?: { solana?: unknown };
  solana?: unknown;
};

function win(): Win | null {
  return typeof window === "undefined" ? null : (window as unknown as Win);
}

function asEvm(p: unknown): EvmProvider | null {
  if (typeof p !== "object" || p === null) return null;
  const req = (p as { request?: unknown }).request;
  return typeof req === "function" ? (p as EvmProvider) : null;
}

function asSolana(p: unknown): SolanaProviderLike | null {
  // NOTE: publicKey stays null until the user connects (Phantom/Solflare/Backpack
  // all hide it pre-connect), so presence of connect() alone proves installation.
  if (typeof p !== "object" || p === null) return null;
  const o = p as { connect?: unknown };
  if (typeof o.connect !== "function") return null;
  return p as SolanaProviderLike;
}

function flag(p: unknown, key: string): boolean {
  return typeof p === "object" && p !== null && (p as Record<string, unknown>)[key] === true;
}

function evmCandidates(): unknown[] {
  const w = win();
  if (!w) return [];
  const multi = Array.isArray(w.ethereum?.providers) ? (w.ethereum.providers as unknown[]) : [];
  return [
    ...multi,
    w.ethereum,
    w.phantom?.ethereum,
    w.coinbaseWalletExtension,
    w.okxwallet,
    w.trustwallet,
  ].filter((p) => p !== undefined && p !== null);
}

function matchEvm(p: unknown, id: EvmWalletId): boolean {
  switch (id) {
    case "rabby":
      return flag(p, "isRabby");
    case "metamask":
      return flag(p, "isMetaMask") && !flag(p, "isRabby");
    case "coinbase":
      return flag(p, "isCoinbaseWallet") || flag(p, "isCoinbaseBrowser");
    case "okx":
      return flag(p, "isOkxWallet");
    case "trust":
      return flag(p, "isTrust") || flag(p, "isTrustWallet");
    case "phantom":
      return flag(p, "isPhantom");
  }
}

/** Resolve the injected EVM provider for a wallet id, or null when missing. */
export function detectEvm(id: EvmWalletId): EvmProvider | null {
  for (const p of evmCandidates()) {
    if (matchEvm(p, id)) {
      const evm = asEvm(p);
      if (evm) return evm;
    }
  }
  return null;
}

/** Resolve the injected Solana provider for a wallet id, or null when missing. */
export function detectSolana(id: SolanaWalletId): SolanaProviderLike | null {
  const w = win();
  if (!w) return null;
  const raw =
    id === "phantom"
      ? (w.phantom?.solana ?? (flag(w.solana, "isPhantom") ? w.solana : null))
      : id === "solflare"
        ? (w.solflare ?? (flag(w.solana, "isSolflare") ? w.solana : null))
        : id === "backpack"
          ? (w.backpack ?? (flag(w.solana, "isBackpack") ? w.solana : null))
          : (w.nightly?.solana ?? null);
  return asSolana(raw);
}

export function withTimeout<T>(p: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("wallet_timeout")), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

const STORE_KEY = "artemis.wallet.v1";

// ponytail: id allowlists shared by loadWallet validation
const EVM_IDS: ReadonlySet<string> = new Set(EVM_WALLETS.map((w) => w.id));
const SOL_IDS: ReadonlySet<string> = new Set(SOLANA_WALLETS.map((w) => w.id));

type StoredWallet = { kind: WalletKind; id: string; address: string };

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadWallet(): StoredWallet | null {
  try {
    const raw = store()?.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWallet;
    if (!parsed || typeof parsed !== "object") return null;
    // Poisoned storage must never yield an unusable id/address (see SolanaButton fallback).
    if (parsed.kind === "evm" && EVM_IDS.has(parsed.id) && isEvmAddress(parsed.address)) {
      return parsed;
    }
    if (parsed.kind === "solana" && SOL_IDS.has(parsed.id) && isSolanaAddress(parsed.address)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearWallet(): void {
  try {
    store()?.removeItem(STORE_KEY);
  } catch {
    // private mode: nothing persisted anyway
  }
}

function saveWallet(w: StoredWallet): void {
  try {
    store()?.setItem(STORE_KEY, JSON.stringify(w));
  } catch {
    // private mode: session-only
  }
}

function isEvmAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

function isSolanaAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

/** Connect an EVM wallet: detect, request accounts (12s cap), validate, persist. */
export async function connectEvm(id: EvmWalletId): Promise<{ provider: EvmProvider; address: string }> {
  const provider = detectEvm(id);
  if (!provider) throw new Error("wallet_missing");
  let accounts: unknown;
  try {
    accounts = await withTimeout(provider.request({ method: "eth_requestAccounts" }));
  } catch (e) {
    if (e instanceof Error && /rejected|cancel|denied|user/i.test(e.message)) throw new Error("wallet_rejected");
    throw e instanceof Error ? e : new Error("wallet_failed");
  }
  const address = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
  if (!isEvmAddress(address)) throw new Error("wallet_failed");
  saveWallet({ kind: "evm", id, address });
  return { provider, address };
}

/** Quiet re-check: returns the first account only if the wallet is already authorized. */
export async function silentEvmAccount(id: EvmWalletId): Promise<string | null> {
  const provider = detectEvm(id);
  if (!provider) return null;
  try {
    const accounts = await withTimeout(provider.request({ method: "eth_accounts" }), 5000);
    const address = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
    return isEvmAddress(address) ? address : null;
  } catch {
    return null;
  }
}

/** Connect a Solana wallet: detect, connect (12s cap), validate, persist. */
export async function connectSolana(
  id: SolanaWalletId,
): Promise<{ provider: SolanaProviderLike; address: string }> {
  const provider = detectSolana(id);
  if (!provider) throw new Error("wallet_missing");
  try {
    await withTimeout(provider.connect());
  } catch (e) {
    if (e instanceof Error && /rejected|cancel|denied|user/i.test(e.message)) throw new Error("wallet_rejected");
    throw e instanceof Error ? e : new Error("wallet_failed");
  }
  let address = "";
  try {
    address = provider.publicKey.toBase58();
  } catch {
    throw new Error("wallet_failed");
  }
  if (!isSolanaAddress(address)) throw new Error("wallet_failed");
  saveWallet({ kind: "solana", id, address });
  return { provider, address };
}

/** Provider for the wallet chosen in the modal (no new permission prompt). */
export function getActiveEvmProvider(): EvmProvider | null {
  const w = win();
  if (!w) return null;
  const stored = loadWallet();
  if (stored?.kind === "evm") {
    const p = detectEvm(stored.id as EvmWalletId);
    if (p) return p;
  }
  return asEvm(w.ethereum);
}

/** Provider for the Solana wallet chosen in the modal, legacy pick as fallback. */
export function getActiveSolanaProvider(): SolanaProviderLike | null {
  const w = win();
  if (!w) return null;
  const stored = loadWallet();
  if (stored?.kind === "solana") {
    const p = detectSolana(stored.id as SolanaWalletId);
    if (p) return p;
  }
  return (
    asSolana(w.phantom?.solana) ?? asSolana(w.solflare) ?? asSolana(w.backpack) ?? asSolana(w.solana)
  );
}

/** Native balance of an EVM account, formatted (e.g. "1.2345"). Null when unreadable. */
export async function getEvmBalance(provider: EvmProvider, address: string): Promise<string | null> {
  try {
    const hex = (await withTimeout(provider.request({ method: "eth_getBalance", params: [address, "latest"] }), 8000)) as string;
    const wei = BigInt(hex);
    const whole = wei / 10n ** 18n;
    const frac = ((wei % 10n ** 18n) / 10n ** 14n).toString().padStart(4, "0").replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : `${whole}`;
  } catch {
    return null;
  }
}

/** Native SOL balance of an account via public RPC. Null when unreadable. */
export async function getSolanaBalance(address: string, rpc = "https://api.mainnet-beta.solana.com"): Promise<string | null> {
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { value?: number } };
    const lamports = data.result?.value;
    if (typeof lamports !== "number") return null;
    const sol = lamports / 1e9;
    return sol >= 1000 ? sol.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(Math.round(sol * 1e4) / 1e4);
  } catch {
    return null;
  }
}

export function walletLabel(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "wallet_missing") return "Wallet not detected. Install it first, or pick another.";
    if (e.message === "wallet_rejected") return "Connection cancelled in the wallet.";
    if (e.message === "wallet_timeout") return "Wallet did not respond. Unlock it and retry.";
    return e.message;
  }
  return "Wallet connection failed.";
}
