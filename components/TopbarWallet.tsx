"use client";

import { useDraft } from "./DraftContext";
import SolanaButton from "./SolanaButton";
import WalletButton from "./WalletButton";

export default function TopbarWallet() {
  const { draft } = useDraft();
  const id = draft.chainId;
  if (id === 4663 || id === 46630) return <WalletButton chainId={id} />;
  if (typeof id === "string" && id.startsWith("solana")) return <SolanaButton />;
  return <WalletButton chainId={46630} />;
}
