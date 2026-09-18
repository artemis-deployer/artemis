"use client";

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
        <SolanaButton />
      ) : (
        <WalletButton chainId={46630} />
      )}
    </>
  );
}
