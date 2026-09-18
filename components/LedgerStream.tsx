"use client";

import React from 'react';
import { HOOD_MAINNET } from '../lib/launcher-evm';
import { DIRECT_SUPPLY } from '../lib/chains';

const evmTelemetry = [
  "EVM :: CHAIN 4663",
  `ROUTER :: ${(HOOD_MAINNET.router ?? "").slice(0, 6)}...${(HOOD_MAINNET.router ?? "").slice(-4)}`,
  "FACTORY :: 0x8bce...937f",
  "PAIR :: UNISWAP V2",
  `SUPPLY :: ${DIRECT_SUPPLY.toLocaleString('en-US')}`,
  "MINT FUNCTION :: NONE",
  "OWNER ROLE :: RENOUNCED",
  "SLIPPAGE :: 200 BPS EXACT",
  "NON-CUSTODIAL :: VERIFIED",
  "TESTNET REHEARSAL :: OK",
];

const solanaTelemetry = [
  "SOLANA :: PUMP.FUN RAIL",
  "PORTAL :: PUMPPORTAL API",
  "CURVE :: BONDING V1",
  "SUPPLY :: 1,000,000,000",
  "METADATA :: IPFS PINNED",
  "FEE :: 0.02 SOL BASE",
  "SIGNING :: PHANTOM / SOLFLARE",
  "LOCAL BYTES :: IN-BROWSER",
  "DEVNET :: SIMULATION READY",
  "RAYDIUM :: AUTO MIGRATION",
];

export const LedgerStream: React.FC = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 hidden xl:flex justify-between px-6 2xl:px-12 select-none overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)'
      }}
      aria-hidden="true"
    >
      {/* Left Stream: EVM / Robinhood Chain Rail */}
      <div className="flex flex-col gap-4 font-mono text-[10px] 2xl:text-[11px] uppercase tracking-[0.2em] text-white/20 pt-36">
        <span className="text-[#cadcf0]/40 font-semibold border-b border-white/10 pb-1.5 w-fit">
          [ RAIL_01 // HOOD_EVM ]
        </span>
        <div className="flex flex-col gap-2.5">
          {[...evmTelemetry, ...evmTelemetry].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[#fae8a4]/30">›</span>
              <span className="hover:text-white/40 transition-colors">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Stream: Solana / pump.fun Rail */}
      <div className="flex flex-col gap-4 font-mono text-[10px] 2xl:text-[11px] uppercase tracking-[0.2em] text-white/20 text-right pt-36 items-end">
        <span className="text-[#fae8a4]/40 font-semibold border-b border-white/10 pb-1.5 w-fit">
          [ RAIL_02 // SOLANA_PUMP ]
        </span>
        <div className="flex flex-col gap-2.5 items-end">
          {[...solanaTelemetry, ...solanaTelemetry].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="hover:text-white/40 transition-colors">{item}</span>
              <span className="text-[#cadcf0]/30">‹</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
