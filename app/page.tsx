"use client";

import { useRef } from "react";
import CharacterStage from "../components/CharacterStage";
import { DraftProvider, useDraft } from "../components/DraftContext";
import LaunchForm from "../components/LaunchForm";
import ReviewDialog from "../components/ReviewDialog";
import StatusBadge from "../components/StatusBadge";
import StudioChat from "../components/StudioChat";
import { CHAINS } from "../lib/chains";

const STEPS = [
  {
    n: "01",
    title: "Tell Kentir your idea",
    body: "Pick a name and ticker, or ask the chat for help. The chat fills your draft; you can always edit every detail yourself.",
  },
  {
    n: "02",
    title: "Fixed supply. No extra minting.",
    body: "Direct launches start with exactly 999,000,000 tokens. Supply is not editable. No mint function, no transfer tax.",
  },
  {
    n: "03",
    title: "Your liquidity, your choice",
    body: "Choose how many tokens go into the pool and how much ETH or SOL pairs with them. The pool ratio sets the opening price.",
  },
  {
    n: "04",
    title: "Review. Then sign.",
    body: "Mainnets ask for a consent checkbox first. Every transaction is approved in your wallet. Kentir never holds your keys.",
  },
];

const RISKS = [
  "Staging software, not independently audited.",
  "Direct-pool liquidity is unlocked and withdrawable.",
  "A funded pool enables trading but guarantees no buyers, price, or listing.",
  "Testnets first. Mainnet spends real money.",
];

function Studio() {
  const { draft } = useDraft();
  const ref = useRef<HTMLDialogElement>(null);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="#top">
          kentir <span aria-hidden="true">✳</span>
        </a>
        <nav aria-label="Main">
          <a href="#meet">Meet Kentir</a>
          <a href="/tokens">Token showcase</a>
          <a href="#how">How it works</a>
          <a href="#your-launch">Your launch</a>
        </nav>
        <span className="powered">✳ Powered by Mimo v2.5</span>
      </header>

      <main id="top">
        <section className="hero" id="meet" aria-label="Meet Kentir">
          <p className="eyebrow">A little spark. A new beginning.</p>
          <h1 className="display">Kentir</h1>
          <p className="tagline">Liquidity you control. A community you run.</p>
          <div className="hero-grid">
            <div className="hero-side">
              <p className="live-dot">
                <span aria-hidden="true">●</span> Here with you
              </p>
            </div>
            <CharacterStage />
            <aside className="live-card" aria-label="Talk invitation">
              <p className="eyebrow light">Right here with you</p>
              <p className="live-big">
                A little idea?
                <br />
                Let&apos;s give it life.
              </p>
              <a className="btn-light" href="#studio">
                Talk to Kentir <span aria-hidden="true">↗</span>
              </a>
            </aside>
          </div>
        </section>

        <div id="studio">
          <StatusBadge />
          <StudioChat />
        </div>

        <div id="your-launch">
          <div className="section-head">
            <p className="eyebrow">From a little conversation</p>
            <h2>
              A new <em>beginning.</em>
            </h2>
            <p>Your idea takes shape here. You stay in control of every detail.</p>
          </div>
          <LaunchForm
            onReview={() => {
              ref.current?.showModal();
            }}
          />
          <ReviewDialog ref={ref} draft={draft} mainnet={!chain.testnet} />
        </div>

        <section className="how" id="how" aria-label="How it works">
          <p className="eyebrow">From an idea to an onchain token</p>
          <h2>
            A little conversation.
            <br />A launch you control.
          </h2>
          <div className="steps">
            {STEPS.map((s) => (
              <article key={s.n} className="step">
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="chains" aria-label="Choose your chain">
          <p className="eyebrow">Choose your token&apos;s home</p>
          <h2>Two rails. Four networks.</h2>
          <div className="chain-grid">
            <article className="chain-card">
              <p className="route">Hood Chain · Uniswap V2</p>
              <h3>One transaction per step</h3>
              <p>Token deploys first, then the pool funds. Testnet rehearses the deploy for free.</p>
            </article>
            <article className="chain-card">
              <p className="route">Solana · pump.fun</p>
              <h3>Bonding-curve launch</h3>
              <p>Build free on devnet, launch for real on mainnet. Mint key never leaves your browser.</p>
            </article>
          </div>
        </section>

        <section className="risks" aria-label="Honest risks">
          <h2>Before your first spark</h2>
          <ul>
            {RISKS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="cta" aria-label="Get started">
          <h2>Small beginnings. Beautiful possibilities.</h2>
          <div className="cta-row">
            <a className="btn-primary" href="#studio">
              Start your launch
            </a>
            <a className="btn-ghost" href="/tokens">
              Browse the showcase
            </a>
          </div>
        </section>
      </main>

      <footer>
        <span className="wordmark small">
          kentir <span aria-hidden="true">✳</span>
        </span>
        <span>Non-custodial. Your wallet signs everything.</span>
      </footer>
    </>
  );
}

export default function Home() {
  return (
    <DraftProvider>
      <Studio />
    </DraftProvider>
  );
}
