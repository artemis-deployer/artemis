export type Chain = {
  id: number | string;
  name: string;
  currency: string;
  testnet: boolean;
  explorer: string;
};

export const CHAINS: Chain[] = [
  { id: 4663, name: "Robinhood Chain", currency: "ETH", testnet: false, explorer: "https://robinhoodchain.blockscout.com" },
  { id: "solana-mainnet", name: "Solana", currency: "SOL", testnet: false, explorer: "https://solscan.io" },
  { id: 46630, name: "Robinhood Testnet", currency: "ETH", testnet: true, explorer: "https://explorer.testnet.chain.robinhood.com" },
  { id: "solana-devnet", name: "Solana Devnet", currency: "SOL", testnet: true, explorer: "https://solscan.io?cluster=devnet" },
];

export function getChain(id: number | string): Chain | undefined {
  const norm = typeof id === "string" && /^\d+$/.test(id) ? Number(id) : id;
  return CHAINS.find((c) => c.id === norm);
}

export const DIRECT_SUPPLY = 999000000;
