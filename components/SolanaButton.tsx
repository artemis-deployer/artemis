"use client";

import { useState } from "react";

export type SolanaProvider = {
  publicKey: { toBase58(): string };
  connect(): Promise<unknown>;
  signTransaction: <T>(tx: T) => Promise<T>;
};

function pickProvider(): SolanaProvider | null {
  const w = window as unknown as { phantom?: { solana?: SolanaProvider }; solflare?: SolanaProvider; solana?: SolanaProvider };
  const p = w.phantom?.solana ?? w.solflare ?? w.solana;
  return p && typeof p.connect === "function" ? p : null;
}

export function getSolanaProvider(): SolanaProvider | null {
  return pickProvider();
}

export default function SolanaButton({ onConnect }: { onConnect: (p: SolanaProvider) => void }) {
  const [label, setLabel] = useState("Connect Solana wallet");
  const [error, setError] = useState("");

  async function connect() {
    setError("");
    const p = pickProvider();
    if (!p) {
      setError("Install Phantom or Solflare first.");
      return;
    }
    try {
      await p.connect();
      setLabel(p.publicKey.toBase58().slice(0, 4) + "…" + p.publicKey.toBase58().slice(-4));
      onConnect(p);
    } catch {
      setError("Wallet connection rejected.");
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void connect()}>
        {label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
