"use client";

import { useRef } from "react";
import CharacterStage from "../components/CharacterStage";
import { DraftProvider, useDraft } from "../components/DraftContext";
import LaunchForm from "../components/LaunchForm";
import ReviewDialog from "../components/ReviewDialog";
import StatusBadge from "../components/StatusBadge";
import StudioChat from "../components/StudioChat";
import { CHAINS } from "../lib/chains";

function Studio() {
  const { draft } = useDraft();
  const ref = useRef<HTMLDialogElement>(null);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  return (
    <main>
      <h1>Kentir</h1>
      <StatusBadge />
      <StudioChat />
      <CharacterStage />
      <LaunchForm
        onReview={() => {
          ref.current?.showModal();
        }}
      />
      <ReviewDialog ref={ref} draft={draft} mainnet={!chain.testnet} />
    </main>
  );
}

export default function Home() {
  return (
    <DraftProvider>
      <Studio />
    </DraftProvider>
  );
}
