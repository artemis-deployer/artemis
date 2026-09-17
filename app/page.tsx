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
    title: "Draft your token idea",
    body: "Tell Kentir Copilot your concept, ticker, or community name. The assistant formats your launch draft while keeping you in full control of every parameter.",
  },
  {
    n: "02",
    title: "Fixed supply, zero minting",
    body: "Launches start with a strictly unalterable supply (999,000,000 for direct pools). No hidden mint functions, no administrative owner privileges, no transfer taxes.",
  },
  {
    n: "03",
    title: "Sovereign liquidity pairing",
    body: "Allocate how many tokens go directly into the DEX liquidity pool and pair them with ETH or SOL. The pool ratio determines the public market opening price.",
  },
  {
    n: "04",
    title: "Sign from your own wallet",
    body: "Review gas estimates and sign transactions directly via your web3 wallet (MetaMask, Phantom, Solflare). Kentir is non-custodial and never touches private keys.",
  },
];

const RISKS = [
  "Staging software, unaudited smart contracts. Rehearse thoroughly on testnets first.",
  "Direct liquidity pool tokens are unlocked and sovereignly managed by the creator.",
  "Funding a pool establishes an onchain trading pair but guarantees no trading volume or buyers.",
  "Mainnet broadcasts require real funds for network gas and paired liquidity.",
];

function Studio() {
  const { draft } = useDraft();
  const ref = useRef<HTMLDialogElement>(null);
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];

  return (
    <>
      {/* Topbar Header */}
      <header className="topbar-wrapper">
        <div className="topbar-container">
          <a className="brand-link" href="#top">
            <span>kentir</span>
            <span className="brand-star" aria-hidden="true">✳</span>
          </a>

          <nav className="topbar-nav" aria-label="Main Navigation">
            <a href="#meet">Meet Kentir</a>
            <a href="#studio">Launch Studio</a>
            <a href="#how">How It Works</a>
            <a href="/tokens">Showcase</a>
          </nav>

          <div className="topbar-actions">
            <StatusBadge />
          </div>
        </div>
      </header>

      <main id="top" className="page-container">
        {/* Hero Section */}
        <section className="hero-section" id="meet" aria-label="Meet Kentir">
          <div className="hero-header">
            <p className="eyebrow">A little spark. A new beginning.</p>
            <h1 className="hero-display">Kentir</h1>
            <p className="hero-tagline">Liquidity you control. A community you run.</p>
          </div>

          <div className="hero-grid">
            <div className="hero-intro">
              <span className="eyebrow">Non-Custodial Launchpad</span>
              <p>
                From a little spark to an onchain community. Pair direct liquidity on Robinhood Chain or launch via pump.fun on Solana. No custody, zero platform fees.
              </p>
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <a className="btn-primary" href="#studio">
                  Start Launch ↗
                </a>
                <a className="btn-secondary" href="/tokens">
                  Browse Showcase
                </a>
              </div>
            </div>

            <CharacterStage />

            <aside className="note-card" aria-label="Talk invitation">
              <p className="eyebrow light">Right here with you</p>
              <p className="note-big">
                A little idea?
                <br />
                Let&apos;s give it life.
              </p>
              <a className="btn-light" href="#studio">
                Talk to Kentir ↗
              </a>
            </aside>
          </div>
        </section>

        {/* Studio Workspace Section */}
        <section id="studio" className="studio-section" aria-label="Token Studio">
          <div className="studio-heading">
            <p className="eyebrow">From a little conversation</p>
            <h2>
              A new <em>beginning.</em>
            </h2>
            <p>Your idea takes shape here. You stay in control of every detail.</p>
          </div>

          <div className="studio-grid">
            <StudioChat />
            <div>
              <LaunchForm
                onReview={() => {
                  ref.current?.showModal();
                }}
              />
              <ReviewDialog ref={ref} draft={draft} mainnet={!chain.testnet} />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="section-container" id="how" aria-label="How it works">
          <div className="section-head">
            <p className="eyebrow">From an idea to an onchain token</p>
            <h2>
              A little conversation.
              <br />A launch you control.
            </h2>
            <p>Every step is verifiable, transparent, and executed directly through your browser wallet.</p>
          </div>

          <div className="steps-grid">
            {STEPS.map((s) => (
              <article key={s.n} className="step-card">
                <span className="step-number">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Supported Rails Section */}
        <section className="section-container" aria-label="Supported Rails">
          <div className="section-head">
            <p className="eyebrow">Choose your token&apos;s home</p>
            <h2>Two rails. Four networks.</h2>
            <p>Deploy directly to decentralized exchanges with verified parameters.</p>
          </div>

          <div className="chains-grid">
            <article className="chain-detail-card">
              <div>
                <span className="chain-detail-tag">EVM Rail · Uniswap V2</span>
                <h3>Robinhood Chain</h3>
                <p>
                  Two-step transparent execution: Deploy fixed-supply ERC20 contract, then fund liquidity pool via standard V2 router. Rehearse on testnet (Chain ID 46630) for free.
                </p>
              </div>
              <div className="pt-4 border-t border-[#332b25] text-xs text-[#d6cab6] font-mono">
                Chain ID 4663 · Native ETH Currency
              </div>
            </article>

            <article className="chain-detail-card">
              <div>
                <span className="chain-detail-tag">Solana Rail · PumpPortal</span>
                <h3>pump.fun Integration</h3>
                <p>
                  Fair-launch bonding-curve rail. Upload metadata to decentralized storage and build transaction payload directly in browser with Phantom or Solflare signing.
                </p>
              </div>
              <div className="pt-4 border-t border-[#332b25] text-xs text-[#d6cab6] font-mono">
                Solana Mainnet-Beta & Devnet Rehearsal
              </div>
            </article>
          </div>
        </section>

        {/* Honest Risks Section */}
        <section className="risks-box" aria-label="Honest risks">
          <h3>Notice & Important Considerations</h3>
          <ul className="risks-list">
            {RISKS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer-section">
        <div className="flex items-center gap-3">
          <span className="brand-link text-lg py-1 px-2.5">
            kentir ✳
          </span>
          <span>Non-custodial. Your wallet signs everything.</span>
        </div>
        <div>
          <span>Robinhood Chain & Solana pump.fun Launchpad</span>
        </div>
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
