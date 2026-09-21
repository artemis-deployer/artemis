"use client";

import { DEVNET_RPC, MAINNET_RPC, MAINNET_RPC_FALLBACK } from "../lib/launcher-solana";
import { useDraft } from "./DraftContext";
import SolanaButton from "./SolanaButton";
import WalletButton from "./WalletButton";

export default function TopbarWallet() {
  const { draft } = useDraft();
  const id = draft.chainId;
  return (
    <>
      {id === 4663 || id === 46630 ? (
        <WalletButton chainId={id} />
      ) : typeof id === "string" && id.startsWith("solana") ? (
        <SolanaButton rpc={id === "solana-devnet" ? DEVNET_RPC : [MAINNET_RPC, MAINNET_RPC_FALLBACK]} />
      ) : (
        <WalletButton chainId={46630} />
      )}
    </>
  );
}
