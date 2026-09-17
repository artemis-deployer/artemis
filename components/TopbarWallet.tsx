"use client";

import { getChain } from "../lib/chains";
import { useDraft } from "./DraftContext";
import SolanaButton from "./SolanaButton";
import WalletButton from "./WalletButton";

export default function TopbarWallet() {
  const { draft } = useDraft();
  const id = draft.chainId;
  const chain = getChain(id);
  return (
    <>
      {chain?.testnet && (
        <span className="testnet-pill" role="status">
          Testnet mode — no real funds
        </span>
      )}
      {id === 4663 || id === 46630 ? (
        <WalletButton chainId={id} />
      ) : typeof id === "string" && id.startsWith("solana") ? (
        <SolanaButton />
      ) : (
        <WalletButton chainId={46630} />
      )}
    </>
  );
}
