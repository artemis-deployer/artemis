export function classifyAddress(s: string): "evm" | "solana" | null {
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) return "evm";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return "solana";
  return null;
}
