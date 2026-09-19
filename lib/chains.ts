export type Chain = {
  id: number | string;
  name: string;
  currency: string;
  testnet: boolean;
  explorer: string;
  logo: "hood" | "solana";
};

export const CHAINS: Chain[] = [
  { id: 4663, name: "Robinhood Chain", currency: "ETH", testnet: false, explorer: "https://robinhoodchain.blockscout.com", logo: "hood" },
  { id: "solana-mainnet", name: "Solana", currency: "SOL", testnet: false, explorer: "https://solscan.io", logo: "solana" },
  { id: 46630, name: "Robinhood Testnet", currency: "ETH", testnet: true, explorer: "https://explorer.testnet.chain.robinhood.com", logo: "hood" },
  { id: "solana-devnet", name: "Solana Devnet", currency: "SOL", testnet: true, explorer: "https://solscan.io?cluster=devnet", logo: "solana" },
];

export function defaultRouteFor(id: number | string): "pumpfun" | "direct" {
  return String(id).startsWith("solana") ? "pumpfun" : "direct";
}

export function getChain(id: number | string): Chain | undefined {
  const norm = typeof id === "string" && /^\d+$/.test(id) ? Number(id) : id;
  return CHAINS.find((c) => c.id === norm);
}

export const DIRECT_SUPPLY = 999000000;

// ponytail: solscan takes cluster as query AFTER path, not baked into base
export function explorerTokenUrl(chainId: number | string, address: string): string {
  if (String(chainId).includes("solana")) {
    const root = (getChain(chainId)?.explorer ?? "https://solscan.io").split("?")[0];
    const cluster = String(chainId) === "solana-devnet" ? "?cluster=devnet" : "";
    return `${root}/token/${address}${cluster}`;
  }
  const base = getChain(chainId)?.explorer ?? "https://blockscout.com";
  return `${base}/address/${address}`;
}

export function explorerTxUrl(chainId: number | string, txHash: string): string {
  if (String(chainId).includes("solana")) {
    const root = (getChain(chainId)?.explorer ?? "https://solscan.io").split("?")[0];
    const cluster = String(chainId) === "solana-devnet" ? "?cluster=devnet" : "";
    return `${root}/tx/${txHash}${cluster}`;
  }
  const base = getChain(chainId)?.explorer ?? "https://blockscout.com";
  return `${base}/tx/${txHash}`;
}
